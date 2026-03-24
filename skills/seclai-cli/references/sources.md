# Seclai CLI — Sources

## CRUD
```bash
seclai sources list [--page N] [--limit N] [--sort field] [--order asc|desc] [--account-id id]
seclai sources create --json '{"name":"My Source",...}'
seclai sources get <sourceId>
seclai sources update <sourceId> --json '{"name":"Updated"}'
seclai sources delete <sourceId>
```

## File Upload
```bash
seclai sources upload <sourceId> --file ./doc.pdf [--title "Title"] [--metadata '{"k":"v"}'] [--file-name name] [--mime-type type]
seclai sources upload-text <sourceId> --json '{"text":"...","title":"..."}'
```

## Exports
```bash
seclai sources exports list <sourceId> [--page N] [--limit N]
seclai sources exports create <sourceId> --json '{"format":"..."}'
seclai sources exports get <sourceId> <exportId>
seclai sources exports cancel <sourceId> <exportId>
seclai sources exports delete <sourceId> <exportId>
seclai sources exports download <sourceId> <exportId>
seclai sources exports estimate <sourceId> --json '{"format":"..."}'
```

## Embedding Migration
```bash
seclai sources migration get <sourceId>
seclai sources migration start <sourceId> --json '{"target_model":"..."}'
seclai sources migration cancel <sourceId>
```
