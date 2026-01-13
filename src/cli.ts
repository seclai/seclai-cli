import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

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
  const seclaiOpts: { apiKey?: string } = {};
  if (opts.apiKey !== undefined) seclaiOpts.apiKey = opts.apiKey;
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
    .description(`Seclai Command Line Interface (v${cliVersion})`)
    .version(cliVersion, "-V, --version", "output the version")
    .option("--api-key <key>", "API key (defaults to SECLAI_API_KEY)");

  program.configureOutput({
    writeOut: (str) => rt.writeOut(str),
    writeErr: (str) => rt.writeErr(str),
  });
  // Prevent commander from calling process.exit() (needed for testability)
  program.exitOverride();

  // sources
  const sources = program.command("sources").description("Manage sources");

sources
  .command("list")
  .description("List sources")
  .option("--page <n>", "Page number", (v) => Number(v))
  .option("--limit <n>", "Page size", (v) => Number(v))
  .option("--sort <field>", "Sort field")
  .option("--order <asc|desc>", "Sort order")
  .option("--account-id <id>", "Filter by account id")
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
  .description("Upload a file to a source connection")
  .argument("<sourceConnectionId>", "Source connection id")
  .requiredOption("--file <path>", "Path to local file")
  .option("--title <title>", "Optional title")
  .option("--file-name <name>", "Filename to send (defaults to basename)")
  .option("--mime-type <type>", "MIME type")
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
const agents = program.command("agents").description("Run agents and manage runs");

agents
  .command("run")
  .description("Run an agent")
  .argument("<agentId>", "Agent id")
  .option("--json <json>", "Request body JSON (string or '-')")
  .option("--json-file <path>", "Request body JSON file path (or '-')")
  .option("--stream", "Use streaming SSE endpoint and wait for completion")
  .option("--timeout-ms <n>", "Client-side timeout in milliseconds", (v) => Number(v))
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
  .description("List runs for an agent")
  .argument("<agentId>", "Agent id")
  .option("--page <n>", "Page number", (v) => Number(v))
  .option("--limit <n>", "Page size", (v) => Number(v))
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
  .description("Get a specific agent run")
  .argument("<agentId>", "Agent id")
  .argument("<runId>", "Run id")
  .action(async (agentId: string, runId: string) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.getAgentRun(agentId, runId);
      printJson(rt, res);
    });
  });

agentRuns
  .command("delete")
  .description("Cancel/delete a specific agent run")
  .argument("<agentId>", "Agent id")
  .argument("<runId>", "Run id")
  .action(async (agentId: string, runId: string) => {
    await run(rt, async () => {
      const global = program.opts<GlobalOptions>();
      const client = createClient(global);
      const res = await client.deleteAgentRun(agentId, runId);
      printJson(rt, res);
    });
  });

// contents
const contents = program.command("contents").description("Inspect content and embeddings");

contents
  .command("get")
  .description("Get content detail")
  .argument("<sourceConnectionContentVersion>", "Content version id")
  .option("--start <n>", "Start offset", (v) => Number(v))
  .option("--end <n>", "End offset", (v) => Number(v))
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
  .description("Delete a content version")
  .argument("<sourceConnectionContentVersion>", "Content version id")
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
  .description("List embeddings for a content version")
  .argument("<sourceConnectionContentVersion>", "Content version id")
  .option("--page <n>", "Page number", (v) => Number(v))
  .option("--limit <n>", "Page size", (v) => Number(v))
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
  const entryHref = pathToFileURL(process.argv[1]).href;
  if (import.meta.url === entryHref) {
    await runCli(process.argv);
  }
}
