// 📁 actions/unstarBot.js
import { getFollowers, unstarRepo } from "../core/githubClient.js";
import { loadJSON, saveJSON } from "../utils/json.js";
import { STARRED_PATH } from "../constants/paths.js";
import { checkRateLimit } from "../core/rateLimiter.js";

const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function runUnstarBot() {
  const starred = loadJSON(STARRED_PATH);
  const followers = await getFollowers();
  const followerSet = new Set(followers.map((f) => f.login.toLowerCase()));

  const kept = [];
  let removedCount = 0;

  for (const { owner, repo } of starred) {
    const isRepoKnown = repo && repo !== "UNKNOWN";
    const ownerLower = owner.toLowerCase();

    if (!isRepoKnown) {
      console.log(`⏩ Skipped (repo unknown): ${owner}`);
      kept.push({ owner, repo });
      continue;
    }

    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti düşük, unstar işlemi durduruldu.");
      break;
    }

    if (!followerSet.has(ownerLower)) {
      try {
        console.log(`🧹 Unstarring ${owner}/${repo} (not following back)...`);
        await unstarRepo(owner, repo);
        removedCount++;
      } catch (err) {
        console.warn(`❌ Unstar hatası: ${owner}/${repo} → ${err.message}`);
        kept.push({ owner, repo }); // hata varsa tekrar tut
      }
    } else {
      kept.push({ owner, repo }); // hâlâ takip ediyorsa tut
    }

    await safeDelay();
  }

  saveJSON(STARRED_PATH, kept);
  console.log(`\n✅ ${removedCount} repo'dan yıldız kaldırıldı.`);
}
