import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  Seclai,
  SeclaiAPIStatusError,
  SeclaiAPIValidationError,
  SeclaiConfigurationError,
} from "@seclai/sdk";

type GlobalOptions = {
  apiKey?: string;
};

export type CliRuntime = {
  stdin: NodeJS.ReadableStream;
  writeOut: (text: string) => void;
  writeErr: (text: string) => void;
  setExitCode: (code: number) => void;
};

function defaultRuntime(): CliRuntime {
  return {
    stdin: process.stdin,
    writeOut: (text) => {
      process.stdout.write(text);
    },
    writeErr: (text) => {
      process.stderr.write(text);
    },
    setExitCode: (code) => {
      process.exitCode = code;
    },
  };
}

async function readStdinText(rt: CliRuntime): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    rt.stdin.setEncoding("utf8");
    rt.stdin.on("data", (chunk: string) => (data += chunk));
    rt.stdin.on("end", () => resolve(data));
    rt.stdin.on("error", reject);
  });
}

async function readJsonInput(
  rt: CliRuntime,
  opts: {
  json?: string;
  jsonFile?: string;
  }
): Promise<unknown> {
  if (opts.json !== undefined && opts.jsonFile !== undefined) {
    throw new Error("Provide only one of --json or --json-file");
  }

  if (opts.jsonFile !== undefined) {
    const text =
      opts.jsonFile === "-" ? await readStdinText(rt) : await readFile(opts.jsonFile, "utf8");
    return JSON.parse(text);
  }

  if (opts.json !== undefined) {
    const text = opts.json === "-" ? await readStdinText(rt) : opts.json;
    return JSON.parse(text);
  }

  throw new Error("Missing JSON input. Provide --json or --json-file.");
}

function getCliVersion(): string {
  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function createClient(opts: GlobalOptions): Seclai {
  const seclaiOpts: { apiKey?: string; baseUrl?: string } = {};
  if (opts.apiKey !== undefined) seclaiOpts.apiKey = opts.apiKey;

  // Be explicit about the default API host. (The SDK also supports SECLAI_API_URL.)
  const envUrl = process.env.SECLAI_API_URL;
  seclaiOpts.baseUrl = envUrl && envUrl.length > 0 ? envUrl : "https://api.seclai.com";

  return new Seclai(seclaiOpts);
}

function printJson(rt: CliRuntime, value: unknown): void {
  rt.writeOut(`${JSON.stringify(value, null, 2)}\n`);
}

function printError(rt: CliRuntime, err: unknown): void {
  if (err instanceof SeclaiAPIValidationError) {
    rt.writeErr(`${err.name}: ${err.message}\n`);
    rt.writeErr(`status: ${err.statusCode}\n`);
    rt.writeErr(`url: ${err.url}\n`);
    if (err.responseText) rt.writeErr(`response: ${err.responseText}\n`);
    if (err.validationError) printJson(rt, { validationError: err.validationError });
    return;
  }

  if (err instanceof SeclaiAPIStatusError) {
    rt.writeErr(`${err.name}: ${err.message}\n`);
    rt.writeErr(`status: ${err.statusCode}\n`);
    rt.writeErr(`url: ${err.url}\n`);
    if (err.responseText) rt.writeErr(`response: ${err.responseText}\n`);
    return;
  }

  if (err instanceof SeclaiConfigurationError) {
    rt.writeErr(`${err.name}: ${err.message}\n`);
    return;
  }

  if (err instanceof Error) {
    rt.writeErr(`${err.name}: ${err.message}\n`);
    return;
  }

  rt.writeErr(String(err));
  rt.writeErr("\n");
}

async function run(rt: CliRuntime, main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (err) {
    printError(rt, err);
    rt.setExitCode(1);
  }
}

export function createProgram(rt: CliRuntime = defaultRuntime()): Command {
  const program = new Command();
  const cliVersion = getCliVersion();

  program
    .name("seclai")
    .description(
      `Seclai Command Line Interface (v${cliVersion})\n\n` +
        `Use this CLI to interact with Seclai from scripts and CI: manage connected content sources, run agents, and inspect agent runs and indexed content.\n\n` +
        `All commands return JSON to stdout by default, which makes it easy to pipe into tools like jq.`
    )
    .version(cliVersion, "-V, --version", "output the version")
    .option(
      "--api-key <key>",
      "Seclai API key (defaults to SECLAI_API_KEY). You can create/manage keys in the Seclai dashboard (Settings → API Keys)."
    );

  program.addHelpText(
    "after",
    `\nEnvironment:\n` +
      `  SECLAI_API_KEY   Default API key (alternative to --api-key)\n` +
      `  SECLAI_API_URL   Override API base URL (default: https://api.seclai.com). Intended for dev/staging.\n\n` +
      `Examples:\n` +
      `  seclai sources list\n` +
      `  seclai sources upload <sourceConnectionId> --file ./document.pdf\n` +
      `  seclai agents run <agentId> --json '{"input":"Hello"}'\n` +
      `  seclai agents run <agentId> --json-file - --stream --timeout-ms 60000 < run.json\n`
  );

  program.configureOutput({
    writeOut: (str) => rt.writeOut(str),
    writeErr: (str) => rt.writeErr(str),
  });
  // Prevent commander from calling process.exit() (needed for testability)
  program.exitOverride();

  // sources
  const sources = program
    .command("sources")
    .alias("source")
    .description(
      "Manage content sources connected to Seclai.\n\n" +
        "Sources are how Seclai ingests content (e.g., websites, RSS feeds, document uploads) into a knowledge base so agents can retrieve and cite it."
    );

sources
  .command("list")
  .description(
    "List sources available to your organization/account.\n\n" +
      "Use this to discover source connections and their IDs before uploading documents or debugging indexing."
  )
  .option("--page <n>", "Page number for pagination (1-based).", (v) => Number(v))
  .option("--limit <n>", "Page size (number of items to return).", (v) => Number(v))
  .option("--sort <field>", "Sort field (API-defined; commonly created_at or updated_at).")
  .option("--order <asc|desc>", "Sort direction: asc or desc.")
  .option("--account-id <id>", "Filter results to a specific account/organization id.")
  .action(async (opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.listSources({
        page: opts.page,
        limit: opts.limit,
        sort: opts.sort,
        order: opts.order,
        accountId: opts.accountId,
      });
      printJson(rt, res);
    });
  });

sources
  .command("upload")
  .description(
    "Upload a local file to an existing source connection.\n\n" +
      "This is commonly used for document-upload sources inside a knowledge base. The uploaded file becomes indexed content that agents can retrieve from.\n\n" +
      "Note: file size limits and supported MIME types are defined by the Seclai API (see the API reference for the upload endpoint)."
  )
  .argument(
    "<sourceConnectionId>",
    "Source connection ID to upload into. You can find this in the Seclai dashboard or by listing sources."
  )
  .requiredOption("--file <path>", "Path to a local file to upload.")
  .option("--title <title>", "Optional human-readable title to associate with the uploaded content.")
  .option(
    "--file-name <name>",
    "Override the filename sent to the API (defaults to the basename of --file). Useful when uploading from temp paths."
  )
  .option("--mime-type <type>", "Explicit MIME type (e.g., application/pdf, text/plain).")
  .action(async (sourceConnectionId: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);

      const bytes = new Uint8Array(await readFile(opts.file));

      const uploadOpts: {
        file: Uint8Array;
        title?: string;
        fileName?: string;
        mimeType?: string;
      } = { file: bytes };
      if (opts.title !== undefined) uploadOpts.title = opts.title;
      if (opts.fileName !== undefined) uploadOpts.fileName = opts.fileName;
      if (opts.mimeType !== undefined) uploadOpts.mimeType = opts.mimeType;

      const res = await client.uploadFileToSource(sourceConnectionId, uploadOpts);
      printJson(rt, res);
    });
  });

// agents
const agents = program
  .command("agents")
  .description(
    "Run agents and manage agent runs.\n\n" +
      "Agents are workflows/assistants backed by your configured knowledge base and model settings. Running an agent creates a run, which you can inspect later for status, outputs, and (optionally) step-level details."
  );

agents
  .command("run")
  .description(
    "Run an agent by ID and print the run result as JSON.\n\n" +
      "The request body is passed through to the Seclai API as-is (see the API docs for the specific agent/run schema).\n\n" +
      "For automation, prefer --json-file and pipe input via stdin (use '-' as the path)."
  )
  .argument("<agentId>", "Agent ID to run (from the Seclai dashboard).")
  .option("--json <json>", "Inline JSON request body. Use '-' to read JSON from stdin.")
  .option("--json-file <path>", "Path to a JSON file containing the request body. Use '-' to read from stdin.")
  .option(
    "--stream",
    "Wait for completion using the streaming (SSE) endpoint. The CLI prints the final result when the run is done."
  )
  .option(
    "--timeout-ms <n>",
    "Client-side timeout (milliseconds) when using --stream. This controls how long the CLI waits; it does not change server-side execution limits.",
    (v) => Number(v)
  )
  .action(async (agentId: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);

      const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });

      let res: unknown;
      if (opts.stream) {
        const streamFn = (client as any).runStreamingAgentAndWait as
          | undefined
          | ((agentId: string, body: unknown, opts?: { timeoutMs?: number }) => Promise<unknown>);
        if (!streamFn) {
          throw new Error(
            "This version of @seclai/sdk does not support streaming agent runs yet. Upgrade @seclai/sdk to a version that includes runStreamingAgentAndWait."
          );
        }
        res = await streamFn(agentId, body, opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : undefined);
      } else {
        res = await client.runAgent(agentId, body as any);
      }
      printJson(rt, res);
    });
  });

const agentRuns = agents.command("runs").description("Manage agent runs");

agentRuns
  .command("list")
  .description(
    "List runs for a specific agent.\n\n" +
      "This is useful for monitoring recent executions, checking statuses, and obtaining run IDs for follow-up commands."
  )
  .argument("<agentId>", "Agent ID whose runs you want to list.")
  .option("--page <n>", "Page number for pagination (1-based).", (v) => Number(v))
  .option("--limit <n>", "Page size (number of runs to return).", (v) => Number(v))
  .action(async (agentId: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.listAgentRuns(agentId, { page: opts.page, limit: opts.limit });
      printJson(rt, res);
    });
  });

agentRuns
  .command("get")
  .description(
    "Fetch a specific agent run and print it as JSON.\n\n" +
      "Use this to inspect status, timestamps, and outputs. Optionally include step outputs for deeper debugging (may be large)."
  )
  .argument("<runId>", "Run ID to retrieve.")
  .option(
    "--include-step-outputs",
    "Include step-level outputs when available. This may increase response size and latency."
  )
  .action(async (agentId: string, runId: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.getAgentRun(runId, opts.includeStepOutputs ? { includeStepOutputs: true } : undefined);
      printJson(rt, res);
    });
  });

agentRuns
  .command("delete")
  .description(
    "Cancel or delete a specific agent run by ID.\n\n" +
      "If a run is still in progress, this requests cancellation. If it has already completed, behavior depends on the API (it may delete or mark the run)."
  )
  .argument("<runId>", "Run ID to cancel/delete.")
  .action(async (runId: string) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.deleteAgentRun(runId);
      printJson(rt, res);
    });
  });

// runs (run id is globally unique)
const runs = program
  .command("runs")
  .alias("agent-runs")
  .description(
    "Manage agent runs by run ID (globally unique)."
  );

runs
  .command("get")
  .description(
    "Fetch a specific agent run by run ID and print it as JSON.\n\n" +
      "Use --include-step-outputs to include step-level details when available (may be large)."
  )
  .argument("<runId>", "Run ID to retrieve.")
  .option(
    "--include-step-outputs",
    "Include step-level outputs when available. This may increase response size and latency."
  )
  .action(async (runId: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.getAgentRun(runId, opts.includeStepOutputs ? { includeStepOutputs: true } : undefined);
      printJson(rt, res);
    });
  });

runs
  .command("delete")
  .description(
    "Cancel or delete a specific agent run by run ID.\n\n" +
      "If the run is in progress, this requests cancellation. If it is completed, behavior depends on the API (it may delete or mark the run)."
  )
  .argument("<runId>", "Run ID to cancel/delete.")
  .action(async (runId: string) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.deleteAgentRun(runId);
      printJson(rt, res);
    });
  });

// contents
const contents = program
  .command("contents")
  .description(
    "Inspect indexed content and embeddings.\n\n" +
      "When Seclai ingests data from sources into a knowledge base, it creates content versions and generates vector embeddings for retrieval. These commands help you debug what was indexed and what embeddings were produced."
  );

contents
  .command("get")
  .description(
    "Get details for a specific content version.\n\n" +
      "This typically includes extracted text/metadata produced during indexing. Use --start/--end to fetch a slice of the text for faster inspection."
  )
  .argument(
    "<sourceConnectionContentVersion>",
    "Content version ID to retrieve (from Seclai dashboard or API responses)."
  )
  .option("--start <n>", "Start offset for returned text (0-based).", (v) => Number(v))
  .option("--end <n>", "End offset for returned text (exclusive).", (v) => Number(v))
  .action(async (sourceConnectionContentVersion: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.getContentDetail(sourceConnectionContentVersion, {
        start: opts.start,
        end: opts.end,
      });
      printJson(rt, res);
    });
  });

contents
  .command("delete")
  .description(
    "Delete a specific content version from Seclai.\n\n" +
      "Use with care: removing a content version can affect retrieval results for agents that rely on the associated knowledge base."
  )
  .argument("<sourceConnectionContentVersion>", "Content version ID to delete.")
  .action(async (sourceConnectionContentVersion: string) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      await client.deleteContent(sourceConnectionContentVersion);
      printJson(rt, { ok: true });
    });
  });

contents
  .command("embeddings")
  .description(
    "List embeddings generated for a content version.\n\n" +
      "Embeddings power similarity search and retrieval for knowledge base agents. Listing them is useful for debugging indexing and verifying that content produced vectors."
  )
  .argument("<sourceConnectionContentVersion>", "Content version ID whose embeddings you want to list.")
  .option("--page <n>", "Page number for pagination (1-based).", (v) => Number(v))
  .option("--limit <n>", "Page size (number of embeddings to return).", (v) => Number(v))
  .action(async (sourceConnectionContentVersion: string, opts) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.listContentEmbeddings(sourceConnectionContentVersion, {
        page: opts.page,
        limit: opts.limit,
      });
      printJson(rt, res);
    });
  });

  return program;
}

export async function runCli(argv: string[], rt: CliRuntime = defaultRuntime()): Promise<number> {
  let observedExitCode = 0;
  const wrappedRt: CliRuntime = {
    ...rt,
    setExitCode: (code) => {
      observedExitCode = code;
      rt.setExitCode(code);
    },
  };

  const program = createProgram(wrappedRt);
  let exitCode = 0;

  try {
    await program.parseAsync(argv);
  } catch (err: any) {
    // commander throws a CommanderError on help/version/etc due to exitOverride()
    const maybeExitCode = typeof err?.exitCode === "number" ? err.exitCode : undefined;
    if (maybeExitCode !== undefined) {
      exitCode = maybeExitCode;
    } else {
      printError(wrappedRt, err);
      exitCode = 1;
    }
  }

  const finalExitCode = observedExitCode !== 0 ? observedExitCode : exitCode;
  wrappedRt.setExitCode(finalExitCode);
  return finalExitCode;
}

// Only run when executed as an entrypoint, not when imported (e.g. during tests).
if (process.argv[1]) {
  // `process.argv[1]` can be a symlink (common with npm global installs).
  // Compare realpaths so the guard works reliably.
  try {
    const entryReal = realpathSync(process.argv[1]);
    const selfReal = realpathSync(fileURLToPath(import.meta.url));
    if (entryReal === selfReal) {
      await runCli(process.argv);
    }
  } catch {
    // Fall back to a URL comparison (best-effort).
    const entryHref = pathToFileURL(process.argv[1]).href;
    if (import.meta.url === entryHref) {
      await runCli(process.argv);
    }
  }
}
