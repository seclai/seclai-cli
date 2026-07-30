import { Command } from "commander";
import type { CliRuntime } from "../helpers.js";

const BASH = `#!/usr/bin/env bash
# seclai bash completion — add to ~/.bashrc:
#   eval "$(seclai completion bash)"

_seclai_completions() {
  local cur prev commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Top-level commands
  commands="agents sources contents kb memory evals solutions governance alerts email models search docs me api-version ai skills mcp completion auth configure help"

  case "\${COMP_WORDS[1]}" in
    agents)
      case "\${COMP_WORDS[2]}" in
        runs)     COMPREPLY=( $(compgen -W "list get delete cancel search eval-results download-attachment" -- "$cur") ); return ;;
        def)      COMPREPLY=( $(compgen -W "get update" -- "$cur") ); return ;;
        ai)       COMPREPLY=( $(compgen -W "gen-steps step-config history mark" -- "$cur") ); return ;;
        triggers) COMPREPLY=( $(compgen -W "email-config" -- "$cur") ); return ;;
        *)        COMPREPLY=( $(compgen -W "list create get update delete disable enable callers triggers run runs def export preview-import upload-input input-status attachment-references ai" -- "$cur") ); return ;;
      esac ;;
    sources|source)
      case "\${COMP_WORDS[2]}" in
        exports)    COMPREPLY=( $(compgen -W "list create get cancel delete download estimate" -- "$cur") ); return ;;
        migration)  COMPREPLY=( $(compgen -W "get start cancel" -- "$cur") ); return ;;
        *)          COMPREPLY=( $(compgen -W "list create get update delete upload upload-text exports migration" -- "$cur") ); return ;;
      esac ;;
    contents) COMPREPLY=( $(compgen -W "get delete upload replace replace-text embeddings" -- "$cur") ); return ;;
    kb)       COMPREPLY=( $(compgen -W "list create get update delete" -- "$cur") ); return ;;
    memory)
      case "\${COMP_WORDS[2]}" in
        ai) COMPREPLY=( $(compgen -W "generate last accept" -- "$cur") ); return ;;
        *)  COMPREPLY=( $(compgen -W "list create get update delete stats agents compact delete-source templates test-compaction test-compaction-standalone ai" -- "$cur") ); return ;;
      esac ;;
    evals)
      case "\${COMP_WORDS[2]}" in
        criteria) COMPREPLY=( $(compgen -W "list create get update delete summary" -- "$cur") ); return ;;
        results)  COMPREPLY=( $(compgen -W "list create" -- "$cur") ); return ;;
        *)        COMPREPLY=( $(compgen -W "criteria results compatible-runs test-draft agent-results agent-runs non-manual-summary" -- "$cur") ); return ;;
      esac ;;
    solutions)
      case "\${COMP_WORDS[2]}" in
        convos) COMPREPLY=( $(compgen -W "list add mark" -- "$cur") ); return ;;
        ai)     COMPREPLY=( $(compgen -W "generate kb source accept decline" -- "$cur") ); return ;;
        *)      COMPREPLY=( $(compgen -W "list create get update delete link unlink convos ai" -- "$cur") ); return ;;
      esac ;;
    governance)
      case "\${COMP_WORDS[2]}" in
        ai) COMPREPLY=( $(compgen -W "generate list accept decline" -- "$cur") ); return ;;
        *)  COMPREPLY=( $(compgen -W "ai" -- "$cur") ); return ;;
      esac ;;
    alerts)
      case "\${COMP_WORDS[2]}" in
        configs) COMPREPLY=( $(compgen -W "list create get update delete" -- "$cur") ); return ;;
        prefs)   COMPREPLY=( $(compgen -W "list update" -- "$cur") ); return ;;
        *)       COMPREPLY=( $(compgen -W "list get status comment subscribe unsubscribe configs prefs" -- "$cur") ); return ;;
      esac ;;
    email)
      case "\${COMP_WORDS[2]}" in
        domains) COMPREPLY=( $(compgen -W "list add remove verify set-primary use-shared test-email dmarc" -- "$cur") ); return ;;
        blocked) COMPREPLY=( $(compgen -W "list add remove auto-block-mode" -- "$cur") ); return ;;
        inbound) COMPREPLY=( $(compgen -W "status rejections cancel-queued resume" -- "$cur") ); return ;;
        optouts) COMPREPLY=( $(compgen -W "list remove" -- "$cur") ); return ;;
        *)       COMPREPLY=( $(compgen -W "domains blocked inbound optouts" -- "$cur") ); return ;;
      esac ;;
    models)
      case "\${COMP_WORDS[2]}" in
        alerts)      COMPREPLY=( $(compgen -W "list mark-read mark-all-read unread-count" -- "$cur") ); return ;;
        experiments) COMPREPLY=( $(compgen -W "list create get cancel delete" -- "$cur") ); return ;;
        *)           COMPREPLY=( $(compgen -W "list get tiers alerts recommendations experiments" -- "$cur") ); return ;;
      esac ;;
    docs) COMPREPLY=( $(compgen -W "search" -- "$cur") ); return ;;
    api-version) COMPREPLY=( $(compgen -W "get set clear" -- "$cur") ); return ;;
    auth) COMPREPLY=( $(compgen -W "login logout status refresh" -- "$cur") ); return ;;
    configure) COMPREPLY=( $(compgen -W "sso list" -- "$cur") ); return ;;
    ai) COMPREPLY=( $(compgen -W "feedback kb source solution memory memory-history accept decline memory-accept" -- "$cur") ); return ;;
    skills) COMPREPLY=( $(compgen -W "install" -- "$cur") ); return ;;
    mcp) COMPREPLY=( $(compgen -W "configure show" -- "$cur") ); return ;;
    completion) COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ); return ;;
  esac

  COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
}

complete -F _seclai_completions seclai
`;

const ZSH = `#compdef seclai
# seclai zsh completion — add to ~/.zshrc:
#   eval "$(seclai completion zsh)"

_seclai() {
  local -a commands
  commands=(
    'agents:Manage agents, runs, definitions, and AI assistance'
    'sources:Manage content sources'
    'contents:Manage indexed content and embeddings'
    'kb:Manage knowledge bases'
    'memory:Manage memory banks'
    'evals:Manage evaluations'
    'solutions:Manage solutions'
    'governance:Governance AI assistant'
    'alerts:Manage alerts and alert configurations'
    'email:Agent email domains, blocklist, inbound health, opt-outs'
    'models:Models, model alerts, recommendations, experiments'
    'search:Search across Seclai resources'
    'docs:Search the Seclai documentation'
    'me:Show the authenticated user and organizations'
    'api-version:Read or pin the dated API version'
    'ai:Top-level AI assistant'
    'skills:Install skill files for AI coding tools'
    'mcp:Configure the Seclai MCP server'
    'completion:Generate shell completion scripts'
    'auth:SSO authentication'
    'configure:Manage SSO profiles'
    'help:Display help for command'
  )

  _arguments -C \\
    '--api-key[Seclai API key]:key' \\
    '--api-version[Dated API version (YYYY-MM-DD)]:date' \\
    '--allow-unknown-api-version[Permit an unrecognized --api-version]' \\
    '--compact[Output compact JSON]' \\
    '-V[Output version]' \\
    '-h[Display help]' \\
    '1:command:->cmd' \\
    '*::arg:->args'

  case $state in
    cmd) _describe 'command' commands ;;
    args)
      case \${words[1]} in
        agents)
          local -a sub=(list create get update delete disable enable callers triggers run runs def export preview-import upload-input input-status attachment-references ai)
          _describe 'subcommand' sub ;;
        sources|source)
          local -a sub=(list create get update delete upload upload-text exports migration)
          _describe 'subcommand' sub ;;
        contents)
          local -a sub=(get delete upload replace replace-text embeddings)
          _describe 'subcommand' sub ;;
        kb)
          local -a sub=(list create get update delete)
          _describe 'subcommand' sub ;;
        memory)
          local -a sub=(list create get update delete stats agents compact delete-source templates test-compaction test-compaction-standalone ai)
          _describe 'subcommand' sub ;;
        evals)
          local -a sub=(criteria results compatible-runs test-draft agent-results agent-runs non-manual-summary)
          _describe 'subcommand' sub ;;
        solutions)
          local -a sub=(list create get update delete link unlink convos ai)
          _describe 'subcommand' sub ;;
        governance)
          local -a sub=(ai)
          _describe 'subcommand' sub ;;
        alerts)
          local -a sub=(list get status comment subscribe unsubscribe configs prefs)
          _describe 'subcommand' sub ;;
        email)
          local -a sub=(domains blocked inbound optouts)
          _describe 'subcommand' sub ;;
        models)
          local -a sub=(list get tiers alerts recommendations experiments)
          _describe 'subcommand' sub ;;
        docs)
          local -a sub=(search)
          _describe 'subcommand' sub ;;
        api-version)
          local -a sub=(get set clear)
          _describe 'subcommand' sub ;;
        auth)
          local -a sub=(login logout status refresh)
          _describe 'subcommand' sub ;;
        configure)
          local -a sub=(sso list)
          _describe 'subcommand' sub ;;
        ai)
          local -a sub=(feedback kb source solution memory memory-history accept decline memory-accept)
          _describe 'subcommand' sub ;;
        skills)
          local -a sub=(install)
          _describe 'subcommand' sub ;;
        mcp)
          local -a sub=(configure show)
          _describe 'subcommand' sub ;;
        completion)
          local -a sub=(bash zsh fish)
          _describe 'shell' sub ;;
      esac ;;
  esac
}

_seclai "$@"
`;

const FISH = `# seclai fish completion — save to ~/.config/fish/completions/seclai.fish
#   seclai completion fish > ~/.config/fish/completions/seclai.fish

set -l top agents sources contents kb memory evals solutions governance alerts email models search docs me api-version ai skills mcp completion auth configure help

# Top-level
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "agents" -d "Manage agents"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "sources" -d "Manage sources"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "contents" -d "Manage content"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "kb" -d "Knowledge bases"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "memory" -d "Memory banks"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "evals" -d "Evaluations"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "solutions" -d "Solutions"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "governance" -d "Governance AI"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "alerts" -d "Alerts"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "email" -d "Agent email"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "models" -d "Models and model alerts"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "search" -d "Search resources"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "docs" -d "Search documentation"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "me" -d "Authenticated user"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "api-version" -d "Dated API version"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "ai" -d "AI assistant"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "skills" -d "Skill files"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "mcp" -d "MCP server config"
complete -c seclai -n "not __fish_seen_subcommand_from $top" -f -a "completion" -d "Shell completions"

# agents
complete -c seclai -n "__fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from list create get update delete disable enable callers triggers run runs def export preview-import upload-input input-status attachment-references ai" -f -a "list create get update delete disable enable callers triggers run runs def export preview-import upload-input input-status attachment-references ai"

# sources
complete -c seclai -n "__fish_seen_subcommand_from sources; and not __fish_seen_subcommand_from list create get update delete upload upload-text exports migration" -f -a "list create get update delete upload upload-text exports migration"

# contents
complete -c seclai -n "__fish_seen_subcommand_from contents; and not __fish_seen_subcommand_from get delete upload replace replace-text embeddings" -f -a "get delete upload replace replace-text embeddings"

# kb
complete -c seclai -n "__fish_seen_subcommand_from kb; and not __fish_seen_subcommand_from list create get update delete" -f -a "list create get update delete"

# memory
complete -c seclai -n "__fish_seen_subcommand_from memory; and not __fish_seen_subcommand_from list create get update delete stats agents compact delete-source templates test-compaction test-compaction-standalone ai" -f -a "list create get update delete stats agents compact delete-source templates test-compaction test-compaction-standalone ai"

# evals
complete -c seclai -n "__fish_seen_subcommand_from evals; and not __fish_seen_subcommand_from criteria results compatible-runs test-draft agent-results agent-runs non-manual-summary" -f -a "criteria results compatible-runs test-draft agent-results agent-runs non-manual-summary"

# solutions
complete -c seclai -n "__fish_seen_subcommand_from solutions; and not __fish_seen_subcommand_from list create get update delete link unlink convos ai" -f -a "list create get update delete link unlink convos ai"

# governance
complete -c seclai -n "__fish_seen_subcommand_from governance; and not __fish_seen_subcommand_from ai" -f -a "ai"

# alerts
complete -c seclai -n "__fish_seen_subcommand_from alerts; and not __fish_seen_subcommand_from list get status comment subscribe unsubscribe configs prefs" -f -a "list get status comment subscribe unsubscribe configs prefs"

# email
complete -c seclai -n "__fish_seen_subcommand_from email; and not __fish_seen_subcommand_from domains blocked inbound optouts" -f -a "domains blocked inbound optouts"

# models
complete -c seclai -n "__fish_seen_subcommand_from models; and not __fish_seen_subcommand_from list get tiers alerts recommendations experiments" -f -a "list get tiers alerts recommendations experiments"

# docs
complete -c seclai -n "__fish_seen_subcommand_from docs; and not __fish_seen_subcommand_from search" -f -a "search"

# api-version
complete -c seclai -n "__fish_seen_subcommand_from api-version; and not __fish_seen_subcommand_from get set clear" -f -a "get set clear"

# auth
complete -c seclai -n "__fish_seen_subcommand_from auth; and not __fish_seen_subcommand_from login logout status refresh" -f -a "login logout status refresh"

# configure
complete -c seclai -n "__fish_seen_subcommand_from configure; and not __fish_seen_subcommand_from sso list" -f -a "sso list"

# ai
complete -c seclai -n "__fish_seen_subcommand_from ai; and not __fish_seen_subcommand_from feedback kb source solution memory memory-history accept decline memory-accept" -f -a "feedback kb source solution memory memory-history accept decline memory-accept"

# skills
complete -c seclai -n "__fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from install" -f -a "install"

# mcp
complete -c seclai -n "__fish_seen_subcommand_from mcp; and not __fish_seen_subcommand_from configure show" -f -a "configure show"

# completion
complete -c seclai -n "__fish_seen_subcommand_from completion; and not __fish_seen_subcommand_from bash zsh fish" -f -a "bash zsh fish"

# Global options
complete -c seclai -l api-key -d "Seclai API key"
complete -c seclai -l api-version -d "Dated API version (YYYY-MM-DD)"
complete -c seclai -l allow-unknown-api-version -d "Permit an unrecognized --api-version"
complete -c seclai -l compact -d "Output compact JSON"
complete -c seclai -s V -l version -d "Output version"
`;

const SCRIPTS: Record<string, string> = { bash: BASH, zsh: ZSH, fish: FISH };

/** Register the `completion` command for generating shell completion scripts (bash/zsh/fish). */
export function register(program: Command, rt: CliRuntime): void {
  const completion = program
    .command("completion")
    .description("Generate shell completion scripts.")
    .argument("<shell>", "Shell type: bash, zsh, or fish.")
    .action(async (shell: string) => {
      const script = SCRIPTS[shell];
      if (!script) {
        rt.writeErr(`Unknown shell "${shell}". Use: bash, zsh, or fish.\n`);
        rt.setExitCode(1);
        return;
      }
      rt.writeOut(script);
    });
}
