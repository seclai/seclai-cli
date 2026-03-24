import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import { run, createClient, printJson, readJsonInput, listOpts } from "../helpers.js";

/** Register `evals` commands: criteria CRUD, results, compatible-runs, test-draft, agent-level summaries. */
export function register(program: Command, rt: CliRuntime): void {
  const evals = program.command("evals").description("Manage evaluations.");

  // --- Criteria ---

  const criteria = evals.command("criteria").description("Evaluation criteria.");

  criteria
    .command("list")
    .description("List evaluation criteria for an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listEvaluationCriteria(agentId, listOpts(opts)));
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

  results
    .command("list")
    .description("List results for criteria.")
    .argument("<criteriaId>", "Criteria ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (criteriaId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listEvaluationResults(criteriaId, listOpts(opts)));
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
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (criteriaId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listCompatibleRuns(criteriaId, listOpts(opts)));
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

  evals
    .command("agent-results")
    .description("List all evaluation results for an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listAgentEvaluationResults(agentId, listOpts(opts)));
      });
    });

  evals
    .command("agent-runs")
    .description("List evaluation run summaries for an agent.")
    .argument("<agentId>", "Agent ID.")
    .option("--page <n>", "Page number.", (v: string) => Number(v))
    .option("--limit <n>", "Page size.", (v: string) => Number(v))
    .action(async (agentId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listEvaluationRuns(agentId, listOpts(opts)));
      });
    });

  evals
    .command("non-manual-summary")
    .description("Get non-manual evaluation summary for an agent.")
    .argument("<agentId>", "Agent ID.")
    .action(async (agentId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getNonManualEvaluationSummary(agentId));
      });
    });
}
