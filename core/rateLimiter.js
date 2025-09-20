// 📁 core/rateLimiter.js
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function checkRateLimit() {
  try {
    const res = await octokit.rest.rateLimit.get();
    const core = res.data.rate;

    console.log(
      `📈 Rate Limit: ${core.remaining}/${core.limit} - Resets at ${new Date(
        core.reset * 1000
      ).toLocaleTimeString()}`
    );

    if (core.remaining < 100) {
      console.warn(
        "⚠️ Uyarı: Rate limit sınırına yaklaşıldı! Kalan istek çok az."
      );
    }

    return core.remaining;
  } catch (err) {
    console.error("❌ Rate limit kontrolü başarısız:", err.message);
    return 0;
  }
}

export async function validateToken() {
  try {
    const res = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Token geçerli. Giriş yapan kullanıcı: @${res.data.login}`);
    return true;
  } catch (err) {
    console.error("❌ Token geçersiz veya erişim hatası:", err.message);
    return false;
  }
}
