import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, listOpts, withJsonInputOptions, readJsonInput } from "../helpers.js";

/** Register `models` commands: list, get, alerts, recommendations, playground experiments. */
export function register(program: Command, rt: CliRuntime): void {
  const models = program.command("models").description("Models, model alerts, recommendations, and playground experiments.");

  models
    .command("list")
    .description("List models grouped by provider.")
    .option("--provider <provider>", "Filter by provider name.")
    .option("--supports-tool-use", "Only models that support tool use.")
    .option("--supports-thinking", "Only models that support thinking.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listModels>[0] = {};
        if (opts.provider !== undefined) o.provider = opts.provider;
        if (opts.supportsToolUse !== undefined) o.supportsToolUse = opts.supportsToolUse;
        if (opts.supportsThinking !== undefined) o.supportsThinking = opts.supportsThinking;
        printJson(rt, await client.listModels(o));
      });
    });

  models
    .command("get")
    .description("Get full details for a specific model.")
    .argument("<modelId>", "Model ID.")
    .action(async (modelId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getModel(modelId));
      });
    });

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

  // ── Playground Experiments ──────────────────────────────────────────────

  const experiments = models.command("experiments").description("Model playground experiments.");

  experiments
    .command("list")
    .description("List model playground experiments.")
    .option("--days <n>", "Filter to last N days.", (v: string) => Number(v))
    .option("--start-date <date>", "Start date (ISO 8601).")
    .option("--end-date <date>", "End date (ISO 8601).")
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .option("--offset <n>", "Offset.", (v: string) => Number(v))
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listExperiments>[0] = {};
        if (opts.days !== undefined) o.days = opts.days;
        if (opts.startDate !== undefined) o.startDate = opts.startDate;
        if (opts.endDate !== undefined) o.endDate = opts.endDate;
        if (opts.limit !== undefined) o.limit = opts.limit;
        if (opts.offset !== undefined) o.offset = opts.offset;
        printJson(rt, await client.listExperiments(o));
      });
    });

  withJsonInputOptions(experiments
    .command("create")
    .description("Create a model playground experiment."))
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createExperiment(body as Parameters<typeof client.createExperiment>[0]));
      });
    });

  experiments
    .command("get")
    .description("Get a model playground experiment by ID.")
    .argument("<experimentId>", "Experiment ID.")
    .action(async (experimentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getExperiment(experimentId));
      });
    });

  experiments
    .command("cancel")
    .description("Cancel a running model playground experiment.")
    .argument("<experimentId>", "Experiment ID.")
    .action(async (experimentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.cancelExperiment(experimentId));
      });
    });

  experiments
    .command("delete")
    .description("Soft-delete a model playground experiment (preserves audit history).")
    .argument("<experimentId>", "Experiment ID.")
    .action(async (experimentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteExperiment(experimentId);
        printJson(rt, { ok: true });
      });
    });
}
