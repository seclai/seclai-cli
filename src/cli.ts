import { Command } from "commander";
import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  type CliRuntime,
  type GlobalOptions,
  defaultRuntime,
  getCliVersion,
  printError,
} from "./helpers.js";

import { register as registerAgents } from "./commands/agents.js";
import { register as registerSources } from "./commands/sources.js";
import { register as registerContents } from "./commands/contents.js";
import { register as registerKb } from "./commands/kb.js";
import { register as registerMemory } from "./commands/memory.js";
import { register as registerEvals } from "./commands/evals.js";
import { register as registerSolutions } from "./commands/solutions.js";
import { register as registerGovernance } from "./commands/governance.js";
import { register as registerAlerts } from "./commands/alerts.js";
import { register as registerEmail } from "./commands/email.js";
import { register as registerAccount } from "./commands/account.js";
import { register as registerModels } from "./commands/models.js";
import { register as registerSearch } from "./commands/search.js";
import { register as registerAi } from "./commands/ai.js";
import { register as registerSkills } from "./commands/skills.js";
import { register as registerMcp } from "./commands/mcp.js";
import { register as registerCompletion } from "./commands/completion.js";
import { register as registerAuth } from "./commands/auth.js";
import { register as registerConfigure } from "./commands/configure.js";

export type { CliRuntime, GlobalOptions };

/**
 * Global options that take a value, with the hint shown when one arrives empty.
 *
 * A shell expanding an unset variable hands us `""`, not an absent flag, and
 * every consumer of these tests truthiness or falls back: `--api-key "$KEY"`
 * with `KEY` unset would authenticate from `SECLAI_API_KEY` or a cached SSO
 * session, silently acting as a different identity, and `--api-version ""`
 * would send no version header and skip the SDK's unknown-version guard. An
 * empty value is always a mistake, so it is rejected rather than ignored.
 */
const VALUED_GLOBAL_OPTIONS: ReadonlyArray<[keyof GlobalOptions, string, string]> = [
  ["apiKey", "--api-key", "Pass a key, or omit the flag to use SECLAI_API_KEY or SSO."],
  ["profile", "--profile", "Pass a profile name, or omit the flag to use the default profile."],
  ["accountId", "--account-id", "Pass an account ID, or omit the flag."],
  ["configDir", "--config-dir", "Pass a directory, or omit the flag to use ~/.seclai."],
  ["apiVersion", "--api-version", "Pass a YYYY-MM-DD date, or omit the flag to use the account default."],
];

/**
 * Build the top-level Commander program with all command modules registered.
 * Pass a custom {@link CliRuntime} for testing; defaults to real process I/O.
 */
export function createProgram(rt: CliRuntime = defaultRuntime()): Command {
  const program = new Command();
  const cliVersion = getCliVersion();

  program
    .name("seclai")
    .description(
      `Seclai Command Line Interface (v${cliVersion})\n\n` +
        `Manage agents, knowledge bases, sources, memory banks, evaluations, and more from the terminal.\n\n` +
        `All commands return JSON to stdout, making it easy to pipe into jq or other tools.`
    )
    .version(cliVersion, "-V, --version", "output the version")
    .option(
      "--api-key <key>",
      "Seclai API key (defaults to SECLAI_API_KEY)."
    )
    .option(
      "--profile <name>",
      "SSO profile name (defaults to SECLAI_PROFILE, then 'default')."
    )
    .option(
      "--account-id <id>",
      "Account ID for multi-org targeting (X-Account-Id header)."
    )
    .option(
      "--config-dir <path>",
      "Config directory (defaults to SECLAI_CONFIG_DIR, then ~/.seclai)."
    )
    .option(
      "--api-version <date>",
      "Opt into dated API changes released on or before this YYYY-MM-DD (defaults to SECLAI_API_VERSION; omitted means the account default)."
    )
    .option(
      "--allow-unknown-api-version",
      "Send an --api-version this CLI was not built against instead of rejecting it."
    )
    .option(
      "--compact",
      "Output compact JSON (no indentation)."
    );

  program.addHelpText(
    "after",
    `\nEnvironment:\n` +
      `  SECLAI_API_KEY      Default API key (alternative to --api-key)\n` +
      `  SECLAI_API_URL      Override API base URL (default: https://api.seclai.com)\n` +
      `  SECLAI_PROFILE      Default SSO profile (alternative to --profile)\n` +
      `  SECLAI_CONFIG_DIR   Config directory (alternative to --config-dir)\n` +
      `  SECLAI_API_VERSION  Dated API version (alternative to --api-version)\n\n` +
      `Examples:\n` +
      `  seclai agents list\n` +
      `  seclai agents run <agentId> --json '{"input":"Hello"}'\n` +
      `  seclai agents run <agentId> --json '{"input":"Hi"}' --events\n` +
      `  seclai configure sso\n` +
      `  seclai auth login\n` +
      `  seclai auth status\n` +
      `  seclai sources list --profile dev\n` +
      `  npx @seclai/cli agents list\n`
  );

  program.configureOutput({
    writeOut: (str) => rt.writeOut(str),
    writeErr: (str) => rt.writeErr(str),
  });
  program.exitOverride();

  // Validate global flags and propagate them to the runtime before any action
  program.hook("preAction", (thisCommand) => {
    const globalOpts = thisCommand.opts<GlobalOptions>();
    for (const [key, flag, hint] of VALUED_GLOBAL_OPTIONS) {
      const value = globalOpts[key];
      if (typeof value === "string" && value.length === 0) {
        throw new Error(`${flag} was given an empty value. ${hint}`);
      }
    }
    rt.compact = Boolean(globalOpts.compact);
  });

  // Register all command modules
  registerAgents(program, rt);
  registerSources(program, rt);
  registerContents(program, rt);
  registerKb(program, rt);
  registerMemory(program, rt);
  registerEvals(program, rt);
  registerSolutions(program, rt);
  registerGovernance(program, rt);
  registerAlerts(program, rt);
  registerEmail(program, rt);
  registerAccount(program, rt);
  registerModels(program, rt);
  registerSearch(program, rt);
  registerAi(program, rt);
  registerSkills(program, rt);
  registerMcp(program, rt);
  registerCompletion(program, rt);
  registerAuth(program, rt);
  registerConfigure(program, rt);

  return program;
}

/**
 * Parse `argv` and run the matching command.
 * Returns the process exit code (0 = success).
 */
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

// Only run when executed as an entrypoint, not when imported.
if (process.argv[1]) {
  try {
    const entryReal = realpathSync(process.argv[1]);
    const selfReal = realpathSync(fileURLToPath(import.meta.url));
    if (entryReal === selfReal) {
      await runCli(process.argv);
    }
  } catch {
    const entryHref = pathToFileURL(process.argv[1]).href;
    if (import.meta.url === entryHref) {
      await runCli(process.argv);
    }
  }
}
