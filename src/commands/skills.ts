import { Command } from "commander";
import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CliRuntime } from "../helpers.js";
import { run, printJson } from "../helpers.js";

// --- Skill content ---

const SKILL_MD = `---
name: seclai-cli
description: >-
  Manage Seclai agents, knowledge bases, sources, memory banks, evaluations,
  solutions, governance, alerts, and more via the CLI. Use when working with
  the Seclai platform or when the user mentions Seclai CLI commands.
---

# Seclai CLI

The Seclai CLI (\`seclai\` / \`npx @seclai/cli\`) manages agents, knowledge bases, sources, memory banks, evaluations, solutions, governance, alerts, and more from the terminal.

All commands output JSON to stdout. Pipe into \`jq\` for filtering.

## Authentication

Set \`SECLAI_API_KEY\` env var or pass \`--api-key <key>\`.
Override the API URL with \`SECLAI_API_URL\` (default: https://api.seclai.com).

## Quick Reference

| Domain | Command | Description |
|--------|---------|-------------|
| Agents | \`seclai agents list/create/get/update/delete\` | Manage agents |
| Agent Runs | \`seclai agents run <id> --json '...'\` | Run an agent |
| Agent Runs | \`seclai agents runs list/get/delete/cancel/search\` | Manage runs |
| Agent Def | \`seclai agents def get/update\` | Agent step definitions |
| Sources | \`seclai sources list/create/get/update/delete/upload/upload-text\` | Content sources |
| Source Exports | \`seclai sources exports list/create/get/cancel/delete/download/estimate\` | Export management |
| Contents | \`seclai contents get/delete/upload/replace-text/embeddings\` | Indexed content |
| Knowledge Bases | \`seclai kb list/create/get/update/delete\` | Knowledge bases |
| Memory Banks | \`seclai memory list/create/get/update/delete/stats/agents/compact/templates\` | Memory banks |
| Evaluations | \`seclai evals criteria list/create/get/update/delete/summary\` | Eval criteria |
| Evaluations | \`seclai evals results list/create\` | Eval results |
| Solutions | \`seclai solutions list/create/get/update/delete/link/unlink\` | Solutions |
| Governance | \`seclai governance ai generate/list/accept/decline\` | Governance AI |
| Alerts | \`seclai alerts list/get/status/comment/subscribe/unsubscribe\` | Alerts |
| Alert Config | \`seclai alerts configs list/create/get/update/delete\` | Alert configs |
| Models | \`seclai models alerts list/mark-read/mark-all-read/unread-count\` | Model alerts |
| Search | \`seclai search --query "text"\` | Global search |
| AI Assistant | \`seclai ai feedback/kb/source/solution/memory/accept/decline/memory-accept\` | AI assistant |

## Common Patterns

### JSON input
Most create/update commands accept \`--json '{"key":"value"}'\` or \`--json-file path.json\`.
Use \`--json -\` or \`--json-file -\` to read from stdin.

### AI assistant shorthand
AI generation commands accept \`--user-input <text>\` as shorthand for \`--json '{"user_input":"<text>"}'\`.
\`\`\`bash
seclai agents ai gen-steps <id> --user-input "Build a QA chatbot"
seclai ai kb --user-input "Create a support knowledge base"
\`\`\`

### Compact output
Use \`--compact\` for single-line JSON output (useful for scripting):
\`\`\`bash
seclai agents list --compact | jq -c '.[]'
\`\`\`

### Pagination
List commands support \`--page <n>\` and \`--limit <n>\`. Some also support \`--sort <field>\` and \`--order asc|desc\`.

### Streaming agent runs
\`\`\`bash
# Wait for completion via SSE, print final result
seclai agents run <id> --json '{"input":"Hello"}' --stream

# Stream individual SSE events as NDJSON
seclai agents run <id> --json '{"input":"Hello"}' --events

# Filter event types
seclai agents run <id> --json '{"input":"Hello"}' --events --event-filter "status,data"

# Poll-based waiting
seclai agents run <id> --json '{"input":"Hello"}' --poll --poll-interval-ms 2000
\`\`\`

### File uploads
\`\`\`bash
seclai sources upload <sourceId> --file ./doc.pdf --title "My Doc" --metadata '{"category":"docs"}'
seclai contents upload <contentVersionId> --file ./updated.pdf
\`\`\`

## Detailed References

- [Agents](references/agents.md) — CRUD, runs, definitions, AI assistant
- [Sources](references/sources.md) — content sources, uploads, exports, migrations
- [Knowledge Bases & Memory Banks](references/kb-memory.md) — KB CRUD, memory banks, compaction
- [Evaluations & Solutions](references/evals-solutions.md) — criteria, results, solutions, links
- [Alerts, Governance & More](references/alerts-governance.md) — alerts, governance, models, search, AI
`;

const AGENTS_SKILL = `# Seclai CLI — Agents

## CRUD
\`\`\`bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent",...}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Updated"}'
seclai agents delete <agentId>
\`\`\`

## Running Agents
\`\`\`bash
# Simple run
seclai agents run <agentId> --json '{"input":"Hello"}'

# Stream (wait for final result via SSE)
seclai agents run <agentId> --json '{"input":"Hello"}' --stream [--timeout-ms 60000]

# Stream individual events as NDJSON
seclai agents run <agentId> --json '{"input":"Hello"}' --events [--event-filter "status,data"] [--output full|data|status]

# Poll-based
seclai agents run <agentId> --json '{"input":"Hello"}' --poll [--poll-interval-ms 2000] [--include-step-outputs]
\`\`\`

## Runs Management
\`\`\`bash
seclai agents runs list <agentId> [--page N] [--limit N] [--status <status>]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs delete <runId>
seclai agents runs cancel <runId>
seclai agents runs search --json '{"query":"..."}'
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
\`\`\`

## Agent Definition
\`\`\`bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[...]}'
\`\`\`

## Input Uploads
\`\`\`bash
seclai agents upload-input <agentId> --file ./input.pdf [--file-name name] [--mime-type type]
seclai agents input-status <agentId> <uploadId>
\`\`\`

## AI Assistant
\`\`\`bash
seclai agents ai gen-steps <agentId> --user-input "Build a chat agent"
seclai agents ai step-config <agentId> --json '{"step_type":"...",}'
seclai agents ai history <agentId>
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
\`\`\`
`;

const SOURCES_SKILL = `# Seclai CLI — Sources

## CRUD
\`\`\`bash
seclai sources list [--page N] [--limit N] [--sort field] [--order asc|desc] [--account-id id]
seclai sources create --json '{"name":"My Source",...}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Updated"}'
seclai sources delete <sourceId>
\`\`\`

## File Upload
\`\`\`bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "Title"] [--metadata '{"k":"v"}'] [--file-name name] [--mime-type type]
seclai sources upload-text <sourceId> --json '{"text":"...","title":"..."}'
\`\`\`

## Exports
\`\`\`bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId> --json '{"format":"..."}'
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId> --json '{"format":"..."}'
\`\`\`

## Embedding Migration
\`\`\`bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId> --json '{"target_model":"..."}'
seclai sources migration cancel <sourceId>
\`\`\`
`;

const KB_MEMORY_SKILL = `# Seclai CLI — Knowledge Bases & Memory Banks

## Knowledge Bases
\`\`\`bash
seclai kb list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai kb create --json '{"name":"My KB",...}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Updated"}'
seclai kb delete <kbId>
\`\`\`

## Memory Banks
\`\`\`bash
seclai memory list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai memory create --json '{"name":"My Bank","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Updated"}'
seclai memory delete <memoryBankId>
\`\`\`

## Memory Bank Utilities
\`\`\`bash
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> --json '{"prompt":"..."}'
seclai memory test-compaction-standalone --json '{"prompt":"..."}'
\`\`\`

## Memory Bank AI
\`\`\`bash
seclai memory ai generate --user-input "Configure compaction for chat memory"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
\`\`\`
`;

const EVALS_SOLUTIONS_SKILL = `# Seclai CLI — Evaluations & Solutions

## Evaluation Criteria
\`\`\`bash
seclai evals criteria list <agentId> [--page N] [--limit N]
seclai evals criteria create <agentId> --json '{"name":"Quality",...}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
\`\`\`

## Evaluation Results
\`\`\`bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals results create <criteriaId> --json '{"run_id":"...","score":0.9}'
\`\`\`

## Other Evaluation Commands
\`\`\`bash
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals test-draft <agentId> --json '{"criteria":{...},"run_id":"..."}'
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
seclai evals non-manual-summary <agentId>
\`\`\`

## Solutions
\`\`\`bash
seclai solutions list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai solutions create --json '{"name":"My Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Updated"}'
seclai solutions delete <solutionId>
\`\`\`

## Solution Links
\`\`\`bash
seclai solutions link <solutionId> --agents '["id1","id2"]' --kb '["id3"]' --sources '["id4"]'
seclai solutions unlink <solutionId> --agents '["id1"]'
\`\`\`

## Solution Conversations
\`\`\`bash
seclai solutions convos list <solutionId>
seclai solutions convos add <solutionId> --json '{"message":"..."}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'
\`\`\`

## Solution AI
\`\`\`bash
seclai solutions ai generate <solutionId> --user-input "Add an FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base"
seclai solutions ai source <solutionId> --user-input "Create a file source"
seclai solutions ai accept <solutionId> <conversationId> --json '{"accepted":true}'
seclai solutions ai decline <solutionId> <conversationId>
\`\`\`
`;

const ALERTS_GOVERNANCE_SKILL = `# Seclai CLI — Alerts, Governance, Models & Search

## Alerts
\`\`\`bash
seclai alerts list [--page N] [--limit N] [--status <s>] [--severity <s>]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Fixed"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
\`\`\`

## Alert Configurations
\`\`\`bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"My Config",...}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"name":"Updated"}'
seclai alerts configs delete <configId>
\`\`\`

## Alert Preferences
\`\`\`bash
seclai alerts prefs list
seclai alerts prefs update <orgId> <alertType> --json '{"enabled":true}'
\`\`\`

## Governance AI
\`\`\`bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
\`\`\`

## Model Alerts
\`\`\`bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
seclai models recommendations <modelId>
\`\`\`

## Search
\`\`\`bash
seclai search --query "deployment guide" [--limit N] [--entity-type <type>]
\`\`\`

## AI Assistant
\`\`\`bash
seclai ai feedback --json '{"feedback":"..."}'
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"
seclai ai memory-history
seclai ai accept <conversationId> --json '{"accepted":true}'
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> --json '{"accepted":true}'
\`\`\`
`;

// --- Tool detection & path mapping ---

type ToolConfig = {
  dir: string;
  files: Array<{ name: string; content: string }>;
};

function getToolConfig(tool: string, destDir: string): ToolConfig {
  const skillFiles = [
    { name: "SKILL.md", content: SKILL_MD },
    { name: "references/agents.md", content: AGENTS_SKILL },
    { name: "references/sources.md", content: SOURCES_SKILL },
    { name: "references/kb-memory.md", content: KB_MEMORY_SKILL },
    { name: "references/evals-solutions.md", content: EVALS_SOLUTIONS_SKILL },
    { name: "references/alerts-governance.md", content: ALERTS_GOVERNANCE_SKILL },
  ];

  switch (tool) {
    case "copilot":
      return { dir: join(destDir, ".github", "copilot", "seclai-cli"), files: skillFiles };
    case "claude":
      return { dir: join(destDir, ".claude", "skills", "seclai-cli"), files: skillFiles };
    case "cursor":
      return { dir: join(destDir, ".cursor", "skills", "seclai-cli"), files: skillFiles };
    case "windsurf":
      return { dir: join(destDir, ".windsurf", "skills", "seclai-cli"), files: skillFiles };
    case "codex":
      return { dir: join(destDir, ".codex", "skills", "seclai-cli"), files: skillFiles };
    case "kiro":
      return { dir: join(destDir, ".kiro", "steering", "seclai-cli"), files: skillFiles };
    case "cline":
      return { dir: join(destDir, ".clinerules", "seclai-cli"), files: skillFiles };
    case "roo":
      return { dir: join(destDir, ".roo", "rules", "seclai-cli"), files: skillFiles };
    case "gemini":
      return { dir: join(destDir, ".gemini", "seclai-cli"), files: skillFiles };
    case "antigravity":
      return { dir: join(destDir, ".antigravity", "seclai-cli"), files: skillFiles };
    default:
      throw new Error(`Unknown tool: ${tool}. Use copilot, claude, cursor, windsurf, codex, kiro, cline, roo, gemini, or antigravity.`);
  }
}

function detectTools(destDir: string): string[] {
  const detected: string[] = [];

  if (existsSync(join(destDir, ".github", "copilot"))) detected.push("copilot");
  if (existsSync(join(destDir, ".claude")) || existsSync(join(destDir, "CLAUDE.md")))
    detected.push("claude");
  if (existsSync(join(destDir, ".cursor"))) detected.push("cursor");
  if (existsSync(join(destDir, ".windsurf"))) detected.push("windsurf");
  if (existsSync(join(destDir, ".codex"))) detected.push("codex");
  if (existsSync(join(destDir, ".kiro"))) detected.push("kiro");
  if (existsSync(join(destDir, ".clinerules")) && statSync(join(destDir, ".clinerules")).isDirectory()) detected.push("cline");
  if (existsSync(join(destDir, ".roo"))) detected.push("roo");
  if (existsSync(join(destDir, ".gemini")) || existsSync(join(destDir, "GEMINI.md")))
    detected.push("gemini");
  if (existsSync(join(destDir, ".antigravity"))) detected.push("antigravity");

  return detected;
}

/** Register the `skills` command for installing Seclai skill files into AI coding tool directories. */
export function register(program: Command, rt: CliRuntime): void {
  const skills = program.command("skills").description("Install Seclai CLI skill files for AI coding tools.");

  skills
    .command("install")
    .description(
      "Write Seclai CLI skill/instruction files into the current workspace.\n\n" +
        "Detected tools: copilot, claude, cursor, windsurf, codex, kiro, cline, roo, gemini, antigravity.\n" +
        "Use --tool to target a specific tool, or 'all' for all supported tools."
    )
    .option("--tool <name>", "Target tool (copilot|claude|cursor|windsurf|codex|kiro|cline|roo|gemini|antigravity|all). Auto-detects if omitted.")
    .option("--dir <path>", "Target directory (default: current directory).", ".")
    .action(async (opts) => {
      await run(rt, async () => {
        const destDir = opts.dir;
        let tools: string[];

        if (opts.tool === "all") {
          tools = ["copilot", "claude", "cursor", "windsurf", "codex", "kiro", "cline", "roo", "gemini", "antigravity"];
        } else if (opts.tool) {
          tools = [opts.tool];
        } else {
          tools = detectTools(destDir);
          if (tools.length === 0) {
            tools = ["copilot"]; // default fallback
            rt.writeErr("No AI tool detected, defaulting to copilot.\n");
          }
        }

        let totalFiles = 0;
        for (const tool of tools) {
          const config = getToolConfig(tool, destDir);
          for (const file of config.files) {
            const filePath = join(config.dir, file.name);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, file.content, "utf8");
            totalFiles++;
          }
          rt.writeErr(`Installed ${config.files.length} skill files for ${tool} → ${config.dir}\n`);
        }

        printJson(rt, { ok: true, tools, filesWritten: totalFiles });
      });
    });
}
