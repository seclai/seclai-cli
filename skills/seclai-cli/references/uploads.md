# File Uploads & Content Management

## Upload to a source
```bash
seclai sources upload <sourceId> --file ./doc.pdf
seclai sources upload <sourceId> --file ./doc.pdf --title "My Doc" --metadata '{"category":"docs"}' --file-name "custom-name.pdf" --mime-type "application/pdf"
seclai sources upload <sourceId> --file ./doc.pdf --metadata-file ./meta.json
```

## Upload text directly
```bash
seclai sources upload-text <sourceId> --json '{"text":"Article content here...","title":"My Article"}'
```

## Upload input for agent runs
```bash
# Check what files (if any) the agent expects before uploading. requires_uploads
# reports whether the agent accepts files; the agent block lists the exact names /
# indexes / patterns a run-time batch must satisfy.
seclai agents attachment-references <agentId>
seclai agents upload-input <agentId> --file ./input.pdf
seclai agents upload-input <agentId> --file ./data.csv --file-name "report.csv" --mime-type "text/csv"
seclai agents input-status <agentId> <uploadId>
```

## Download an attachment emitted by a run
```bash
# attachmentId is the URL-safe-base64 storage_key from run output manifests / webhooks.
seclai agents runs download-attachment <runId> <attachmentId> --output ./out.pdf
```

## Replace content
```bash
# replace with file
seclai contents upload <contentVersionId> --file ./updated.pdf

# replace with text
seclai contents replace-text <contentVersionId> --json '{"text":"Updated content","title":"Revised Article"}'
```

## Read content
```bash
# full content
seclai contents get <contentVersionId>

# text slice (0-based offsets)
seclai contents get <contentVersionId> --start 0 --end 1000

# view embeddings
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
```
