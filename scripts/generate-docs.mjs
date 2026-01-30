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

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
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
  rendered.push({ id: slugify(s.title), title: s.title, output: stdout });
}

const toc = rendered
  .map(
    (s) =>
      `<a class="toc-item" href="#${escapeHtml(s.id)}"><span class="toc-title">${escapeHtml(
        s.title
      )}</span></a>`
  )
  .join("\n");

const body = rendered
  .map(
    (s) =>
      `\n<section class="section" id="${escapeHtml(s.id)}">\n<h2 class="section-title"><a class="anchor" href="#${escapeHtml(
        s.id
      )}">${escapeHtml(s.title)}</a></h2>\n<pre class="code"><code>${escapeHtml(
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
    :root {
      color-scheme: light dark;
      --border: rgba(127,127,127,0.35);
      --muted: rgba(127,127,127,0.85);
      --bg: color-mix(in srgb, Canvas 92%, transparent);
      --card: color-mix(in srgb, Canvas 98%, transparent);
      --link: LinkText;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.45;
    }
    .wrap {
      max-width: 1160px;
      margin: 0 auto;
      padding: 24px;
    }
    header {
      padding: 16px 0 18px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 18px;
    }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .meta { margin: 0; color: var(--muted); }
    .layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 18px;
      align-items: start;
    }
    nav {
      position: sticky;
      top: 18px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--card);
      padding: 12px;
      max-height: calc(100vh - 48px);
      overflow: auto;
    }
    .toc-title-h {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin: 0 0 10px;
    }
    .toc-item {
      display: block;
      padding: 6px 8px;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
    }
    .toc-item:hover { background: var(--bg); }
    .toc-title { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; }
    main { min-width: 0; }
    .section {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      background: var(--card);
      margin: 0 0 14px;
    }
    .section-title {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 650;
    }
    .anchor { color: inherit; text-decoration: none; }
    .anchor:hover { color: var(--link); text-decoration: underline; }
    .code {
      margin: 0;
      padding: 12px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12.5px;
    }
    @media (max-width: 920px) {
      .layout { grid-template-columns: 1fr; }
      nav { position: relative; top: 0; max-height: none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Seclai CLI</h1>
      <p class="meta">Version: <code>${escapeHtml(docsVersion)}</code> · Generated command reference from <code>--help</code> output</p>
    </header>
    <div class="layout">
      <nav aria-label="Table of contents">
        <p class="toc-title-h">Contents</p>
        ${toc}
      </nav>
      <main>
        ${body}
      </main>
    </div>
  </div>
</body>
</html>
`;

await writeFile(path.join(outDir, "index.html"), html, "utf8");
