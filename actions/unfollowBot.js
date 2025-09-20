// 📁 actions/unfollowBot.js
import { loadJSON, saveJSON } from "../utils/json.js";
import { getFollowers, unfollowUser } from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";
import { BLACKLIST_PATH } from "../constants/paths.js";

const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function runUnfollowBot() {
  const blacklist = loadJSON(BLACKLIST_PATH).map((u) => u.toLowerCase());
  const followers = await getFollowers();
  const followerSet = new Set(followers.map((u) => u.login.toLowerCase()));
  const unfollowed = [];

  for (const username of blacklist) {
    if (followerSet.has(username)) continue;

    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti düşük, unfollow işlemi durduruluyor.");
      break;
    }

    try {
      console.log(`➖ Unfollowing @${username} (doesn't follow back)`);
      await unfollowUser(username);
      unfollowed.push(username);
    } catch (err) {
      console.warn(`⚠️ Hata @${username} → ${err.message}`);
    }

    await safeDelay();
  }

  const updated = blacklist.filter(
    (u) => !unfollowed.includes(u.toLowerCase())
  );
  saveJSON(BLACKLIST_PATH, updated);

  console.log(`\n✅ ${unfollowed.length} kullanıcı takipten çıkarıldı.`);
}
