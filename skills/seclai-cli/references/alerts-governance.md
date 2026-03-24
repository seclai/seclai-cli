# Seclai CLI — Alerts, Governance, Models & Search

## Alerts
```bash
seclai alerts list [--page N] [--limit N] [--status <s>] [--severity <s>]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Fixed"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
```

## Alert Configurations
```bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"My Config",...}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"name":"Updated"}'
seclai alerts configs delete <configId>
```

## Alert Preferences
```bash
seclai alerts prefs list
seclai alerts prefs update <orgId> <alertType> --json '{"enabled":true}'
```

## Governance AI
```bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
```

## Model Alerts
```bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
seclai models recommendations <modelId>
```

## Search
```bash
seclai search --query "deployment guide" [--limit N] [--entity-type <type>]
```

## AI Assistant
```bash
seclai ai feedback --json '{"feedback":"..."}'
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"
seclai ai memory-history
seclai ai accept <conversationId> --json '{"accepted":true}'
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> --json '{"accepted":true}'
```
