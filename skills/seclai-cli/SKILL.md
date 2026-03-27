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

## Quick start

```bash
# authenticate
export SECLAI_API_KEY="sk-..."

# create an agent
seclai agents create --json '{"name":"My Agent","description":"QA chatbot"}'

# configure steps via AI assistant
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot that uses a knowledge base"

# accept the generated plan
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'

# run the agent
seclai agents run <agentId> --json '{"input":"How do I reset my password?"}' --stream

# list runs
seclai agents runs list <agentId>
```

## Authentication

Two modes:

1. **API key** — set `SECLAI_API_KEY` env var or pass `--api-key <key>`.
2. **SSO** — run `seclai auth login` for browser-based OAuth2/PKCE. Tokens are cached locally and auto-refreshed.

Override the API URL with `SECLAI_API_URL` (default: https://api.seclai.com).

## Global options

```bash
--api-key <key>    # Seclai API key (or set SECLAI_API_KEY)
--profile <name>   # SSO profile name (or set SECLAI_PROFILE, default: 'default')
--account-id <id>  # Account ID for multi-org targeting (X-Account-Id header)
--config-dir <path> # Config directory (or set SECLAI_CONFIG_DIR, default: ~/.seclai)
--compact          # Output compact single-line JSON
-V, --version      # Print version
```

## Common patterns

### JSON input
Most create/update commands accept `--json '{"key":"value"}'` or `--json-file path.json`.
Use `--json -` or `--json-file -` to read from stdin.

### AI assistant shorthand
AI generation commands accept `--user-input <text>` as shorthand for `--json '{"user_input":"<text>"}'`.

### Pagination
List commands support `--page <n>` and `--limit <n>`. Some also support `--sort <field>` and `--order asc|desc`.

### File uploads
Upload commands accept `--file <path>` (required), plus optional `--title`, `--metadata '{"k":"v"}'`, `--metadata-file path.json`, `--file-name`, `--mime-type`.

## Commands

### Agents

```bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent","description":"..."}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Renamed"}'
seclai agents delete <agentId>
```

### Running agents

```bash
# simple run — returns the final result
seclai agents run <agentId> --json '{"input":"Hello"}'

# stream — wait for completion via SSE, print final result
seclai agents run <agentId> --json '{"input":"Hello"}' --stream [--timeout-ms 60000]

# events — stream individual SSE events as NDJSON lines
# --output: full (entire event), data (event data only), status (status events only)
# --event-filter: comma-separated event types to include, e.g. "status,data"
seclai agents run <agentId> --json '{"input":"Hello"}' --events [--output full|data|status] [--event-filter "status,data"]

# poll — poll for completion
seclai agents run <agentId> --json '{"input":"Hello"}' --poll [--poll-interval-ms 2000] [--include-step-outputs]
```

### Agent runs

```bash
seclai agents runs list <agentId> [--page N] [--limit N] [--status <status>]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs delete <runId>
seclai agents runs cancel <runId>
seclai agents runs search --json '{"query":"..."}'
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
```

### Agent definitions

```bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[{"step_type":"llm","config":{...}}]}'
```

### Agent input uploads

```bash
seclai agents upload-input <agentId> --file ./input.pdf [--file-name name] [--mime-type type]
seclai agents input-status <agentId> <uploadId>
```

### Agent AI assistant

```bash
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot"
seclai agents ai step-config <agentId> --json '{"step_type":"llm","user_input":"Configure the LLM step"}'
seclai agents ai history <agentId>
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```

### Sources

```bash
seclai sources list [--page N] [--limit N] [--sort field] [--order asc|desc] [--account-id id]
seclai sources create --json '{"name":"Docs","description":"Product documentation"}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Updated Docs"}'
seclai sources delete <sourceId>
```

### Source uploads

```bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "My Doc"] [--metadata '{"category":"docs"}'] [--file-name name] [--mime-type type]
seclai sources upload-text <sourceId> --json '{"text":"Article content here...","title":"My Article"}'
```

### Source exports

```bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId> --json '{"format":"jsonl"}'
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId> --json '{"format":"jsonl"}'
```

### Embedding migration

```bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId> --json '{"target_model":"text-embedding-3-large"}'
seclai sources migration cancel <sourceId>
```

### Contents (indexed content)

```bash
seclai contents get <contentVersionId> [--start N] [--end N]
seclai contents delete <contentVersionId>
seclai contents upload <contentVersionId> --file ./updated.pdf [--title "Title"] [--file-name name] [--mime-type type]
seclai contents replace-text <contentVersionId> --json '{"text":"Replacement text","title":"Updated"}'
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
```

### Knowledge bases

```bash
seclai kb list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Updated KB"}'
seclai kb delete <kbId>
```

### Memory banks

```bash
seclai memory list [--page N] [--limit N] [--sort field] [--order asc|desc]
# type: "conversation" (chat history) or "general" (structured facts)
seclai memory create --json '{"name":"Chat Memory","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Renamed"}'
seclai memory delete <memoryBankId>
```

### Memory bank utilities

```bash
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> --json '{"prompt":"Summarize the conversation"}'
seclai memory test-compaction-standalone --json '{"prompt":"Summarize the conversation"}'
```

### Memory bank AI

```bash
seclai memory ai generate --user-input "Configure compaction for chat memory"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
```

### Evaluations — criteria

```bash
seclai evals criteria list <agentId> [--page N] [--limit N]
seclai evals criteria create <agentId> --json '{"name":"Response Quality","description":"...","eval_type":"llm_judge"}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated Criteria"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
```

### Evaluations — results & runs

```bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals results create <criteriaId> --json '{"run_id":"...","score":0.9}'
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals test-draft <agentId> --json '{"criteria":{"name":"Test","eval_type":"llm_judge"},"run_id":"..."}'
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
seclai evals non-manual-summary <agentId>
```

### Solutions

```bash
seclai solutions list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai solutions create --json '{"name":"Customer Support Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Updated"}'
seclai solutions delete <solutionId>
```

### Solution links

```bash
# link resources — each flag takes a JSON array of IDs
seclai solutions link <solutionId> --agents '["agentId1"]' --kb '["kbId1"]' --sources '["sourceId1"]'
seclai solutions unlink <solutionId> --agents '["agentId1"]'
```

### Solution conversations & AI

```bash
seclai solutions convos list <solutionId>
seclai solutions convos add <solutionId> --json '{"message":"How should I structure this?"}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'

seclai solutions ai generate <solutionId> --user-input "Add an FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base for docs"
seclai solutions ai source <solutionId> --user-input "Create a file source for PDFs"
seclai solutions ai accept <solutionId> <conversationId> --json '{"accepted":true}'
seclai solutions ai decline <solutionId> <conversationId>
```

### Alerts

```bash
seclai alerts list [--page N] [--limit N] [--status <status>] [--severity <severity>]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Fixed the issue"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
```

### Alert configurations

```bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"Latency Alert","description":"...","threshold":5000}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"threshold":3000}'
seclai alerts configs delete <configId>
```

### Alert preferences

```bash
seclai alerts prefs list
seclai alerts prefs update <organizationId> <alertType> --json '{"enabled":true}'
```

### SSO authentication

```bash
# interactive browser login (OAuth2 + PKCE)
seclai auth login [--port <port>] [--no-browser]

# show current auth status for the active profile
seclai auth status

# manually refresh the SSO token
seclai auth refresh

# remove cached SSO tokens
seclai auth logout
```

### Configuration

```bash
# interactive SSO profile setup (prompts for domain, client ID, region, account ID)
seclai configure sso [--profile-name <name>]

# list all configured profiles
seclai configure list
```

### Governance AI

```bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
```

### Model alerts

```bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
seclai models recommendations <modelId>
```

### Search

```bash
seclai search --query "deployment guide" [--limit N] [--entity-type <type>]
```

### AI assistant (global)

```bash
seclai ai feedback --json '{"feedback":"The response was helpful"}'
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"
seclai ai memory-history
seclai ai accept <conversationId> --json '{"accepted":true}'
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> --json '{"accepted":true}'
```

### Shell completion

```bash
# generate shell completion scripts
seclai completion bash   # eval "$(seclai completion bash)" in ~/.bashrc
seclai completion zsh    # eval "$(seclai completion zsh)" in ~/.zshrc
seclai completion fish   # seclai completion fish > ~/.config/fish/completions/seclai.fish
```

### Skills

```bash
# install skill files into AI coding tool directories (auto-detects or specify)
seclai skills install [--tool copilot|claude|cursor|windsurf|codex|kiro|cline|roo|gemini|antigravity|all] [--dir .]
```

### MCP server

```bash
# configure MCP server access in AI coding tool config files
seclai mcp configure --key <apiKey> [--target claude-code|cursor|claude-desktop|windsurf|all] [--dir .]

# show the MCP config JSON snippet
seclai mcp show [--key <apiKey>]
```

## Example: Create a source and upload content

```bash
seclai sources create --json '{"name":"Product Docs","description":"Product documentation source"}'
# note the id from the output
seclai sources upload <sourceId> --file ./docs.pdf --title "Product Manual" --metadata '{"version":"2.0"}'
seclai sources get <sourceId>
```

## Example: Set up a knowledge base with an agent

```bash
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai agents create --json '{"name":"Support Bot","description":"Answers customer questions"}'
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot that searches the Support KB"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
seclai agents run <agentId> --json '{"input":"How do I reset my password?"}' --stream
```

## Example: Evaluate agent quality

```bash
# create eval criteria
seclai evals criteria create <agentId> --json '{"name":"Answer Accuracy","eval_type":"llm_judge","description":"Does the answer correctly address the question?"}'
# find compatible runs
seclai evals compatible-runs <criteriaId> --limit 5
# test the criteria against a run without persisting
seclai evals test-draft <agentId> --json '{"criteria":{"name":"Answer Accuracy","eval_type":"llm_judge"},"run_id":"<runId>"}'
# create a persisted result
seclai evals results create <criteriaId> --json '{"run_id":"<runId>","score":0.95}'
# view summary
seclai evals criteria summary <criteriaId>
```

## Example: Solution with linked resources

```bash
seclai solutions create --json '{"name":"Customer Support"}'
seclai solutions link <solutionId> --agents '["<agentId>"]' --kb '["<kbId>"]' --sources '["<sourceId>"]'
seclai solutions get <solutionId>
```

## Example: Memory-powered agent

```bash
seclai memory create --json '{"name":"User Preferences","type":"general"}'
seclai agents create --json '{"name":"Personal Assistant","description":"Remembers user preferences"}'
seclai agents ai gen-steps <agentId> --user-input "Build a chat agent that remembers user preferences. Use general memory bank <memoryBankId>"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```

## Example: Governance policy setup

```bash
seclai governance ai generate --user-input "Create a content safety policy that blocks harmful outputs"
seclai governance ai list
seclai governance ai accept <conversationId>
```

## Specific topics

* **Streaming & event modes** [references/streaming.md](references/streaming.md)
* **File uploads & content management** [references/uploads.md](references/uploads.md)
* **Evaluations workflow** [references/evaluations.md](references/evaluations.md)
