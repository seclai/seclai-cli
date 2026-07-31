# Agents

Agents, their runs, definitions, export/import, input uploads, triggers, and the
agent AI assistant.

## CRUD and lifecycle

```bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent","description":"..."}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Renamed"}'
seclai agents delete <agentId>

# pause across every trigger path (API, schedule, email, sub-agent calls)
seclai agents disable <agentId>
seclai agents enable <agentId>

# which live agents call this one via a call_agent step?
seclai agents callers <agentId>
```

## Triggers

```bash
# alias, sender allowlist and inbound-handling flags for an EMAIL_RECEIVED trigger
seclai agents triggers email-config <agentId> <triggerId> --json '{"alias":"support"}'
```

## Running agents

Four modes: basic, streaming, NDJSON events, and polling. See
[streaming.md](streaming.md) for event shapes and filtering.

```bash
# simple run — returns the final result
seclai agents run <agentId> --json '{"input":"Hello"}'

# stream — wait for completion via SSE, print the final result
seclai agents run <agentId> --json '{"input":"Hello"}' --stream [--timeout-ms 60000]

# events — every SSE event as an NDJSON line
# --output: full (entire event), data (event data only), status (one-line summary)
# --event-filter: comma-separated event types, e.g. "status,data"
seclai agents run <agentId> --json '{"input":"Hello"}' --events [--output full|data|status] [--event-filter "status,data"]

# poll — submit, then poll until complete
seclai agents run <agentId> --json '{"input":"Hello"}' --poll [--poll-interval-ms 2000] [--include-step-outputs]
```

## Runs

```bash
seclai agents runs list <agentId> [--page N] [--limit N] [--status <status>]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs cancel <runId>
seclai agents runs delete <runId>  # deprecated alias for `runs cancel`; the API has no delete-a-run operation
seclai agents runs search --json '{"query":"..."}'
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]

# Download a file emitted by a run step. attachmentId is the URL-safe-base64
# storage_key from run output manifests or webhooks.
seclai agents runs download-attachment <runId> <attachmentId> [--download-name <name>] [--output <path>]
```

Without `--output`, raw bytes go to stdout — redirect to a file rather than
letting them hit the terminal.

## Definitions

```bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[{"step_type":"llm","config":{}}]}'
```

## Export and import

```bash
# portable JSON snapshot of an agent definition
seclai agents export <agentId> [--no-download]

# Validate an agent_definition payload before importing — no writes.
# Reports counts and any unresolved_refs (knowledge bases, memory banks, source
# connections or sub-agents that do not exist in this account).
seclai agents export <agentId> \
  | jq '{agent_definition: .}' \
  | seclai agents preview-import --json-file -

# Import via `agents create` (or `agents update`) with agent_definition set to
# the export payload, and entity_remap mapping unresolved source UUIDs to target
# UUIDs taken from preview-import's unresolved_refs[*].alternatives.
seclai agents create --json '{"name":"Imported","trigger_type":"dynamic_input","agent_definition":{},"entity_remap":{}}'
```

## Input uploads

```bash
# What files (if any) does this agent expect? requires_uploads reports whether it
# accepts files; the agent block lists the names, indexes and patterns a run-time
# batch must satisfy. Call this before staging uploads.
seclai agents attachment-references <agentId>

seclai agents upload-input <agentId> --file ./input.pdf [--file-name name] [--mime-type type]
seclai agents input-status <agentId> <uploadId>
```

## Agent AI assistant

```bash
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot"
seclai agents ai step-config <agentId> --json '{"step_type":"llm","user_input":"Configure the LLM step"}'

# --step-type is required; the API rejects the request without it
seclai agents ai history <agentId> --step-type llm [--step-id <id>] [--limit N] [--offset N]

seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```

## Example: knowledge-base-backed agent

```bash
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai agents create --json '{"name":"Support Bot","description":"Answers customer questions"}'
seclai agents ai gen-steps <agentId> --user-input "Build a QA chatbot that searches the Support KB"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
seclai agents run <agentId> --json '{"input":"How do I reset my password?"}' --stream
```

## Example: memory-powered agent

```bash
seclai memory create --json '{"name":"User Preferences","type":"general"}'
seclai agents create --json '{"name":"Personal Assistant","description":"Remembers user preferences"}'
seclai agents ai gen-steps <agentId> --user-input "Build a chat agent that remembers user preferences. Use general memory bank <memoryBankId>"
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```
