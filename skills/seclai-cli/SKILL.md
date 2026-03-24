---
name: seclai-cli
description: >-
  Manage Seclai agents, knowledge bases, sources, memory banks, evaluations,
  solutions, governance, alerts, and more via the CLI. Use when working with
  the Seclai platform or when the user mentions Seclai CLI commands.
---

# Seclai CLI

The Seclai CLI (`seclai` / `npx @seclai/cli`) manages agents, knowledge bases, sources, memory banks, evaluations, solutions, governance, alerts, and more from the terminal.

All commands output JSON to stdout. Pipe into `jq` for filtering.

## Authentication

Set `SECLAI_API_KEY` env var or pass `--api-key <key>`.
Override the API URL with `SECLAI_API_URL` (default: https://api.seclai.com).

## Quick Reference

| Domain | Command | Description |
|--------|---------|-------------|
| Agents | `seclai agents list/create/get/update/delete` | Manage agents |
| Agent Runs | `seclai agents run <id> --json '...'` | Run an agent |
| Agent Runs | `seclai agents runs list/get/delete/cancel/search` | Manage runs |
| Agent Def | `seclai agents def get/update` | Agent step definitions |
| Sources | `seclai sources list/create/get/update/delete/upload/upload-text` | Content sources |
| Source Exports | `seclai sources exports list/create/get/cancel/delete/download/estimate` | Export management |
| Contents | `seclai contents get/delete/upload/replace-text/embeddings` | Indexed content |
| Knowledge Bases | `seclai kb list/create/get/update/delete` | Knowledge bases |
| Memory Banks | `seclai memory list/create/get/update/delete/stats/agents/compact/templates` | Memory banks |
| Evaluations | `seclai evals criteria list/create/get/update/delete/summary` | Eval criteria |
| Evaluations | `seclai evals results list/create` | Eval results |
| Solutions | `seclai solutions list/create/get/update/delete/link/unlink` | Solutions |
| Governance | `seclai governance ai generate/list/accept/decline` | Governance AI |
| Alerts | `seclai alerts list/get/status/comment/subscribe/unsubscribe` | Alerts |
| Alert Config | `seclai alerts configs list/create/get/update/delete` | Alert configs |
| Models | `seclai models alerts list/mark-read/mark-all-read/unread-count` | Model alerts |
| Search | `seclai search --query "text"` | Global search |
| AI Assistant | `seclai ai feedback/kb/source/solution/memory/accept/decline/memory-accept` | AI assistant |

## Common Patterns

### JSON input
Most create/update commands accept `--json '{"key":"value"}'` or `--json-file path.json`.
Use `--json -` or `--json-file -` to read from stdin.

### AI assistant shorthand
AI generation commands accept `--user-input <text>` as shorthand for `--json '{"user_input":"<text>"}'`.
```bash
seclai agents ai gen-steps <id> --user-input "Build a QA chatbot"
seclai ai kb --user-input "Create a support knowledge base"
```

### Compact output
Use `--compact` for single-line JSON output (useful for scripting):
```bash
seclai agents list --compact | jq -c '.[]'
```

### Pagination
List commands support `--page <n>` and `--limit <n>`. Some also support `--sort <field>` and `--order asc|desc`.

### Streaming agent runs
```bash
# Wait for completion via SSE, print final result
seclai agents run <id> --json '{"input":"Hello"}' --stream

# Stream individual SSE events as NDJSON
seclai agents run <id> --json '{"input":"Hello"}' --events

# Filter event types
seclai agents run <id> --json '{"input":"Hello"}' --events --event-filter "status,data"

# Poll-based waiting
seclai agents run <id> --json '{"input":"Hello"}' --poll --poll-interval-ms 2000
```

### File uploads
```bash
seclai sources upload <sourceId> --file ./doc.pdf --title "My Doc" --metadata '{"category":"docs"}'
seclai contents upload <contentVersionId> --file ./updated.pdf
```

## Detailed References

- [Agents](references/agents.md) — CRUD, runs, definitions, AI assistant
- [Sources](references/sources.md) — content sources, uploads, exports, migrations
- [Knowledge Bases & Memory Banks](references/kb-memory.md) — KB CRUD, memory banks, compaction
- [Evaluations & Solutions](references/evals-solutions.md) — criteria, results, solutions, links
- [Alerts, Governance & More](references/alerts-governance.md) — alerts, governance, models, search, AI
