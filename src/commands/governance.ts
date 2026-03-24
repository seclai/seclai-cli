import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readAiInput, withAiInputOptions } from "../helpers.js";

/** Register `governance` commands: AI-assisted generate, list, accept, decline. */
export function register(program: Command, rt: CliRuntime): void {
  const governance = program.command("governance").description("Governance AI assistant.");

  const ai = governance.command("ai").description("Governance AI operations.");

  withAiInputOptions(
    ai.command("generate")
      .description("Generate a governance AI plan.")
  ).action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateGovernanceAiPlan(body as any));
      });
    });

  ai.command("list")
    .description("List governance AI conversations.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listGovernanceAiConversations());
      });
    });

  ai.command("accept")
    .description("Accept a governance AI plan.")
    .argument("<conversationId>", "Conversation ID.")
    .action(async (conversationId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.acceptGovernanceAiPlan(conversationId));
      });
    });

  ai.command("decline")
    .description("Decline a governance AI plan.")
    .argument("<conversationId>", "Conversation ID.")
    .action(async (conversationId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.declineGovernanceAiPlan(conversationId);
        printJson(rt, { ok: true });
      });
    });
}
