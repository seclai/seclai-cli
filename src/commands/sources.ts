import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  readJsonInput,
  buildUploadOpts,
  withFileUploadOptions,
  listOpts,
} from "../helpers.js";

/** Register `sources` commands: CRUD, file/text upload, exports, embedding migration. */
export function register(program: Command, rt: CliRuntime): void {
  const sources = program
    .command("sources")
    .alias("source")
    .description("Manage content sources.");

  // --- CRUD ---

  sources
    .command("list")
    .description("List sources.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .option("--sort <field>", "Sort field.")
    .option("--order <asc|desc>", "Sort direction.")
    .option("--account-id <id>", "Filter by account ID.")
    .action(async (opts) => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const client = createClient(globalOpts);
        const o: Record<string, unknown> = listOpts(opts);
        const acctId = opts.accountId || globalOpts.accountId;
        if (acctId) o.accountId = acctId;
        printJson(rt, await client.listSources(o));
      });
    });

  sources
    .command("create")
    .description("Create a source.")
    .option("--json <json>", "Source body JSON.")
    .option("--json-file <path>", "Source body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createSource(body as any));
      });
    });

  sources
    .command("get")
    .description("Get a source by ID.")
    .argument("<sourceId>", "Source ID.")
    .action(async (sourceId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getSource(sourceId));
      });
    });

  sources
    .command("update")
    .description("Update a source.")
    .argument("<sourceId>", "Source ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateSource(sourceId, body as any));
      });
    });

  sources
    .command("delete")
    .description("Delete a source.")
    .argument("<sourceId>", "Source ID.")
    .action(async (sourceId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteSource(sourceId);
        printJson(rt, { ok: true });
      });
    });

  // --- Upload ---

  const uploadCmd = sources.command("upload").description("Upload a file to a source.");
  withFileUploadOptions(uploadCmd)
    .argument("<sourceId>", "Source ID.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const uploadOpts = await buildUploadOpts(rt, opts);
        printJson(rt, await client.uploadFileToSource(sourceId, uploadOpts));
      });
    });

  sources
    .command("upload-text")
    .description("Upload inline text to a source.")
    .argument("<sourceId>", "Source ID.")
    .option("--json <json>", "Inline text body JSON.")
    .option("--json-file <path>", "Inline text body JSON file.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.uploadInlineTextToSource(sourceId, body as any));
      });
    });

  // --- Exports ---

  const exports_ = sources.command("exports").description("Manage source exports.");

  exports_
    .command("list")
    .description("List exports for a source.")
    .argument("<sourceId>", "Source ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listSourceExports(sourceId, listOpts(opts)));
      });
    });

  exports_
    .command("create")
    .description("Create an export.")
    .argument("<sourceId>", "Source ID.")
    .option("--json <json>", "Export body JSON.")
    .option("--json-file <path>", "Export body JSON file.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createSourceExport(sourceId, body as any));
      });
    });

  exports_
    .command("get")
    .description("Get an export.")
    .argument("<sourceId>", "Source ID.")
    .argument("<exportId>", "Export ID.")
    .action(async (sourceId: string, exportId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getSourceExport(sourceId, exportId));
      });
    });

  exports_
    .command("cancel")
    .description("Cancel an export.")
    .argument("<sourceId>", "Source ID.")
    .argument("<exportId>", "Export ID.")
    .action(async (sourceId: string, exportId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.cancelSourceExport(sourceId, exportId));
      });
    });

  exports_
    .command("delete")
    .description("Delete an export.")
    .argument("<sourceId>", "Source ID.")
    .argument("<exportId>", "Export ID.")
    .action(async (sourceId: string, exportId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteSourceExport(sourceId, exportId);
        printJson(rt, { ok: true });
      });
    });

  exports_
    .command("download")
    .description("Download an export (prints raw response body).")
    .argument("<sourceId>", "Source ID.")
    .argument("<exportId>", "Export ID.")
    .action(async (sourceId: string, exportId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const res = await client.downloadSourceExport(sourceId, exportId);
        rt.writeOut(await res.text());
      });
    });

  exports_
    .command("estimate")
    .description("Estimate an export.")
    .argument("<sourceId>", "Source ID.")
    .option("--json <json>", "Estimate body JSON.")
    .option("--json-file <path>", "Estimate body JSON file.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.estimateSourceExport(sourceId, body as any));
      });
    });

  // --- Embedding Migration ---

  const migration = sources.command("migration").description("Source embedding migrations.");

  migration
    .command("get")
    .description("Get migration status.")
    .argument("<sourceId>", "Source ID.")
    .action(async (sourceId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getSourceEmbeddingMigration(sourceId));
      });
    });

  migration
    .command("start")
    .description("Start an embedding migration.")
    .argument("<sourceId>", "Source ID.")
    .option("--json <json>", "Migration config JSON.")
    .option("--json-file <path>", "Migration config JSON file.")
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.startSourceEmbeddingMigration(sourceId, body as any));
      });
    });

  migration
    .command("cancel")
    .description("Cancel an embedding migration.")
    .argument("<sourceId>", "Source ID.")
    .action(async (sourceId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.cancelSourceEmbeddingMigration(sourceId));
      });
    });
}
