# Seclai CLI — Agents

## CRUD
```bash
seclai agents list [--page N] [--limit N]
seclai agents create --json '{"name":"My Agent",...}'
seclai agents get <agentId>
seclai agents update <agentId> --json '{"name":"Updated"}'
seclai agents delete <agentId>
```

## Running Agents
```bash
# Simple run
seclai agents run <agentId> --json '{"input":"Hello"}'

# Stream (wait for final result via SSE)
seclai agents run <agentId> --json '{"input":"Hello"}' --stream [--timeout-ms 60000]

# Stream individual events as NDJSON
seclai agents run <agentId> --json '{"input":"Hello"}' --events [--event-filter "status,data"] [--output full|data|status]

# Poll-based
seclai agents run <agentId> --json '{"input":"Hello"}' --poll [--poll-interval-ms 2000] [--include-step-outputs]
```

## Runs Management
```bash
seclai agents runs list <agentId> [--page N] [--limit N] [--status <status>]
seclai agents runs get <runId> [--include-step-outputs]
seclai agents runs delete <runId>
seclai agents runs cancel <runId>
seclai agents runs search --json '{"query":"..."}'
seclai agents runs eval-results <agentId> <runId> [--page N] [--limit N]
```

## Agent Definition
```bash
seclai agents def get <agentId>
seclai agents def update <agentId> --json '{"steps":[...]}'
```

## Input Uploads
```bash
seclai agents upload-input <agentId> --file ./input.pdf [--file-name name] [--mime-type type]
seclai agents input-status <agentId> <uploadId>
```

## AI Assistant
```bash
seclai agents ai gen-steps <agentId> --user-input "Build a chat agent"
seclai agents ai step-config <agentId> --json '{"step_type":"...",}'
seclai agents ai history <agentId>
seclai agents ai mark <agentId> <conversationId> --json '{"accepted":true}'
```
