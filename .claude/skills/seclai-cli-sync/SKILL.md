---
name: seclai-cli-sync
description: >-
  Update seclai-cli to a new @seclai/sdk release — surface new endpoints as
  commands, handle deprecations and newly-required parameters, and keep the
  completion scripts and docs in step. Use when the SDK version has moved, when
  asked to add CLI commands, or when auditing CLI coverage of the SDK.
---

# Syncing seclai-cli to a new SDK release

`seclai-cli` is not an SDK. It bundles no OpenAPI spec, generates no code, and
issues no HTTP requests of its own — it wraps `@seclai/sdk`. **Nothing in
`seclai-sdk-sync` applies here.** Every `sdksync.py` subcommand refuses to run
against this repo and says so:

```
$ sdksync.py parity .
seclai-cli: not applicable — wraps @seclai/sdk; coverage is SDK-method-to-command, not spec-path
```

The coverage question is *SDK method → CLI command*, and it is answered by the
repo's own test suite rather than by an external tool.

## The automated half

`tests/drift.test.ts` fails the build on the three ways this repo silently rots.
Run `npm test` after bumping the dependency and it will name what changed:

| Guard | Catches |
| --- | --- |
| SDK surface vs call sites | The SDK gained endpoints the CLI does not expose. Reads the installed `index.d.ts`, so it cannot go stale. |
| Call sites vs SDK surface | The CLI calls a method the SDK removed or renamed. |
| Commands vs completion scripts | A command or global option that bash/zsh/fish do not offer. It parses each script's completion word lists — a name merely *appearing* in the file is not enough, which is how a missing fish entry once passed. |
| Commands vs docs | A command group with no `seclai <cmd>` example in `README.md` or the bundled skill. |
| Embedded skill vs its sources | `src/commands/skills.ts` out of date with `skills/seclai-cli/`. This is the only guard that reads what `skills install` actually ships. |

Deliberate omissions live in `NOT_COMMANDS` in that file, each with a reason. A
second test asserts every exemption still corresponds to a real SDK method, so
the excuses cannot outlive the things they excuse.

**This is the whole of what can be checked mechanically.** The list of new
methods is a work list, not a design.

## The half that needs reading

Everything below is invisible to the type checker and to the drift tests,
because the CLI passes options through as plain objects and a passing
`npm run typecheck` proves nothing about them. **Read the SDK's `CHANGELOG.md`
across the whole version range** — it is the only source for these.

1. **Runtime guards added under an unchanged type.** In SDK 1.5.0
   `getAgentAiConversationHistory` began throwing when `opts.stepType` is
   missing; the option stayed optional in the signature so released one-argument
   calls keep compiling. The CLI typechecked clean and threw on every
   invocation. Any *Fixed* entry that says "throw from …" is this.

2. **Options accepted and ignored.** `listAlerts({severity})` still typechecks
   and always did — `GET /alerts` declares no such filter, so `--severity`
   returned unfiltered results that looked filtered, and becomes a 422 once the
   caller opts into `2026-07-27`. Remove the flag rather than pass it on; an
   unknown-option error is better than a plausible wrong answer.

3. **Deprecations that were never what they claimed.** `deleteAgentRun` called
   the cancel endpoint all along. Keep the command as an alias that warns on
   stderr and calls the honestly-named method, so scripts keep working.

4. **Generated request types with spurious required properties.** A schema
   property that declares a default is emitted as *required*
   (`BlockEmailSenderRequest.match_type`). Send the schema's own default rather
   than casting around the type — and check whether the SDK offers a
   hand-written `…Input` alias, as it does for `AddEmailDomainInput`.

## Response shapes are opt-in, always

The API is versioned by date and a version can reshape a response — a bare array
becoming `{data, pagination}`. The CLI sends **no version header by default**, so
upgrading it can never change what a command prints. That is a hard constraint,
not a preference: a CLI's output is a scripting interface.

- Global `--api-version` / `SECLAI_API_VERSION` opts a single invocation in.
- Where the SDK ships both readers (`listEvaluationCriteria` and
  `listEvaluationCriteriaPage`), expose the new shape behind a flag (`--paged`)
  that works regardless of the version in effect. That gives scripts a migration
  path before the account flips.

## Procedure

1. `npm install @seclai/sdk@^<version>` — then `grep '"version"'
   node_modules/@seclai/sdk/package.json` to confirm what actually resolved.
2. `npm test`. The drift guard names every uncovered method. That is the work list.
3. Read the SDK `CHANGELOG.md` for the full range, against the four traps above.
4. Group the new methods into commands. Prefer a new top-level group over
   bolting onto an existing one when the endpoints share a domain — SDK 1.4.0's
   twenty email methods became `seclai email {domains,blocked,inbound,optouts}`.
5. Add tests asserting the exact SDK call for each command, including which
   options are omitted when not passed.
6. Update `completion.ts`, `README.md` and `skills/seclai-cli/SKILL.md`, then run
   **`npm run sync:skills`** — the files `skills install` writes are string
   constants compiled into `src/commands/skills.ts`, and editing the sources
   alone changes nothing that ships. The drift tests enforce presence and
   freshness, not accuracy: they cannot tell you an example is wrong.
7. Gate: `npm run typecheck && npm test && npm run build && npm run docs`.

## Commander notes

- A command with its own `.action()` cannot cleanly host subcommands. `search`
  takes `--query` directly, so documentation search became `seclai docs search`
  rather than `seclai search docs`.
- `requiredOption` is how a newly-required API parameter should surface: the
  parse fails with a usable message instead of the request 422-ing.
- Commander's option name maps to camelCase (`--step-type` → `opts.stepType`);
  the SDK takes camelCase too, but the *wire* parameter is snake_case. Assert on
  the SDK call in tests, not on the URL.

## Changelog

`seclai-cli` keeps a root `CHANGELOG.md` like the other five repos — see the
`seclai-changelog` skill, which is vendored here too. Two things are specific to
this repo:

- **The version comes from the merge commit.** `seclai/github-tag-action` reads
  it for `#major` / `#minor`, defaulting to a patch bump. A sync that adds
  commands must say `#minor` in the PR title, or the heading you write will not
  match the tag that gets cut.
- **Entries describe commands, not SDK methods.** A consumer of this package
  runs `seclai email domains list`; that they are reaching
  `listEmailDomains()` is an implementation detail. Group a family of new
  commands into one entry rather than listing each endpoint.

A removed flag is `Removed` and `**Breaking:**` even when it never worked —
scripts passing `--severity` used to succeed and now fail, and that is what a
reader needs to know.
