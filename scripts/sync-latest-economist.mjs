import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const publication = args.publication ?? "economist";
const githubRepo = args.github_repo ?? "hehonghui/awesome-english-ebooks";
const economistRoot = args.source_path ?? "01_economist";
const rawRoot = args.raw_root ?? path.join("data", "raw", publication);
const textsRoot = args.texts_root ?? path.join("texts", publication);
const sourceRemote = args.remote ?? "duoread";
const sourceBranch = args.source_branch ?? "source";
const pagesBranch = args.pages_branch ?? "main";
const provider = args.provider ?? process.env.TRANSLATION_PROVIDER ?? "codex";
const model =
  args.model ??
  process.env.CODEX_TRANSLATION_MODEL ??
  process.env.OPENAI_TRANSLATION_MODEL ??
  "gpt-5.3-codex-spark";
const chunkSize = args.chunk_size ?? process.env.TRANSLATION_CHUNK_SIZE ?? "4";
const retries = args.retries ?? "3";
const publish = args.publish === "true" || args.publish === "1";
const dryRun = args.dry_run === "true" || args.dry_run === "1";

const latest = await findLatestIssue();
const issueRoot = path.join(textsRoot, latest.issue);
const issuePath = path.join(issueRoot, "issue.json");

console.log(
  `[${localTimestamp()}] Latest ${publication} issue from source: ${latest.issue} (${latest.epubName})`,
);

if (dryRun) {
  console.log(`[${localTimestamp()}] Dry run only; no files changed.`);
  process.exit(0);
}

const existing = await readIssueIfExists(issuePath);
if (existing && isIssueComplete(existing)) {
  console.log(
    `[${localTimestamp()}] ${latest.issue} already translated: ${existing.translated_count}/${existing.article_count}.`,
  );
  process.exit(0);
}

if (!existing) {
  const rawDir = path.join(rawRoot, latest.issue);
  const rawPath = path.join(rawDir, latest.epubName);
  await mkdir(rawDir, { recursive: true });
  await downloadFile(latest.downloadUrl, rawPath);
  run("node", [
    "scripts/extract-epub.mjs",
    "--epub",
    rawPath,
    "--issue",
    latest.issue,
    "--publication",
    publication,
    "--published_at",
    latest.issue,
  ]);
} else {
  console.log(
    `[${localTimestamp()}] ${latest.issue} exists but is incomplete; continuing translation.`,
  );
}

run("node", [
  "scripts/translate-issue.mjs",
  "--root",
  issueRoot,
  "--provider",
  provider,
  "--model",
  model,
  "--chunk_size",
  String(chunkSize),
  "--retries",
  String(retries),
]);
run("npm", ["run", "validate:texts"]);
run("npm", ["run", "export:pages"]);

const completed = await readIssueIfExists(issuePath);
if (!completed || !isIssueComplete(completed)) {
  throw new Error(`${latest.issue} did not finish translation after pipeline run.`);
}

if (!hasGitChanges()) {
  console.log(`[${localTimestamp()}] No source changes to commit.`);
} else {
  run("git", ["add", "texts"]);
  run("git", ["commit", "-m", `data: add ${publication} ${latest.issue} translation`]);
  run("git", ["push", sourceRemote, `HEAD:${sourceBranch}`]);
}

if (publish) {
  await publishStaticSite(latest.issue);
}

console.log(`[${localTimestamp()}] ${publication} ${latest.issue} sync complete.`);

async function findLatestIssue() {
  const contents = await githubJson(
    `https://api.github.com/repos/${githubRepo}/contents/${economistRoot}`,
  );
  const latestDir = contents
    .filter((item) => item.type === "dir" && /^te_\d{4}\.\d{2}\.\d{2}$/.test(item.name))
    .sort((a, b) => b.name.localeCompare(a.name))[0];

  if (!latestDir) throw new Error(`No Economist issue folders found under ${economistRoot}`);

  const files = await githubJson(latestDir.url);
  const epub = files
    .filter((item) => item.type === "file" && /\.epub$/i.test(item.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  if (!epub?.download_url) {
    throw new Error(`No EPUB file found under ${latestDir.path}`);
  }

  return {
    issue: latestDir.name.replace(/^te_/, "").replaceAll(".", "-"),
    epubName: epub.name,
    downloadUrl: epub.download_url,
  };
}

async function githubJson(url) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "parallel-reader-sync",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status} ${response.statusText} ${url}`);
  }
  return response.json();
}

async function downloadFile(url, filePath) {
  console.log(`[${localTimestamp()}] Downloading ${url}`);
  const response = await fetch(url, {
    headers: { "user-agent": "parallel-reader-sync" },
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText} ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);
  console.log(`[${localTimestamp()}] Wrote ${filePath} (${bytes.length} bytes).`);
}

async function readIssueIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function isIssueComplete(issue) {
  return (
    issue.article_count > 0 &&
    issue.translated_count === issue.article_count &&
    issue.articles.every((article) => article.translation_status === "translated")
  );
}

function run(command, commandArgs, options = {}) {
  console.log(`[${localTimestamp()}] $ ${[command, ...commandArgs].join(" ")}`);
  execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      TRANSLATION_PROVIDER: provider,
      CODEX_TRANSLATION_MODEL: provider === "codex" ? model : process.env.CODEX_TRANSLATION_MODEL,
      OPENAI_TRANSLATION_MODEL: provider === "openai" ? model : process.env.OPENAI_TRANSLATION_MODEL,
      TRANSLATION_CHUNK_SIZE: String(chunkSize),
    },
    ...options,
  });
}

function hasGitChanges(cwd = process.cwd()) {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf8",
  }).trim().length > 0;
}

async function publishStaticSite(issue) {
  const worktree = path.join(
    process.env.RUN_ROOT ?? "/tmp",
    `duoread-pages-${process.pid}-${Date.now()}`,
  );

  try {
    run("git", ["fetch", sourceRemote, pagesBranch]);
    run("git", ["worktree", "add", "--detach", worktree, `${sourceRemote}/${pagesBranch}`]);
    await emptyDirectoryExceptGit(worktree);
    await copyDirectoryContents(path.join("dist", "client"), worktree);

    if (!hasGitChanges(worktree)) {
      console.log(`[${localTimestamp()}] No pages changes to publish.`);
      return;
    }

    run("git", ["add", "-A"], { cwd: worktree });
    run("git", ["commit", "-m", `deploy: publish ${publication} ${issue}`], { cwd: worktree });
    run("git", ["push", sourceRemote, `HEAD:${pagesBranch}`], { cwd: worktree });
  } finally {
    await rm(worktree, { recursive: true, force: true });
    try {
      run("git", ["worktree", "prune"]);
    } catch {
      // A failed prune should not hide the publish result.
    }
  }
}

async function emptyDirectoryExceptGit(directory) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.name !== ".git")
      .map((entry) => rm(path.join(directory, entry.name), { recursive: true, force: true })),
  );
}

async function copyDirectoryContents(source, destination) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) =>
      cp(path.join(source, entry.name), path.join(destination, entry.name), {
        recursive: true,
        force: true,
        errorOnExist: false,
      }),
    ),
  );
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2).replaceAll("-", "_");
    const value = argv[i + 1]?.startsWith("--") ? "true" : argv[i + 1];
    parsed[key] = value ?? "true";
    if (value && value !== "true") i += 1;
  }
  return parsed;
}

function localTimestamp() {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absolute / 60)).padStart(2, "0");
  const mm = String(absolute % 60).padStart(2, "0");
  const yyyy = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${month}-${day}T${hour}:${minute}:${second}${sign}${hh}:${mm}`;
}
