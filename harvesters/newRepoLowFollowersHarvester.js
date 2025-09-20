// 📁 harvesters/newRepoLowFollowersHarvester.js
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import octokit from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";

const OUTPUT_PATH = path.resolve("data/users-raw.json");
const twoDaysAgo = dayjs().subtract(2, "day").format("YYYY-MM-DD");
const perPage = 5;
const maxPages = 5;
const maxUsers = 15;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const isSafeMode = process.env.SAFE_MODE === "true";
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function harvestNewRepoLowFollowersUsers() {
  const seenUsers = new Set();
  let existingUsers = [];

  // Mevcut kullanıcıları yükle
  try {
    const data = fs.readFileSync(OUTPUT_PATH, "utf8");
    existingUsers = JSON.parse(data);
    for (const user of existingUsers) {
      seenUsers.add(user.login.toLowerCase());
    }
  } catch {
    existingUsers = [];
  }

  const allUsers = [...existingUsers];
  let added = 0;

  try {
    for (let page = 1; page <= maxPages; page++) {
      if (added >= maxUsers) break;

      const remaining = await checkRateLimit();
      if (remaining < 10) {
        console.warn("⏸️ Çok az API hakkı kaldı, işlem durduruluyor.");
        break;
      }

      console.log(
        `🔎 Fetching repos created after ${twoDaysAgo}, page ${page}...`
      );

      const res = await octokit.request("GET /search/repositories", {
        q: `created:>${twoDaysAgo}`,
        sort: "updated",
        order: "desc",
        per_page: perPage,
        page,
      });

      const repos = res.data.items;

      for (const repo of repos) {
        if (added >= maxUsers) break;

        const username = repo.owner.login.toLowerCase();
        if (seenUsers.has(username)) continue;

        try {
          const { data: user } = await octokit.rest.users.getByUsername({
            username,
          });

          if (user.followers < 100) {
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
              repo: repo.full_name,
              source: "new-repo-low-followers",
              addedAt: new Date().toISOString(),
            });

            seenUsers.add(username);
            added++;
          } else {
            console.log(
              `⏩ @${user.login} skipped (followers: ${user.followers})`
            );
          }
        } catch (err) {
          console.warn(`⚠️ Kullanıcı alınamadı: @${username} → ${err.message}`);
        }

        await safeDelay(); // güvenli modda gecikme
      }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allUsers, null, 2));
    console.log(`\n✅ ${added} yeni kullanıcı kaydedildi → users-raw.json`);
  } catch (err) {
    console.error("❌ Harvester hatası:", err.message);
  }
}
