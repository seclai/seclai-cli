import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";
import type { CliRuntime } from "../helpers.js";
import { run, printJson } from "../helpers.js";

const MCP_URL = "https://api.seclai.com/mcp";

type McpConfig = {
  mcpServers: Record<string, { type: string; url: string; headers: Record<string, string> }>;
};

function buildMcpEntry(apiKey: string): McpConfig["mcpServers"]["seclai"] {
  return {
    type: "streamable-http",
    url: MCP_URL,
    headers: { "X-API-Key": apiKey },
  };
}

type McpTarget = { name: string; path: string; scope: "project" | "global" };

function getTargets(destDir: string): McpTarget[] {
  const home = homedir();
  const os = platform();

  return [
    // Project-scoped configs
    { name: "claude-code", path: join(destDir, ".mcp.json"), scope: "project" },
    { name: "cursor", path: join(destDir, ".cursor", "mcp.json"), scope: "project" },
    // Global configs
    { name: "claude-desktop", path: os === "win32"
        ? join(process.env["APPDATA"] ?? join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json")
        : join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      scope: "global" },
    { name: "windsurf", path: join(home, ".codeium", "windsurf", "mcp_config.json"), scope: "global" },
  ];
}

async function mergeConfig(filePath: string, apiKey: string): Promise<boolean> {
  let existing: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
    } catch {
      return false;
    }
  }
  const servers = (existing["mcpServers"] ?? {}) as Record<string, unknown>;
  servers["seclai"] = buildMcpEntry(apiKey);
  existing["mcpServers"] = servers;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(existing, null, 2) + "\n", "utf8");
  return true;
}

function detectTargets(destDir: string): McpTarget[] {
  const all = getTargets(destDir);
  return all.filter((t) => {
    if (t.scope === "global") return existsSync(dirname(t.path));
    // For project configs, check if the tool's directory marker exists
    if (t.name === "claude-code") return existsSync(join(destDir, ".claude")) || existsSync(join(destDir, "CLAUDE.md"));
    if (t.name === "cursor") return existsSync(join(destDir, ".cursor"));
    return false;
  });
}

/** Register the `mcp` command for configuring MCP server access in AI coding tools. */
export function register(program: Command, rt: CliRuntime): void {
  const mcp = program.command("mcp").description("Configure the Seclai MCP server for AI coding tools.");

  mcp
    .command("configure")
    .description(
      "Add the Seclai MCP server to AI coding tool config files.\n\n" +
        "Targets: claude-code, cursor, claude-desktop, windsurf.\n" +
        "Use --target to pick a specific tool, or 'all' for all known targets."
    )
    .requiredOption("--key <key>", "Seclai API key to embed in the config.")
    .option("--target <name>", "Target tool (claude-code|cursor|claude-desktop|windsurf|all). Auto-detects if omitted.")
    .option("--dir <path>", "Project directory for project-scoped configs (default: current directory).", ".")
    .action(async (opts) => {
      await run(rt, async () => {
        const destDir = opts.dir;
        const apiKey: string = opts.key;
        const allTargets = getTargets(destDir);
        let targets: McpTarget[];

        if (opts.target === "all") {
          targets = allTargets;
        } else if (opts.target) {
          const found = allTargets.find((t) => t.name === opts.target);
          if (!found) {
            rt.writeErr(`Unknown target "${opts.target}". Use: claude-code, cursor, claude-desktop, windsurf, or all.\n`);
            rt.setExitCode(1);
            return;
          }
          targets = [found];
        } else {
          targets = detectTargets(destDir);
          if (targets.length === 0) {
            targets = [allTargets[0]!]; // default to claude-code
            rt.writeErr("No MCP-compatible tool detected, defaulting to claude-code (.mcp.json).\n");
          }
        }

        let configured = 0;
        for (const target of targets) {
          const ok = await mergeConfig(target.path, apiKey);
          if (ok) {
            configured++;
            rt.writeErr(`Configured seclai MCP for ${target.name} → ${target.path}\n`);
          } else {
            rt.writeErr(`Failed to parse existing config at ${target.path}, skipping.\n`);
          }
        }

        printJson(rt, { ok: true, targets: targets.map((t) => t.name), filesWritten: configured });
      });
    });

  mcp
    .command("show")
    .description("Show the Seclai MCP server JSON configuration snippet.")
    .option("--key <key>", "API key to include (default: placeholder).")
    .action(async (opts) => {
      await run(rt, async () => {
        const entry = buildMcpEntry(opts.key ?? "YOUR_API_KEY");
        printJson(rt, { mcpServers: { seclai: entry } });
      });
    });
}
