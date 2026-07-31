# Top-level AI assistant

`seclai ai` creates resources from a natural-language description, without
starting from a solution or an agent. The domain-scoped assistants —
`agents ai`, `memory ai`, `solutions ai`, `governance ai` — live with their
resources.

```bash
seclai ai kb --user-input "Create a support knowledge base"
seclai ai source --user-input "Create a documentation source"
seclai ai solution --user-input "Build a customer support solution"
seclai ai memory --user-input "Create a conversation memory bank"

seclai ai memory-history
seclai ai accept <conversationId> --json '{"accepted":true}'
seclai ai decline <conversationId>
seclai ai memory-accept <conversationId> --json '{"accepted":true}'

seclai ai feedback --json '{"feedback":"The response was helpful"}'
```

## The generate-then-accept cycle

Every assistant command returns a *proposal* with a conversation ID. Nothing is
created until you accept it:

```bash
seclai ai kb --user-input "Create a support knowledge base"
# read the proposal, note the conversation id
seclai ai accept <conversationId> --json '{"accepted":true}'
```

Memory-bank proposals have their own accept command (`ai memory-accept`) and
their own history (`ai memory-history`); everything else uses `ai accept` /
`ai decline`.
