# Setup: authentication, profiles, API version, editor integration

## SSO authentication

```bash
seclai auth login [--port <port>] [--no-browser]   # OAuth2 + PKCE in the browser
seclai auth status                                 # active profile's auth state
seclai auth refresh                                # refresh the token manually
seclai auth logout                                 # clear cached tokens
```

Tokens are cached under the config directory and refreshed automatically, so
`auth refresh` is only needed to force it. An API key in `SECLAI_API_KEY` takes a
different path entirely and needs none of this.

## Profiles

```bash
seclai configure sso [--profile-name <name>]   # interactive: domain, client ID, region, account ID
seclai configure list                          # every configured profile
```

Profiles live in `~/.seclai/config` (override with `--config-dir` or
`SECLAI_CONFIG_DIR`). Select one per invocation with `--profile <name>`, or set
`SECLAI_PROFILE`.

## API version

```bash
seclai api-version get           # what version does a request resolve to?
seclai api-version set <date>    # pin the account — affects every client
seclai api-version clear         # remove the pin
```

`set` and `clear` change the account, not just this CLI. To affect only your own
invocation, use the `--api-version` global option instead.

## MCP server

```bash
# write Seclai MCP server config into AI coding tool config files
seclai mcp configure --key <apiKey> [--target claude-code|cursor|claude-desktop|windsurf|all] [--dir .]

# print the config JSON for manual setup
seclai mcp show [--key <apiKey>]
```

## Skill files

```bash
# install these skill files into AI coding tool directories
seclai skills install [--tool copilot|claude|cursor|windsurf|codex|kiro|cline|roo|gemini|antigravity|all] [--dir .]
```

With no `--tool`, the target is detected from the directory structure.

## Shell completion

```bash
seclai completion bash   # eval "$(seclai completion bash)" in ~/.bashrc
seclai completion zsh    # eval "$(seclai completion zsh)" in ~/.zshrc
seclai completion fish   # seclai completion fish > ~/.config/fish/completions/seclai.fish
```
