import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  readJsonInput,
  listOpts,
  parseNumber,
  parseFilter,
  withDateRangeOptions,
  dateRangeOpts,
  withTimeRangeOptions,
  timeRangeOpts,
} from "../helpers.js";

/** Register `evals` commands: criteria CRUD, results, compatible-runs, test-draft, agent-level summaries. */
export function register(program: Command, rt: CliRuntime): void {
  const evals = program.command("evals").description("Manage evaluations.");

  // --- Criteria ---

  const criteria = evals.command("criteria").description("Evaluation criteria.");

  criteria
    .command("list")
    .description("List evaluation criteria for an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option(
      "--paged",
      "Wrap the results in {data: [...]} instead of returning a bare array. The pagination block is included once the API sends one, from --api-version 2026-07-27.",
    )
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        // The endpoint answers with a bare array by default and the envelope
        // once the account opts in. --paged normalises the array into {data},
        // so `.data` is a stable path to read either way — but nothing is
        // invented: `pagination` appears only when the API actually sent it.
        printJson(
          rt,
          opts.paged
            ? await client.listEvaluationCriteriaPage(agentId, listOpts(opts))
            : await client.listEvaluationCriteria(agentId, listOpts(opts)),
        );
      });
    });

  criteria
    .command("create")
    .description("Create evaluation criteria.")
    .argument("<agentId>", "Agent ID.")
    .option("--json <json>", "Criteria body JSON.")
    .option("--json-file <path>", "Criteria body JSON file.")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createEvaluationCriteria(agentId, body as any));
      });
    });

  criteria
    .command("get")
    .description("Get evaluation criteria.")
    .argument("<criteriaId>", "Criteria ID.")
    .action(async (criteriaId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getEvaluationCriteria(criteriaId));
      });
    });

  criteria
    .command("update")
    .description("Update evaluation criteria.")
    .argument("<criteriaId>", "Criteria ID.")
    .option("--json <json>", "Update body JSON.")
    .option("--json-file <path>", "Update body JSON file.")
    .action(async (criteriaId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.updateEvaluationCriteria(criteriaId, body as any));
      });
    });

  criteria
    .command("delete")
    .description("Delete evaluation criteria.")
    .argument("<criteriaId>", "Criteria ID.")
    .action(async (criteriaId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.deleteEvaluationCriteria(criteriaId);
        printJson(rt, { ok: true });
      });
    });

  criteria
    .command("summary")
    .description("Get criteria evaluation summary.")
    .argument("<criteriaId>", "Criteria ID.")
    .action(async (criteriaId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getEvaluationCriteriaSummary(criteriaId));
      });
    });

  // --- Results ---

  const results = evals.command("results").description("Evaluation results.");

  withTimeRangeOptions(
    results
      .command("list")
      .description("List results for criteria.")
      .argument("<criteriaId>", "Criteria ID.")
      .option("--page <n>", "Page number.", parseNumber)
      .option("--limit <n>", "Page size.", parseNumber)
      .option("--status <status>", "Keep only one result status.", parseFilter)
      .option("--flagged-only", "Keep only flagged results."),
  ).action(async (criteriaId: string, opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: Parameters<typeof client.listEvaluationResults>[1] = {
        ...listOpts(opts),
        ...timeRangeOpts(opts),
      };
      if (opts.status !== undefined) o.status = opts.status;
      if (opts.flaggedOnly) o.flaggedOnly = true;
      printJson(rt, await client.listEvaluationResults(criteriaId, o));
    });
  });

  results
    .command("create")
    .description("Create an evaluation result.")
    .argument("<criteriaId>", "Criteria ID.")
    .option("--json <json>", "Result body JSON.")
    .option("--json-file <path>", "Result body JSON file.")
    .action(async (criteriaId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.createEvaluationResult(criteriaId, body as any));
      });
    });

  // --- Misc ---

  evals
    .command("compatible-runs")
    .description("List runs compatible with criteria.")
    .argument("<criteriaId>", "Criteria ID.")
    .option("--page <n>", "Page number.", parseNumber)
    .option("--limit <n>", "Page size.", parseNumber)
    .option("--started-after <time>", "Only runs started after this time, ISO 8601.", parseFilter)
    .action(async (criteriaId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listCompatibleRuns>[1] = listOpts(opts);
        if (opts.startedAfter !== undefined) o.startedAfter = opts.startedAfter;
        printJson(rt, await client.listCompatibleRuns(criteriaId, o));
      });
    });

  evals
    .command("test-draft")
    .description("Test a draft evaluation.")
    .argument("<agentId>", "Agent ID.")
    .option("--json <json>", "Test body JSON.")
    .option("--json-file <path>", "Test body JSON file.")
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body = await readJsonInput(rt, { json: opts.json, jsonFile: opts.jsonFile });
        printJson(rt, await client.testDraftEvaluation(agentId, body as any));
      });
    });

  withTimeRangeOptions(
    evals
      .command("agent-results")
      .description("List all evaluation results for an agent.")
      .argument("<agentId>", "Agent ID.")
      .option("--page <n>", "Page number.", parseNumber)
      .option("--limit <n>", "Page size.", parseNumber)
      .option("--status <status>", "Keep only one result status.", parseFilter)
      .option("--flagged-only", "Keep only flagged results.")
      .option("--step <stepId>", "Keep only results for this agent step.", parseFilter),
  ).action(async (agentId: string, opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: Parameters<typeof client.listAgentEvaluationResults>[1] = {
        ...listOpts(opts),
        ...timeRangeOpts(opts),
      };
      if (opts.status !== undefined) o.status = opts.status;
      if (opts.flaggedOnly) o.flaggedOnly = true;
      if (opts.step !== undefined) o.step = opts.step;
      printJson(rt, await client.listAgentEvaluationResults(agentId, o));
    });
  });

  withTimeRangeOptions(
    evals
      .command("agent-runs")
      .description("List evaluation run summaries for an agent.")
      .argument("<agentId>", "Agent ID.")
      .option("--page <n>", "Page number.", parseNumber)
      .option("--limit <n>", "Page size.", parseNumber)
      .option("--status <status>", "Keep only one result status.", parseFilter)
      .option("--step <stepId>", "Keep only runs for this agent step.", parseFilter),
  ).action(async (agentId: string, opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: Parameters<typeof client.listEvaluationRuns>[1] = {
        ...listOpts(opts),
        ...timeRangeOpts(opts),
      };
      if (opts.status !== undefined) o.status = opts.status;
      if (opts.step !== undefined) o.step = opts.step;
      printJson(rt, await client.listEvaluationRuns(agentId, o));
    });
  });

  withDateRangeOptions(
    evals
      .command("non-manual-summary")
      .description(
        "Get the non-manual evaluation summary for an agent, or for the whole account when no agent is given. " +
          "--start-date with --end-date sets the range; --start-date alone runs through today; " +
          "otherwise the last --days days apply. --end-date alone is refused, because the API would ignore it.",
      )
      .argument("[agentId]", "Agent ID. Omit for the account-wide summary."),
  ).action(async (agentId: string | undefined, opts) => {
    await run(rt, async () => {
      if (agentId !== undefined && agentId.trim().length === 0) {
        throw new Error("agentId was given an empty value. Pass an agent ID, or omit it for the account-wide summary.");
      }
      if (opts.endDate !== undefined && opts.startDate === undefined) {
        throw new Error("--end-date needs --start-date: the API ignores an end date on its own.");
      }
      const client = createClient(program.opts<GlobalOptions>());
      const range = dateRangeOpts(opts);
      printJson(
        rt,
        Object.keys(range).length > 0
          ? await client.getNonManualEvaluationSummary(agentId, range)
          : await client.getNonManualEvaluationSummary(agentId),
      );
    });
  });
}
