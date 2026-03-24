import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson } from "../helpers.js";

/** Register the `search` command for querying across Seclai resources. */
export function register(program: Command, rt: CliRuntime): void {
  program
    .command("search")
    .description("Search across Seclai resources.")
    .requiredOption("--query <text>", "Search query text.")
    .option("--limit <n>", "Max results.", (v: string) => Number(v))
    .option("--entity-type <type>", "Filter by entity type (e.g. agent, source, knowledge_base, memory_bank).")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Record<string, unknown> = { query: opts.query };
        if (opts.limit !== undefined) o.limit = opts.limit;
        if (opts.entityType) o.entityType = opts.entityType;
        printJson(rt, await client.search(o as any));
      });
    });
}
