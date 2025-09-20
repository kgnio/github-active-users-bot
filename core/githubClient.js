// 📁 core/githubClient.js
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GITHUB_TOKEN) {
  throw new Error("🚨 GITHUB_TOKEN missing");
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getUser(username) {
  return (await octokit.users.getByUsername({ username })).data;
}

export async function getRepos(username) {
  return (await octokit.repos.listForUser({ username, per_page: 100 })).data;
}

export async function followUser(username) {
  return await octokit.request("PUT /user/following/{username}", { username });
}

export async function unfollowUser(username) {
  return await octokit.request("DELETE /user/following/{username}", {
    username,
  });
}

export async function getFollowers() {
  return await octokit.paginate("GET /user/followers", { per_page: 100 });
}

export async function getFollowing() {
  return await octokit.paginate("GET /user/following", { per_page: 100 });
}

export async function starRepo(owner, repo) {
  return await octokit.activity.starRepoForAuthenticatedUser({ owner, repo });
}

export async function unstarRepo(owner, repo) {
  return await octokit.activity.unstarRepoForAuthenticatedUser({ owner, repo });
}

export async function getFollowersOfUser(username) {
  return await octokit.paginate("GET /users/{username}/followers", {
    username,
    per_page: 100,
  });
}

export async function getContributors(owner, repo) {
  return await octokit.repos.listContributors({ owner, repo, per_page: 100 });
}

export default octokit;
