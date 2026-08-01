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

### Setup Skills and MCP

If you are using an AI coding agent like Claude Code, you can also install the skill individually with:

```sh
seclai skills install
```

This installs skills into all detected coding editors by default. Use `--tool <tool>` to scope it to one editor.

To install the Seclai MCP server into your editors (Cursor, Claude Code, VS Code, etc.):

```sh
seclai mcp configure --key "$SECLAI_API_KEY"
```

Or directly via npx:

```sh
npx skills add seclai/seclai-cli --full-depth --global --all
npx add-mcp https://api.seclai.com/mcp --header "X-API-Key: $SECLAI_API_KEY" --name Seclai
```

## Documentation

Command reference (latest): https://seclai.github.io/seclai-cli/latest/

## Authentication

The CLI supports two authentication methods:

### API Key

Set the `SECLAI_API_KEY` environment variable, or pass `--api-key` per-command:

```bash
export SECLAI_API_KEY="sk-..."

# or inline
seclai --api-key "$SECLAI_API_KEY" agents list
```

### SSO (OAuth2 Bearer Token)

SSO works out of the box with built-in production defaults — no configuration needed:

```bash
# Authenticate via browser (Authorization Code + PKCE)
seclai auth login

# Check authentication status
seclai auth status

# Refresh tokens manually
seclai auth refresh

# Log out (clears cached tokens)
seclai auth logout
```

For custom SSO settings (e.g. staging environment), use `seclai configure sso`
or set environment variables:

| Variable | Description | Default |
|---|---|---|
| `SECLAI_SSO_DOMAIN` | Cognito domain | `auth.seclai.com` |
| `SECLAI_SSO_CLIENT_ID` | Cognito app client ID | `4bgf8v9qmc5puivbaqon9n5lmr` |
| `SECLAI_SSO_REGION` | AWS region | `us-west-2` |

Set profiles up interactively, and list the ones you have:

```bash
# Prompts for domain, client ID, region, and account ID
seclai configure sso [--profile-name <name>]

# Show every configured profile
seclai configure list
```

Use a named profile with `--profile`:

```bash
seclai --profile staging agents list
```

Tokens are cached in `~/.seclai/sso/cache/` and auto-refreshed when expired.

## Environment Variables

| Variable | Description |
|---|---|
| `SECLAI_API_KEY` | Default API key (alternative to `--api-key`) |
| `SECLAI_API_URL` | Override API base URL (default: `https://api.seclai.com`) |
| `SECLAI_PROFILE` | Default SSO profile name (default: `default`) |
| `SECLAI_CONFIG_DIR` | Config directory path (default: `~/.seclai`) |
| `SECLAI_API_VERSION` | Dated API version (alternative to `--api-version`) |
| `SECLAI_SSO_DOMAIN` | Override SSO domain (default: `auth.seclai.com`) |
| `SECLAI_SSO_CLIENT_ID` | Override SSO client ID (default: `4bgf8v9qmc5puivbaqon9n5lmr`) |
| `SECLAI_SSO_REGION` | Override SSO region (default: `us-west-2`) |

## Global Options

| Flag | Description |
|---|---|
| `--api-key <key>` | Seclai API key |
| `--profile <name>` | SSO profile name |
| `--account-id <id>` | Account ID (`X-Account-Id` header) |
| `--config-dir <path>` | Config directory path |
| `--api-version <date>` | Opt into dated API changes released on or before this `YYYY-MM-DD` |
| `--allow-unknown-api-version` | Send an `--api-version` this CLI was not built against |
| `--compact` | Output compact (single-line) JSON |
| `-V, --version` | Print version |

---

## API Versions

The API is versioned by date. Responses can change shape between versions — a
bare array becoming a `{data, pagination}` envelope, for instance — so the CLI
sends **no version header by default**. Upgrading the CLI on its own never
changes what a command prints.

```bash
# See which version a request resolves to
seclai api-version get

# Opt one invocation into the changes released up to a date
seclai --api-version 2026-07-27 alerts list

# Or for every client on the account, not just this CLI
seclai api-version set 2026-07-27
seclai api-version clear    # revert to the default
```

An `--api-version` this CLI was not built against is rejected, because a newer
version can reshape a response the CLI would then misread. Pass
`--allow-unknown-api-version` to send it anyway. `api-version set` takes a
`YYYY-MM-DD` date and rejects anything else, because the pin applies to every
client on the account and nothing re-checks it afterwards.

Every global option that takes a value rejects an empty one rather than ignoring
it. A shell expanding an unset variable passes `""`, so `--api-key "$KEY"` with
`KEY` unset would otherwise fall back to `SECLAI_API_KEY` or a cached SSO session
and run as a different identity.

---

## Commands

### Agents

```bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent"}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Renamed"}'
seclai agents delete <agentId>

# Pause an agent across every trigger path, then resume it
seclai agents disable <agentId>
seclai agents enable <agentId>

# Which live agents call this one via a call_agent step?
seclai agents callers <agentId>
```

#### Triggers

```bash
# Alias, sender allowlist, and inbound-handling flags for an EMAIL_RECEIVED trigger
seclai agents triggers email-config <agentId> <triggerId> --json '{"alias":"support"}'
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
seclai agents runs cancel <runId>
seclai agents runs delete <runId>   # deprecated alias for `runs cancel`
seclai agents runs search [--page N] [--limit N] [--json '...']
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
# Download a file attachment emitted by a run step. attachmentId is the
# URL-safe-base64 storage_key from run output manifests / webhooks.
seclai agents runs download-attachment <runId> <attachmentId> [--download-name <name>] [--output <path>]
```

#### Agent Definition

```bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[...]}'
```

#### Agent Export / Import

```bash
seclai agents export <agentId>
seclai agents export <agentId> --no-download

# Validate an agent_definition payload without creating an agent.
# Reports counts and any unresolved_refs you'll need to map with entity_remap
# when calling `agents create` or `agents update`.
# The body shape is `{ "agent_definition": <export payload> }`.
seclai agents preview-import --json-file ./preview-body.json
seclai agents export <agentId> \
  | jq '{agent_definition: .}' \
  | seclai agents preview-import --json-file -
```

#### Agent Input Upload

```bash
# Discover which files (if any) the agent expects before staging uploads.
seclai agents attachment-references <agentId>
seclai agents upload-input <agentId> --file ./data.csv [--file-name data.csv] [--mime-type text/csv]
seclai agents input-status <agentId> <uploadId>
```

#### Agent AI Assistant

```bash
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot"
seclai agents ai step-config <agentId> --user-input "Configure the search step"
# --step-type is required: the API rejects the request without it.
seclai agents ai history <agentId> --step-type llm [--step-id <id>] [--limit N] [--offset N]
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
seclai evals criteria list <agentId> [--page N] [--limit N] [--paged]
seclai evals criteria create <agentId> --json '{"name":"Quality"}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Renamed"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
```

`--paged` wraps the results in `{"data": [...]}` instead of returning a bare
array, so `.data` is a stable path to read whatever `--api-version` is in
effect. Nothing is invented: the `pagination` block appears only once the API
sends one, from `--api-version 2026-07-27`. Migrate scripts to `.data` first,
then opt in to get `.pagination`.

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
seclai solutions convos list <solutionId>
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
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
```

### Alerts

```bash
seclai alerts list [--page N] [--limit N] [--status open]
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

```bash
seclai models list [--provider <name>] [--supports-tool-use] [--supports-thinking]
seclai models list --supports-input-media image --supports-output-media video
seclai models get <modelId>

# Each media-generation modality and tier, with its model and cost
seclai models tiers
```

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

#### Model Playground Experiments

```bash
seclai models experiments list [--days N] [--start-date <date>] [--end-date <date>] [--limit N] [--offset N]
seclai models experiments create --json '{"model_ids":["gpt-4o"],"prompt":"Compare responses"}'
seclai models experiments get <experimentId>
seclai models experiments cancel <experimentId>
seclai models experiments delete <experimentId>   # soft-delete, preserves audit history
```

### Search

```bash
seclai search --query "deployment guide" [--limit N] [--entity-type agent|source|kb]

# Search the Seclai documentation
seclai docs search --query "memory banks" [--mode keyword|semantic] [--limit N]
```

### Account

```bash
# The authenticated user's account ID and organization memberships
seclai me
```

### Email

Agent email: the domains agents send from, the inbound blocklist, inbound
health, and recipient opt-outs.

#### Domains

```bash
seclai email domains list
seclai email domains add --kind custom --value mail.example.com [--delegated]
seclai email domains verify <domainId>        # check DNS now
seclai email domains set-primary <domainId>
seclai email domains test-email <domainId>    # send a test to the account owner
seclai email domains dmarc <domainId> [--days N] [--top-sources N]
seclai email domains remove <domainId>
seclai email domains use-shared               # revert to agent.seclai.com
```

`add` returns the DNS records to publish. Use `--delegated` when the domain's
DNS is delegated to Seclai, so those records are published for you.

#### Blocked Senders

```bash
seclai email blocked list [--limit N] [--offset N]
seclai email blocked add --sender-email spam@example.com [--note "phishing"]
seclai email blocked add --sender-email example.com --match-type domain
seclai email blocked remove <blockedId>
seclai email blocked auto-block-mode disabled|input|input_and_output
```

#### Inbound Health

```bash
seclai email inbound status                   # quota, pause state, queued runs
seclai email inbound rejections [--agent-id <id>] [--limit N]
seclai email inbound cancel-queued            # fail all over-quota parked runs
seclai email inbound resume                   # lift the account-wide pause
```

#### Opt-outs

```bash
seclai email optouts list [--agent-id <id>] [--limit N] [--offset N]
seclai email optouts remove <optoutId>
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

You can also install skills using the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add seclai/seclai-cli
```

### MCP Server

Configure the [Seclai MCP server](https://github.com/seclai/seclai-mcp) for AI coding tools:

```bash
# Auto-detect tools and write MCP config
seclai mcp configure --key YOUR_API_KEY

# Target a specific tool
seclai mcp configure --key YOUR_API_KEY --target claude-code
seclai mcp configure --key YOUR_API_KEY --target cursor
seclai mcp configure --key YOUR_API_KEY --target claude-desktop
seclai mcp configure --key YOUR_API_KEY --target windsurf

# Configure all known targets
seclai mcp configure --key YOUR_API_KEY --target all

# Show the MCP config snippet (for manual setup)
seclai mcp show
seclai mcp show --key YOUR_API_KEY
```

| Target | Config File | Scope |
|---|---|---|
| claude-code | `.mcp.json` | Project |
| cursor | `.cursor/mcp.json` | Project |
| claude-desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | Global |
| windsurf | `~/.codeium/windsurf/mcp_config.json` | Global |

The command merges into existing config files — it won't overwrite other MCP servers.

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
