# Solutions and governance

Solutions group agents, knowledge bases and sources into one deliverable.
Governance defines the policies applied to agent input and output.

## Solutions

```bash
seclai solutions list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai solutions create --json '{"name":"Customer Support Solution"}'
seclai solutions get <solutionId>
seclai solutions update <solutionId> --json '{"name":"Updated"}'
seclai solutions delete <solutionId>
```

## Linking resources

```bash
# each flag takes a JSON array of IDs
seclai solutions link <solutionId> --agents '["agentId1"]' --kb '["kbId1"]' --sources '["sourceId1"]'
seclai solutions unlink <solutionId> --agents '["agentId1"]'
```

## Conversations

```bash
seclai solutions convos list <solutionId>
seclai solutions convos add <solutionId> --json '{"message":"How should I structure this?"}'
seclai solutions convos mark <solutionId> <conversationId> --json '{"accepted":true}'
```

## Solution AI

```bash
seclai solutions ai generate <solutionId> --user-input "Add an FAQ source"
seclai solutions ai kb <solutionId> --user-input "Create a knowledge base for docs"
seclai solutions ai source <solutionId> --user-input "Create a file source for PDFs"
seclai solutions ai accept <solutionId> <conversationId> --json '{"accepted":true}'
seclai solutions ai decline <solutionId> <conversationId>
```

`ai kb` and `ai source` create the resource and link it to the solution in one
step, which is why they live here rather than under `kb` or `sources`.

## Governance AI

```bash
seclai governance ai generate --user-input "Create a content safety policy"
seclai governance ai list
seclai governance ai accept <conversationId>
seclai governance ai decline <conversationId>
```

A generated policy is a proposal until accepted — `generate` alone changes
nothing.

## Example: solution with linked resources

```bash
seclai solutions create --json '{"name":"Customer Support"}'
seclai solutions link <solutionId> --agents '["<agentId>"]' --kb '["<kbId>"]' --sources '["<sourceId>"]'
seclai solutions get <solutionId>
```

## Example: governance policy setup

```bash
seclai governance ai generate --user-input "Create a content safety policy that blocks harmful outputs"
seclai governance ai list
seclai governance ai accept <conversationId>
```
