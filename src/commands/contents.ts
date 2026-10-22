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
  writeDownload,
} from "../helpers.js";

/** Register `contents` commands: get, delete, upload/replace, replace-text, embeddings, attachments. */
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

  // --- Attachments ---

  const attachments = contents
    .command("attachments")
    .description("Files attached to a content item: email attachments, feed enclosures, page media, document images.");

  attachments
    .command("list")
    .description("List a content item's attachments with their indexing status.")
    .argument("<contentVersionId>", "Content version ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .action(async (contentVersionId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listContentAttachments(contentVersionId, listOpts(opts)));
      });
    });

  attachments
    .command("get")
    .description("Get one attachment: its status, metadata, and the text it is indexed by.")
    .argument("<contentVersionId>", "Content version ID.")
    .argument("<attachmentId>", "Attachment ID, from 'contents attachments list'.")
    .option("--start <n>", "Text start offset (0-based, server default 0).", parseNumber)
    .option("--end <n>", "Text end offset (exclusive, server default 5000; 0 returns no text).", parseNumber)
    .action(async (contentVersionId: string, attachmentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: { start?: number; end?: number } = {};
        if (opts.start !== undefined) o.start = opts.start;
        if (opts.end !== undefined) o.end = opts.end;
        printJson(rt, await client.getContentAttachment(contentVersionId, attachmentId, o));
      });
    });

  attachments
    .command("embeddings")
    .description("List the embeddings an attachment is indexed by.")
    .argument("<contentVersionId>", "Content version ID.")
    .argument("<attachmentId>", "Attachment ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size (1-100).", parseNumber)
    .action(async (contentVersionId: string, attachmentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(
          rt,
          await client.listContentAttachmentEmbeddings(contentVersionId, attachmentId, listOpts(opts)),
        );
      });
    });

  attachments
    .command("download")
    .description(
      "Download an attachment's bytes. The API answers 403 for a file withheld by governance " +
        "or still being indexed; the attachment's file_withheld field says which.",
    )
    .argument("<contentVersionId>", "Content version ID.")
    .argument("<attachmentId>", "Attachment ID.")
    .option("--output <path>", "Write the bytes to this file. If omitted, raw bytes are written to stdout.")
    .action(async (contentVersionId: string, attachmentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const res = await client.downloadContentAttachment(contentVersionId, attachmentId);
        await writeDownload(rt, res, opts.output);
      });
    });
}
