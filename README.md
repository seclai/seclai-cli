# Seclai CLI

Full-featured command-line interface for the [Seclai](https://seclai.com) platform.
Manage agents, knowledge bases, sources, memory banks, evaluations, solutions, governance, and more — all from the terminal.

All commands return JSON to stdout, so you can pipe into `jq` or other tools.

## Install

```bash
npm i -g @seclai/cli
```

Or run directly via npx (no install needed):

```bash
npx @seclai/cli agents list
```

## Documentation

Command reference (latest): https://seclai.github.io/seclai-cli/latest/

## Authentication

Set the `SECLAI_API_KEY` environment variable, or pass `--api-key` per-command:

```bash
export SECLAI_API_KEY="sk-..."

# or inline
seclai --api-key "$SECLAI_API_KEY" agents list
```

## Environment Variables

| Variable | Description |
|---|---|
| `SECLAI_API_KEY` | Default API key (alternative to `--api-key`) |
| `SECLAI_API_URL` | Override API base URL (default: `https://api.seclai.com`) |

## Global Options

| Flag | Description |
|---|---|
| `--api-key <key>` | Seclai API key |
| `--compact` | Output compact (single-line) JSON |
| `-V, --version` | Print version |

---

## Commands

### Agents

```bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent"}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Renamed"}'
seclai agents delete <agentId>
```

#### Running Agents

Four modes: basic, streaming (SSE wait), events (NDJSON), and polling.

```bash
# Basic run (returns final result)
seclai agents run <agentId> --json '{"input":"Hello"}'
seclai agents run <agentId> --json-file ./run.json
cat run.json | seclai agents run <agentId> --json-file -

# SSE streaming (waits for done event or timeout)
seclai agents run <agentId> --json '{"input":"Hi"}' --stream --timeout-ms 60000

# NDJSON event stream (outputs every SSE event as a JSON line)
seclai agents run <agentId> --json '{"input":"Hi"}' --events
seclai agents run <agentId> --json '{"input":"Hi"}' --events --event-filter status
seclai agents run <agentId> --json '{"input":"Hi"}' --events --output data

# Polling (submit then poll until complete)
seclai agents run <agentId> --json '{"input":"Hi"}' --poll --poll-interval-ms 2000
```

#### Agent Runs

```bash
seclai agents runs list <agentId> [--page N] [--limit N]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs delete <runId>
seclai agents runs cancel <runId>
seclai agents runs search [--page N] [--limit N] [--json '...']
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
```

#### Agent Definition

```bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[...]}'
```

#### Agent Input Upload

```bash
seclai agents upload-input <agentId> --file ./data.csv [--title "Data"] [--metadata '{}']
seclai agents input-status <agentId> <uploadId>
```

#### Agent AI Assistant

```bash
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot"
seclai agents ai step-config <agentId> --user-input "Configure the search step"
seclai agents ai history <agentId>
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```

### Sources

```bash
seclai sources list [--page N] [--limit N] [--sort <field>] [--order asc|desc]
seclai sources create --json '{"name":"Docs","type":"manual"}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Renamed"}'
seclai sources delete <sourceId>
```

`source` is an alias for `sources` (e.g. `seclai source list`).

#### Upload

```bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "Doc"] [--mime-type application/pdf] [--metadata '{}']
seclai sources upload-text <sourceId> --json '{"title":"Note","text":"Hello world"}'
```

#### Exports

```bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId>
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId>
```

#### Embedding Migration

```bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId>
seclai sources migration cancel <sourceId>
```

### Contents

```bash
seclai contents get <contentVersionId> [--start N] [--end N]
seclai contents delete <contentVersionId>
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
```

#### Upload / Replace

```bash
seclai contents upload <contentVersionId> --file ./updated.pdf [--metadata '{}']
seclai contents replace <contentVersionId> --file ./updated.pdf   # alias
seclai contents replace-text <contentVersionId> --json '{"title":"Note","text":"Updated content"}'
```

### Knowledge Bases

```bash
seclai kb list [--page N] [--limit N] [--sort <field>] [--order asc|desc]
seclai kb create --json '{"name":"Support KB"}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Renamed"}'
seclai kb delete <kbId>
```

### Memory Banks

```bash
seclai memory list [--page N] [--limit N]
seclai memory create --json '{"name":"Chat Memory","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Renamed"}'
seclai memory delete <memoryBankId>
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> [--json '...']
seclai memory test-compaction-standalone [--json '...']
```

#### Memory AI Assistant

```bash
seclai memory ai generate --user-input "Configure compaction"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
```

### Evaluations

#### Criteria

```bash
seclai evals criteria list <agentId> [--page N] [--limit N]
seclai evals criteria create <agentId> --json '{"name":"Quality"}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Renamed"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
```

#### Results

```bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals results create <criteriaId> --json '{"run_id":"...","score":0.9}'
```

#### Agent-level

```bash
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals test-draft <agentId> --json '{"criteria":{...}}'
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
seclai evals non-manual-summary <agentId>
```

### Solutions

```bash
seclai solutions list [--page N] [--limit N]
seclai solutions create --json '{"name":"My Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Renamed"}'
seclai solutions delete <solutionId>
```

#### Link / Unlink Resources

```bash
seclai solutions link <solutionId> --agents '["id1","id2"]' --kb '["id3"]' --sources '["id4"]'
seclai solutions unlink <solutionId> --agents '["id1"]'
```

#### Conversations

```bash
seclai solutions convos list <solutionId> [--page N] [--limit N]
seclai solutions convos add <solutionId> --json '{"user_input":"Add a source"}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'
```

#### Solution AI Assistant

```bash
seclai solutions ai generate <solutionId> --user-input "Add a FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base"
seclai solutions ai source <solutionId> --user-input "Create a file source"
seclai solutions ai accept <solutionId> <conversationId>
seclai solutions ai decline <solutionId> <conversationId>
```

### Governance

```bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list [--page N] [--limit N]
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
```

### Alerts

```bash
seclai alerts list [--page N] [--limit N] [--status open] [--severity high]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Investigating"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
```

#### Alert Configurations

```bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"Critical Alerts","type":"email"}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"name":"Renamed"}'
seclai alerts configs delete <configId>
```

#### Organization Alert Preferences

```bash
seclai alerts prefs list
seclai alerts prefs update <organizationId> <alertType> --json '{"enabled":true}'
```

### Models

#### Model Alerts

```bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
```

#### Recommendations

```bash
seclai models recommendations <modelId>
```

### Search

```bash
seclai search --query "deployment guide" [--limit N] [--entity-type agent|source|kb]
```

### AI Assistant

Top-level AI assistant for multi-domain operations.

```bash
seclai ai feedback --json '{"conversation_id":"...","feedback":"helpful"}'
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"
seclai ai memory-history
seclai ai accept <conversationId> [--json '...']
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> [--json '...']
```

### Skills

Install Seclai skill files for AI coding tools (Copilot, Claude Code, Cursor, Windsurf, Codex, Kiro, Cline, Roo Code, Gemini, Antigravity).

```bash
# Auto-detect tools from workspace directory structure
seclai skills install

# Target a specific tool
seclai skills install --tool copilot
seclai skills install --tool claude
seclai skills install --tool cursor
seclai skills install --tool kiro
seclai skills install --tool cline

# Install for all supported tools
seclai skills install --tool all

# Specify a custom directory
seclai skills install --tool copilot --dir /path/to/project

# Via npx (no install required)
npx @seclai/cli skills install
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification). Each tool gets a `seclai-cli/` directory containing a `SKILL.md` with YAML frontmatter and a `references/` subdirectory for progressive disclosure:

| Tool | Directory |
|---|---|
| Copilot | `.github/copilot/seclai-cli/` |
| Claude Code | `.claude/skills/seclai-cli/` |
| Cursor | `.cursor/skills/seclai-cli/` |
| Windsurf | `.windsurf/skills/seclai-cli/` |
| Codex | `.codex/skills/seclai-cli/` |
| Kiro | `.kiro/steering/seclai-cli/` |
| Cline | `.clinerules/seclai-cli/` |
| Roo Code | `.roo/rules/seclai-cli/` |
| Gemini | `.gemini/seclai-cli/` |
| Antigravity | `.antigravity/seclai-cli/` |

### Shell Completion

Generate shell completion scripts for tab-completion of commands:

```bash
# Bash — add to ~/.bashrc
eval "$(seclai completion bash)"

# Zsh — add to ~/.zshrc
eval "$(seclai completion zsh)"

# Fish — save to completions directory
seclai completion fish > ~/.config/fish/completions/seclai.fish
```

---

## Development

### Install dependencies

```bash
npm install
```

### Type checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Run locally

```bash
npm run dev -- --help
```

### Test

```bash
npm test
```

### Test global install locally

```bash
npm run build
npm link
seclai --help
```
