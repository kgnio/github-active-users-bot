// harvesters/lowFollowersHarvester.js
import octokit from "../core/githubClient.js";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const OUTPUT_PATH = path.resolve("data/users-raw.json");
const oneWeekAgo = dayjs().subtract(7, "day");
const perPage = 10; // Daha fazla testte artırılabilir
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function harvestLowFollowersActiveUsers() {
  const query = `followers:<100`;
  let allUsers = [];

  try {
    for (let page = 1; page <= 1; page++) {
      console.log(`🔎 Fetching page ${page}...`);
      const res = await octokit.request("GET /search/users", {
        q: query,
        per_page: perPage,
        page,
      });

      const candidates = res.data.items;

      for (const user of candidates) {
        try {
          console.log(`🔍 Checking activity of @${user.login}...`);
          const repos = await octokit.rest.repos.listForUser({
            username: user.login,
            sort: "pushed",
            direction: "desc",
            per_page: 5,
          });

          const isActive = repos.data.some((repo) =>
            dayjs(repo.pushed_at).isAfter(oneWeekAgo)
          );

          if (isActive) {
            console.log(`✅ Active user found: @${user.login}`);
            allUsers.push({
              login: user.login,
              html_url: user.html_url,
              score: 0,
              source: "low-followers",
            });
          } else {
            console.log(`⏸️ Inactive user skipped: @${user.login}`);
          }
        } catch (err) {
          console.warn(
            `⚠️ Kullanıcı analizi sırasında hata: @${user.login}`,
            err.message
          );
        }

        await delay(1500); // 1.5 saniye bekle → rate limit dostu
      }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allUsers, null, 2));
    console.log(
      `\n✅ ${allUsers.length} aktif kullanıcı bulundu ve kaydedildi → users-raw.json`
    );
  } catch (err) {
    console.error("❌ Harvester genel hatası:", err.message);
  }
}
