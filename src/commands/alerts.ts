import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, listOpts, parseNumber } from "../helpers.js";

/** Register `alerts` commands: alert CRUD, configs, organization preferences. */
export function register(program: Command, rt: CliRuntime): void {
  const alerts = program.command("alerts").description("Manage alerts and alert configurations.");

  // --- Alert CRUD ---

  alerts
    .command("list")
    .description("List alerts.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option("--status <status>", "Filter by status.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Record<string, unknown> = listOpts(opts);
        if (opts.status) o.status = opts.status;
        printJson(rt, await client.listAlerts(o));
      });
    });

  alerts
    .command("get")
    .description("Get an alert.")
    .argument("<alertId>", "Alert ID.")
    .action(async (alertId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAlert(alertId));
      });
    });

  alerts
    .command("status")
    .description("Change alert status.")
    .argument("<alertId>", "Alert ID.")
    .option("--json <json>", "Status body JSON.")
    .option("--json-file <path>", "Status body JSON file.")
    .action(async (alertId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.changeAlertStatus(alertId, body as any));
      });
    });

  alerts
    .command("comment")
    .description("Add a comment to an alert.")
    .argument("<alertId>", "Alert ID.")
    .option("--json <json>", "Comment body JSON.")
    .option("--json-file <path>", "Comment body JSON file.")
    .action(async (alertId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.addAlertComment(alertId, body as any));
      });
    });

  alerts
    .command("subscribe")
    .description("Subscribe to an alert.")
    .argument("<alertId>", "Alert ID.")
    .action(async (alertId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.subscribeToAlert(alertId));
      });
    });

  alerts
    .command("unsubscribe")
    .description("Unsubscribe from an alert.")
    .argument("<alertId>", "Alert ID.")
    .action(async (alertId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.unsubscribeFromAlert(alertId));
      });
    });

  // --- Alert Configs ---

  const configs = alerts.command("configs").description("Alert configurations.");

  configs
    .command("list")
    .description("List alert configurations.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listAlertConfigs(listOpts(opts)));
      });
    });

  configs
    .command("create")
    .description("Create an alert configuration.")
    .option("--json <json>", "Config body JSON.")
    .option("--json-file <path>", "Config body JSON file.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createAlertConfig(body as any));
      });
    });

  configs
    .command("get")
    .description("Get an alert configuration.")
    .argument("<configId>", "Config ID.")
    .action(async (configId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getAlertConfig(configId));
      });
    });

  configs
    .command("update")
    .description("Update an alert configuration.")
    .argument("<configId>", "Config ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (configId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateAlertConfig(configId, body as any));
      });
    });

  configs
    .command("delete")
    .description("Delete an alert configuration.")
    .argument("<configId>", "Config ID.")
    .action(async (configId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteAlertConfig(configId);
        printJson(rt, { ok: true });
      });
    });

  // --- Organization Alert Preferences ---

  const prefs = alerts.command("prefs").description("Organization alert preferences.");

  prefs
    .command("list")
    .description("List organization alert preferences.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listOrganizationAlertPreferences());
      });
    });

  prefs
    .command("update")
    .description("Update an organization alert preference.")
    .argument("<organizationId>", "Organization ID.")
    .argument("<alertType>", "Alert type.")
    .option("--json <json>", "Preference body JSON.")
    .option("--json-file <path>", "Preference body JSON file.")
    .action(async (organizationId: string, alertType: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateOrganizationAlertPreference(organizationId, alertType, body as any));
      });
    });
}
