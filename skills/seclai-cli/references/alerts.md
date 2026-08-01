# Alerts

Account alerts, the configurations that raise them, and per-organization
delivery preferences.

Model-catalog alerts are separate — see [models.md](models.md).

## Alerts

```bash
seclai alerts list [--page N] [--limit N] [--status <status>]
seclai alerts get <alertId>
seclai alerts status <alertId> --json '{"status":"resolved"}'
seclai alerts comment <alertId> --json '{"comment":"Fixed the issue"}'
seclai alerts subscribe <alertId>
seclai alerts unsubscribe <alertId>
```

`GET /alerts` declares no severity filter. `--severity` still parses, but it is
ignored with a warning and will be removed — it never filtered anything. Filter
client-side instead:

```bash
seclai alerts list | jq '[.data[] | select(.severity == "high")]'
```

## Alert configurations

```bash
seclai alerts configs list [--page N] [--limit N]
seclai alerts configs create --json '{"name":"Latency Alert","description":"...","threshold":5000}'
seclai alerts configs get <configId>
seclai alerts configs update <configId> --json '{"threshold":3000}'
seclai alerts configs delete <configId>
```

## Organization preferences

```bash
seclai alerts prefs list
seclai alerts prefs update <organizationId> <alertType> --json '{"enabled":true}'
```

Preferences are per organization and per alert type, so `update` takes both.
