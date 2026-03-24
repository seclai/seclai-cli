# Seclai CLI — Knowledge Bases & Memory Banks

## Knowledge Bases
```bash
seclai kb list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai kb create --json '{"name":"My KB",...}'
seclai kb get <kbId>
seclai kb update <kbId> --json '{"name":"Updated"}'
seclai kb delete <kbId>
```

## Memory Banks
```bash
seclai memory list [--page N] [--limit N] [--sort field] [--order asc|desc]
seclai memory create --json '{"name":"My Bank","type":"conversation"}'
seclai memory get <memoryBankId>
seclai memory update <memoryBankId> --json '{"name":"Updated"}'
seclai memory delete <memoryBankId>
```

## Memory Bank Utilities
```bash
seclai memory stats <memoryBankId>
seclai memory agents <memoryBankId>
seclai memory compact <memoryBankId>
seclai memory delete-source <memoryBankId>
seclai memory templates
seclai memory test-compaction <memoryBankId> --json '{"prompt":"..."}'
seclai memory test-compaction-standalone --json '{"prompt":"..."}'
```

## Memory Bank AI
```bash
seclai memory ai generate --user-input "Configure compaction for chat memory"
seclai memory ai last
seclai memory ai accept <conversationId> --json '{"accepted":true}'
```
