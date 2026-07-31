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

## Quick start

\`\`\`bash
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
\`\`\`

## Authentication

Two modes:

1. **API key** — set \`SECLAI_API_KEY\` env var or pass \`--api-key <key>\`.
2. **SSO** — run \`seclai auth login\` for browser-based OAuth2/PKCE. Tokens are cached locally and auto-refreshed.

Override the API URL with \`SECLAI_API_URL\` (default: https://api.seclai.com).

## Global options

\`\`\`bash
--api-key <key>    # Seclai API key (or set SECLAI_API_KEY)
--profile <name>   # SSO profile name (or set SECLAI_PROFILE, default: 'default')
--account-id <id>  # Account ID for multi-org targeting (X-Account-Id header)
--config-dir <path> # Config directory (or set SECLAI_CONFIG_DIR, default: ~/.seclai)
--api-version <date> # Opt into dated API changes up to YYYY-MM-DD (or set SECLAI_API_VERSION)
--allow-unknown-api-version # Send an --api-version this CLI was not built against
--compact          # Output compact single-line JSON
-V, --version      # Print version
\`\`\`

## API versions

The API is versioned by date and responses can change shape between versions,
so the CLI sends no version header by default — upgrading it never changes what
a command prints. Opt in per invocation with \`--api-version\`, or pin the whole
account:

\`\`\`bash
seclai api-version get            # which version does a request resolve to?
seclai --api-version 2026-07-27 alerts list
seclai api-version set 2026-07-27 # every client on the account, not just the CLI
seclai api-version clear
\`\`\`

## Common patterns

### JSON input
Most create/update commands accept \`--json '{"key":"value"}'\` or \`--json-file path.json\`.
Use \`--json -\` or \`--json-file -\` to read from stdin.

### AI assistant shorthand
AI generation commands accept \`--user-input <text>\` as shorthand for \`--json '{"user_input":"<text>"}'\`.

### Pagination
List commands support \`--page <n>\` and \`--limit <n>\`. Some also support \`--sort <field>\` and \`--order asc|desc\`.

### File uploads
Upload commands accept \`--file <path>\` (required), plus optional \`--title\`, \`--metadata '{"k":"v"}'\`, \`--metadata-file path.json\`, \`--file-name\`, \`--mime-type\`.

## Commands

### Agents

\`\`\`bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent","description":"..."}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Renamed"}'
seclai agents delete <agentId>
seclai agents disable <agentId>   # pause across every trigger path
seclai agents enable <agentId>
seclai agents callers <agentId>   # live agents that call this one via call_agent
seclai agents triggers email-config <agentId> <triggerId> --json '{"alias":"support"}'
\`\`\`

### Running agents

\`\`\`bash
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
\`\`\`

### Agent runs

\`\`\`bash
seclai agents runs list <agentId> [--page N] [--limit N] [--status <status>]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs cancel <runId>
seclai agents runs delete <runId>  # deprecated alias for \`runs cancel\`; there is no delete-a-run API
seclai agents runs search --json '{"query":"..."}'
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
# Download a file attachment emitted by a run step (attachmentId = storage_key from run output manifests / webhooks).
seclai agents runs download-attachment <runId> <attachmentId> [--download-name <name>] [--output <path>]
\`\`\`

### Agent definitions

\`\`\`bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[{"step_type":"llm","config":{...}}]}'
\`\`\`

### Agent export / import

\`\`\`bash
# Export an agent as a portable JSON snapshot.
seclai agents export <agentId> [--no-download]

# Validate an agent_definition payload before importing — no DB writes.
# Reports counts and any unresolved_refs (KBs, memory banks, source connections,
# or sub-agents that don't exist in this account). The body shape is
# \`{ "agent_definition": <export payload> }\`.
seclai agents export <agentId> \\
  | jq '{agent_definition: .}' \\
  | seclai agents preview-import --json-file -

# Import via \`agents create\` (or \`agents update\`) with \`agent_definition\` set
# to the export payload and \`entity_remap\` mapping unresolved source UUIDs to
# target UUIDs from preview-import's \`unresolved_refs[*].alternatives\`.
seclai agents create --json '{"name":"Imported","trigger_type":"dynamic_input","agent_definition":{...},"entity_remap":{}}'
\`\`\`

### Agent input uploads

\`\`\`bash
# Discover what files (if any) an agent expects before staging uploads.
# requires_uploads tells you whether the agent accepts files; the agent block
# lists the exact names / indexes / patterns a run-time batch must satisfy.
seclai agents attachment-references <agentId>
seclai agents upload-input <agentId> --file ./input.pdf [--file-name name] [--mime-type type]
seclai agents input-status <agentId> <uploadId>
\`\`\`

### Agent AI assistant

\`\`\`bash
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot"
seclai agents ai step-config <agentId> --json '{"step_type":"llm","user_input":"Configure the LLM step"}'
# --step-type is required; the API rejects the request without it
seclai agents ai history <agentId> --step-type llm [--step-id <id>] [--limit N] [--offset N]
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
\`\`\`

### Sources

\`\`\`bash
seclai sources list [--page N] [--limit N] [--sort field] [--order asc|desc] [--account-id id]
seclai sources create --json '{"name":"Docs","description":"Product documentation"}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Updated Docs"}'
seclai sources delete <sourceId>
\`\`\`

### Source uploads

\`\`\`bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "My Doc"] [--metadata '{"category":"docs"}'] [--file-name name] [--mime-type type]
seclai sources upload-text <sourceId> --json '{"text":"Article content here...","title":"My Article"}'
\`\`\`

### Source exports

\`\`\`bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId> --json '{"format":"jsonl"}'
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId> --json '{"format":"jsonl"}'
\`\`\`

### Embedding migration

\`\`\`bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId> --json '{"target_model":"text-embedding-3-large"}'
seclai sources migration cancel <sourceId>
\`\`\`

### Contents (indexed content)

\`\`\`bash
seclai contents get <contentVersionId> [--start N] [--end N]
seclai contents delete <contentVersionId>
seclai contents upload <contentVersionId> --file ./updated.pdf [--title "Title"] [--file-name name] [--mime-type type]
seclai contents replace-text <contentVersionId> --json '{"text":"Replacement text","title":"Updated"}'
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
\`\`\`

### Knowledge bases

\`\`\`bash
seclai kb list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Updated KB"}'
seclai kb delete <kbId>
\`\`\`

### Memory banks

\`\`\`bash
seclai memory list [--page N] [--limit N] [--sort field] [--order asc|desc]
# type: "conversation" (chat history) or "general" (structured facts)
seclai memory create --json '{"name":"Chat Memory","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Renamed"}'
seclai memory delete <memoryBankId>
\`\`\`

### Memory bank utilities

\`\`\`bash
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> --json '{"prompt":"Summarize the conversation"}'
seclai memory test-compaction-standalone --json '{"prompt":"Summarize the conversation"}'
\`\`\`

### Memory bank AI

\`\`\`bash
seclai memory ai generate --user-input "Configure compaction for chat memory"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
\`\`\`

### Evaluations — criteria

\`\`\`bash
# --paged wraps results in {data: [...]}; pagination appears from --api-version 2026-07-27
seclai evals criteria list <agentId> [--page N] [--limit N] [--paged]
seclai evals criteria create <agentId> --json '{"name":"Response Quality","description":"...","eval_type":"llm_judge"}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated Criteria"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
\`\`\`

### Evaluations — results & runs

\`\`\`bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals results create <criteriaId> --json '{"run_id":"...","score":0.9}'
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals test-draft <agentId> --json '{"criteria":{"name":"Test","eval_type":"llm_judge"},"run_id":"..."}'
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
seclai evals non-manual-summary <agentId>
\`\`\`

### Solutions

\`\`\`bash
seclai solutions list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai solutions create --json '{"name":"Customer Support Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Updated"}'
seclai solutions delete <solutionId>
\`\`\`

### Solution links

\`\`\`bash
# link resources — each flag takes a JSON array of IDs
seclai solutions link <solutionId> --agents '["agentId1"]' --kb '["kbId1"]' --sources '["sourceId1"]'
seclai solutions unlink <solutionId> --agents '["agentId1"]'
\`\`\`

### Solution conversations & AI

\`\`\`bash
seclai solutions convos list <solutionId>
seclai solutions convos add <solutionId> --json '{"message":"How should I structure this?"}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'

seclai solutions ai generate <solutionId> --user-input "Add an FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base for docs"
seclai solutions ai source <solutionId> --user-input "Create a file source for PDFs"
seclai solutions ai accept <solutionId> <conversationId> --json '{"accepted":true}'
seclai solutions ai decline <solutionId> <conversationId>
\`\`\`

### Alerts

\`\`\`bash
seclai alerts list [--page N] [--limit N] [--status <status>]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Fixed the issue"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
\`\`\`

### Alert configurations

\`\`\`bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"Latency Alert","description":"...","threshold":5000}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"threshold":3000}'
seclai alerts configs delete <configId>
\`\`\`

### Alert preferences

\`\`\`bash
seclai alerts prefs list
seclai alerts prefs update <organizationId> <alertType> --json '{"enabled":true}'
\`\`\`

### SSO authentication

\`\`\`bash
# interactive browser login (OAuth2 + PKCE)
seclai auth login [--port <port>] [--no-browser]

# show current auth status for the active profile
seclai auth status

# manually refresh the SSO token
seclai auth refresh

# remove cached SSO tokens
seclai auth logout
\`\`\`

### Configuration

\`\`\`bash
# interactive SSO profile setup (prompts for domain, client ID, region, account ID)
seclai configure sso [--profile-name <name>]

# list all configured profiles
seclai configure list
\`\`\`

### Governance AI

\`\`\`bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
\`\`\`

### Model alerts

\`\`\`bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
seclai models recommendations <modelId>
\`\`\`

### Models

\`\`\`bash
seclai models list [--provider <name>] [--supports-tool-use] [--supports-thinking]
seclai models list [--supports-input-media <media>] [--supports-output-media <media>]
seclai models get <modelId>
seclai models tiers   # media-generation modality/tier → model and cost
\`\`\`

### Model playground experiments

\`\`\`bash
seclai models experiments list [--days N] [--start-date <date>] [--end-date <date>] [--limit N] [--offset N]
seclai models experiments create --json '{"model_ids":["gpt-4o"],"prompt":"Compare responses"}'
seclai models experiments get <experimentId>
seclai models experiments cancel <experimentId>
seclai models experiments delete <experimentId>  # soft-delete, preserves audit history
\`\`\`

### Search

\`\`\`bash
seclai search --query "deployment guide" [--limit N] [--entity-type <type>]
seclai docs search --query "memory banks" [--mode keyword|semantic] [--limit N]
\`\`\`

### Account

\`\`\`bash
seclai me   # account ID and organization memberships
\`\`\`

### Agent email

\`\`\`bash
# Sending domains
seclai email domains list
seclai email domains add --kind custom --value mail.example.com [--delegated]
seclai email domains verify <domainId>
seclai email domains set-primary <domainId>
seclai email domains test-email <domainId>
seclai email domains dmarc <domainId> [--days N] [--top-sources N]
seclai email domains remove <domainId>
seclai email domains use-shared      # revert to agent.seclai.com

# Inbound sender blocklist
seclai email blocked list [--limit N] [--offset N]
seclai email blocked add --sender-email spam@example.com [--match-type domain] [--note "..."]
seclai email blocked remove <blockedId>
seclai email blocked auto-block-mode disabled|input|input_and_output

# Inbound health
seclai email inbound status          # quota, pause state, queued runs
seclai email inbound rejections [--agent-id <id>] [--limit N]
seclai email inbound cancel-queued
seclai email inbound resume

# Recipient opt-outs
seclai email optouts list [--agent-id <id>] [--limit N] [--offset N]
seclai email optouts remove <optoutId>
\`\`\`

### AI assistant (global)

\`\`\`bash
seclai ai feedback --json '{"feedback":"The response was helpful"}'
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"
seclai ai memory-history
seclai ai accept <conversationId> --json '{"accepted":true}'
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> --json '{"accepted":true}'
\`\`\`

### Shell completion

\`\`\`bash
# generate shell completion scripts
seclai completion bash   # eval "\$(seclai completion bash)" in ~/.bashrc
seclai completion zsh    # eval "\$(seclai completion zsh)" in ~/.zshrc
seclai completion fish   # seclai completion fish > ~/.config/fish/completions/seclai.fish
\`\`\`

### Skills

\`\`\`bash
# install skill files into AI coding tool directories (auto-detects or specify)
seclai skills install [--tool copilot|claude|cursor|windsurf|codex|kiro|cline|roo|gemini|antigravity|all] [--dir .]
\`\`\`

### MCP server

\`\`\`bash
# configure MCP server access in AI coding tool config files
seclai mcp configure --key <apiKey> [--target claude-code|cursor|claude-desktop|windsurf|all] [--dir .]

# show the MCP config JSON snippet
seclai mcp show [--key <apiKey>]
\`\`\`

## Example: Create a source and upload content

\`\`\`bash
seclai sources create --json '{"name":"Product Docs","description":"Product documentation source"}'
# note the id from the output
seclai sources upload <sourceId> --file ./docs.pdf --title "Product Manual" --metadata '{"version":"2.0"}'
seclai sources get <sourceId>
\`\`\`

## Example: Set up a knowledge base with an agent

\`\`\`bash
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai agents create --json '{"name":"Support Bot","description":"Answers customer questions"}'
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot that searches the Support KB"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
seclai agents run <agentId> --json '{"input":"How do I reset my password?"}' --stream
\`\`\`

## Example: Evaluate agent quality

\`\`\`bash
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
\`\`\`

## Example: Solution with linked resources

\`\`\`bash
seclai solutions create --json '{"name":"Customer Support"}'
seclai solutions link <solutionId> --agents '["<agentId>"]' --kb '["<kbId>"]' --sources '["<sourceId>"]'
seclai solutions get <solutionId>
\`\`\`

## Example: Memory-powered agent

\`\`\`bash
seclai memory create --json '{"name":"User Preferences","type":"general"}'
seclai agents create --json '{"name":"Personal Assistant","description":"Remembers user preferences"}'
seclai agents ai gen-steps <agentId> --user-input "Build a chat agent that remembers user preferences. Use general memory bank <memoryBankId>"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
\`\`\`

## Example: Governance policy setup

\`\`\`bash
seclai governance ai generate --user-input "Create a content safety policy that blocks harmful outputs"
seclai governance ai list
seclai governance ai accept <conversationId>
\`\`\`

## Specific topics

* **Streaming & event modes** [references/streaming.md](references/streaming.md)
* **File uploads & content management** [references/uploads.md](references/uploads.md)
* **Evaluations workflow** [references/evaluations.md](references/evaluations.md)
`;

const STREAMING_REF = `# Streaming Agent Runs

## Modes

### --stream
Wait for the agent run to complete via SSE. Prints the final result as a single JSON object.
Useful when you want to block until done.

\`\`\`bash
seclai agents run <agentId> --json '{"input":"Hello"}' --stream
seclai agents run <agentId> --json '{"input":"Hello"}' --stream --timeout-ms 120000
\`\`\`

### --events
Stream individual SSE events as NDJSON (one JSON object per line). Use for real-time processing.

\`\`\`bash
# all events, full event objects
seclai agents run <agentId> --json '{"input":"Hello"}' --events

# only data payloads (no event metadata)
seclai agents run <agentId> --json '{"input":"Hello"}' --events --output data

# only status events
seclai agents run <agentId> --json '{"input":"Hello"}' --events --output status

# filter specific event types
seclai agents run <agentId> --json '{"input":"Hello"}' --events --event-filter "status,data"
\`\`\`

Output modes for --events:
- \`full\`: entire SSE event object (default)
- \`data\`: only the data payload of each event
- \`status\`: only events with status information

### --poll
Poll the API at intervals for run completion. Does not use SSE.

\`\`\`bash
seclai agents run <agentId> --json '{"input":"Hello"}' --poll
seclai agents run <agentId> --json '{"input":"Hello"}' --poll --poll-interval-ms 5000 --include-step-outputs
\`\`\`

### No flag
Fire-and-forget: starts the run and immediately returns the run ID.

\`\`\`bash
seclai agents run <agentId> --json '{"input":"Hello"}'
# returns: {"id":"run_...","status":"queued",...}
# check later:
seclai agents runs get <runId>
\`\`\`
`;

const UPLOADS_REF = `# File Uploads & Content Management

## Upload to a source
\`\`\`bash
seclai sources upload <sourceId> --file ./doc.pdf
seclai sources upload <sourceId> --file ./doc.pdf --title "My Doc" --metadata '{"category":"docs"}' --file-name "custom-name.pdf" --mime-type "application/pdf"
seclai sources upload <sourceId> --file ./doc.pdf --metadata-file ./meta.json
\`\`\`

## Upload text directly
\`\`\`bash
seclai sources upload-text <sourceId> --json '{"text":"Article content here...","title":"My Article"}'
\`\`\`

## Upload input for agent runs
\`\`\`bash
# Check what files (if any) the agent expects before uploading. requires_uploads
# reports whether the agent accepts files; the agent block lists the exact names /
# indexes / patterns a run-time batch must satisfy.
seclai agents attachment-references <agentId>
seclai agents upload-input <agentId> --file ./input.pdf
seclai agents upload-input <agentId> --file ./data.csv --file-name "report.csv" --mime-type "text/csv"
seclai agents input-status <agentId> <uploadId>
\`\`\`

## Download an attachment emitted by a run
\`\`\`bash
# attachmentId is the URL-safe-base64 storage_key from run output manifests / webhooks.
seclai agents runs download-attachment <runId> <attachmentId> --output ./out.pdf
\`\`\`

## Replace content
\`\`\`bash
# replace with file
seclai contents upload <contentVersionId> --file ./updated.pdf

# replace with text
seclai contents replace-text <contentVersionId> --json '{"text":"Updated content","title":"Revised Article"}'
\`\`\`

## Read content
\`\`\`bash
# full content
seclai contents get <contentVersionId>

# text slice (0-based offsets)
seclai contents get <contentVersionId> --start 0 --end 1000

# view embeddings
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
\`\`\`
`;

const EVALUATIONS_REF = `# Evaluations Workflow

## Step 1: Create evaluation criteria for an agent
\`\`\`bash
seclai evals criteria create <agentId> --json '{"name":"Answer Accuracy","description":"Does the answer correctly address the question?","eval_type":"llm_judge"}'
\`\`\`

## Step 2: Find runs to evaluate
\`\`\`bash
# list all runs for an agent
seclai agents runs list <agentId> --limit 10

# or find runs compatible with specific criteria
seclai evals compatible-runs <criteriaId> --limit 10
\`\`\`

## Step 3: Test criteria before committing
\`\`\`bash
seclai evals test-draft <agentId> --json '{"criteria":{"name":"Answer Accuracy","eval_type":"llm_judge","description":"..."},"run_id":"<runId>"}'
\`\`\`

## Step 4: Create evaluation results
\`\`\`bash
seclai evals results create <criteriaId> --json '{"run_id":"<runId>","score":0.95}'
\`\`\`

## Step 5: Review summaries
\`\`\`bash
seclai evals criteria summary <criteriaId>
seclai evals agent-results <agentId>
seclai evals agent-runs <agentId> --limit 20
seclai evals non-manual-summary <agentId>
\`\`\`

## Managing criteria
\`\`\`bash
seclai evals criteria list <agentId>
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated Name"}'
seclai evals criteria delete <criteriaId>
\`\`\`

## Viewing results
\`\`\`bash
seclai evals results list <criteriaId> [--page N] [--limit N]
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
    { name: "references/streaming.md", content: STREAMING_REF },
    { name: "references/uploads.md", content: UPLOADS_REF },
    { name: "references/evaluations.md", content: EVALUATIONS_REF },
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
