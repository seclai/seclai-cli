import { Command } from "commander";
import { SeclaiApiVersion } from "@seclai/sdk";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson } from "../helpers.js";

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
    .description("Read or pin the account's dated API version.");

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
