// 📁 run.js
import "dotenv/config";
import { validateToken, checkRateLimit } from "./core/rateLimiter.js";
import { harvestNewRepoLowFollowersUsers } from "./harvesters/newRepoLowFollowersHarvester.js";
import { harvestActiveCommitUsers } from "./harvesters/activeCommitHarvester.js";
import { harvestHacktoberfestUsers } from "./harvesters/hacktoberfestHarvester.js";
import { harvestNewRepoZeroStarsUsers } from "./harvesters/newRepoZeroStarsHarvester.js";

import { cleanOldUsers } from "./core/cleanOldUsers.js";
import { scoreUsers } from "./core/userScorer.js";
import { runFollowBot } from "./actions/followBot.js";
import { runStarBot } from "./actions/starBot.js";
import { runCheckExpiredFollows } from "./actions/checkExpiredFollows.js";
import { showDashboard } from "./advanced/engageBotDashboard.js";
import { harvestTrendingContributors } from "./harvesters/randomTrendingRepoContributorsHarvester.js";
import { harvestPopularFollowers } from "./harvesters/recentFollowersOfPopularDevHarvester.js";

async function runHarvestPhase() {
  console.log("🧹 Eski kullanıcılar temizleniyor...");
  cleanOldUsers(); 

  console.log("🌱 Harvest Phase Başlıyor...\n");

  await harvestNewRepoLowFollowersUsers();
  await harvestActiveCommitUsers();
  await harvestHacktoberfestUsers();
  await harvestNewRepoZeroStarsUsers();
  await harvestTrendingContributors(); 
  await harvestPopularFollowers();

  console.log("\n🌾 Harvest işlemleri tamamlandı.\n");
}

async function runEngagePhase() {
  console.log("📊 Kullanıcılar puanlanıyor...");
  await scoreUsers();

  console.log("\n🤝 En yüksek puanlı 50 kullanıcı takip ediliyor...");
  await runFollowBot(50);

  console.log("\n🌟 Yıldız bırakma işlemi başlatıldı...");
  await runStarBot();
}

async function runMaintenancePhase() {
  console.log("\n🧼 Takip süresi dolanlar kontrol ediliyor...");
  await runCheckExpiredFollows();

  console.log("\n📺 Dashboard güncelleniyor...");
  await showDashboard();
}

async function main() {
  console.log("🚀 GitHub Engage Bot başlatılıyor...\n");

  const tokenValid = await validateToken();
  if (!tokenValid) {
    console.error("❌ Token geçersiz. Bot durduruldu.");
    return;
  }

  await checkRateLimit();

  await runHarvestPhase();
  await runEngagePhase();
  await runMaintenancePhase();

  console.log("\n🏁 Tüm işlemler başarıyla tamamlandı.");
}

main();
