import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const INPUT_PATH = path.resolve("data/users-raw.json");
const OUTPUT_PATH = path.resolve("data/users-scored.json");

export async function scoreUsers() {
  let rawUsers = [];
  try {
    const data = fs.readFileSync(INPUT_PATH, "utf8");
    if (!data.trim()) return console.warn("⚠️ users-raw.json boş.");
    rawUsers = JSON.parse(data);
  } catch (err) {
    console.error("❌ users-raw.json okunamadı:", err.message);
    return;
  }

  const scoredUsers = rawUsers.map((user) => {
    let score = 0;

    // 🎯 Source ağırlığı
    switch (user.source) {
      case "new-repo-low-followers":
        score += 30;
        break;
      case "active-commit":
        score += 40;
        break;
      case "hacktoberfest":
        score += 50;
        break;
      case "new-repo-zero-stars":
        score += 35;
        break;
      case "trending-contributor":
        score += 45; // ✅ yeni eklendi
        break;
      case "popular-followers":
        score += 30; // ✅ yeni eklendi
        break;
      default:
        score += 20;
        break;
    }

    // 👥 Followers: düşük olanlara puan
    const followers = user.followers ?? 0;
    if (followers < 5) score += 20;
    else if (followers < 20) score += 10;

    // 📦 Public repos: 3–10 arası iyidir
    const repos = user.public_repos ?? 0;
    if (repos >= 3 && repos <= 10) score += 10;
    else if (repos > 10) score += 5;

    // 🕰️ Yeni hesaplara bonus
    const createdAt = user.created_at ? dayjs(user.created_at) : null;
    if (createdAt) {
      const ageInMonths = dayjs().diff(createdAt, "month");
      if (ageInMonths < 3) score += 15;
      else if (ageInMonths < 6) score += 10;
      else if (ageInMonths < 12) score += 5;
    }

    // 🔀 Hafif rastgelelik
    score += Math.floor(Math.random() * 6); // 0–5

    return {
      ...user,
      score: Math.min(score, 100),
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(scoredUsers, null, 2));
  console.log(
    `✅ ${scoredUsers.length} kullanıcı puanlandı → users-scored.json`
  );
}
