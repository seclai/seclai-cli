# Sources, content, knowledge bases and memory banks

The ingestion side of Seclai: where documents come from, how they are indexed,
and the stores agents read from.

For upload mechanics — MIME types, size limits, metadata — see
[uploads.md](uploads.md).

## Sources

```bash
seclai sources list [--page N] [--limit N] [--sort field] [--order asc|desc] [--account-id id]
seclai sources create --json '{"name":"Docs","description":"Product documentation"}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Updated Docs"}'
seclai sources delete <sourceId>
```

`source` is accepted as an alias for `sources`.

## Source uploads

```bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "My Doc"] [--metadata '{"category":"docs"}'] [--file-name name] [--mime-type type]
seclai sources upload-text <sourceId> --json '{"text":"Article content here...","title":"My Article"}'
```

## Source exports

```bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId> --json '{"format":"jsonl"}'
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId> --json '{"format":"jsonl"}'
```

`estimate` reports the size and cost before you commit to `create`.

## Embedding migration

```bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId> --json '{"target_model":"text-embedding-3-large"}'
seclai sources migration cancel <sourceId>
```

## Contents (indexed content)

```bash
seclai contents get <contentVersionId> [--start N] [--end N]
seclai contents delete <contentVersionId>
seclai contents upload <contentVersionId> --file ./updated.pdf [--title "Title"] [--file-name name] [--mime-type type]
seclai contents replace-text <contentVersionId> --json '{"text":"Replacement text","title":"Updated"}'
seclai contents embeddings <contentVersionId> [--page N] [--limit N]
```

`--start` / `--end` on `contents get` slice the returned text by character
offset, which is how you inspect a long document without pulling all of it.

## Knowledge bases

```bash
seclai kb list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai kb create --json '{"name":"Support KB","description":"Customer support articles"}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Updated KB"}'
seclai kb delete <kbId>
```

## Memory banks

```bash
seclai memory list [--page N] [--limit N] [--sort field] [--order asc|desc]
# type: "conversation" (chat history) or "general" (structured facts)
seclai memory create --json '{"name":"Chat Memory","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Renamed"}'
seclai memory delete <memoryBankId>
```

### Utilities

```bash
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>        # agents using this bank
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> --json '{"prompt":"Summarize the conversation"}'
seclai memory test-compaction-standalone --json '{"prompt":"Summarize the conversation"}'
```

Both `test-compaction` commands are dry runs — they show what compaction would
produce without writing to the bank.

### Memory bank AI

```bash
seclai memory ai generate --user-input "Configure compaction for chat memory"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
```

## Example: create a source and upload content

```bash
seclai sources create --json '{"name":"Product Docs","description":"Product documentation source"}'
# note the id from the output
seclai sources upload <sourceId> --file ./docs.pdf --title "Product Manual" --metadata '{"version":"2.0"}'
seclai sources get <sourceId>
```
