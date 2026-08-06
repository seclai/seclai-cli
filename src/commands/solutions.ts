import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, readAiInput, withAiInputOptions, listOpts, parseNumber } from "../helpers.js";

/** Register `solutions` commands: CRUD, link/unlink, conversations, AI assistant. */
export function register(program: Command, rt: CliRuntime): void {
  const solutions = program.command("solutions").description("Manage solutions.");

  // --- CRUD ---

  solutions
    .command("list")
    .description("List solutions.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
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
        if (!opts.agents && !opts.kb && !opts.sources) {
          rt.writeErr("Provide at least one of --agents, --kb, or --sources.\n");
          rt.setExitCode(1);
          return;
        }
        const client = createClient(program.opts<GlobalOptions>());
        const results: Record<string, unknown> = {};
        if (opts.agents) {
          results.agents = await client.linkAgentsToSolution(solutionId, JSON.parse(opts.agents));
        }
        if (opts.kb) {
          results.knowledgeBases = await client.linkKnowledgeBasesToSolution(solutionId, JSON.parse(opts.kb));
        }
        if (opts.sources) {
          results.sources = await client.linkSourceConnectionsToSolution(solutionId, JSON.parse(opts.sources));
        }
        printJson(rt, results);
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
        if (!opts.agents && !opts.kb && !opts.sources) {
          rt.writeErr("Provide at least one of --agents, --kb, or --sources.\n");
          rt.setExitCode(1);
          return;
        }
        const client = createClient(program.opts<GlobalOptions>());
        const results: Record<string, unknown> = {};
        if (opts.agents) {
          results.agents = await client.unlinkAgentsFromSolution(solutionId, JSON.parse(opts.agents));
        }
        if (opts.kb) {
          results.knowledgeBases = await client.unlinkKnowledgeBasesFromSolution(solutionId, JSON.parse(opts.kb));
        }
        if (opts.sources) {
          results.sources = await client.unlinkSourceConnectionsFromSolution(solutionId, JSON.parse(opts.sources));
        }
        printJson(rt, results);
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
