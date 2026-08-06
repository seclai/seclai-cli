import { Command, Option } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, parseNumber } from "../helpers.js";

/** Register the `search` command for querying across Seclai resources, and `docs search`. */
export function register(program: Command, rt: CliRuntime): void {
  program
    .command("search")
    .description("Search across Seclai resources.")
    .requiredOption("--query <text>", "Search query text.")
    .option("--limit <n>", "Max results.", parseNumber)
    .option("--entity-type <type>", "Filter by entity type (e.g. agent, source, knowledge_base, memory_bank).")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.search>[0] = { query: opts.query };
        if (opts.limit !== undefined) o.limit = opts.limit;
        // `!== undefined`, not truthiness: `--entity-type "$T"` with T unset
        // would otherwise be dropped and silently return every entity type.
        if (opts.entityType !== undefined) o.entityType = opts.entityType;
        printJson(rt, await client.search(o));
      });
    });

  const docs = program.command("docs").description("Seclai documentation.");

  docs
    .command("search")
    .description("Search the Seclai documentation.")
    .requiredOption("--query <text>", "Search query text.")
    // The SDK types this as a closed union, so an unrecognised mode can only
    // ever be a 422. Fail the parse with the accepted values instead.
    .addOption(new Option("--mode <mode>", "Search mode.").choices(["keyword", "semantic"]))
    .option("--limit <n>", "Max results.", parseNumber)
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.searchDocs>[0] = { query: opts.query };
        if (opts.mode !== undefined) o.mode = opts.mode;
        if (opts.limit !== undefined) o.limit = opts.limit;
        printJson(rt, await client.searchDocs(o));
      });
    });
}
