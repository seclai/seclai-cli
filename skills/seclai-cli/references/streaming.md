# Streaming Agent Runs

## Modes

### --stream
Wait for the agent run to complete via SSE. Prints the final result as a single JSON object.
Useful when you want to block until done.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}' --stream
seclai agents run <agentId> --json '{"input":"Hello"}' --stream --timeout-ms 120000
```

### --events
Stream individual SSE events as NDJSON (one JSON object per line). Use for real-time processing.

```bash
# all events, full event objects
seclai agents run <agentId> --json '{"input":"Hello"}' --events

# only data payloads (no event metadata)
seclai agents run <agentId> --json '{"input":"Hello"}' --events --output data

# only status events
seclai agents run <agentId> --json '{"input":"Hello"}' --events --output status

# filter specific event types
seclai agents run <agentId> --json '{"input":"Hello"}' --events --event-filter "status,data"
```

Output modes for --events:
- `full`: entire SSE event object (default)
- `data`: only the data payload of each event
- `status`: only events with status information

### --poll
Poll the API at intervals for run completion. Does not use SSE.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}' --poll
seclai agents run <agentId> --json '{"input":"Hello"}' --poll --poll-interval-ms 5000 --include-step-outputs
```

### No flag
Fire-and-forget: starts the run and immediately returns the run ID.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}'
# returns: {"id":"run_...","status":"queued",...}
# check later:
seclai agents runs get <runId>
```
