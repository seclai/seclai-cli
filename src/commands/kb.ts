import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, listOpts, parseNumber } from "../helpers.js";

/** Register `kb` (knowledge base) commands: list, create, get, update, delete. */
export function register(program: Command, rt: CliRuntime): void {
  const kb = program.command("kb").description("Manage knowledge bases.");

  kb.command("list")
    .description("List knowledge bases.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option("--sort <field>", "Sort field.")
    .option("--order <asc|desc>", "Sort direction.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listKnowledgeBases(listOpts(opts)));
      });
    });

  kb.command("create")
    .description("Create a knowledge base.")
    .option("--json <json>", "Body JSON.")
    .option("--json-file <path>", "Body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createKnowledgeBase(body as any));
      });
    });

  kb.command("get")
    .description("Get a knowledge base.")
    .argument("<kbId>", "Knowledge base ID.")
    .action(async (kbId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getKnowledgeBase(kbId));
      });
    });

  kb.command("update")
    .description("Update a knowledge base.")
    .argument("<kbId>", "Knowledge base ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (kbId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateKnowledgeBase(kbId, body as any));
      });
    });

  kb.command("delete")
    .description("Delete a knowledge base.")
    .argument("<kbId>", "Knowledge base ID.")
    .action(async (kbId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteKnowledgeBase(kbId);
        printJson(rt, { ok: true });
      });
    });
}
