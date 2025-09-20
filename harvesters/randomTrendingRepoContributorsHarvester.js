// 📁 harvesters/trendingContributorsHarvester.js
import fs from "fs";
import path from "path";
import octokit from "../core/githubClient.js";
import { checkRateLimit } from "../core/rateLimiter.js";

const OUTPUT_PATH = path.resolve("data/users-raw.json");
const isSafeMode = process.env.SAFE_MODE === "true";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const safeDelay = async () => {
  if (isSafeMode) await delay(1500);
};

export async function harvestTrendingContributors() {
  const trendingRepos = [
    "vercel/next.js",
    "microsoft/vscode",
    "withastro/astro",
    "nuxt/nuxt",
    "facebook/react",
    "sindresorhus/awesome",
  ];

  const existing = new Set();
  const allUsers = loadExistingUsers(existing);

  for (const repo of trendingRepos) {
    const [owner, name] = repo.split("/");
    console.log(`🚀 Fetching contributors for ${repo}...`);

    const remaining = await checkRateLimit();
    if (remaining < 10) {
      console.warn("⏸️ API limiti düşük, işlem durduruluyor.");
      break;
    }

    try {
      const { data: contributors } = await octokit.repos.listContributors({
        owner,
        repo: name,
        per_page: 5,
        page: 5,
      });

      for (const contributor of contributors) {
        const login = contributor.login.toLowerCase();
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
            source: "trending-contributor",
            repo: `${owner}/${name}`,
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
    } catch (err) {
      console.warn(`⚠️ ${repo} için contributor alınamadı: ${err.message}`);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allUsers, null, 2));
  console.log(`✅ Trending contributors kaydedildi → users-raw.json`);
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
