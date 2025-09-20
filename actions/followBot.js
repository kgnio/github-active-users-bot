// 📁 actions/followBot.js
import { followUser } from "../core/githubClient.js";
import { loadJSON, saveJSON } from "../utils/json.js";
import { checkRateLimit } from "../core/rateLimiter.js";
import {
  SCORED_USERS_PATH,
  FOLLOWED_PATH,
  BLACKLIST_PATH,
} from "../constants/paths.js";

const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function runFollowBot(limit = 50) {
  const users = loadJSON(SCORED_USERS_PATH);
  const blacklist = new Set(
    loadJSON(BLACKLIST_PATH).map((u) => u.toLowerCase())
  );
  const followed = loadJSON(FOLLOWED_PATH);
  const alreadyFollowed = new Set(followed.map((u) => u.login.toLowerCase()));

  if (users.length === 0) {
    console.warn("⚠️ users-scored.json boş, takip edilecek kullanıcı yok.");
    return;
  }

  const candidates = users
    .filter(
      (u) =>
        !blacklist.has(u.login.toLowerCase()) &&
        !alreadyFollowed.has(u.login.toLowerCase())
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  let successCount = 0;

  for (const user of candidates) {
    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti düşük, takip işlemi durduruluyor.");
      break;
    }

    try {
      console.log(`➕ Following @${user.login} (score: ${user.score})...`);
      await followUser(user.login);

      blacklist.add(user.login.toLowerCase());
      followed.push({
        login: user.login,
        followedAt: new Date().toISOString(),
        repo: user.repo || "UNKNOWN",
      });

      successCount++;
    } catch (err) {
      console.warn(`⚠️ @${user.login} takip hatası:`, err.message);
    }

    await safeDelay();
  }

  saveJSON(BLACKLIST_PATH, Array.from(blacklist));
  saveJSON(FOLLOWED_PATH, followed);

  console.log(
    `✅ Takip işlemi tamamlandı. Bu döngüde işlenen kullanıcı sayısı: ${successCount}`
  );
}
