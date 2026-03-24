import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, readAiInput, withAiInputOptions } from "../helpers.js";

/** Register top-level `ai` commands: feedback, domain assistants (kb/source/solution/memory), accept/decline. */
export function register(program: Command, rt: CliRuntime): void {
  const ai = program.command("ai").description("Top-level AI assistant.");

  ai.command("feedback")
    .description("Submit AI feedback.")
    .option("--json <json>", "Feedback body JSON.")
    .option("--json-file <path>", "Feedback body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.submitAiFeedback(body as any));
      });
    });

  withAiInputOptions(
    ai.command("kb")
      .description("AI assistant for knowledge bases.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.aiAssistantKnowledgeBase(body as any));
      });
    });

  withAiInputOptions(
    ai.command("source")
      .description("AI assistant for sources.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.aiAssistantSource(body as any));
      });
    });

  withAiInputOptions(
    ai.command("solution")
      .description("AI assistant for solutions.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.aiAssistantSolution(body as any));
      });
    });

  withAiInputOptions(
    ai.command("memory")
      .description("AI assistant for memory banks.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.aiAssistantMemoryBank(body as any));
      });
    });

  ai.command("memory-history")
    .description("Get AI assistant memory bank conversation history.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAiAssistantMemoryBankHistory());
      });
    });

  ai.command("accept")
    .description("Accept an AI assistant plan.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Accept body JSON.")
    .option("--json-file <path>", "Accept body JSON file.")
    .action(async (conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.acceptAiAssistantPlan(conversationId, body as any));
      });
    });

  ai.command("decline")
    .description("Decline an AI assistant plan.")
    .argument("<conversationId>", "Conversation ID.")
    .action(async (conversationId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.declineAiAssistantPlan(conversationId);
        printJson(rt, { ok: true });
      });
    });

  ai.command("memory-accept")
    .description("Accept an AI memory bank suggestion.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Accept body JSON.")
    .option("--json-file <path>", "Accept body JSON file.")
    .action(async (conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.acceptAiMemoryBankSuggestion(conversationId, body as any));
      });
    });
}
