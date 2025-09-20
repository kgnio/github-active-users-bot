import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function getMergeableState(prNumber, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      if (data.mergeable !== null) return data;
      console.log(
        `⏳ PR #${prNumber} mergeable durumu hesaplanıyor... (${
          attempt + 1
        }/${retries})`
      );
      await sleep(3000); // biraz bekle
    } catch (err) {
      console.warn(`⚠️ PR #${prNumber} detay alınırken hata: ${err.message}`);
      await sleep(3000);
    }
  }
  return null;
}

async function mergePR(pr) {
  const prNumber = pr.number;
  const prTitle = pr.title;

  console.log(`🔍 PR #${prNumber} – ${prTitle}`);

  const freshPR = await getMergeableState(prNumber);

  if (!freshPR) {
    console.warn(`❌ PR #${prNumber} mergeable durumu alınamadı.`);
    return;
  }

  if (!freshPR.mergeable) {
    console.log(
      `⚠️ PR #${prNumber} merge edilemez durumda (conflict olabilir).`
    );
    return;
  }

  try {
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      commit_title: `🤖 Auto-merged: ${prTitle}`,
      merge_method: "squash",
    });

    console.log(`✅ PR #${prNumber} başarıyla merge edildi.`);
  } catch (err) {
    if (err.status === 502) {
      console.log(`🔁 PR #${prNumber} için tekrar deneniyor (502)...`);
      await sleep(3000);
      return await mergePR(pr); // retry
    }
    console.error(`❌ PR #${prNumber} merge edilirken hata:`, err.message);
  }
}

async function mergeAllOpenPRs() {
  try {
    const { data: pullRequests } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
    });

    if (pullRequests.length === 0) {
      console.log("🚫 Açık pull request yok.");
      return;
    }

    for (const pr of pullRequests) {
      await mergePR(pr);
    }
  } catch (err) {
    console.error("❌ PR listesi alınamadı:", err.message);
  }
}

mergeAllOpenPRs();
