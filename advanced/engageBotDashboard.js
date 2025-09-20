import fs from "fs";
import path from "path";
import chalk from "chalk";
import Table from "cli-table3";

const USERS_RAW = path.resolve("data/users-raw.json");
const USERS_SCORED = path.resolve("data/users-scored.json");
const BLACKLIST = path.resolve("data/blacklist.json");
const STARRED = path.resolve("data/starred.json");

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function average(arr) {
  if (!arr.length) return 0;
  const total = arr.reduce((acc, user) => acc + (user.score || 0), 0);
  return (total / arr.length).toFixed(2);
}

function getTopUser(usersScored) {
  const sorted = [...usersScored].sort((a, b) => b.score - a.score);
  return sorted[0] || null;
}

function countRecentUsers(users, hours = 24) {
  const now = Date.now();
  return users.filter((u) => {
    const added = new Date(u.addedAt || u.timestamp || now).getTime();
    return now - added <= hours * 60 * 60 * 1000;
  }).length;
}

export async function showDashboard() {
  console.clear();

  const usersRaw = readJSON(USERS_RAW);
  const usersScored = readJSON(USERS_SCORED);
  const blacklist = readJSON(BLACKLIST);
  const starred = readJSON(STARRED);

  const latestUser = usersRaw.at(-1)?.login || "—";
  const latestScored = usersScored.at(-1);
  const latestScoredUser = latestScored?.login || "—";
  const latestRepo = latestScored?.repo || "—";
  const avgScore = average(usersScored);
  const topUser = getTopUser(usersScored);
  const recentCount = countRecentUsers(usersRaw, 24);

  console.log(chalk.bgMagentaBright.bold("\n 📊 GITHUB ENGAGE BOT DASHBOARD "));
  console.log(chalk.gray("=".repeat(60)));

  const table = new Table({
    head: [
      chalk.bold("📁 Dosya"),
      chalk.bold("🧮 Toplam"),
      chalk.bold("📝 Açıklama"),
    ],
    colWidths: [25, 10, 50],
  });

  table.push(
    [
      "users-raw.json",
      usersRaw.length,
      "Ham kullanıcı listesi (filtrelenmeden)",
    ],
    [
      "users-scored.json",
      usersScored.length,
      "Skorlanmış ve sıralanmış kullanıcılar",
    ],
    [
      "blacklist.json",
      blacklist.length,
      "Zaten etkileşim yapılmış kullanıcılar",
    ],
    ["starred.json", starred.length, "Yıldız bırakılan public repolar"]
  );

  console.log(table.toString());

  console.log(
    `\n📌 ${chalk.bold("Son kullanıcı:")} @${chalk.green(latestUser)}`
  );
  console.log(
    `📌 ${chalk.bold("Son takip edilen:")} @${chalk.yellow(
      latestScoredUser
    )} → ${chalk.gray(latestRepo)}`
  );
  console.log(
    `🏅 ${chalk.bold("En yüksek skor:")} ${chalk.green(
      topUser?.score || "—"
    )} → @${topUser?.login || "—"}`
  );
  console.log(`📊 ${chalk.bold("Ortalama skor:")} ${chalk.magenta(avgScore)}`);
  console.log(
    `🆕 ${chalk.bold("Son 24 saatte eklenen:")} ${chalk.cyan(
      recentCount
    )} kullanıcı`
  );

  console.log(
    `\n${chalk.green("🟢 Hazır")} | ${chalk.yellow(
      "🔁 Çalışıyor"
    )} | ${chalk.red("❌ Hatalı")} gibi işaretler planlanabilir.`
  );

  console.log(
    `\n🛠️  Daha fazla detay için skor sıralaması, trend kullanıcılar, yıldız dağılımı gibi alanlar eklenebilir.`
  );

  console.log(
    chalk.gray("\n📅 Güncelleme Zamanı: " + new Date().toLocaleString())
  );
}
