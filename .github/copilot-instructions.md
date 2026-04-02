# Copilot Instructions — seclai-cli

## Build & Lint Pipeline

```sh
npm run build       # tsup — bundles CLI into dist/cli.js
npm run typecheck   # tsc --noEmit
npm test            # vitest
```

## Quality gates (must pass to report completion)

- **ALL tests must pass with ZERO failures. No exceptions.** CI/CD runs the full test suite on every PR. A test failure blocks the build.
- **`npm run build` must succeed with ZERO errors.**
- **`npm run typecheck` must succeed with ZERO errors.**
- **Do not dismiss test or build failures as pre-existing or unrelated.** The `main` branch CI/CD is green. Any failure on a feature branch was caused by changes on that branch.
- **CRITICAL — NEVER INVESTIGATE ERROR ORIGIN OR BLAME**: When a type, build, or test error appears, **fix it immediately**. Do NOT run `git blame` or use git history to argue that an error is "pre-existing" or not your responsibility. Tools like `git diff`, `git log`, and `git show` may be used to understand and review changes, but never to avoid fixing an error. There is no scenario where knowing the origin of an error changes what you must do: **fix it**.
- **CRITICAL — NEVER PIPE TEST OR BUILD OUTPUT**: Do not append `| tail`, `| head`, `| grep`, or any pipe to `npm test`, `npm run build`, `npm run typecheck`, or similar commands. Piping hides errors. Always run with full unfiltered output.

## Key Rules

- `tsconfig.json` uses `exactOptionalPropertyTypes: true` — optional properties must use `prop?: T | undefined`, not just `prop?: T`.
- CLI commands live in `src/commands/`. Each file exports a commander subcommand.
- `CliRuntime` in `src/helpers.ts` abstracts `process.stdout/stderr/stdin` for testability. Commands should use the runtime, not `console.log` directly.
- All commands return JSON to stdout by default for piping into `jq`.
- Depends on `@seclai/sdk` — when the SDK adds new endpoints, corresponding CLI commands may need updating.
- `.github/copilot-instructions.md` shares common sections (quality gates, git rules, editing rules, self-correction rules) across all SDK repos. When updating shared rules, apply the same change to all repos: `seclai-python`, `seclai-javascript`, `seclai-go`, `seclai-csharp`, `seclai-cli`, `seclai-mcp`.
- Do not run ad-hoc scripts; add tests instead.

## Git rules

- **NEVER use `git stash`.** Use `git diff`, `git log`, or `git show` instead.
- Do not run `git checkout` to switch branches, `git reset`, or any other destructive git operation without explicit user approval.

## Editing rules

- Do not use CLI text tools (sed/awk). Use the editor-based patch tool.

## Self-correction rules

- **NEVER promise to "do better" without updating these instruction files.** If a recurring mistake is identified, edit this file with a concrete rule that prevents the mistake. Do that FIRST, then continue work.
