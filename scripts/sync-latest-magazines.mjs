import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { localTimestamp } from "./site-index.mjs";

const args = parseArgs(process.argv.slice(2));
const githubRepo = args.github_repo ?? "hehonghui/awesome-english-ebooks";
const rawBaseRoot = args.raw_root ?? path.join("data", "raw");
const textsBaseRoot = args.texts_root ?? "texts";
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
const requestedPublications = (args.publications ?? args.publication ?? "all")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const publicationConfigs = [
  {
    id: "economist",
    sourcePath: "01_economist",
    issuePattern: /^te_\d{4}\.\d{2}\.\d{2}$/,
  },
  {
    id: "new_yorker",
    sourcePath: "02_new_yorker",
    issuePattern: /^\d{4}\.\d{2}\.\d{2}$/,
  },
  {
    id: "atlantic",
    sourcePath: "04_atlantic",
    issuePattern: /^\d{4}\.\d{2}\.\d{2}$/,
  },
  {
    id: "wired",
    sourcePath: "05_wired",
    issuePattern: /^\d{4}\.\d{2}\.\d{2}$/,
  },
];

const selectedPublications = requestedPublications.includes("all")
  ? publicationConfigs
  : publicationConfigs.filter((config) => requestedPublications.includes(config.id));

if (selectedPublications.length === 0) {
  throw new Error(`No known publications matched: ${requestedPublications.join(", ")}`);
}

let changed = false;
const completedIssues = [];

for (const publication of selectedPublications) {
  const latest = await findLatestIssue(publication);
  const issueRoot = path.join(textsBaseRoot, publication.id, latest.issue);
  const issuePath = path.join(issueRoot, "issue.json");

  console.log(
    `[${localTimestamp()}] Latest ${publication.id} issue from source: ${latest.issue} (${latest.epubName})`,
  );

  if (dryRun) continue;

  const existing = await readIssueIfExists(issuePath);
  if (existing && isIssueComplete(existing)) {
    console.log(
      `[${localTimestamp()}] ${publication.id} ${latest.issue} already translated: ${existing.translated_count}/${existing.article_count}.`,
    );
    continue;
  }

  if (!existing) {
    const rawDir = path.join(rawBaseRoot, publication.id, latest.issue);
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
      publication.id,
      "--published_at",
      latest.issue,
    ]);
  } else {
    console.log(
      `[${localTimestamp()}] ${publication.id} ${latest.issue} exists but is incomplete; continuing translation.`,
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

  const completed = await readIssueIfExists(issuePath);
  if (!completed || !isIssueComplete(completed)) {
    throw new Error(`${publication.id} ${latest.issue} did not finish translation after pipeline run.`);
  }

  changed = true;
  completedIssues.push(`${publication.id} ${latest.issue}`);
}

if (dryRun) {
  console.log(`[${localTimestamp()}] Dry run only; no files changed.`);
  process.exit(0);
}

run("npm", ["run", "validate:texts"]);
run("npm", ["run", "audit:translations"]);
run("npm", ["run", "export:pages"]);

if (!changed || !hasGitChanges()) {
  console.log(`[${localTimestamp()}] No source changes to commit.`);
} else {
  run("git", ["add", "texts"]);
  run("git", [
    "commit",
    "-m",
    `data: add magazine translations ${completedIssues.join(", ")}`,
  ]);
  run("git", ["push", sourceRemote, `HEAD:${sourceBranch}`]);
}

if (publish) {
  await publishStaticSite(completedIssues.at(-1) ?? "no content changes");
}

console.log(`[${localTimestamp()}] Magazine sync complete.`);

async function findLatestIssue(publication) {
  const contents = await githubJson(
    `https://api.github.com/repos/${githubRepo}/contents/${publication.sourcePath}`,
  );
  const issueDirs = contents
    .filter((item) => item.type === "dir" && publication.issuePattern.test(item.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (issueDirs.length === 0) {
    throw new Error(`No issue folders found under ${publication.sourcePath}`);
  }

  for (const issueDir of issueDirs) {
    const files = await githubJson(issueDir.url);
    const epub =
      files
        .filter((item) => item.type === "file" && /\.epub$/i.test(item.name))
        .sort((a, b) => a.name.localeCompare(b.name))[0] ??
      (await findEpubFromReadme(files));

    if (!epub?.download_url) continue;
    if (!(await isDownloadable(epub.download_url))) {
      console.warn(
        `[${localTimestamp()}] Skipping ${publication.id} ${issueDir.name}: EPUB URL is not downloadable.`,
      );
      continue;
    }

    return {
      issue: issueDir.name.replace(/^te_/, "").replaceAll(".", "-"),
      epubName: epub.name,
      downloadUrl: epub.download_url,
    };
  }

  throw new Error(`No downloadable EPUB found under ${publication.sourcePath}`);
}

async function findEpubFromReadme(files) {
  const readme = files.find((item) => item.type === "file" && /^readme\.md$/i.test(item.name));
  if (!readme?.download_url) return null;
  const response = await fetch(readme.download_url, {
    headers: { "user-agent": "parallel-reader-sync" },
  });
  if (!response.ok) return null;
  const markdown = await response.text();
  const match = markdown.match(/\((https:\/\/raw\.githubusercontent\.com\/[^)]+\.epub)\)/i);
  if (!match) return null;
  const url = match[1].replace("/./", "/");
  return {
    name: decodeURIComponent(url.split("/").at(-1)),
    download_url: url,
  };
}

async function isDownloadable(url) {
  const response = await fetch(url, {
    method: "HEAD",
    headers: { "user-agent": "parallel-reader-sync" },
  });
  return response.ok;
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
    cwd: options.cwd ?? process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      TRANSLATION_PROVIDER: provider,
      CODEX_TRANSLATION_MODEL: provider === "codex" ? model : process.env.CODEX_TRANSLATION_MODEL,
      OPENAI_TRANSLATION_MODEL: provider === "openai" ? model : process.env.OPENAI_TRANSLATION_MODEL,
      TRANSLATION_CHUNK_SIZE: String(chunkSize),
    },
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
    run("git", ["commit", "-m", `deploy: publish magazine reader ${issue}`], {
      cwd: worktree,
    });
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
