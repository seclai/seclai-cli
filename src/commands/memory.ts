import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, readAiInput, withAiInputOptions, readJsonObjectInput, listOpts, parseNumber } from "../helpers.js";

/** Register `memory` commands: CRUD, stats, utilities, test-compaction, AI assistant. */
export function register(program: Command, rt: CliRuntime): void {
  const memory = program.command("memory").description("Manage memory banks.");

  // --- CRUD ---

  memory
    .command("list")
    .description("List memory banks.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option("--sort <field>", "Sort field.")
    .option("--order <asc|desc>", "Sort direction.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listMemoryBanks(listOpts(opts)));
      });
    });

  memory
    .command("create")
    .description("Create a memory bank.")
    .option("--json <json>", "Body JSON.")
    .option("--json-file <path>", "Body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createMemoryBank(body as any));
      });
    });

  memory
    .command("get")
    .description("Get a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getMemoryBank(memoryBankId));
      });
    });

  memory
    .command("update")
    .description("Update a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (memoryBankId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateMemoryBank(memoryBankId, body as any));
      });
    });

  memory
    .command("delete")
    .description("Delete a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteMemoryBank(memoryBankId);
        printJson(rt, { ok: true });
      });
    });

  // --- Stats & utilities ---

  memory
    .command("stats")
    .description("Get memory bank statistics.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getMemoryBankStats(memoryBankId));
      });
    });

  memory
    .command("agents")
    .description("List agents using a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentsUsingMemoryBank(memoryBankId));
      });
    });

  memory
    .command("compact")
    .description("Compact a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.compactMemoryBank(memoryBankId);
        printJson(rt, { ok: true });
      });
    });

  memory
    .command("delete-source")
    .description("Delete a memory bank's source data.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .action(async (memoryBankId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteMemoryBankSource(memoryBankId);
        printJson(rt, { ok: true });
      });
    });

  memory
    .command("templates")
    .description("List memory bank templates.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listMemoryBankTemplates());
      });
    });

  memory
    .command("test-compaction")
    .description("Test compaction on a memory bank.")
    .argument("<memoryBankId>", "Memory bank ID.")
    .option("--json <json>", "Test config JSON.")
    .option("--json-file <path>", "Test config JSON file.")
    .action(async (memoryBankId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.testMemoryBankCompaction(memoryBankId, body as any));
      });
    });

  memory
    .command("test-compaction-standalone")
    .description("Test compaction prompt standalone (no memory bank required).")
    .option("--json <json>", "Test config JSON.")
    .option("--json-file <path>", "Test config JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.testCompactionPromptStandalone(body as any));
      });
    });

  // --- AI ---

  const ai = memory.command("ai").description("Memory bank AI assistant.");

  withAiInputOptions(
    ai.command("generate")
      .description("Generate memory bank config via AI.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateMemoryBankConfig(body as any));
      });
    });

  ai.command("last")
    .description("Get last memory bank AI conversation.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getMemoryBankAiLastConversation());
      });
    });

  ai.command("accept")
    .description("Accept a memory bank AI suggestion.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Accept body JSON.")
    .option("--json-file <path>", "Accept body JSON file.")
    .action(async (conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.acceptMemoryBankAiSuggestion(conversationId, body as any));
      });
    });
}
