# Evaluations Workflow

## Step 1: Create evaluation criteria for an agent
```bash
seclai evals criteria create <agentId> --json '{"name":"Answer Accuracy","description":"Does the answer correctly address the question?","eval_type":"llm_judge"}'
```

## Step 2: Find runs to evaluate
```bash
# list all runs for an agent
seclai agents runs list <agentId> --limit 10

# or find runs compatible with specific criteria
seclai evals compatible-runs <criteriaId> --limit 10
```

## Step 3: Test criteria before committing
```bash
seclai evals test-draft <agentId> --json '{"criteria":{"name":"Answer Accuracy","eval_type":"llm_judge","description":"..."},"run_id":"<runId>"}'
```

## Step 4: Create evaluation results
```bash
seclai evals results create <criteriaId> --json '{"run_id":"<runId>","score":0.95}'
```

## Step 5: Review summaries
```bash
seclai evals criteria summary <criteriaId>
seclai evals agent-results <agentId>
seclai evals agent-runs <agentId> --limit 20
seclai evals non-manual-summary <agentId>
```

## Managing criteria
```bash
seclai evals criteria list <agentId> [--page N] [--limit N] [--paged]
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated Name"}'
seclai evals criteria delete <criteriaId>
```

`--paged` wraps the results in `{"data": [...]}` instead of returning a bare
array, so `.data` is a stable path to read whatever `--api-version` is in effect.
Nothing is invented: the `pagination` block appears only once the API sends one,
from `--api-version 2026-07-27`. Move scripts to `.data` first, then opt in to
get `.pagination`.

## Viewing results
```bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
```
