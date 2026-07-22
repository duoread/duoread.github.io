import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const clientDir = path.join(root, "dist", "client");
const workerPath = path.join(root, "dist", "server", "index.js");

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("export", `${process.pid}-${Date.now()}`);

const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request("https://duoread.github.io/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static export failed: ${response.status} ${response.statusText}`);
}

await mkdir(clientDir, { recursive: true });
await writeFile(path.join(clientDir, "index.html"), await response.text(), "utf8");
await writeFile(path.join(clientDir, ".nojekyll"), "", "utf8");

console.log(`Wrote ${path.relative(root, path.join(clientDir, "index.html"))}`);
