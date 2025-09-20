// 📁 core/scheduler.js
import { spawn } from "child_process";

const INTERVAL_MS = 1 * 60 * 60 * 1000; // 2 saatlik tekrar aralığı

function runBot() {
  const timestamp = new Date().toLocaleString();
  console.log(`\n⏱️ ${timestamp} → Bot çalıştırılıyor...`);

  const child = spawn("node", ["run.js"], { stdio: "inherit", shell: true });

  child.on("error", (err) => {
    console.error(`❌ Bot başlatma hatası: ${err.message}`);
  });

  child.on("exit", (code, signal) => {
    if (code !== null) {
      console.log(`👋 Bot işlemi sona erdi (çıkış kodu: ${code})`);
    } else {
      console.log(`⚠️ Bot işlemi sinyal ile sonlandı: ${signal}`);
    }
  });
}

console.log("🗓️ GitHub Engage Bot zamanlayıcı başlatıldı.");
runBot(); // İlk çalıştırma hemen
setInterval(runBot, INTERVAL_MS); // Sonraki çalıştırmalar
