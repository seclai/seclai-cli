import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, readAiInput, withAiInputOptions, listOpts } from "../helpers.js";

/** Register `solutions` commands: CRUD, link/unlink, conversations, AI assistant. */
export function register(program: Command, rt: CliRuntime): void {
  const solutions = program.command("solutions").description("Manage solutions.");

  // --- CRUD ---

  solutions
    .command("list")
    .description("List solutions.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .option("--sort <field>", "Sort field.")
    .option("--order <asc|desc>", "Sort direction.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listSolutions(listOpts(opts)));
      });
    });

  solutions
    .command("create")
    .description("Create a solution.")
    .option("--json <json>", "Body JSON.")
    .option("--json-file <path>", "Body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createSolution(body as any));
      });
    });

  solutions
    .command("get")
    .description("Get a solution.")
    .argument("<solutionId>", "Solution ID.")
    .action(async (solutionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getSolution(solutionId));
      });
    });

  solutions
    .command("update")
    .description("Update a solution.")
    .argument("<solutionId>", "Solution ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateSolution(solutionId, body as any));
      });
    });

  solutions
    .command("delete")
    .description("Delete a solution.")
    .argument("<solutionId>", "Solution ID.")
    .action(async (solutionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteSolution(solutionId);
        printJson(rt, { ok: true });
      });
    });

  // --- Link / Unlink ---

  solutions
    .command("link")
    .description("Link resources to a solution. Use --agents, --kb, or --sources with JSON array of IDs.")
    .argument("<solutionId>", "Solution ID.")
    .option("--agents <json>", "Link agents (JSON body).")
    .option("--kb <json>", "Link knowledge bases (JSON body).")
    .option("--sources <json>", "Link sources (JSON body).")
    .action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        if (opts.agents) {
          const body = JSON.parse(opts.agents);
          printJson(rt, await client.linkAgentsToSolution(solutionId, body));
        }
        if (opts.kb) {
          const body = JSON.parse(opts.kb);
          printJson(rt, await client.linkKnowledgeBasesToSolution(solutionId, body));
        }
        if (opts.sources) {
          const body = JSON.parse(opts.sources);
          printJson(rt, await client.linkSourceConnectionsToSolution(solutionId, body));
        }
      });
    });

  solutions
    .command("unlink")
    .description("Unlink resources from a solution. Use --agents, --kb, or --sources with JSON array of IDs.")
    .argument("<solutionId>", "Solution ID.")
    .option("--agents <json>", "Unlink agents (JSON body).")
    .option("--kb <json>", "Unlink knowledge bases (JSON body).")
    .option("--sources <json>", "Unlink sources (JSON body).")
    .action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        if (opts.agents) {
          const body = JSON.parse(opts.agents);
          printJson(rt, await client.unlinkAgentsFromSolution(solutionId, body));
        }
        if (opts.kb) {
          const body = JSON.parse(opts.kb);
          printJson(rt, await client.unlinkKnowledgeBasesFromSolution(solutionId, body));
        }
        if (opts.sources) {
          const body = JSON.parse(opts.sources);
          printJson(rt, await client.unlinkSourceConnectionsFromSolution(solutionId, body));
        }
      });
    });

  // --- Conversations ---

  const convos = solutions.command("convos").description("Solution conversations.");

  convos
    .command("list")
    .description("List conversations for a solution.")
    .argument("<solutionId>", "Solution ID.")
    .action(async (solutionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listSolutionConversations(solutionId));
      });
    });

  convos
    .command("add")
    .description("Add a conversation turn.")
    .argument("<solutionId>", "Solution ID.")
    .option("--json <json>", "Turn body JSON.")
    .option("--json-file <path>", "Turn body JSON file.")
    .action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.addSolutionConversationTurn(solutionId, body as any));
      });
    });

  convos
    .command("mark")
    .description("Mark a conversation turn.")
    .argument("<solutionId>", "Solution ID.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Mark body JSON.")
    .option("--json-file <path>", "Mark body JSON file.")
    .action(async (solutionId: string, conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        await client.markSolutionConversationTurn(solutionId, conversationId, body as any);
        printJson(rt, { ok: true });
      });
    });

  // --- AI ---

  const ai = solutions.command("ai").description("Solution AI assistant.");

  withAiInputOptions(
    ai.command("generate")
      .description("Generate a solution AI plan.")
      .argument("<solutionId>", "Solution ID.")
  ).action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateSolutionAiPlan(solutionId, body as any));
      });
    });

  withAiInputOptions(
    ai.command("kb")
      .description("Generate a KB plan via solution AI.")
      .argument("<solutionId>", "Solution ID.")
  ).action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateSolutionAiKnowledgeBase(solutionId, body as any));
      });
    });

  withAiInputOptions(
    ai.command("source")
      .description("Generate a source plan via solution AI.")
      .argument("<solutionId>", "Solution ID.")
  ).action(async (solutionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateSolutionAiSource(solutionId, body as any));
      });
    });

  ai.command("accept")
    .description("Accept a solution AI plan.")
    .argument("<solutionId>", "Solution ID.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Accept body JSON.")
    .option("--json-file <path>", "Accept body JSON file.")
    .action(async (solutionId: string, conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.acceptSolutionAiPlan(solutionId, conversationId, body as any));
      });
    });

  ai.command("decline")
    .description("Decline a solution AI plan.")
    .argument("<solutionId>", "Solution ID.")
    .argument("<conversationId>", "Conversation ID.")
    .action(async (solutionId: string, conversationId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.declineSolutionAiPlan(solutionId, conversationId);
        printJson(rt, { ok: true });
      });
    });
}
