// 📁 utils/testToken.js
import octokit from "../core/githubClient.js";

const rate = await octokit.rest.rateLimit.get();
console.log(rate.data.rate);
