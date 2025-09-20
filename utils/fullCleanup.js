// 📁 utils/fullCleanup.js
import fs from "fs";
import path from "path";
import {
  getFollowers,
  unfollowUser,
  unstarRepo,
} from "../core/githubClient.js";

const FOLLOWED_PATH = path.resolve("data/followed.json");
const STARRED_PATH = path.resolve("data/starred.json");

function loadJSON(file, fallback = []) {
  try {
    const data = fs.readFileSync(file, "utf-8");
    return data.trim() ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function runFullCleanup() {
  const followers = await getFollowers(); // Seni takip edenler
  const followerLogins = new Set(followers.map((u) => u.login.toLowerCase()));

  let followed = loadJSON(FOLLOWED_PATH);
  let starred = loadJSON(STARRED_PATH);

  const remainingFollowed = [];
  const remainingStarred = [];

  for (const user of followed) {
    const login = user.login.toLowerCase();

    if (!followerLogins.has(login)) {
      console.log(`🚫 @${login} seni geri takip etmiyor. Unfollow + Unstar...`);

      try {
        await unfollowUser(login);
      } catch (err) {
        console.warn(`❌ Unfollow hatası @${login}:`, err.message);
      }

      const starredEntries = starred.filter(
        (s) => s.owner?.toLowerCase() === login
      );
      for (const entry of starredEntries) {
        try {
          await unstarRepo(entry.owner, entry.repo);
          console.log(`⭐ Unstar yapıldı: ${entry.owner}/${entry.repo}`);
        } catch (err) {
          console.warn(`❌ Unstar hatası @${entry.owner}:`, err.message);
        }
      }

      // Bu kullanıcıya ait tüm star kayıtlarını kaldır
      starred = starred.filter((s) => s.owner?.toLowerCase() !== login);
    } else {
      remainingFollowed.push(user);
    }
  }

  saveJSON(FOLLOWED_PATH, remainingFollowed);
  saveJSON(STARRED_PATH, starred);

  console.log(`\n✅ Temizlik tamamlandı. Geri takip etmeyenler silindi.`);
}

runFullCleanup();
