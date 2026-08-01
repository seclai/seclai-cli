# Agent email

The domains agents send from, the inbound blocklist, inbound health, and
recipient opt-outs.

Per-agent inbound configuration (alias, sender allowlist) lives on the trigger —
see `agents triggers email-config` in [agents.md](agents.md).

## Sending domains

```bash
seclai email domains list
seclai email domains add --kind custom --value mail.example.com [--delegated]
seclai email domains verify <domainId>        # run a DNS check now
seclai email domains set-primary <domainId>
seclai email domains test-email <domainId>    # send a test to the account owner
seclai email domains dmarc <domainId> [--days N] [--top-sources N]
seclai email domains remove <domainId>
seclai email domains use-shared               # revert to agent.seclai.com
```

`--kind` is `vanity` (a subdomain of seclai.com) or `custom` (your own domain).
`add` returns the DNS records to publish; pass `--delegated` when the domain's
DNS is delegated to Seclai so those records are published for you. A domain must
verify before `set-primary` will accept it.

## Inbound sender blocklist

```bash
seclai email blocked list [--limit N] [--offset N]
seclai email blocked add --sender-email spam@example.com [--note "phishing"]
seclai email blocked add --sender-email example.com --match-type domain
seclai email blocked remove <blockedId>
seclai email blocked auto-block-mode disabled|input|input_and_output
```

`--match-type` is `address` (the default) or `domain`. `auto-block-mode` controls
whether a governance BLOCK on an authenticated sender adds them to the blocklist
automatically.

## Inbound health

```bash
seclai email inbound status          # quota usage, pause state, queued run counts
seclai email inbound rejections [--agent-id <id>] [--limit N]
seclai email inbound cancel-queued   # fail every over-quota parked run at once
seclai email inbound resume          # lift the account-wide pause
```

When inbound email exceeds quota, runs park in a QUEUED state and the account
pauses. `status` shows both; `cancel-queued` clears the backlog and `resume`
lifts the pause. Check `rejections` first — it reports why messages were turned
away, which is usually the more useful answer.

## Recipient opt-outs

```bash
seclai email optouts list [--agent-id <id>] [--limit N] [--offset N]
seclai email optouts remove <optoutId>
```

Removing an opt-out lets that recipient receive agent email again.
