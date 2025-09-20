// 📁 actions/checkExpiredFollows.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  getFollowers,
  unfollowUser,
  unstarRepo,
} from "../core/githubClient.js";

const FOLLOWED_PATH = path.resolve("data/followed.json");
const DEFAULT_HOURS = 48;

// JSON dosyasını oku
function loadFollowedUsers() {
  try {
    const content = fs.readFileSync(FOLLOWED_PATH, "utf-8");
    return content.trim() ? JSON.parse(content) : [];
  } catch {
    return [];
  }
}

// JSON dosyasını yaz
function saveFollowedUsers(users) {
  fs.writeFileSync(FOLLOWED_PATH, JSON.stringify(users, null, 2));
}

export async function runCheckExpiredFollows() {
  const EXPIRY_HOURS =
    parseInt(process.env.UNFOLLOW_AFTER_HOURS) || DEFAULT_HOURS;
  const cutoffMs = EXPIRY_HOURS * 60 * 60 * 1000;

  console.log(
    `\n📂 Takip süresi dolan kullanıcılar kontrol ediliyor (limit: ${EXPIRY_HOURS} saat)...`
  );

  const followedUsers = loadFollowedUsers();
  if (followedUsers.length === 0) {
    console.log("📭 followed.json dosyası boş. Takip edilen kullanıcı yok.");
    return;
  }

  const now = Date.now();
  const followers = await getFollowers();
  const followerSet = new Set(followers.map((f) => f.login.toLowerCase()));

  let kept = [];
  let removed = 0;
  let notExpired = 0;
  let expiredButFollowing = 0;
  let expiredNotFollowing = 0;

  for (const entry of followedUsers) {
    const { login, followedAt, repo } = entry;
    const timePassed = now - new Date(followedAt).getTime();

    if (timePassed >= cutoffMs) {
      if (!followerSet.has(login.toLowerCase())) {
        console.log(
          `⏱️ ${EXPIRY_HOURS}+ saat geçti, geri takip yok → @${login}`
        );
        try {
          await unfollowUser(login);

          if (repo && repo !== "UNKNOWN") {
            await unstarRepo(login, repo);
            console.log(`🧹 Star da kaldırıldı → ${login}/${repo}`);
          }

          removed++;
          expiredNotFollowing++;
        } catch (err) {
          console.warn(`⚠️ Hata oluştu: @${login} → ${err.message}`);
          kept.push(entry); // hata varsa silme
        }
      } else {
        console.log(`✅ @${login} geri takip ediyor, tutuldu.`);
        kept.push(entry);
        expiredButFollowing++;
      }
    } else {
      notExpired++;
      kept.push(entry);
    }
  }

  saveFollowedUsers(kept);

  console.log(`\n📊 Takip kontrol özeti:
🕒 Süresi dolmamış kullanıcı: ${notExpired}
🔁 Süresi dolmuş ama geri takip eden: ${expiredButFollowing}
❌ Süresi dolmuş ve geri takip etmeyen: ${expiredNotFollowing}`);

  if (removed === 0) {
    console.log("ℹ️  Bu döngüde hiçbir kullanıcı takipten çıkarılmadı.");
  } else {
    console.log(`✅ ${removed} kullanıcı takipten çıkarıldı.`);
  }
}

// Script olarak çalıştırılırsa:
if (process.argv[1].endsWith("checkExpiredFollows.js")) {
  runCheckExpiredFollows();
}
