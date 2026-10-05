# Cloud drives

The cloud-drive connections that file triggers, drive steps and `cloud_drive`
sources read from. Connecting a drive is an OAuth flow in the app, so there is
no `create` here — these commands inspect and maintain connections that exist.

## Connections

```bash
seclai cloud-drives providers            # providers that can be connected, with their access levels
seclai cloud-drives list
seclai cloud-drives get <connectionId>
```

The listings print a plain array on every API version. A connection's `status`
is one of `active`, `pending_auth`, `error` or `disconnected`, and `last_error`
holds the most recent sync or authorization failure.

## Rename or re-point

```bash
seclai cloud-drives update <connectionId> --name "Contracts"
seclai cloud-drives update <connectionId> --folder-path "/Inbox"
seclai cloud-drives update <connectionId> --folder-path "/Shared drives/Legal/Inbox"
seclai cloud-drives update <connectionId> --whole-drive
```

Only the fields you pass change. Changing the folder resets the sync cursor, so
files already in the new folder do not fire triggers — only later changes do.
An empty `--folder-path` is refused, because the API reads it as the whole
drive; pass `--whole-drive` when that is what you mean.

## Why did my agent not run for a file?

```bash
seclai cloud-drives rejections <connectionId> [--limit N]
```

A skipped file fires no trigger and appears nowhere else. Each rejection carries
a `reason`: `too_large`, `download_failed` or `flood`. Newest first; `--limit`
takes 1 to 200 and defaults to 50.

## Disconnect or delete

```bash
seclai cloud-drives agents <connectionId>      # agents using the connection
seclai cloud-drives disconnect <connectionId>  # revoke tokens, keep the connection
seclai cloud-drives delete <connectionId>
```

`disconnect` prints the connection in its disconnected state; agents bound to it
stop firing until it is reconnected from the app.

`delete` is refused with a 409 while an agent trigger or a content source still
depends on the connection. `agents` lists the agents but not the content
sources, so an empty result does not mean the delete will go through — the 409
is the authoritative answer.
