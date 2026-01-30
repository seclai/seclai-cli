# Seclai CLI

Seclai Command Line Interface

## Install

Global install (recommended):

```bash
npm i -g @seclai/cli
```

## Documentation

Command reference (latest):

https://seclai.github.io/seclai-cli/latest/

## Authentication

The CLI uses API key authentication.

Set `SECLAI_API_KEY` (or pass `--api-key`).

You can also pass options per command:

```bash
seclai --api-key "$SECLAI_API_KEY" sources list
```

## Commands

### Sources

List sources:

```bash
seclai sources list
seclai sources list --page 1 --limit 20 --sort created_at --order desc
seclai sources list --account-id 9f3c2a7d-2d4a-4c8e-9d1d-3f7a2f1c0b5e
```

Upload a file to a source connection:

```bash
seclai sources upload 2b1f0f3a-1d2c-4b5a-8e9f-0a1b2c3d4e5f --file ./mydoc.pdf
seclai sources upload 2b1f0f3a-1d2c-4b5a-8e9f-0a1b2c3d4e5f --file ./notes.txt --title "Notes" --mime-type text/plain
seclai sources upload 2b1f0f3a-1d2c-4b5a-8e9f-0a1b2c3d4e5f --file ./mydoc.pdf --metadata '{"category":"docs","author":"Ada"}'
```

### Agents

Run an agent (body is JSON):

```bash
seclai agents run 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d --json '{"query":"hello"}'
seclai agents run 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d --json-file ./run.json
cat ./run.json | seclai agents run 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d --json-file -
```

Run an agent via SSE streaming (waits until the final result or timeout):

This command exits successfully when the stream emits the final `done` event; it fails if the stream ends early or the timeout is reached.

```bash
seclai agents run 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d \
	--json '{"input":"Hello from streaming"}' \
	--stream \
	--timeout-ms 60000
```

List runs:

```bash
seclai agents runs list 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d
seclai agents runs list 6b9e2a1c-4d5f-4a7b-9c0d-1e2f3a4b5c6d --page 1 --limit 50
```

Get a run:

```bash
seclai runs get 3f1a2b4c-5d6e-4f70-8a9b-1c2d3e4f5a6b
seclai runs get 3f1a2b4c-5d6e-4f70-8a9b-1c2d3e4f5a6b --include-step-outputs
```

Cancel/delete a run:

```bash
seclai runs delete 3f1a2b4c-5d6e-4f70-8a9b-1c2d3e4f5a6b
```

### Contents

Get content detail:

```bash
seclai contents get a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
seclai contents get a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d --start 0 --end 5000
```

Delete a content version:

```bash
seclai contents delete a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
```

List embeddings:

```bash
seclai contents embeddings a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
seclai contents embeddings a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d --page 1 --limit 20
```

Replace a content version by uploading a new file (keeps the same content version ID):

```bash
seclai contents upload a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d --file ./updated.pdf
seclai contents upload a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d --file ./updated.pdf --metadata '{"revision":2}'
seclai contents replace a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d --file ./updated.pdf  # alias
```

## Development

### Base URL

Overriding the base URL is intended for development/staging.

Set `SECLAI_API_URL` to point at a different API host:

```bash
export SECLAI_API_URL="https://example.invalid"
```

Or pass it per-invocation:

```bash
SECLAI_API_URL="https://example.invalid" seclai sources list
```

This is intentionally environment-variable-only (there is no CLI flag for it).

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

### Test global install locally

```bash
npm run build
npm link
seclai --help
```
