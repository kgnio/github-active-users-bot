// 📁 harvesters/popularFollowersHarvester.js
import fs from "fs";
import path from "path";
import octokit from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";

const OUTPUT_PATH = path.resolve("data/users-raw.json");
const POPULAR_DEVS = [
  "vercel",
  "microsoft",
  "facebook",
  "google",
  "sindresorhus",
];

const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function harvestPopularFollowers() {
  const existing = new Set();
  const allUsers = loadExistingUsers(existing);

  for (const dev of POPULAR_DEVS) {
    console.log(`👀 Fetching followers of ${dev}...`);

    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti çok düşük, işlem sonlandırıldı.");
      break;
    }

    try {
      for (let page = 1; page <= 3; page++) {
        const { data: followers } = await octokit.request(
          "GET /users/{username}/followers",
          {
            username: dev,
            per_page: 5,
            page,
          }
        );

        for (const f of followers) {
          const login = f.login.toLowerCase();
          if (existing.has(login)) continue;

          try {
            const { data: user } = await octokit.rest.users.getByUsername({
              username: login,
            });

            if (user.followers >= 100) {
              console.log(
                `⏩ @${user.login} → ${user.followers} followers, skipped.`
              );
              continue;
            }

            console.log(
              `✅ @${user.login} → 👥 ${user.followers} followers, 📦 ${user.public_repos} repos`
            );

            allUsers.push({
              login: user.login,
              html_url: user.html_url,
              followers: user.followers,
              public_repos: user.public_repos,
              created_at: user.created_at,
              score: 0,
              source: "popular-followers",
              repo: `follows:${dev}`,
              addedAt: new Date().toISOString(),
            });

            existing.add(login);
            await safeDelay();
          } catch (userErr) {
            console.warn(
              `⚠️ Kullanıcı verisi alınamadı: @${login} → ${userErr.message}`
            );
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ ${dev} takipçileri alınamadı: ${err.message}`);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allUsers, null, 2));
  console.log(`✅ Popüler dev takipçileri kaydedildi → users-raw.json`);
}

function loadExistingUsers(set) {
  try {
    const data = fs.readFileSync(OUTPUT_PATH, "utf8");
    const users = JSON.parse(data);
    users.forEach((u) => set.add(u.login.toLowerCase()));
    return users;
  } catch {
    return [];
  }
}
