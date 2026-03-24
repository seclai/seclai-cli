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

  // agents
  { title: "agents", args: ["agents", "--help"] },
  { title: "agents list", args: ["agents", "list", "--help"] },
  { title: "agents create", args: ["agents", "create", "--help"] },
  { title: "agents get", args: ["agents", "get", "--help"] },
  { title: "agents update", args: ["agents", "update", "--help"] },
  { title: "agents delete", args: ["agents", "delete", "--help"] },
  { title: "agents run", args: ["agents", "run", "--help"] },
  { title: "agents runs", args: ["agents", "runs", "--help"] },
  { title: "agents runs list", args: ["agents", "runs", "list", "--help"] },
  { title: "agents runs get", args: ["agents", "runs", "get", "--help"] },
  { title: "agents runs delete", args: ["agents", "runs", "delete", "--help"] },
  { title: "agents runs cancel", args: ["agents", "runs", "cancel", "--help"] },
  { title: "agents runs search", args: ["agents", "runs", "search", "--help"] },
  { title: "agents runs eval-results", args: ["agents", "runs", "eval-results", "--help"] },
  { title: "agents def", args: ["agents", "def", "--help"] },
  { title: "agents def get", args: ["agents", "def", "get", "--help"] },
  { title: "agents def update", args: ["agents", "def", "update", "--help"] },
  { title: "agents upload-input", args: ["agents", "upload-input", "--help"] },
  { title: "agents input-status", args: ["agents", "input-status", "--help"] },
  { title: "agents ai", args: ["agents", "ai", "--help"] },
  { title: "agents ai gen-steps", args: ["agents", "ai", "gen-steps", "--help"] },
  { title: "agents ai step-config", args: ["agents", "ai", "step-config", "--help"] },
  { title: "agents ai history", args: ["agents", "ai", "history", "--help"] },
  { title: "agents ai mark", args: ["agents", "ai", "mark", "--help"] },

  // sources
  { title: "sources", args: ["sources", "--help"] },
  { title: "sources list", args: ["sources", "list", "--help"] },
  { title: "sources create", args: ["sources", "create", "--help"] },
  { title: "sources get", args: ["sources", "get", "--help"] },
  { title: "sources update", args: ["sources", "update", "--help"] },
  { title: "sources delete", args: ["sources", "delete", "--help"] },
  { title: "sources upload", args: ["sources", "upload", "--help"] },
  { title: "sources upload-text", args: ["sources", "upload-text", "--help"] },
  { title: "sources exports", args: ["sources", "exports", "--help"] },
  { title: "sources exports list", args: ["sources", "exports", "list", "--help"] },
  { title: "sources exports create", args: ["sources", "exports", "create", "--help"] },
  { title: "sources exports get", args: ["sources", "exports", "get", "--help"] },
  { title: "sources exports cancel", args: ["sources", "exports", "cancel", "--help"] },
  { title: "sources exports delete", args: ["sources", "exports", "delete", "--help"] },
  { title: "sources exports download", args: ["sources", "exports", "download", "--help"] },
  { title: "sources exports estimate", args: ["sources", "exports", "estimate", "--help"] },
  { title: "sources migration", args: ["sources", "migration", "--help"] },
  { title: "sources migration get", args: ["sources", "migration", "get", "--help"] },
  { title: "sources migration start", args: ["sources", "migration", "start", "--help"] },
  { title: "sources migration cancel", args: ["sources", "migration", "cancel", "--help"] },

  // contents
  { title: "contents", args: ["contents", "--help"] },
  { title: "contents get", args: ["contents", "get", "--help"] },
  { title: "contents delete", args: ["contents", "delete", "--help"] },
  { title: "contents upload", args: ["contents", "upload", "--help"] },
  { title: "contents replace-text", args: ["contents", "replace-text", "--help"] },
  { title: "contents embeddings", args: ["contents", "embeddings", "--help"] },

  // kb
  { title: "kb", args: ["kb", "--help"] },
  { title: "kb list", args: ["kb", "list", "--help"] },
  { title: "kb create", args: ["kb", "create", "--help"] },
  { title: "kb get", args: ["kb", "get", "--help"] },
  { title: "kb update", args: ["kb", "update", "--help"] },
  { title: "kb delete", args: ["kb", "delete", "--help"] },

  // memory
  { title: "memory", args: ["memory", "--help"] },
  { title: "memory list", args: ["memory", "list", "--help"] },
  { title: "memory create", args: ["memory", "create", "--help"] },
  { title: "memory get", args: ["memory", "get", "--help"] },
  { title: "memory update", args: ["memory", "update", "--help"] },
  { title: "memory delete", args: ["memory", "delete", "--help"] },
  { title: "memory stats", args: ["memory", "stats", "--help"] },
  { title: "memory agents", args: ["memory", "agents", "--help"] },
  { title: "memory compact", args: ["memory", "compact", "--help"] },
  { title: "memory delete-source", args: ["memory", "delete-source", "--help"] },
  { title: "memory templates", args: ["memory", "templates", "--help"] },
  { title: "memory test-compaction", args: ["memory", "test-compaction", "--help"] },
  { title: "memory test-compaction-standalone", args: ["memory", "test-compaction-standalone", "--help"] },
  { title: "memory ai", args: ["memory", "ai", "--help"] },
  { title: "memory ai generate", args: ["memory", "ai", "generate", "--help"] },
  { title: "memory ai last", args: ["memory", "ai", "last", "--help"] },
  { title: "memory ai accept", args: ["memory", "ai", "accept", "--help"] },

  // evals
  { title: "evals", args: ["evals", "--help"] },
  { title: "evals criteria", args: ["evals", "criteria", "--help"] },
  { title: "evals criteria list", args: ["evals", "criteria", "list", "--help"] },
  { title: "evals criteria create", args: ["evals", "criteria", "create", "--help"] },
  { title: "evals criteria get", args: ["evals", "criteria", "get", "--help"] },
  { title: "evals criteria update", args: ["evals", "criteria", "update", "--help"] },
  { title: "evals criteria delete", args: ["evals", "criteria", "delete", "--help"] },
  { title: "evals criteria summary", args: ["evals", "criteria", "summary", "--help"] },
  { title: "evals results", args: ["evals", "results", "--help"] },
  { title: "evals results list", args: ["evals", "results", "list", "--help"] },
  { title: "evals results create", args: ["evals", "results", "create", "--help"] },
  { title: "evals compatible-runs", args: ["evals", "compatible-runs", "--help"] },
  { title: "evals test-draft", args: ["evals", "test-draft", "--help"] },
  { title: "evals agent-results", args: ["evals", "agent-results", "--help"] },
  { title: "evals agent-runs", args: ["evals", "agent-runs", "--help"] },
  { title: "evals non-manual-summary", args: ["evals", "non-manual-summary", "--help"] },

  // solutions
  { title: "solutions", args: ["solutions", "--help"] },
  { title: "solutions list", args: ["solutions", "list", "--help"] },
  { title: "solutions create", args: ["solutions", "create", "--help"] },
  { title: "solutions get", args: ["solutions", "get", "--help"] },
  { title: "solutions update", args: ["solutions", "update", "--help"] },
  { title: "solutions delete", args: ["solutions", "delete", "--help"] },
  { title: "solutions link", args: ["solutions", "link", "--help"] },
  { title: "solutions unlink", args: ["solutions", "unlink", "--help"] },
  { title: "solutions convos", args: ["solutions", "convos", "--help"] },
  { title: "solutions convos list", args: ["solutions", "convos", "list", "--help"] },
  { title: "solutions convos add", args: ["solutions", "convos", "add", "--help"] },
  { title: "solutions convos mark", args: ["solutions", "convos", "mark", "--help"] },
  { title: "solutions ai", args: ["solutions", "ai", "--help"] },
  { title: "solutions ai generate", args: ["solutions", "ai", "generate", "--help"] },
  { title: "solutions ai kb", args: ["solutions", "ai", "kb", "--help"] },
  { title: "solutions ai source", args: ["solutions", "ai", "source", "--help"] },
  { title: "solutions ai accept", args: ["solutions", "ai", "accept", "--help"] },
  { title: "solutions ai decline", args: ["solutions", "ai", "decline", "--help"] },

  // governance
  { title: "governance", args: ["governance", "--help"] },
  { title: "governance ai", args: ["governance", "ai", "--help"] },
  { title: "governance ai generate", args: ["governance", "ai", "generate", "--help"] },
  { title: "governance ai list", args: ["governance", "ai", "list", "--help"] },
  { title: "governance ai accept", args: ["governance", "ai", "accept", "--help"] },
  { title: "governance ai decline", args: ["governance", "ai", "decline", "--help"] },

  // alerts
  { title: "alerts", args: ["alerts", "--help"] },
  { title: "alerts list", args: ["alerts", "list", "--help"] },
  { title: "alerts get", args: ["alerts", "get", "--help"] },
  { title: "alerts status", args: ["alerts", "status", "--help"] },
  { title: "alerts comment", args: ["alerts", "comment", "--help"] },
  { title: "alerts subscribe", args: ["alerts", "subscribe", "--help"] },
  { title: "alerts unsubscribe", args: ["alerts", "unsubscribe", "--help"] },
  { title: "alerts configs", args: ["alerts", "configs", "--help"] },
  { title: "alerts configs list", args: ["alerts", "configs", "list", "--help"] },
  { title: "alerts configs create", args: ["alerts", "configs", "create", "--help"] },
  { title: "alerts configs get", args: ["alerts", "configs", "get", "--help"] },
  { title: "alerts configs update", args: ["alerts", "configs", "update", "--help"] },
  { title: "alerts configs delete", args: ["alerts", "configs", "delete", "--help"] },
  { title: "alerts prefs", args: ["alerts", "prefs", "--help"] },
  { title: "alerts prefs list", args: ["alerts", "prefs", "list", "--help"] },
  { title: "alerts prefs update", args: ["alerts", "prefs", "update", "--help"] },

  // models
  { title: "models", args: ["models", "--help"] },
  { title: "models alerts", args: ["models", "alerts", "--help"] },
  { title: "models alerts list", args: ["models", "alerts", "list", "--help"] },
  { title: "models alerts mark-read", args: ["models", "alerts", "mark-read", "--help"] },
  { title: "models alerts mark-all-read", args: ["models", "alerts", "mark-all-read", "--help"] },
  { title: "models alerts unread-count", args: ["models", "alerts", "unread-count", "--help"] },
  { title: "models recommendations", args: ["models", "recommendations", "--help"] },

  // search
  { title: "search", args: ["search", "--help"] },

  // ai
  { title: "ai", args: ["ai", "--help"] },
  { title: "ai feedback", args: ["ai", "feedback", "--help"] },
  { title: "ai kb", args: ["ai", "kb", "--help"] },
  { title: "ai source", args: ["ai", "source", "--help"] },
  { title: "ai solution", args: ["ai", "solution", "--help"] },
  { title: "ai memory", args: ["ai", "memory", "--help"] },
  { title: "ai memory-history", args: ["ai", "memory-history", "--help"] },
  { title: "ai accept", args: ["ai", "accept", "--help"] },
  { title: "ai decline", args: ["ai", "decline", "--help"] },
  { title: "ai memory-accept", args: ["ai", "memory-accept", "--help"] },

  // skills
  { title: "skills", args: ["skills", "--help"] },
  { title: "skills install", args: ["skills", "install", "--help"] },

  // completion
  { title: "completion", args: ["completion", "--help"] },
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
