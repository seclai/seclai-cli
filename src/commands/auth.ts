/**
 * SSO authentication commands — login, logout, status, and refresh.
 *
 * @module
 */
import { Command } from "commander";
import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { URL, URLSearchParams } from "node:url";
import process from "node:process";

import {
  loadSsoProfile,
  readSsoCache,
  writeSsoCache,
  deleteSsoCache,
  isTokenValid,
  type SsoProfile,
  type SsoCacheEntry,
} from "@seclai/sdk";

import {
  type CliRuntime,
  type GlobalOptions,
  createClient,
  printJson,
  run,
} from "../helpers.js";

/**
 * PKCE helpers.
 */
/** Generate a random PKCE code verifier (base64url-encoded). */
function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** Compute the S256 PKCE code challenge from a verifier. */
function computeCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Start a local HTTP server to receive the OAuth callback.
 * Returns a promise that resolves with the authorization code.
 */
function waitForAuthCode(port: number, state: string): Promise<{ code: string; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h2>Authentication failed</h2><p>You can close this tab.</p></body></html>");
        reject(new Error(`OAuth error: ${error}`));
        server.close();
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<html><body><h2>Invalid callback</h2></body></html>");
        reject(new Error("Invalid callback: missing code or state mismatch"));
        server.close();
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><h2>Authenticated successfully!</h2><p>You can close this tab.</p></body></html>");

      resolve({
        code,
        cleanup: () => server.close(),
      });
    });

    server.listen(port, "127.0.0.1");
    server.on("error", reject);
  });
}

/**
 * Exchange an authorization code for SSO tokens via the Cognito token endpoint.
 *
 * @param profile - SSO profile with Cognito domain and client ID.
 * @param code - Authorization code from the OAuth callback.
 * @param codeVerifier - PKCE code verifier used in the authorization request.
 * @param redirectUri - Redirect URI matching the authorization request.
 * @returns Fresh cache entry with access, refresh, and ID tokens.
 * @throws {Error} If the token endpoint returns a non-OK status.
 */
async function exchangeCodeForTokens(
  profile: SsoProfile,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<SsoCacheEntry> {
  const tokenUrl = `https://${profile.ssoDomain}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: profile.ssoClientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (HTTP ${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const entry: SsoCacheEntry = {
    accessToken: data.access_token,
    expiresAt,
    clientId: profile.ssoClientId,
    region: profile.ssoRegion,
    cognitoDomain: profile.ssoDomain,
  };
  if (data.refresh_token) entry.refreshToken = data.refresh_token;
  if (data.id_token) entry.idToken = data.id_token;
  return entry;
}

const DEFAULT_CALLBACK_PORT = 9876;

/** Resolve the API base URL from environment or default. */
function resolveBaseUrl(): string {
  const envUrl = process.env.SECLAI_API_URL;
  return envUrl && envUrl.length > 0 ? envUrl : "https://api.seclai.com";
}

/**
 * Call GET /me with a bearer token to resolve the user's account ID.
 *
 * @param accessToken - Fresh access token from SSO login.
 * @returns The user's personal account ID.
 */
async function fetchAccountId(accessToken: string): Promise<string> {
  const baseUrl = resolveBaseUrl();
  const resp = await fetch(`${baseUrl}/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to resolve account ID from /me (HTTP ${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { account_id: string };
  return data.account_id;
}

/**
 * Update a single key within an existing profile section of the config file.
 * Adds the key if it doesn't exist in the section.
 */
async function updateConfigKey(
  configDir: string,
  profileName: string,
  key: string,
  value: string,
): Promise<void> {
  const configPath = join(configDir, "config");

  let content = "";
  try {
    content = await readFile(configPath, "utf-8");
  } catch {
    // file doesn't exist — we'll create it
  }

  const sectionHeader = profileName === "default" ? "[default]" : `[profile ${profileName}]`;
  const sectionIdx = content.indexOf(sectionHeader);

  if (sectionIdx === -1) {
    // Section doesn't exist — create it with just this key
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `\n${sectionHeader}\n${key} = ${value}\n`;
  } else {
    const afterHeader = sectionIdx + sectionHeader.length;
    const nextSectionMatch = content.slice(afterHeader).match(/\n\[/);
    const sectionEnd = nextSectionMatch
      ? afterHeader + nextSectionMatch.index!
      : content.length;

    const sectionBody = content.slice(afterHeader, sectionEnd);
    const keyRegex = new RegExp(`^${key}\\s*=.*$`, "m");

    let newSectionBody: string;
    if (keyRegex.test(sectionBody)) {
      newSectionBody = sectionBody.replace(keyRegex, `${key} = ${value}`);
    } else {
      const trimmed = sectionBody.trimEnd();
      newSectionBody = `${trimmed}\n${key} = ${value}\n`;
    }

    content = content.slice(0, afterHeader) + newSectionBody + content.slice(sectionEnd);
  }

  const { mkdir } = await import("node:fs/promises");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, content, { mode: 0o600 });
}

/**
 * Resolve profile name and config directory from global options and environment.
 *
 * @param opts - Global CLI options.
 * @returns Object with profileName and configDir.
 */
function resolveProfile(opts: GlobalOptions): { profileName: string; configDir: string } {
  const profileName = opts.profile || process.env.SECLAI_PROFILE || "default";
  let configDir = opts.configDir || process.env.SECLAI_CONFIG_DIR;
  if (!configDir) {
    const home = process.env.HOME ?? process.env.USERPROFILE;
    if (home && home.trim() !== "") {
      configDir = join(home, ".seclai");
    } else {
      configDir = join(process.cwd(), ".seclai");
    }
  }
  return { profileName, configDir };
}

/**
 * Load the SSO profile, using built-in defaults if no config exists.
 *
 * @param rt - CLI runtime for I/O.
 * @param opts - Global CLI options.
 * @returns Object with the resolved profile, profile name, and config directory.
 */
async function loadProfile(rt: CliRuntime, opts: GlobalOptions): Promise<{ profile: SsoProfile; profileName: string; configDir: string }> {
  const { profileName, configDir } = resolveProfile(opts);
  const profile = await loadSsoProfile(configDir, profileName);

  return { profile, profileName, configDir };
}

/**
 * Register the `auth` command group (login, logout, status, refresh)
 * on the given Commander program.
 *
 * @param program - Root Commander program.
 * @param rt - CLI runtime for I/O.
 */
export function register(program: Command, rt: CliRuntime): void {
  const group = program.command("auth").description("SSO authentication (login/logout/status/refresh).");

  // ── login ─────────────────────────────────────────────────────────────
  group
    .command("login")
    .description("Authenticate via SSO using Authorization Code + PKCE flow.")
    .option("--port <port>", "Local callback port", String(DEFAULT_CALLBACK_PORT))
    .option("--no-browser", "Print the URL instead of opening a browser")
    .action(async (opts: { port?: string; browser?: boolean }) => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const { profile, profileName, configDir } = await loadProfile(rt, globalOpts);

        const port = parseInt(opts.port ?? String(DEFAULT_CALLBACK_PORT), 10);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port: ${opts.port}. Must be an integer between 1 and 65535.`);
        }
        const redirectUri = `http://localhost:${port}/callback`;

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = computeCodeChallenge(codeVerifier);
        const state = randomBytes(16).toString("hex");

        const authUrl = new URL(`https://${profile.ssoDomain}/oauth2/authorize`);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", profile.ssoClientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", "openid profile email");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");

        const authUrlStr = authUrl.toString();

        // Start callback server before opening browser
        const codePromise = waitForAuthCode(port, state);

        if (opts.browser !== false) {
          // Open browser
          const { spawn } = await import("node:child_process");
          const openCmd = process.platform === "darwin"
            ? { cmd: "open", args: [authUrlStr] }
            : process.platform === "win32"
              ? { cmd: "cmd", args: ["/c", "start", "", authUrlStr] }
              : { cmd: "xdg-open", args: [authUrlStr] };
          spawn(openCmd.cmd, openCmd.args, { stdio: "ignore", detached: true }).unref();
          rt.writeErr(`Opening browser for authentication...\n`);
        } else {
          rt.writeErr(`Open this URL in your browser:\n\n${authUrlStr}\n\n`);
        }

        rt.writeErr("Waiting for authentication callback...\n");

        const { code, cleanup } = await codePromise;

        let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
        try {
          rt.writeErr("Exchanging code for tokens...\n");
          tokens = await exchangeCodeForTokens(profile, code, codeVerifier, redirectUri);
          await writeSsoCache(configDir, profile, tokens);
        } finally {
          cleanup();
        }

        // Resolve the account ID from /me and persist it in the config
        let accountId = profile.ssoAccountId;
        try {
          rt.writeErr("Resolving account ID...\n");
          accountId = await fetchAccountId(tokens.accessToken);
          await updateConfigKey(configDir, profileName, "sso_account_id", accountId);
        } catch {
          rt.writeErr("Warning: Could not resolve account ID from /me. You can set it manually with `seclai configure sso`.\n");
        }

        rt.writeErr("Successfully authenticated!\n");
        const loginResult: Record<string, string> = {
          status: "authenticated",
          profile: profileName,
          expiresAt: tokens.expiresAt,
        };
        if (accountId) loginResult.accountId = accountId;
        printJson(rt, loginResult);
      });
    });

  // ── logout ────────────────────────────────────────────────────────────
  group
    .command("logout")
    .description("Remove cached SSO tokens for the current profile.")
    .action(async () => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const { profile, profileName, configDir } = await loadProfile(rt, globalOpts);

        await deleteSsoCache(configDir, profile);

        rt.writeErr("Logged out successfully.\n");
        printJson(rt, { status: "logged_out", profile: profileName });
      });
    });

  // ── status ────────────────────────────────────────────────────────────
  group
    .command("status")
    .description("Show current authentication status for the active profile.")
    .action(async () => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const { profile: profileLoaded, profileName, configDir } = await loadProfile(rt, globalOpts);

        const cached = await readSsoCache(configDir, profileLoaded);
        if (!cached) {
          const notAuthResult: Record<string, string> = {
            profile: profileName,
            status: "not_authenticated",
          };
          if (profileLoaded.ssoAccountId) notAuthResult.accountId = profileLoaded.ssoAccountId;
          printJson(rt, notAuthResult);
          return;
        }

        const valid = isTokenValid(cached);
        const statusResult: Record<string, string | boolean> = {
          profile: profileName,
          status: valid ? "authenticated" : "expired",
          expiresAt: cached.expiresAt,
          hasRefreshToken: Boolean(cached.refreshToken),
        };
        if (profileLoaded.ssoAccountId) statusResult.accountId = profileLoaded.ssoAccountId;
        printJson(rt, statusResult);
      });
    });

  // ── refresh ───────────────────────────────────────────────────────────
  group
    .command("refresh")
    .description("Manually refresh the SSO token for the current profile.")
    .action(async () => {
      await run(rt, async () => {
        const globalOpts = program.opts<GlobalOptions>();
        const { profile, profileName, configDir } = await loadProfile(rt, globalOpts);

        const cached = await readSsoCache(configDir, profile);
        if (!cached?.refreshToken) {
          throw new Error("No cached token with refresh token. Run `seclai auth login` first.");
        }

        const tokenUrl = `https://${profile.ssoDomain}/oauth2/token`;
        const body = new URLSearchParams({
          grant_type: "refresh_token",
          client_id: profile.ssoClientId,
          refresh_token: cached.refreshToken,
        });

        const resp = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Token refresh failed (HTTP ${resp.status}): ${text}`);
        }

        const data = (await resp.json()) as {
          access_token: string;
          id_token?: string;
          refresh_token?: string;
          expires_in: number;
        };

        const refreshed: SsoCacheEntry = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? cached.refreshToken,
          expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          clientId: profile.ssoClientId,
          region: profile.ssoRegion,
          cognitoDomain: profile.ssoDomain,
        };
        if (data.id_token) refreshed.idToken = data.id_token;

        await writeSsoCache(configDir, profile, refreshed);

        rt.writeErr("Token refreshed successfully.\n");
        printJson(rt, {
          status: "refreshed",
          profile: profileName,
          expiresAt: refreshed.expiresAt,
        });
      });
    });
}
