// 📁 actions/starBot.js
import { loadJSON, saveJSON } from "../utils/json.js";
import { starRepo, getRepos } from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";
import { SCORED_USERS_PATH, STARRED_PATH } from "../constants/paths.js";

const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function runStarBot(limit = 50) {
  const users = loadJSON(SCORED_USERS_PATH);
  const starred = loadJSON(STARRED_PATH);

  const starredSet = new Set(
    starred.map((entry) =>
      typeof entry === "string"
        ? entry.toLowerCase()
        : `${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}`
    )
  );

  const topUsers = users
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  let successCount = 0;
  let totalStarCount = 0;

  for (const user of topUsers) {
    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti çok düşük. Star işlemi durduruluyor.");
      break;
    }

    try {
      console.log(`🔍 Repos scanning for @${user.login}...`);
      const repos = await getRepos(user.login);
      const publicRepos = repos.filter((r) => !r.private);

      if (!publicRepos.length) {
        console.log(`⚠️ No public repo found for @${user.login}`);
        continue;
      }

      let starredThisUser = 0;
      for (const repo of publicRepos) {
        if (starredThisUser >= 3) break;

        const repoKey = `${user.login.toLowerCase()}/${repo.name.toLowerCase()}`;
        if (starredSet.has(repoKey)) {
          console.log(`⏭️ Already starred: ${repoKey}`);
          continue;
        }

        try {
          await starRepo(user.login, repo.name);
          console.log(`⭐ Starred: ${repoKey}`);

          starred.push({ owner: user.login, repo: repo.name });
          starredSet.add(repoKey);
          totalStarCount++;
          starredThisUser++;
        } catch (err) {
          console.warn(`❌ Failed to star ${repoKey}: ${err.message}`);
        }

        await safeDelay();
      }

      if (starredThisUser > 0) successCount++;
    } catch (err) {
      console.warn(`❌ Error processing @${user.login}: ${err.message}`);
    }
  }

  saveJSON(STARRED_PATH, starred);
  console.log(`\n✅ ${successCount} kullanıcıya yıldız bırakıldı.`);
  console.log(`🌟 Toplam repo yıldızlandı: ${totalStarCount}`);
}
