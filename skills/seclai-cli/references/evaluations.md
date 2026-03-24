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
seclai evals criteria list <agentId>
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated Name"}'
seclai evals criteria delete <criteriaId>
```

## Viewing results
```bash
seclai evals results list <criteriaId> [--page N] [--limit N]
```
