# Seclai CLI — Evaluations & Solutions

## Evaluation Criteria
```bash
seclai evals criteria list <agentId> [--page N] [--limit N]
seclai evals criteria create <agentId> --json '{"name":"Quality",...}'
seclai evals criteria get <criteriaId>
seclai evals criteria update <criteriaId> --json '{"name":"Updated"}'
seclai evals criteria delete <criteriaId>
seclai evals criteria summary <criteriaId>
```

## Evaluation Results
```bash
seclai evals results list <criteriaId> [--page N] [--limit N]
seclai evals results create <criteriaId> --json '{"run_id":"...","score":0.9}'
```

## Other Evaluation Commands
```bash
seclai evals compatible-runs <criteriaId> [--page N] [--limit N]
seclai evals test-draft <agentId> --json '{"criteria":{...},"run_id":"..."}'
seclai evals agent-results <agentId> [--page N] [--limit N]
seclai evals agent-runs <agentId> [--page N] [--limit N]
seclai evals non-manual-summary <agentId>
```

## Solutions
```bash
seclai solutions list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai solutions create --json '{"name":"My Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Updated"}'
seclai solutions delete <solutionId>
```

## Solution Links
```bash
seclai solutions link <solutionId> --agents '["id1","id2"]' --kb '["id3"]' --sources '["id4"]'
seclai solutions unlink <solutionId> --agents '["id1"]'
```

## Solution Conversations
```bash
seclai solutions convos list <solutionId>
seclai solutions convos add <solutionId> --json '{"message":"..."}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'
```

## Solution AI
```bash
seclai solutions ai generate <solutionId> --user-input "Add an FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base"
seclai solutions ai source <solutionId> --user-input "Create a file source"
seclai solutions ai accept <solutionId> <conversationId> --json '{"accepted":true}'
seclai solutions ai decline <solutionId> <conversationId>
```
