import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  listOpts,
  withJsonInputOptions,
  readJsonInput,
  withOffsetListOptions,
  offsetListOpts,
  parseNumber,
  toPagedEnvelope,
} from "../helpers.js";

/**
 * Shape an embedder/reranker listing so it reads the same on every API version.
 *
 * From 2026-07-27 the API adds `data` and `pagination` beside the `models` the
 * SDK always fills. The default drops both; `--paged` moves the list to `data`.
 */
function modelListOutput(res: unknown, paged: boolean): unknown {
  if (res === null || typeof res !== "object" || Array.isArray(res)) return res;
  const { models, data, pagination, ...rest } = res as Record<string, unknown>;
  const list = models ?? data;
  if (!paged) return { models: list, ...rest };
  return { data: list, ...(pagination !== undefined ? { pagination } : {}), ...rest };
}

/** Register `models` commands: catalog, embedders, rerankers, alerts, recommendations, experiments. */
export function register(program: Command, rt: CliRuntime): void {
  const models = program.command("models").description("Models, model alerts, recommendations, and playground experiments.");

  models
    .command("list")
    .description("List models grouped by provider.")
    .option("--provider <provider>", "Filter by provider name.")
    .option("--supports-tool-use", "Only models that support tool use.")
    .option("--supports-thinking", "Only models that support thinking.")
    .option("--supports-input-media <media>", "Only models accepting this input modality (e.g. image, audio).")
    .option("--supports-output-media <media>", "Only models producing this output modality (e.g. image, video).")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listModels>[0] = {};
        if (opts.provider !== undefined) o.provider = opts.provider;
        if (opts.supportsToolUse !== undefined) o.supportsToolUse = opts.supportsToolUse;
        if (opts.supportsThinking !== undefined) o.supportsThinking = opts.supportsThinking;
        if (opts.supportsInputMedia !== undefined) o.supportsInputMedia = opts.supportsInputMedia;
        if (opts.supportsOutputMedia !== undefined) o.supportsOutputMedia = opts.supportsOutputMedia;
        printJson(rt, await client.listModels(o));
      });
    });

  models
    .command("tiers")
    .description("Show each media-generation modality and tier with its model and cost.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getGenerationTiers());
      });
    });

  const pagedHelp =
    "Print the list under `data` instead of `models`, with the pagination block when the API sends one.";

  models
    .command("embedders")
    .description(
      "List the embedding models a source can index with, their supported dimensions and pricing.",
    )
    .option(
      "--supports-input-media <media>",
      "Only embedders that can index this input: text, image, video, audio, or a full MIME type.",
    )
    .option("--paged", pagedHelp)
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listEmbeddingModels>[0] = {};
        if (opts.supportsInputMedia !== undefined) o.supportsInputMedia = opts.supportsInputMedia;
        printJson(rt, modelListOutput(await client.listEmbeddingModels(o), Boolean(opts.paged)));
      });
    });

  models
    .command("rerankers")
    .description("List the reranker models a knowledge base can use, and their pricing.")
    .option("--paged", pagedHelp)
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, modelListOutput(await client.listRerankerModels(), Boolean(opts.paged)));
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
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option(
      "--paged",
      "Wrap the results in {data: [...]}, the shape this endpoint moves to from --api-version 2026-07-27.",
    )
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const res = await client.listModelAlerts(listOpts(opts));
        printJson(rt, opts.paged ? toPagedEnvelope(res, "alerts") : res);
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

  withOffsetListOptions(
    experiments
      .command("list")
      .description("List model playground experiments.")
      .option("--days <n>", "Filter to last N days.", parseNumber)
      .option("--start-date <date>", "Start date (ISO 8601).")
      .option("--end-date <date>", "End date (ISO 8601)."),
  ).action(async (opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: Parameters<typeof client.listExperiments>[0] = offsetListOpts(opts);
      if (opts.days !== undefined) o.days = opts.days;
      if (opts.startDate !== undefined) o.startDate = opts.startDate;
      if (opts.endDate !== undefined) o.endDate = opts.endDate;
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
