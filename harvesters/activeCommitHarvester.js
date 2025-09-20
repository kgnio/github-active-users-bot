// 📁 harvesters/activeCommitHarvester.js
import fs from "fs";
import path from "path";
import octokit from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";

const OUTPUT_PATH = path.resolve("data/users-raw.json");
const MAX_USERS = 15;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const isSafeMode = process.env.SAFE_MODE === "true";
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

const seenLogins = new Set();

// 📦 Mevcut kullanıcıları oku
let existingUsers = [];
try {
  const data = fs.readFileSync(OUTPUT_PATH, "utf8");
  existingUsers = JSON.parse(data);
  for (const user of existingUsers) {
    seenLogins.add(user.login.toLowerCase());
  }
} catch {
  existingUsers = [];
}

export async function harvestActiveCommitUsers() {
  const allUsers = [...existingUsers];
  let added = 0;

  for (let page = 1; page <= 5; page++) {
    if (added >= MAX_USERS) break;

    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti kritik seviyede, işlem durduruluyor.");
      break;
    }

    console.log(`📡 Fetching commits page ${page}...`);

    try {
      const { data } = await octokit.request("GET /events", {
        per_page: 5,
        page,
      });

      for (const event of data) {
        if (added >= MAX_USERS) break;
        if (event.type !== "PushEvent") continue;

        const username = event.actor.login.toLowerCase();
        if (seenLogins.has(username)) continue;

        try {
          const { data: user } = await octokit.rest.users.getByUsername({
            username,
          });

          if (user.followers < 100) {
            console.log(
              `✅ Aktif commit atan: @${user.login} → 👥 ${user.followers} followers, 📦 ${user.public_repos} repos`
            );

            allUsers.push({
              login: user.login,
              html_url: user.html_url,
              followers: user.followers,
              public_repos: user.public_repos,
              created_at: user.created_at,
              score: 0,
              source: "active-commit",
              repo: "UNKNOWN",
              addedAt: new Date().toISOString(),
            });

            seenLogins.add(username);
            added++;
          } else {
            console.log(
              `⏩ @${user.login} skipped (followers: ${user.followers})`
            );
          }
        } catch (err) {
          console.warn(
            `⚠️ Kullanıcı verisi alınamadı: @${username} → ${err.message}`
          );
        }

        await safeDelay(); // Her kullanıcıdan sonra bekle (SAFE_MODE aktifse)
      }
    } catch (err) {
      console.error(
        `❌ Etkinlik verisi alınamadı (page ${page}):`,
        err.message
      );
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allUsers, null, 2));
  console.log(`📥 ${added} yeni kullanıcı kaydedildi → users-raw.json`);
}
