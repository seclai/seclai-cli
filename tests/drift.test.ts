/**
 * Drift guards.
 *
 * The CLI is a thin wrapper over `@seclai/sdk`, so its failure mode is not a
 * bug — it is silence. The SDK gains endpoints and the CLI simply does not
 * expose them; a command is added and the completion scripts and docs do not
 * mention it. Nothing breaks, so nothing tells you.
 *
 * These tests turn each of those silences into a failing assertion at the
 * moment it happens: on the dependency bump, or on the commit that adds the
 * command. They read the installed SDK's type declarations and the real
 * Commander tree rather than a checked-in list, so they cannot themselves go
 * stale.
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Command } from "commander";
import { createProgram } from "../src/cli.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Public methods on the SDK's `Seclai` class, read from the installed package's
 * type declarations.
 *
 * Private members appear in a `.d.ts` as `private name;` with no signature, so
 * matching on `name(` selects exactly the public surface.
 */
function sdkClientMethods(): string[] {
  const dts = readFileSync(
    path.join(repoRoot, "node_modules/@seclai/sdk/dist/index.d.ts"),
    "utf8",
  ).split("\n");

  const start = dts.findIndex((l) => /^declare class Seclai \{/.test(l));
  expect(start, "could not find `declare class Seclai` in the SDK type declarations").toBeGreaterThan(-1);

  const end = dts.findIndex((l, i) => i > start && l === "}");
  expect(end, "could not find the end of the Seclai class").toBeGreaterThan(start);

  const names = new Set<string>();
  for (const line of dts.slice(start + 1, end)) {
    const m = /^ {4}([a-zA-Z][A-Za-z0-9_]*)[(<]/.exec(line);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

/** Every `client.<method>(` call site across the CLI sources. */
function calledSdkMethods(): Set<string> {
  const names = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".ts")) {
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(/\bclient\.([a-zA-Z][A-Za-z0-9_]*)\(/g)) {
          names.add(m[1]);
        }
      }
    }
  };

  walk(path.join(repoRoot, "src"));
  return names;
}

/**
 * SDK methods the CLI deliberately does not call. Each entry states why, so a
 * reviewer can tell an intentional omission from an oversight.
 */
const NOT_COMMANDS: Record<string, string> = {
  constructor: "not an endpoint",
  request: "generic escape hatch, not an endpoint",
  requestRaw: "generic escape hatch, not an endpoint",
  paginate: "client-side helper, not an endpoint",
  deleteAgentRun:
    "deprecated in SDK 1.5.0 — it never deleted anything. `agents runs delete` " +
    "routes to cancelAgentRun instead.",
};

/** Every command path in the program, e.g. "agents runs cancel". */
function commandPaths(cmd: Command, prefix: string[] = []): string[][] {
  const paths: string[][] = [];
  for (const sub of cmd.commands) {
    const name = sub.name();
    if (name === "help") continue;
    const here = [...prefix, name];
    paths.push(here);
    paths.push(...commandPaths(sub, here));
  }
  return paths;
}

/** Render a completion script by running the real `completion` command. */
function completionScript(shell: string): string {
  let out = "";
  const program = createProgram({
    stdin: process.stdin,
    writeOut: (t) => (out += t),
    writeOutBytes: () => {},
    writeErr: () => {},
    setExitCode: () => {},
  });
  program.parse(["node", "seclai", "completion", shell]);
  return out;
}

describe("drift: SDK surface vs CLI commands", () => {
  test("every SDK endpoint method has a CLI call site", () => {
    const called = calledSdkMethods();
    const uncovered = sdkClientMethods().filter(
      (m) => !called.has(m) && !(m in NOT_COMMANDS),
    );

    expect(
      uncovered,
      `The SDK exposes ${uncovered.length} method(s) the CLI never calls:\n` +
        uncovered.map((m) => `  - ${m}`).join("\n") +
        `\n\nAdd a command, or record the omission with a reason in NOT_COMMANDS.`,
    ).toEqual([]);
  });

  test("every NOT_COMMANDS entry still exists in the SDK", () => {
    // Otherwise the exemptions silently outlive the methods they excuse, and
    // a later re-added method would be exempt for a reason nobody wrote.
    const methods = new Set(sdkClientMethods());
    const stale = Object.keys(NOT_COMMANDS).filter((m) => !methods.has(m));

    expect(stale, `NOT_COMMANDS lists methods the SDK no longer has: ${stale.join(", ")}`).toEqual(
      [],
    );
  });

  test("the CLI calls nothing the SDK does not define", () => {
    const methods = new Set(sdkClientMethods());
    const unknown = [...calledSdkMethods()].filter((m) => !methods.has(m)).sort();

    expect(unknown, `CLI calls SDK methods that do not exist: ${unknown.join(", ")}`).toEqual([]);
  });
});

describe("drift: commands vs completion scripts", () => {
  const shells = ["bash", "zsh", "fish"];

  for (const shell of shells) {
    test(`${shell} completion names every command`, () => {
      const script = completionScript(shell);
      const program = createProgram({
        stdin: process.stdin,
        writeOut: () => {},
        writeOutBytes: () => {},
        writeErr: () => {},
        setExitCode: () => {},
      });

      // All three scripts complete two levels — a top-level group and its
      // direct subcommands. Bash goes a level deeper for some groups, but that
      // is a bonus rather than a contract, so depth 3 is not asserted here.
      const names = new Set(
        commandPaths(program)
          .filter((p) => p.length <= 2)
          .map((p) => p[p.length - 1]),
      );
      const missing = [...names].filter((n) => !script.includes(n)).sort();

      expect(
        missing,
        `${shell} completion does not mention: ${missing.join(", ")}\n` +
          `Update the ${shell.toUpperCase()} script in src/commands/completion.ts.`,
      ).toEqual([]);
    });
  }
});

describe("drift: commands vs documentation", () => {
  const docs = [
    "README.md",
    "skills/seclai-cli/SKILL.md",
  ];

  for (const doc of docs) {
    test(`${doc} documents every top-level command group`, () => {
      const text = readFileSync(path.join(repoRoot, doc), "utf8");
      const program = createProgram({
        stdin: process.stdin,
        writeOut: () => {},
        writeOutBytes: () => {},
        writeErr: () => {},
        setExitCode: () => {},
      });

      // Second level and deeper is left to judgement — every group must at
      // least be reachable from the docs.
      const groups = commandPaths(program)
        .filter((p) => p.length === 1)
        .map((p) => p[0]);

      const missing = groups.filter((g) => !new RegExp(`\\bseclai ${g}\\b`).test(text)).sort();

      expect(
        missing,
        `${doc} has no \`seclai <cmd>\` example for: ${missing.join(", ")}`,
      ).toEqual([]);
    });
  }
});
