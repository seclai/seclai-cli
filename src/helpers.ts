import { Command, InvalidArgumentError } from "commander";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import process from "node:process";

import {
  Seclai,
  SeclaiAPIStatusError,
  SeclaiAPIValidationError,
  SeclaiConfigurationError,
} from "@seclai/sdk";

/**
 * Global CLI options parsed from top-level flags (--api-key, --compact,
 * --profile, --account-id, --config-dir, --api-version).
 *
 * The `?: T | undefined` spelling is deliberate. This repo sets
 * `exactOptionalPropertyTypes`, which distinguishes an absent property from one
 * present with the value `undefined` — a distinction that is meaningful for
 * data we construct, and meaningless for a bag of CLI flags. Commander hands
 * these over with unset flags either missing or `undefined` depending on how
 * the option was declared, and every consumer here tests `!== undefined`, so
 * both spellings already behave identically. Widening the input types says so,
 * and lets callers spread a partial without a confusing assignability error.
 *
 * Values we build and hand onwards keep the strict `?: T` form, so the compiler
 * flag still does its job where the distinction carries meaning.
 */
export type GlobalOptions = {
  apiKey?: string | undefined;
  compact?: boolean | undefined;
  profile?: string | undefined;
  accountId?: string | undefined;
  configDir?: string | undefined;
  apiVersion?: string | undefined;
  allowUnknownApiVersion?: boolean | undefined;
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
  opts: { json?: string | undefined; jsonFile?: string | undefined }
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
  opts: { json?: string | undefined; jsonFile?: string | undefined }
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

  // Rejected here rather than in a Commander hook, because this is where an
  // identity is actually resolved: a hook fired for every command, including
  // `completion`, `skills install` and `mcp show`, which never build a client.
  //
  // A shell expanding an unset variable hands us `""`, not an absent flag, and
  // the SDK's credential chain tests truthiness — so each of these silently
  // resolves to something else, and none has a legitimate empty meaning:
  //
  //   --api-key      falls back to SECLAI_API_KEY, then SSO — a different identity
  //   --config-dir   falls back to ~/.seclai — another account's cached tokens
  //   --account-id   drops the X-Account-Id header — targets the default org
  //   --profile      misses its config section — built-in SSO defaults
  const identityFlags: ReadonlyArray<[keyof GlobalOptions, string, string]> = [
    ["apiKey", "--api-key", "Pass a key, or omit the flag to use SECLAI_API_KEY or SSO."],
    ["profile", "--profile", "Pass a profile name, or omit the flag to use the default profile."],
    ["accountId", "--account-id", "Pass an account ID, or omit the flag to use the default org."],
    ["configDir", "--config-dir", "Pass a directory, or omit the flag to use ~/.seclai."],
  ];
  for (const [key, flag, hint] of identityFlags) {
    const value = opts[key];
    if (typeof value === "string" && value.trim().length === 0) {
      throw new Error(`${flag} was given an empty value. ${hint}`);
    }
  }

  if (opts.apiKey !== undefined) seclaiOpts.apiKey = opts.apiKey;
  if (opts.profile !== undefined) seclaiOpts.profile = opts.profile;
  if (opts.configDir !== undefined) seclaiOpts.configDir = opts.configDir;
  if (opts.accountId !== undefined) seclaiOpts.accountId = opts.accountId;

  // Omitted by default, so upgrading the CLI never changes a response shape;
  // passing --api-version opts into the dated changes released up to that date.
  //
  // An empty --api-version is rejected before we get here, by the global
  // empty-value guard in cli.ts: the SDK tests the option for truthiness, so ""
  // would send no header and skip the unknown-version guard. An empty
  // SECLAI_API_VERSION is treated as unset, which is the ordinary convention
  // for an environment variable.
  // An explicitly empty --api-version means "no version", not "fall back to the
  // environment": cli.ts has already warned that the flag is being ignored, and
  // quietly adopting SECLAI_API_VERSION would make that warning false. Note
  // `??` alone is not enough — it only falls through on null/undefined — so the
  // empty case is handled before it.
  const envVersion = process.env.SECLAI_API_VERSION;
  const version =
    opts.apiVersion === ""
      ? undefined
      : (opts.apiVersion ?? (envVersion && envVersion.length > 0 ? envVersion : undefined));
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

/**
 * Warn on stderr about input that is accepted today and will stop being
 * accepted later.
 *
 * Rejecting bad input outright is the better end state, but doing it in a
 * single release breaks whatever was quietly relying on the old handling. These
 * warnings are the deprecation period: the command still behaves exactly as it
 * did, and the operator gets told what will change. stdout stays clean, so
 * anything piping into `jq` is unaffected.
 */
export function warnDeprecated(
  rt: CliRuntime,
  message: string,
  fate: "rejected" | "removed" | "kept" = "rejected",
): void {
  // The consequence is a parameter because it genuinely differs. `--severity`
  // will be *removed*; an empty global value will be *rejected*; and
  // `agents runs delete` is a permanent alias that is going nowhere — telling
  // its users to migrate against a deadline nobody set would be a lie, and one
  // the tests would then pin in place.
  const suffix =
    fate === "kept"
      ? ""
      : fate === "removed"
        ? " This will be removed in a future release."
        : " This will be rejected in a future release.";
  rt.writeErr(`warning: ${message}${suffix}\n`);
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
    // The hint has to match the failure. This error covers both missing
    // credentials and an unknown API version, and the version case used to be
    // answered with "set your API key" — advice for a problem the caller does
    // not have. The SDK also names its own option (`allowUnknownApiVersion`),
    // which is not something you can type at a terminal.
    if (/api version/i.test(err.message)) {
      rt.writeErr(`hint: Pass --allow-unknown-api-version to send it anyway.\n`);
    } else {
      rt.writeErr(`hint: Set the SECLAI_API_KEY environment variable or pass --api-key.\n`);
    }
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

/**
 * Argument parser for an option that takes a number, failing the parse instead
 * of forwarding garbage. A bare `Number(v)` turns `--limit abc` into `NaN` and
 * `--limit ""` into `0`, and the SDK stringifies whatever it is handed — so the
 * request left as `?limit=NaN` and came back a server 422 naming nothing.
 *
 * Commander wraps an {@link InvalidArgumentError} with the offending flag and
 * value, so the message here only has to say what was expected.
 */
export function parseNumber(value: string): number {
  // Matched against the literal text rather than `Number()`'s result, because
  // `Number` is far more permissive than these parameters are: it reads hex
  // (`0x10` -> 16), exponents (`1e3` -> 1000), fractions and negatives, and
  // `Number.isInteger` waves the first two through. Every consumer here is a
  // page, limit or offset, all of which the API constrains to non-negative
  // integers — and `--limit 0x10` quietly returning 16 rows is worse than the
  // NaN this function replaced, because it looks like it worked.
  if (!/^\d+$/.test(value.trim())) {
    throw new InvalidArgumentError("Expected a non-negative whole number.");
  }
  return Number(value.trim());
}

/**
 * The `--limit` declaration shared by the pagination helpers, and by the
 * commands that take a limit without a page or offset.
 */
export function withLimitOption(cmd: Command, description = "Page size."): Command {
  return cmd.option("--limit <n>", description, parseNumber);
}

/**
 * Add limit/offset options, for the endpoints that paginate by offset rather
 * than by page number. Pairs with {@link offsetListOpts}.
 */
export function withOffsetListOptions(cmd: Command): Command {
  return withLimitOption(cmd).option("--offset <n>", "Number of items to skip.", parseNumber);
}

/**
 * Normalise a version-gated list response to `{data, ...}`.
 *
 * Several endpoints rename their top-level array once the caller opts into
 * `--api-version 2026-07-27`: `configs` and `alerts` both become `data`, and a
 * bare array becomes `{data, pagination}`. A script reading `.configs[]` gets
 * `null` and exit 0 the day someone opts in — the silent-wrong-answer class
 * this release exists to close.
 *
 * This is what `--paged` prints. The default output is left exactly as the API
 * sent it, so opting in is still the only thing that changes a shape.
 */
export function toPagedEnvelope(res: unknown, ...legacyKeys: string[]): unknown {
  if (Array.isArray(res)) return { data: res };
  if (res === null || typeof res !== "object") return res;

  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj;

  for (const key of legacyKeys) {
    if (Array.isArray(obj[key])) {
      const { [key]: rows, ...rest } = obj;
      return { data: rows, ...rest };
    }
  }
  return res;
}

/** Pick the defined limit/offset values for an offset-paginated call. */
export function offsetListOpts(opts: { limit?: number | undefined; offset?: number | undefined }): {
  limit?: number;
  offset?: number;
} {
  const o: { limit?: number; offset?: number } = {};
  if (opts.limit !== undefined) o.limit = opts.limit;
  if (opts.offset !== undefined) o.offset = opts.offset;
  return o;
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
    title?: string | undefined;
    metadata?: string | undefined;
    metadataFile?: string | undefined;
    fileName?: string | undefined;
    mimeType?: string | undefined;
  }
  // The returned object is ours to construct, so it keeps the strict form.
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
  page?: number | undefined;
  limit?: number | undefined;
  sort?: string | undefined;
  order?: string | undefined;
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
  opts: { userInput?: string | undefined; json?: string | undefined; jsonFile?: string | undefined }
): Promise<unknown> {
  if (opts.userInput !== undefined) {
    return { user_input: opts.userInput };
  }
  const jsonArg = opts.json !== undefined ? { json: opts.json } : {};
  const jsonFileArg = opts.jsonFile !== undefined ? { jsonFile: opts.jsonFile } : {};
  return readJsonInput(rt, { ...jsonArg, ...jsonFileArg });
}
