# Streaming Agent Runs

## Modes

### --stream
Wait for the agent run to complete via SSE. Prints the final result as a single JSON object.
Useful when you want to block until done.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}' --stream
seclai agents run <agentId> --json '{"input":"Hello"}' --stream --timeout-ms 120000
seclai agents run <agentId> --json '{"input":"Hello"}' --stream --throw-on-incomplete
```

`--throw-on-incomplete` exits with an error instead of printing a run that has
not finished, when the stream ends before the run is done or the server answers
with plain JSON for an unfinished run. A broken stream exits with an error
either way.

When `--stream` or `--poll` gives up, for example on `--timeout-ms` or with
`--throw-on-incomplete`, the command exits 1 and prints nothing on stdout. The
error line goes to stderr, followed by the latest snapshot of the run as JSON,
when there is one; its `output` may already hold the answer.

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

# also receive the model's reasoning as stream_reasoning events
seclai agents run <agentId> --json '{"input":"Hello","include_reasoning":true}' --events
```

`include_reasoning` only matters with `--events`: `--stream` waits for the final
result and never prints reasoning, so the SDK drops the field there.

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

### --return-on-result
With `--poll` or `--stream`, return as soon as the run's answer is in `output`,
without waiting for later steps. The run may still be in progress and can still
fail: check `result_reported_at`, not `status`.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}' --poll --return-on-result
```

### No flag
Fire-and-forget: starts the run and immediately returns the run ID.

```bash
seclai agents run <agentId> --json '{"input":"Hello"}'
# returns: {"id":"run_...","status":"queued",...}
# check later:
seclai agents runs get <runId>
```
