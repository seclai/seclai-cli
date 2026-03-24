import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, listOpts } from "../helpers.js";

/** Register `models` commands: model alerts (list, mark-read, unread-count), recommendations. */
export function register(program: Command, rt: CliRuntime): void {
  const models = program.command("models").description("Model alerts and recommendations.");

  const alerts = models.command("alerts").description("Model alerts.");

  alerts
    .command("list")
    .description("List model alerts.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listModelAlerts(listOpts(opts)));
      });
    });

  alerts
    .command("mark-read")
    .description("Mark a model alert as read.")
    .argument("<alertId>", "Alert ID.")
    .action(async (alertId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.markModelAlertRead(alertId);
        printJson(rt, { ok: true });
      });
    });

  alerts
    .command("mark-all-read")
    .description("Mark all model alerts as read.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.markAllModelAlertsRead();
        printJson(rt, { ok: true });
      });
    });

  alerts
    .command("unread-count")
    .description("Get unread model alert count.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getUnreadModelAlertCount());
      });
    });

  models
    .command("recommendations")
    .description("Get model recommendations.")
    .argument("<modelId>", "Model ID.")
    .action(async (modelId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getModelRecommendations(modelId));
      });
    });
}
