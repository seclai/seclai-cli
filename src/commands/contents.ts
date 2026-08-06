import { Command } from "commander";
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

/** Register `contents` commands: get, delete, upload/replace, replace-text, embeddings. */
export function register(program: Command, rt: CliRuntime): void {
  const contents = program
    .command("contents")
    .description("Manage indexed content and embeddings.");

  contents
    .command("get")
    .description("Get content version details.")
    .argument("<contentVersionId>", "Content version ID.")
    .option("--start <n>", "Text start offset (0-based).", parseNumber)
    .option("--end <n>", "Text end offset (exclusive).", parseNumber)
    .action(async (contentVersionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Record<string, unknown> = {};
        if (opts.start !== undefined) o.start = opts.start;
        if (opts.end !== undefined) o.end = opts.end;
        printJson(rt, await client.getContentDetail(contentVersionId, o));
      });
    });

  contents
    .command("delete")
    .description("Delete a content version.")
    .argument("<contentVersionId>", "Content version ID.")
    .action(async (contentVersionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteContent(contentVersionId);
        printJson(rt, { ok: true });
      });
    });

  const uploadCmd = contents.command("upload").alias("replace").description("Upload/replace content file.");
  withFileUploadOptions(uploadCmd)
    .argument("<contentVersionId>", "Content version ID.")
    .action(async (contentVersionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const uploadOpts = await buildUploadOpts(rt, opts);
        printJson(rt, await client.uploadFileToContent(contentVersionId, uploadOpts));
      });
    });

  contents
    .command("replace-text")
    .description("Replace content with inline text.")
    .argument("<contentVersionId>", "Content version ID.")
    .option("--json <json>", "Inline text body JSON.")
    .option("--json-file <path>", "Inline text body JSON file.")
    .action(async (contentVersionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.replaceContentWithInlineText(contentVersionId, body as any));
      });
    });

  contents
    .command("embeddings")
    .description("List embeddings for a content version.")
    .argument("<contentVersionId>", "Content version ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .action(async (contentVersionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listContentEmbeddings(contentVersionId, listOpts(opts)));
      });
    });
}
