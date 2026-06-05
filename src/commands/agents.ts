import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  readJsonInput,
  readAiInput,
  withAiInputOptions,
  listOpts,
} from "../helpers.js";

/** Register `agents` commands: CRUD, run (basic/stream/events/poll), runs, definition, export, input uploads, AI assistant. */
export function register(program: Command, rt: CliRuntime): void {
  const agents = program
    .command("agents")
    .description("Manage agents, runs, definitions, export, and AI assistance.");

  // --- CRUD ---

  agents
    .command("list")
    .description("List agents.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listAgents(listOpts(opts)));
      });
    });

  agents
    .command("create")
    .description("Create a new agent.")
    .option("--json <json>", "Inline JSON body. Use '-' for stdin.")
    .option("--json-file <path>", "JSON file path. Use '-' for stdin.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createAgent(body as any));
      });
    });

  agents
    .command("get")
    .description("Get an agent by ID.")
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgent(agentId));
      });
    });

  agents
    .command("update")
    .description("Update an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--json <json>", "Inline JSON body.")
    .option("--json-file <path>", "JSON file path.")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateAgent(agentId, body as any));
      });
    });

  agents
    .command("delete")
    .description("Delete an agent.")
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteAgent(agentId);
        printJson(rt, { ok: true });
      });
    });

  // --- Run ---

  agents
    .command("run")
    .description("Run an agent. Use --stream/--events/--poll for different modes.")
    .argument("<agentId>", "Agent ID.")
    .option("--json <json>", "Inline JSON body. Use '-' for stdin.")
    .option("--json-file <path>", "JSON file path. Use '-' for stdin.")
    .option("--stream", "Stream and print final result when done.")
    .option("--events", "Stream SSE events as newline-delimited JSON.")
    .option("--event-filter <types>", "Comma-separated event types to show (with --events).")
    .option("--output <mode>", "Output mode: 'full' prints entire event, 'data' prints only the data field, 'status' prints a one-line summary.", "full")
    .option("--poll", "Poll until completion instead of streaming.")
    .option("--poll-interval-ms <n>", "Poll interval in ms (with --poll).", (v: string) => Number(v))
    .option("--timeout-ms <n>", "Client-side timeout in ms.", (v: string) => Number(v))
    .option("--include-step-outputs", "Include step outputs (with --poll).")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });

        if (opts.events) {
          // Stream SSE events as NDJSON
          const filterSet = opts.eventFilter
            ? new Set(opts.eventFilter.split(",").map((s: string) => s.trim()))
            : undefined;

          const stream = client.runStreamingAgent(
            agentId,
            body as any,
            opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : undefined
          );

          for await (const event of stream) {
            if (filterSet && !filterSet.has((event as any).type ?? "")) continue;

            if (opts.output === "data") {
              rt.writeOut(JSON.stringify((event as any).data ?? event) + "\n");
            } else if (opts.output === "status") {
              const e = event as any;
              rt.writeOut(`${e.type ?? "event"}: ${e.status ?? JSON.stringify(e.data ?? e)}\n`);
            } else {
              rt.writeOut(JSON.stringify(event) + "\n");
            }
          }
          return;
        }

        if (opts.poll) {
          const pollOpts: Record<string, unknown> = {};
          if (opts.pollIntervalMs !== undefined) pollOpts.pollIntervalMs = opts.pollIntervalMs;
          if (opts.timeoutMs !== undefined) pollOpts.timeoutMs = opts.timeoutMs;
          if (opts.includeStepOutputs) pollOpts.includeStepOutputs = true;
          printJson(rt, await client.runAgentAndPoll(agentId, body as any, pollOpts as any));
          return;
        }

        if (opts.stream) {
          printJson(
            rt,
            await client.runStreamingAgentAndWait(
              agentId,
              body as any,
              opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : undefined
            )
          );
          return;
        }

        printJson(rt, await client.runAgent(agentId, body as any));
      });
    });

  // --- Runs ---

  const runs = agents.command("runs").description("Manage agent runs.");

  runs
    .command("list")
    .description("List runs for an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .option("--status <status>", "Filter by run status (e.g. queued, running, completed, failed, cancelled).")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Record<string, unknown> = listOpts(opts);
        if (opts.status) o.status = opts.status;
        printJson(rt, await client.listAgentRuns(agentId, o));
      });
    });

  runs
    .command("get")
    .description("Get a specific run.")
    .argument("<runId>", "Run ID.")
    .option("--include-step-outputs", "Include step-level outputs.")
    .action(async (runId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(
          rt,
          await client.getAgentRun(runId, opts.includeStepOutputs ? { includeStepOutputs: true } : undefined)
        );
      });
    });

  runs
    .command("delete")
    .description("Delete a run.")
    .argument("<runId>", "Run ID.")
    .action(async (runId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteAgentRun(runId);
        printJson(rt, { ok: true });
      });
    });

  runs
    .command("cancel")
    .description("Cancel a running agent run.")
    .argument("<runId>", "Run ID.")
    .action(async (runId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.cancelAgentRun(runId));
      });
    });

  runs
    .command("search")
    .description("Search agent runs.")
    .option("--json <json>", "Search body JSON.")
    .option("--json-file <path>", "Search body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.searchAgentRuns(body as any));
      });
    });

  runs
    .command("download-attachment")
    .description(
      "Download a file attachment emitted by a step in an agent run. " +
        "The attachmentId is the URL-safe-base64 storage_key from run output manifests / webhooks.",
    )
    .argument("<runId>", "Run ID.")
    .argument("<attachmentId>", "Attachment ID (storage_key).")
    .option("--download-name <name>", "Filename hint for the download disposition.")
    .option("--output <path>", "Write the attachment bytes to this file. If omitted, raw bytes are written to stdout.")
    .action(async (runId: string, attachmentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const res = await client.downloadAgentRunAttachment(
          runId,
          attachmentId,
          opts.downloadName ? { downloadName: opts.downloadName } : {},
        );
        if (opts.output) {
          const { createWriteStream } = await import("node:fs");
          const { stat } = await import("node:fs/promises");
          if (res.body) {
            // Stream the body straight to disk so large attachments never get
            // buffered fully in memory.
            const { Readable } = await import("node:stream");
            const { pipeline } = await import("node:stream/promises");
            await pipeline(
              Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
              createWriteStream(opts.output),
            );
          } else {
            // Fallback for runtimes/mocks without a streamable body.
            const { writeFile } = await import("node:fs/promises");
            await writeFile(opts.output, Buffer.from(await res.arrayBuffer()));
          }
          const { size } = await stat(opts.output);
          printJson(rt, { saved: opts.output, bytes: size });
        } else {
          rt.writeOutBytes(new Uint8Array(await res.arrayBuffer()));
        }
      });
    });

  // --- Definition ---

  const def = agents.command("def").description("Agent definition (step workflow).");

  def
    .command("get")
    .description("Get agent definition.")
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentDefinition(agentId));
      });
    });

  def
    .command("update")
    .description("Update agent definition.")
    .argument("<agentId>", "Agent ID.")
    .option("--json <json>", "Definition JSON body.")
    .option("--json-file <path>", "Definition JSON file.")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateAgentDefinition(agentId, body as any));
      });
    });

  // --- Export / Import ---

  agents
    .command("export")
    .description("Export an agent definition as a portable JSON snapshot.")
    .argument("<agentId>", "Agent ID.")
    .option("--no-download", "Omit Content-Disposition header (inline response).")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.exportAgent(agentId, opts.download as boolean));
      });
    });

  agents
    .command("preview-import")
    .description(
      "Validate an agent_definition payload without creating any agent. " +
        "Reports step/schedule/alert/criteria/policy counts and any unresolved_refs " +
        "(workflow refs to KBs, memory banks, source connections, or sub-agents " +
        "that don't exist in this account).",
    )
    .option("--json <json>", "Inline JSON body ({ agent_definition: ... }). Use '-' for stdin.")
    .option("--json-file <path>", "JSON file path. Use '-' for stdin.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.previewImportAgent(body as any));
      });
    });

  // --- Input uploads ---

  agents
    .command("upload-input")
    .description("Upload a file as agent input.")
    .argument("<agentId>", "Agent ID.")
    .requiredOption("--file <path>", "File to upload.")
    .option("--file-name <name>", "Override filename.")
    .option("--mime-type <type>", "MIME type.")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const { readFile } = await import("node:fs/promises");
        const bytes = new Uint8Array(await readFile(opts.file));
        const o: Record<string, unknown> = { file: bytes };
        if (opts.fileName) o.fileName = opts.fileName;
        if (opts.mimeType) o.mimeType = opts.mimeType;
        printJson(rt, await client.uploadAgentInput(agentId, o as any));
      });
    });

  agents
    .command("input-status")
    .description("Check agent input upload status.")
    .argument("<agentId>", "Agent ID.")
    .argument("<uploadId>", "Upload ID.")
    .action(async (agentId: string, uploadId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentInputUploadStatus(agentId, uploadId));
      });
    });

  agents
    .command("attachment-references")
    .description(
      "Show which files (if any) an agent's templates expect on a run. " +
        "Call before staging uploads: requires_uploads reports whether the agent accepts files, " +
        "and the agent block lists the exact names / indexes / patterns a run-time batch must satisfy.",
    )
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentAttachmentReferences(agentId));
      });
    });

  // --- AI Assistant ---

  const ai = agents.command("ai").description("Agent AI assistant.");

  withAiInputOptions(
    ai.command("gen-steps")
      .description("Generate agent steps via AI.")
      .argument("<agentId>", "Agent ID.")
  ).action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateAgentSteps(agentId, body as any));
      });
    });

  withAiInputOptions(
    ai.command("step-config")
      .description("Generate step config via AI.")
      .argument("<agentId>", "Agent ID.")
  ).action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readAiInput(rt, opts);
        printJson(rt, await client.generateStepConfig(agentId, body as any));
      });
    });

  ai.command("history")
    .description("Get agent AI conversation history.")
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentAiConversationHistory(agentId));
      });
    });

  ai.command("mark")
    .description("Mark an AI suggestion (accept/reject).")
    .argument("<agentId>", "Agent ID.")
    .argument("<conversationId>", "Conversation ID.")
    .option("--json <json>", "Mark body JSON.")
    .option("--json-file <path>", "Mark body JSON file.")
    .action(async (agentId: string, conversationId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        await client.markAgentAiSuggestion(agentId, conversationId, body as any);
        printJson(rt, { ok: true });
      });
    });

  // --- Run eval results (under runs) ---

  runs
    .command("eval-results")
    .description("List evaluation results for a run.")
    .argument("<agentId>", "Agent ID.")
    .argument("<runId>", "Run ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (agentId: string, runId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listRunEvaluationResults(agentId, runId, listOpts(opts)));
      });
    });
}
