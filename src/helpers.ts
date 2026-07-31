import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import process from "node:process";

import {
  Seclai,
  SeclaiAPIStatusError,
  SeclaiAPIValidationError,
  SeclaiConfigurationError,
} from "@seclai/sdk";

/** Global CLI options parsed from top-level flags (--api-key, --compact, --profile, --account-id, --config-dir, --api-version). */
export type GlobalOptions = {
  apiKey?: string;
  compact?: boolean;
  profile?: string;
  accountId?: string;
  configDir?: string;
  apiVersion?: string;
  allowUnknownApiVersion?: boolean;
};

/** Runtime abstraction that decouples the CLI from Node globals, enabling testability. */
export type CliRuntime = {
  stdin: NodeJS.ReadableStream;
  writeOut: (text: string) => void;
  /** Write raw bytes to stdout (e.g. binary downloads). Routed through the runtime for testability. */
  writeOutBytes: (bytes: Uint8Array) => void;
  writeErr: (text: string) => void;
  setExitCode: (code: number) => void;
  compact?: boolean;
};

/** Create a {@link CliRuntime} wired to process stdin/stdout/stderr. */
export function defaultRuntime(): CliRuntime {
  return {
    stdin: process.stdin,
    writeOut: (text) => {
      process.stdout.write(text);
    },
    writeOutBytes: (bytes) => {
      process.stdout.write(bytes);
    },
    writeErr: (text) => {
      process.stderr.write(text);
    },
    setExitCode: (code) => {
      process.exitCode = code;
    },
  };
}

/** Read all of stdin as a UTF-8 string. */
export async function readStdinText(rt: CliRuntime): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    rt.stdin.setEncoding("utf8");
    rt.stdin.on("data", (chunk: string) => (data += chunk));
    rt.stdin.on("end", () => resolve(data));
    rt.stdin.on("error", reject);
  });
}

/**
 * Resolve JSON input from `--json` or `--json-file` options.
 * Pass `"-"` as the value to read from stdin.
 * @throws If neither option is provided, or both are.
 */
export async function readJsonInput(
  rt: CliRuntime,
  opts: { json?: string; jsonFile?: string }
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

/**
 * Like {@link readJsonInput} but validates the result is a plain object.
 * @throws If the parsed value is not a JSON object.
 */
export async function readJsonObjectInput(
  rt: CliRuntime,
  opts: { json?: string; jsonFile?: string }
): Promise<Record<string, unknown>> {
  const value = await readJsonInput(rt, opts);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a JSON object.");
  }
  return value as Record<string, unknown>;
}

/** Read the CLI version from the nearest package.json. Returns `"0.0.0"` on failure. */
export function getCliVersion(): string {
  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Create a {@link Seclai} SDK client from global CLI options and environment variables. */
export function createClient(opts: GlobalOptions): Seclai {
  const seclaiOpts: {
    apiKey?: string;
    baseUrl?: string;
    profile?: string;
    configDir?: string;
    accountId?: string;
    apiVersion?: string;
    allowUnknownApiVersion?: boolean;
  } = {};

  if (opts.apiKey !== undefined) seclaiOpts.apiKey = opts.apiKey;
  if (opts.profile !== undefined) seclaiOpts.profile = opts.profile;
  if (opts.configDir !== undefined) seclaiOpts.configDir = opts.configDir;
  if (opts.accountId !== undefined) seclaiOpts.accountId = opts.accountId;

  // Omitted by default, so upgrading the CLI never changes a response shape;
  // passing --api-version opts into the dated changes released up to that date.
  //
  // An empty --api-version is rejected rather than ignored. The SDK tests the
  // option for truthiness, so "" would send no header and skip the
  // unknown-version guard — `--api-version "$VER"` with an unset VER would
  // quietly return default-version output, the exact silent reshape the flag
  // exists to prevent. An empty SECLAI_API_VERSION is treated as unset, which
  // is the ordinary convention for an environment variable.
  if (opts.apiVersion !== undefined && opts.apiVersion.length === 0) {
    throw new Error(
      "--api-version was given an empty value. Pass a YYYY-MM-DD date, or omit the flag to use the account default.",
    );
  }
  const envVersion = process.env.SECLAI_API_VERSION;
  const version = opts.apiVersion ?? (envVersion && envVersion.length > 0 ? envVersion : undefined);
  if (version !== undefined) seclaiOpts.apiVersion = version;
  if (opts.allowUnknownApiVersion) seclaiOpts.allowUnknownApiVersion = true;

  const envUrl = process.env.SECLAI_API_URL;
  seclaiOpts.baseUrl = envUrl && envUrl.length > 0 ? envUrl : "https://api.seclai.com";

  return new Seclai(seclaiOpts);
}

/** Serialize `value` as JSON to stdout. Respects `rt.compact` for indentation. */
export function printJson(rt: CliRuntime, value: unknown): void {
  const indent = rt.compact ? undefined : 2;
  rt.writeOut(`${JSON.stringify(value, null, indent)}\n`);
}

/** Print a human-readable error to stderr. Shows extra detail for SDK error types. */
export function printError(rt: CliRuntime, err: unknown): void {
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
    rt.writeErr(`hint: Set the SECLAI_API_KEY environment variable or pass --api-key.\n`);
    return;
  }

  if (err instanceof Error) {
    rt.writeErr(`${err.name}: ${err.message}\n`);
    return;
  }

  rt.writeErr(String(err));
  rt.writeErr("\n");
}

/** Execute `main`, catching errors and routing them to {@link printError}. */
export async function run(rt: CliRuntime, main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (err) {
    printError(rt, err);
    rt.setExitCode(1);
  }
}

/** Add common pagination options to a command */
export function withListOptions(cmd: Command): Command {
  return cmd
    .option("--page <n>", "Page number (1-based).", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v));
}

/**
 * Add limit/offset options, for the endpoints that paginate by offset rather
 * than by page number. Pairs with {@link offsetListOpts}.
 */
export function withOffsetListOptions(cmd: Command): Command {
  return cmd
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .option("--offset <n>", "Number of items to skip.", (v: string) => Number(v));
}

/** Pick the defined limit/offset values for an offset-paginated call. */
export function offsetListOpts(opts: { limit?: number; offset?: number }): {
  limit?: number;
  offset?: number;
} {
  const o: { limit?: number; offset?: number } = {};
  if (opts.limit !== undefined) o.limit = opts.limit;
  if (opts.offset !== undefined) o.offset = opts.offset;
  return o;
}

/** Add sortable list options (page, limit, sort, order) */
export function withSortableListOptions(cmd: Command): Command {
  return withListOptions(cmd)
    .option("--sort <field>", "Sort field.")
    .option("--order <asc|desc>", "Sort direction.");
}

/** Add --json / --json-file options to a command */
export function withJsonInputOptions(cmd: Command): Command {
  return cmd
    .option("--json <json>", "Inline JSON body. Use '-' to read from stdin.")
    .option("--json-file <path>", "Path to JSON file. Use '-' to read from stdin.");
}

/** Add file upload options */
export function withFileUploadOptions(cmd: Command): Command {
  return cmd
    .requiredOption("--file <path>", "Path to a local file to upload.")
    .option("--title <title>", "Optional title.")
    .option("--metadata <json>", "Metadata JSON object. Use '-' for stdin.")
    .option("--metadata-file <path>", "Path to metadata JSON file. Use '-' for stdin.")
    .option("--file-name <name>", "Override filename sent to API.")
    .option("--mime-type <type>", "Explicit MIME type.");
}

/** Build upload opts from CLI flags */
export async function buildUploadOpts(
  rt: CliRuntime,
  opts: {
    file: string;
    title?: string;
    metadata?: string;
    metadataFile?: string;
    fileName?: string;
    mimeType?: string;
  }
): Promise<{
  file: Uint8Array;
  title?: string;
  metadata?: Record<string, unknown>;
  fileName?: string;
  mimeType?: string;
}> {
  const bytes = new Uint8Array(await readFile(opts.file));
  const result: {
    file: Uint8Array;
    title?: string;
    metadata?: Record<string, unknown>;
    fileName?: string;
    mimeType?: string;
  } = { file: bytes };
  if (opts.title !== undefined) result.title = opts.title;
  if (opts.metadata !== undefined || opts.metadataFile !== undefined) {
    const jsonArg = opts.metadata !== undefined ? { json: opts.metadata } : {};
    const jsonFileArg = opts.metadataFile !== undefined ? { jsonFile: opts.metadataFile } : {};
    result.metadata = await readJsonObjectInput(rt, { ...jsonArg, ...jsonFileArg });
  }
  if (opts.fileName !== undefined) result.fileName = opts.fileName;
  if (opts.mimeType !== undefined) result.mimeType = opts.mimeType;
  return result;
}

/** Pick defined values from opts for list calls */
export function listOpts(opts: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (opts.page !== undefined) o.page = opts.page;
  if (opts.limit !== undefined) o.limit = opts.limit;
  if (opts.sort !== undefined) o.sort = opts.sort;
  if (opts.order !== undefined) o.order = opts.order;
  return o;
}

/** Signature for a command module's `register` function. */
export type RegisterFn = (program: Command, rt: CliRuntime) => void;

/** Add --user-input / --json / --json-file options for AI assistant commands */
export function withAiInputOptions(cmd: Command): Command {
  return cmd
    .option("--user-input <text>", "User input text (shorthand for --json '{\"user_input\":\"...\"}')")
    .option("--json <json>", "Full request body JSON.")
    .option("--json-file <path>", "Request body JSON file.");
}

/** Read AI assistant input: --user-input takes precedence, falls back to --json/--json-file */
export async function readAiInput(
  rt: CliRuntime,
  opts: { userInput?: string; json?: string; jsonFile?: string }
): Promise<unknown> {
  if (opts.userInput !== undefined) {
    return { user_input: opts.userInput };
  }
  const jsonArg = opts.json !== undefined ? { json: opts.json } : {};
  const jsonFileArg = opts.jsonFile !== undefined ? { jsonFile: opts.jsonFile } : {};
  return readJsonInput(rt, { ...jsonArg, ...jsonFileArg });
}
