import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...opts, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const cmdLine = [cmd, ...(args ?? [])].join(" ");
        err.stdout = stdout;
        err.stderr = stderr;
        err.message = `Failed to execute "${cmdLine}": ${err.message}`;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distCli = path.join(repoRoot, "dist", "cli.js");
const outDir = path.join(repoRoot, "build", "docs");

function readPackageVersion() {
  try {
    const raw = fs.readFileSync(path.join(repoRoot, "package.json"), "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === "string" ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

const docsVersion = process.env.VERSION ?? readPackageVersion() ?? "0.0.0";

const sections = [
  { title: "Overview", args: ["--help"] },
  { title: "sources", args: ["sources", "--help"] },
  { title: "sources list", args: ["sources", "list", "--help"] },
  { title: "sources upload", args: ["sources", "upload", "--help"] },
  { title: "agents", args: ["agents", "--help"] },
  { title: "agents run", args: ["agents", "run", "--help"] },
  { title: "agents runs", args: ["agents", "runs", "--help"] },
  { title: "agents runs list", args: ["agents", "runs", "list", "--help"] },
  { title: "agents runs get", args: ["agents", "runs", "get", "--help"] },
  { title: "agents runs delete", args: ["agents", "runs", "delete", "--help"] },
  { title: "contents", args: ["contents", "--help"] },
  { title: "contents get", args: ["contents", "get", "--help"] },
  { title: "contents delete", args: ["contents", "delete", "--help"] },
  { title: "contents embeddings", args: ["contents", "embeddings", "--help"] },
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const rendered = [];
for (const s of sections) {
  const { stdout } = await execFileAsync(process.execPath, [distCli, ...s.args], {
    env: { ...process.env },
  });
  rendered.push({ title: s.title, output: stdout });
}

const body = rendered
  .map(
    (s) =>
      `\n<section>\n<h2>${escapeHtml(s.title)}</h2>\n<pre><code>${escapeHtml(
        s.output
      )}</code></pre>\n</section>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Seclai CLI Docs (v${escapeHtml(docsVersion)})</title>
  <style>
    :root { color-scheme: light dark; }
    body { max-width: 960px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    h1 { margin: 0 0 12px; }
    h2 { margin: 28px 0 10px; }
    pre { padding: 12px; overflow: auto; border: 1px solid rgba(127,127,127,0.35); border-radius: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .meta { opacity: 0.8; margin: 0 0 18px; }
  </style>
</head>
<body>
  <h1>Seclai CLI</h1>
  <p class="meta">Version: <code>${escapeHtml(docsVersion)}</code></p>
  <p class="meta">Generated command reference (from <code>--help</code> output).</p>
  ${body}
</body>
</html>
`;

await writeFile(path.join(outDir, "index.html"), html, "utf8");
