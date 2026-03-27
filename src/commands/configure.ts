/**
 * CLI profile configuration commands — interactive SSO profile setup.
 *
 * @module
 */
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";

import { type CliRuntime, type GlobalOptions, printJson, run } from "../helpers.js";
import { DEFAULT_SSO_DOMAIN, DEFAULT_SSO_CLIENT_ID, DEFAULT_SSO_REGION } from "@seclai/sdk";

/**
 * Prompt the user for input with an optional default value.
 *
 * @param rt - CLI runtime for I/O.
 * @param question - Prompt text.
 * @param defaultValue - Default used when user presses Enter without typing.
 * @returns The user's answer (or the default).
 */
function prompt(rt: CliRuntime, question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: rt.stdin,
      output: { write: (s: string) => { rt.writeErr(s); return true; } } as unknown as NodeJS.WritableStream,
      terminal: false,
    });

    const display = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rt.writeErr(display);

    rl.once("line", (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/** Resolve the config directory from global options or environment. */
function resolveConfigDir(opts: GlobalOptions): string {
  if (opts.configDir) return opts.configDir;
  const env = process.env.SECLAI_CONFIG_DIR;
  if (env) return env;
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return join(home, ".seclai");
}

/**
 * Register the `configure` command group on the given Commander program.
 *
 * @param program - Root Commander program.
 * @param rt - CLI runtime for I/O.
 */
export function register(program: Command, rt: CliRuntime): void {
  const group = program.command("configure").description("Configure CLI profiles and settings.");

  // ── sso ───────────────────────────────────────────────────────────────
  group
    .command("sso")
    .description("Configure an SSO profile with optional overrides. Defaults to production Seclai SSO.")
    .option("--profile-name <name>", "Profile name to configure (default: from --profile flag)")
    .action(async (opts: { profileName?: string }) => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const profileName = opts.profileName || globalOpts.profile || "default";
        const configDir = resolveConfigDir(globalOpts);
        const configPath = join(configDir, "config");

        rt.writeErr(`\nConfiguring SSO profile "${profileName}".\n`);
        rt.writeErr(`Defaults: domain=${DEFAULT_SSO_DOMAIN}, region=${DEFAULT_SSO_REGION}\n`);
        rt.writeErr(`Press Enter to accept defaults.\n\n`);

        const domain = await prompt(rt, "SSO domain", DEFAULT_SSO_DOMAIN);
        const clientId = await prompt(rt, "SSO client ID", DEFAULT_SSO_CLIENT_ID);
        const region = await prompt(rt, "SSO region", DEFAULT_SSO_REGION);
        const accountId = await prompt(rt, "Account ID (optional, resolved after login)");

        // Only write config if something differs from defaults
        const isDefault = domain === DEFAULT_SSO_DOMAIN
          && clientId === DEFAULT_SSO_CLIENT_ID
          && region === DEFAULT_SSO_REGION
          && !accountId;

        if (isDefault && profileName === "default") {
          rt.writeErr(`\nUsing built-in defaults — no config file needed.\n`);
          rt.writeErr(`Run \`seclai auth login\` to authenticate.\n`);
          printJson(rt, {
            profile: profileName,
            sso_domain: domain,
            sso_client_id: clientId,
            sso_region: region,
            note: "using built-in defaults",
          });
          return;
        }

        // Read existing config or start fresh
        let content = "";
        try {
          content = await readFile(configPath, "utf-8");
        } catch {
          // file doesn't exist
        }

        // Build the section — only write keys that differ from defaults
        const sectionHeader = profileName === "default"
          ? "[default]"
          : `[profile ${profileName}]`;

        const lines: string[] = [];
        if (domain !== DEFAULT_SSO_DOMAIN) lines.push(`sso_domain = ${domain}`);
        if (clientId !== DEFAULT_SSO_CLIENT_ID) lines.push(`sso_client_id = ${clientId}`);
        if (region !== DEFAULT_SSO_REGION) lines.push(`sso_region = ${region}`);
        if (accountId) lines.push(`sso_account_id = ${accountId}`);
        const sectionBody = lines.join("\n");

        // Check if section already exists and replace it
        const sectionRegex = profileName === "default"
          ? /^\[default\][^\[]*(?=\[|$(?![\s\S]))/m
          : new RegExp(`^\\[profile ${escapeRegExp(profileName)}\\][^\\[]*(?=\\[|$(?![\\s\\S]))`, "m");

        if (sectionRegex.test(content)) {
          content = content.replace(sectionRegex, `${sectionHeader}\n${sectionBody}\n`);
        } else {
          if (content.length > 0 && !content.endsWith("\n")) {
            content += "\n";
          }
          content += `\n${sectionHeader}\n${sectionBody}\n`;
        }

        await mkdir(configDir, { recursive: true });
        await writeFile(configPath, content, { mode: 0o600 });

        rt.writeErr(`\nProfile "${profileName}" saved to ${configPath}\n`);
        rt.writeErr(`Run \`seclai auth login --profile ${profileName}\` to authenticate.\n`);

        const result: Record<string, string> = {
          profile: profileName,
          configFile: configPath,
          sso_domain: domain,
          sso_client_id: clientId,
          sso_region: region,
        };
        if (accountId) result.sso_account_id = accountId;
        printJson(rt, result);
      });
    });

  // ── list ──────────────────────────────────────────────────────────────
  group
    .command("list")
    .description("List all configured profiles.")
    .action(async () => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const configDir = resolveConfigDir(globalOpts);
        const configPath = join(configDir, "config");

        let content: string;
        try {
          content = await readFile(configPath, "utf-8");
        } catch {
          printJson(rt, { profiles: [], configFile: configPath });
          return;
        }

        // Parse profile names from section headers
        const profiles: string[] = [];
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            const raw = trimmed.slice(1, -1).trim();
            if (raw.startsWith("profile ")) {
              profiles.push(raw.slice("profile ".length).trim());
            } else {
              profiles.push(raw);
            }
          }
        }

        printJson(rt, { profiles, configFile: configPath });
      });
    });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
