// 📁 utils/unstarAll.js
import "dotenv/config";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: "github-engage-bot/unstar-all",
});

async function getAllStarredRepos(page = 1, all = []) {
  const response = await octokit.activity.listReposStarredByAuthenticatedUser({
    per_page: 100,
    page,
  });

  const repos = response.data;
  if (repos.length === 0) return all;

  return getAllStarredRepos(page + 1, all.concat(repos));
}

async function unstarAllRepos() {
  const starredRepos = await getAllStarredRepos();
  console.log(`\n🌟 Toplam ${starredRepos.length} repo yıldızlanmış.`);

  let successCount = 0;
  let failCount = 0;

  for (const repo of starredRepos) {
    const { owner, name } = {
      owner: repo.owner.login,
      name: repo.name,
    };

    try {
      await octokit.activity.unstarRepoForAuthenticatedUser({
        owner,
        repo: name,
      });
      console.log(`✅ Unstarred: ${owner}/${name}`);
      successCount++;
    } catch (err) {
      console.warn(`❌ Hata: ${owner}/${name} → ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ ${successCount} repo'dan yıldız kaldırıldı.`);
  console.log(`❌ ${failCount} repo kaldırılamadı.`);
}

unstarAllRepos();
