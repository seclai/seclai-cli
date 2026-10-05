---
name: seclai-cli
description: >-
  Manage Seclai agents, knowledge bases, sources, memory banks, evaluations,
  solutions, governance, alerts, agent email, cloud drives, and models via the CLI. Use when
  working with the Seclai platform or when the user mentions Seclai CLI commands.
---

# Seclai CLI

The Seclai CLI (`seclai` / `npx @seclai/cli`) manages agents, knowledge bases,
sources, memory banks, evaluations, solutions, governance, alerts, agent email,
cloud drives, and models from the terminal.

Every command writes JSON to stdout. Pipe into `jq` for filtering. Errors go to
stderr and set a non-zero exit code, so `set -e` scripts fail as expected.

**Find the commands for a task in the map below, then read that reference file.**
Only this page is loaded up front; the references are read on demand.

## Quick start

```bash
export SECLAI_API_KEY="sk-..."

seclai agents create --json '{"name":"My Agent","description":"QA chatbot"}'
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot that uses a knowledge base"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
seclai agents run <agentId> --json '{"input":"How do I reset my password?"}' --stream
seclai agents runs list <agentId>
```

## Command map

| Group | What it covers | Reference |
| --- | --- | --- |
| `agents` | Agents, runs, definitions, export/import, input uploads, triggers, agent AI | [references/agents.md](references/agents.md) |
| `sources` `contents` `kb` `memory` | Sources and uploads, indexing status, exports, embedding migration, indexed content, knowledge bases, memory banks | [references/knowledge.md](references/knowledge.md) |
| `evals` | Evaluation criteria, results, runs, agent-level summaries | [references/evaluations.md](references/evaluations.md) |
| `solutions` `governance` | Solutions, resource links, conversations, solution and governance AI | [references/solutions.md](references/solutions.md) |
| `alerts` | Alerts, alert configurations, organization preferences | [references/alerts.md](references/alerts.md) |
| `email` | Agent email: sending domains, inbound blocklist, inbound health, opt-outs | [references/email.md](references/email.md) |
| `cloud-drives` | Cloud-drive connections: providers, rename and re-point, dependent agents, skipped files, disconnect and delete | [references/cloud-drives.md](references/cloud-drives.md) |
| `models` | Model catalog, embedders and rerankers, generation tiers, model alerts, recommendations, playground experiments | [references/models.md](references/models.md) |
| `auth` `configure` `api-version` `mcp` `skills` `completion` | Authentication, profiles, API version pinning, editor integration | [references/setup.md](references/setup.md) |
| `ai` | Top-level AI assistant for knowledge bases, sources, solutions and memory | [references/ai-assistant.md](references/ai-assistant.md) |
| `search` `docs` `me` | Search across resources, search the documentation, show the authenticated account | below, under [Search and account](#search-and-account) |

Cross-cutting topics: [streaming and event modes](references/streaming.md),
[file uploads](references/uploads.md).

## Authentication

Two modes:

1. **API key** — set `SECLAI_API_KEY`, or pass `--api-key <key>`.
2. **SSO** — `seclai auth login` for browser-based OAuth2/PKCE. Tokens are cached
   locally and refreshed automatically.

Override the API host with `SECLAI_API_URL` (default `https://api.seclai.com`).

## Global options

```bash
--api-key <key>              # or set SECLAI_API_KEY
--profile <name>             # SSO profile (or SECLAI_PROFILE, default 'default')
--account-id <id>            # multi-org targeting (X-Account-Id header)
--config-dir <path>          # or SECLAI_CONFIG_DIR, default ~/.seclai
--api-version <date>         # or SECLAI_API_VERSION; see below
--allow-unknown-api-version  # send a version this CLI was not built against
--compact                    # single-line JSON
-V, --version
```

## API versions

The API is versioned by date, and a version can change a response's shape — a
bare array becoming `{data, pagination}`, for instance. **The CLI sends no
version header by default**, so upgrading it never changes what a command
prints. Opt in per invocation, or pin the account:

```bash
seclai api-version get                        # what does a request resolve to?
seclai --api-version 2026-07-27 alerts list   # this invocation only
seclai api-version set 2026-07-27             # every client on the account
seclai api-version clear
```

An `--api-version` this CLI was not built against is rejected, because a newer
version can reshape a response the CLI would then misread. Pass
`--allow-unknown-api-version` to send it anyway. `api-version set` takes a
`YYYY-MM-DD` date and rejects anything else, because the pin applies to every
client on the account.

Each version includes the changes of the ones before it:

| Version | What it changes |
| --- | --- |
| `2026-07-01` | The baseline, applied when no version is sent and the account is not pinned |
| `2026-07-27` | List responses move to `{data, pagination}`, and a query parameter the endpoint does not declare is rejected with a 422 |
| `2026-08-03` | `memory create` and `memory update` reject a non-zero `max_age_days`, which reads as `null`; an omitted `retention_days` on create resolves per bank type |
| `2026-08-21` | `sources create` rejects an embedding dimension its embedder does not support — `models embedders` reports the supported ones |
| `2026-09-28` | Agent-definition writes such as `agents def update` use the current file-list grammar for a step's `attachments` |
| `2026-09-30` | A run's and a step's `output`, and a step's `input`, are the text rather than a JSON manifest. Files are in `attachments` on every version |
| `2026-10-03` | A new LLM step written without `attachments` takes its parent's files |

To find a run's files, read `.attachments` rather than parsing `.output`: it is
present on every version, and `.output` stops being JSON at `2026-09-30`.

`--api-key`, `--profile`, `--account-id` and `--config-dir` reject an empty
value. A shell expanding an unset variable passes `""`, which the SDK's
credential chain discards, so each would silently resolve elsewhere — a
different identity, another account's cached tokens, or the default org. Guard
the flag rather than the value: `seclai ${KEY:+--api-key "$KEY"} agents list`.

An empty `--api-version` is accepted with a warning, since it costs only the
version header; a future release will reject it too.

## Common patterns

**JSON input.** Most create/update commands take `--json '{"key":"value"}'` or
`--json-file path.json`. Use `-` as the value to read from stdin.

**AI shorthand.** AI generation commands accept `--user-input <text>` in place of
`--json '{"user_input":"<text>"}'`.

**Pagination.** List commands take `--page <n>` and `--limit <n>`; some add
`--sort <field>` and `--order asc|desc`. A few endpoints paginate by offset
instead and take `--limit` / `--offset`.

**Uploads.** Upload commands take `--file <path>`, plus optional `--title`,
`--metadata '{"k":"v"}'`, `--metadata-file`, `--file-name` and `--mime-type`.

## Search and account

```bash
seclai search --query "deployment guide" [--limit N] [--entity-type <type>]
seclai docs search --query "memory banks" [--mode keyword|semantic] [--limit N]
seclai me   # account ID and organization memberships
```
