// 📁 utils/countUsers.js
import fs from "fs";
import path from "path";

const filePath = path.resolve("data/users-raw.json");

function countBySource() {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(data);

    const grouped = {};
    const unique = new Set();

    for (const user of users) {
      const login = user.login.toLowerCase();
      unique.add(login);

      const src = user.source || "unknown";
      grouped[src] = (grouped[src] || 0) + 1;
    }

    console.log(`👤 Toplam unique kullanıcı: ${unique.size}`);
    console.log("📊 Kaynak bazlı dağılım:");
    for (const [source, count] of Object.entries(grouped)) {
      console.log(`  • ${source}: ${count}`);
    }
  } catch (err) {
    console.error("❌ Okuma hatası:", err.message);
  }
}

countBySource();
