import "dotenv/config";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function check() {
  const me = await octokit.rest.users.getAuthenticated();
  console.log("👤 Giriş yapan kullanıcı:", me.data.login);

  const { data } = await octokit.rest.rateLimit.get();
  console.log("📈 Rate Limit:", data.rate);
}

check();
