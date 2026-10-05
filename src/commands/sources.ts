import { Command, InvalidArgumentError } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  readJsonInput,
  buildUploadOpts,
  parseNumber,
  withFileUploadOptions,
  listOpts,
} from "../helpers.js";

/**
 * Collect a repeatable `--content-version-id`, refusing a blank value: dropping
 * one would turn a filtered listing into a wider one, or into every item.
 */
function collectContentVersionId(value: string, previous: string[] | undefined): string[] {
  const id = value.trim();
  if (id.length === 0) {
    throw new InvalidArgumentError("Expected a content version ID, not an empty value.");
  }
  return [...(previous ?? []), id];
}

/** Register `sources` commands: CRUD, file/text upload, content status, exports, embedding migration. */
export function register(program: Command, rt: CliRuntime): void {
  const sources = program
    .command("sources")
    .alias("source")
    .description("Manage content sources.");

  // --- CRUD ---

  sources
    .command("list")
    .description("List sources.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
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

  // --- Content indexing status ---

  const contents = sources
    .command("contents")
    .description("Indexing status of a source's content items.");

  contents
    .command("list")
    .description("List a source's content items and their indexing status.")
    .argument("<sourceId>", "Source ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size (1-100, default 20).", parseNumber)
    .option("--sort <field>", "Sort field: created_at, title or status.")
    .option("--order <asc|desc>", "Sort direction.")
    .option(
      "--status <status>",
      "Only items in one status: pending, fetching, transcribing, scanning, indexing, completed or failed.",
    )
    .option(
      "--content-version-id <id>",
      "Only this item, by the content_version_id an upload returned. Repeat to poll a batch; " +
        "keep one request to about 100 ids, because they travel in the URL and one over 8,192 bytes is rejected with a 414.",
      collectContentVersionId,
    )
    .action(async (sourceId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listSourceContents>[1] = listOpts(opts);
        if (opts.status !== undefined) o.status = opts.status;
        if (opts.contentVersionId !== undefined) o.contentVersionIds = opts.contentVersionId;
        printJson(rt, await client.listSourceContents(sourceId, o));
      });
    });

  contents
    .command("status")
    .description("Get one content item's indexing status.")
    .argument("<sourceId>", "Source ID.")
    .argument("<contentVersionId>", "The content_version_id an upload returned.")
    .action(async (sourceId: string, contentVersionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getSourceContentStatus(sourceId, contentVersionId));
      });
    });

  // --- Exports ---

  const exports_ = sources.command("exports").description("Manage source exports.");

  exports_
    .command("list")
    .description("List exports for a source.")
    .argument("<sourceId>", "Source ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
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
