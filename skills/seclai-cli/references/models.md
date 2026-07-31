# Models

The model catalog, media-generation tiers, model-catalog alerts, recommendations
and the playground.

## Catalog

```bash
seclai models list [--provider <name>] [--supports-tool-use] [--supports-thinking]
seclai models list [--supports-input-media <media>] [--supports-output-media <media>]
seclai models get <modelId>

# each media-generation modality and tier, with its model and cost
seclai models tiers
```

The capability flags compose, so `--supports-tool-use --supports-thinking`
returns only models with both. `--supports-input-media` / `--supports-output-media`
take a modality such as `image`, `audio` or `video`.

## Model alerts

```bash
seclai models alerts list [--page N] [--limit N]
seclai models alerts mark-read <alertId>
seclai models alerts mark-all-read
seclai models alerts unread-count
```

These are catalog alerts — deprecations, price changes, new models — not the
account alerts in [alerts.md](alerts.md).

## Recommendations

```bash
seclai models recommendations <modelId>
```

Suggests replacements for a model, which is how you act on a deprecation alert.

## Playground experiments

```bash
seclai models experiments list [--days N] [--start-date <date>] [--end-date <date>] [--limit N] [--offset N]
seclai models experiments create --json '{"model_ids":["gpt-4o"],"prompt":"Compare responses"}'
seclai models experiments get <experimentId>
seclai models experiments cancel <experimentId>
seclai models experiments delete <experimentId>  # soft-delete, preserves audit history
```

`create` takes several `model_ids` and runs the same prompt against each, which
is the point — side-by-side comparison. `cancel` stops a running experiment;
`delete` soft-deletes a finished one.
