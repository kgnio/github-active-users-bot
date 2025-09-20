// 📁 core/cleanOldUsers.js
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const RAW_PATH = path.resolve("data/users-raw.json");
const SCORED_PATH = path.resolve("data/users-scored.json");

const HOURS_LIMIT = 50;

function loadJSON(filePath, fallback = []) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data.trim() ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function cleanOldUsers() {
  const now = dayjs();

  const rawUsers = loadJSON(RAW_PATH);
  const scoredUsers = loadJSON(SCORED_PATH);

  const freshRaw = rawUsers.filter((u) => {
    if (!u.addedAt) return true;
    return now.diff(dayjs(u.addedAt), "hour") < HOURS_LIMIT;
  });

  const freshScored = scoredUsers.filter((u) => {
    if (!u.addedAt) return true;
    return now.diff(dayjs(u.addedAt), "hour") < HOURS_LIMIT;
  });

  saveJSON(RAW_PATH, freshRaw);
  saveJSON(SCORED_PATH, freshScored);

  console.log(
    `🧼 Eski kullanıcılar temizlendi → ${
      rawUsers.length - freshRaw.length
    } raw, ${scoredUsers.length - freshScored.length} scored silindi`
  );
}
