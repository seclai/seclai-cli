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
import { register as registerModels } from "./commands/models.js";
import { register as registerSearch } from "./commands/search.js";
import { register as registerAi } from "./commands/ai.js";
import { register as registerSkills } from "./commands/skills.js";
import { register as registerMcp } from "./commands/mcp.js";
import { register as registerCompletion } from "./commands/completion.js";

export type { CliRuntime, GlobalOptions };

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
      "--compact",
      "Output compact JSON (no indentation)."
    );

  program.addHelpText(
    "after",
    `\nEnvironment:\n` +
      `  SECLAI_API_KEY   Default API key (alternative to --api-key)\n` +
      `  SECLAI_API_URL   Override API base URL (default: https://api.seclai.com)\n\n` +
      `Examples:\n` +
      `  seclai agents list\n` +
      `  seclai agents run <agentId> --json '{"input":"Hello"}'\n` +
      `  seclai agents run <agentId> --json '{"input":"Hi"}' --events\n` +
      `  seclai sources list\n` +
      `  seclai kb list\n` +
      `  seclai search --query "deployment guide"\n` +
      `  npx @seclai/cli agents list\n`
  );

  program.configureOutput({
    writeOut: (str) => rt.writeOut(str),
    writeErr: (str) => rt.writeErr(str),
  });
  program.exitOverride();

  // Propagate global flags to runtime before any command action
  program.hook("preAction", (thisCommand) => {
    const globalOpts = thisCommand.opts<GlobalOptions>();
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
  registerModels(program, rt);
  registerSearch(program, rt);
  registerAi(program, rt);
  registerSkills(program, rt);
  registerMcp(program, rt);
  registerCompletion(program, rt);

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
