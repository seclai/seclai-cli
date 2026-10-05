import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, withLimitOption } from "../helpers.js";

/** Register `cloud-drives` commands: providers, connections, dependents, skipped files. */
export function register(program: Command, rt: CliRuntime): void {
  const drives = program
    .command("cloud-drives")
    .description("Manage cloud-drive connections (connecting a drive happens in the app).");

  drives
    .command("providers")
    .description("List the cloud-drive providers that can be connected.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listCloudDriveProviders());
      });
    });

  drives
    .command("list")
    .description("List the account's cloud-drive connections.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listCloudDrives());
      });
    });

  drives
    .command("get")
    .description("Get a cloud-drive connection.")
    .argument("<connectionId>", "Cloud-drive connection ID.")
    .action(async (connectionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getCloudDrive(connectionId));
      });
    });

  drives
    .command("update")
    .description(
      "Rename a connection and/or change the folder it watches. Changing the folder " +
        "resets the sync cursor, so files already in the new folder do not fire triggers.",
    )
    .argument("<connectionId>", "Cloud-drive connection ID.")
    .option("--name <name>", "New display name.")
    .option(
      "--folder-path <path>",
      "New watched folder. A shared-drive folder is '/Shared drives/<drive name>/<folder>'.",
    )
    .option("--whole-drive", "Watch the whole drive instead of one folder.")
    .action(async (connectionId: string, opts) => {
      await run(rt, async () => {
        // The API reads an empty folder_path as "the whole drive", so an unset
        // shell variable would silently re-point the connection. --whole-drive
        // is the only way to ask for that.
        for (const [value, flag] of [
          [opts.name, "--name"],
          [opts.folderPath, "--folder-path"],
        ] as const) {
          if (typeof value === "string" && value.trim().length === 0) {
            throw new Error(
              `${flag} was given an empty value.` +
                (flag === "--folder-path" ? " Pass --whole-drive to watch the whole drive." : ""),
            );
          }
        }
        if (opts.folderPath !== undefined && opts.wholeDrive) {
          throw new Error("Provide only one of --folder-path or --whole-drive.");
        }

        const body: { name?: string; folder_path?: string } = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.folderPath !== undefined) body.folder_path = opts.folderPath;
        if (opts.wholeDrive) body.folder_path = "";
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update. Pass --name, --folder-path or --whole-drive.");
        }

        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.updateCloudDrive(connectionId, body));
      });
    });

  drives
    .command("disconnect")
    .description(
      "Revoke a connection's tokens and stop its change notifications, keeping the " +
        "connection so it can be reconnected from the app.",
    )
    .argument("<connectionId>", "Cloud-drive connection ID.")
    .action(async (connectionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.disconnectCloudDrive(connectionId));
      });
    });

  drives
    .command("delete")
    .description(
      "Delete a connection. Refused with a 409 while an agent trigger or a content " +
        "source still depends on it.",
    )
    .argument("<connectionId>", "Cloud-drive connection ID.")
    .action(async (connectionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteCloudDrive(connectionId);
        printJson(rt, { ok: true });
      });
    });

  drives
    .command("agents")
    .description("List the agents using a connection. Content sources that use it are not listed.")
    .argument("<connectionId>", "Cloud-drive connection ID.")
    .action(async (connectionId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAgentsUsingCloudDrive(connectionId));
      });
    });

  withLimitOption(
    drives
      .command("rejections")
      .description(
        "List the files a connection skipped, newest first, with the reason. " +
          "A skipped file fires no trigger.",
      )
      .argument("<connectionId>", "Cloud-drive connection ID."),
    "Maximum rejections to return (1-200, default 50).",
  ).action(async (connectionId: string, opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: { limit?: number } = {};
      if (opts.limit !== undefined) o.limit = opts.limit;
      printJson(rt, await client.listCloudDriveRejections(connectionId, o));
    });
  });
}
