import { Command } from "commander";
import { SeclaiApiVersion } from "@seclai/sdk";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson } from "../helpers.js";

/**
 * What each dated API version changes, in CLI terms. Keyed by every version the
 * SDK accepts — a drift test fails when the SDK gains one this map lacks.
 */
export const API_VERSION_NOTES: Record<string, string> = {
  "2026-07-01": "The baseline, applied when no version is sent and the account is not pinned.",
  "2026-07-27":
    "List responses move to {data, pagination}, and a query parameter the endpoint does not declare is rejected with a 422.",
  "2026-08-03":
    "`memory create` and `memory update` reject a non-zero max_age_days, which reads as null; an omitted retention_days on create resolves per bank type.",
  "2026-08-21":
    "`sources create` rejects an embedding dimension its embedder does not support. `models embedders` reports the supported ones.",
  "2026-09-28":
    "Agent-definition writes such as `agents def update` use the current file-list grammar for a step's attachments.",
  "2026-09-30":
    "A run's and a step's output, and a step's input, are the text rather than a JSON manifest. Files are in attachments on every version.",
  "2026-10-03": "A new LLM step written without attachments takes its parent's files.",
};

/** The versions and their notes as a help block, oldest first. */
function apiVersionHelp(): string {
  const rows = Object.keys(API_VERSION_NOTES)
    .sort()
    .map((v) => `  ${v}  ${API_VERSION_NOTES[v]}`);
  return `\nVersions (each includes the changes of the ones before it):\n${rows.join("\n")}\n`;
}

/** Register account-level commands: `me` and the dated API version pin. */
export function register(program: Command, rt: CliRuntime): void {
  program
    .command("me")
    .description("Show the authenticated user's account ID and organization memberships.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getMe());
      });
    });

  const version = program
    .command("api-version")
    .description("Read or pin the account's dated API version.")
    .addHelpText("after", apiVersionHelp());

  version
    .command("get")
    .description(
      "Show the version a request resolves to. Reflects --api-version when passed, " +
        "otherwise the account pin, otherwise the default.",
    )
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getApiVersion());
      });
    });

  version
    .command("set")
    .description("Pin the account to a dated API version. Affects every client, not just this CLI.")
    .argument("<date>", "API version as YYYY-MM-DD.")
    .action(async (date: string) => {
      await run(rt, async () => {
        // The pin is account-wide and persistent, and nothing re-checks it
        // afterwards: the CLI sends no version header of its own, so the SDK's
        // unknown-version guard — which only inspects the header it sends —
        // never sees it.
        //
        // A shape check alone let the likeliest typo through: `2026-27-07`
        // matches `\d{4}-\d{2}-\d{2}` and pins every client on the account to a
        // version that does not exist. The single-invocation `--api-version` is
        // checked against the SDK's known set, so this — the far more dangerous
        // path — is held to the same standard, with the same escape hatch.
        const known = Object.values(SeclaiApiVersion) as string[];
        if (!known.includes(date) && !program.opts<GlobalOptions>().allowUnknownApiVersion) {
          throw new Error(
            `Unknown API version "${date}". This release knows ${[...new Set(known)].sort().join(", ")}. ` +
              `Pass --allow-unknown-api-version to pin it anyway.`,
          );
        }
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.updateApiVersion(date));
      });
    });

  version
    .command("clear")
    .description("Remove the account's version pin, reverting to the default version.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.updateApiVersion(null));
      });
    });
}
