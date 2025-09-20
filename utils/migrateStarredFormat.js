// utils/migrateStarredFormat.js
import fs from "fs";

const file = "data/starred.json";
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

const migrated = data.map((item) =>
  typeof item === "string" ? { owner: item, repo: "UNKNOWN" } : item
);

fs.writeFileSync(file, JSON.stringify(migrated, null, 2));
console.log("✅ starred.json format migrated.");
