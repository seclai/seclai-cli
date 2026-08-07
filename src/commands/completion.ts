import { Command } from "commander";
import type { CliRuntime } from "../helpers.js";

/**
 * Shell completion scripts, generated from the live Commander tree.
 *
 * These used to be three hand-maintained copies of the command tree, so a new
 * command needed the same edit in three to five places and drifted the moment
 * one was missed: `auth` and `configure` went uncompleted for releases, and the
 * twenty-odd `email` subcommands reached bash but never zsh or fish. Deriving
 * them from `program` makes that class of drift unrepresentable — there is no
 * second copy to forget, and depth is no longer a special case.
 */

type Child = { name: string; description: string };

/**
 * Every command prefix mapped to what may follow it. The root is the empty
 * string, so `""` holds the top-level groups and `"agents runs"` holds that
 * group's subcommands.
 */
function collectTree(program: Command): Map<string, Child[]> {
  const tree = new Map<string, Child[]>();

  const walk = (cmd: Command, prefix: string[]): void => {
    const children: Child[] = [];
    for (const sub of cmd.commands) {
      const name = sub.name();
      if (name === "help") continue;
      children.push({ name, description: sub.description().replace(/\s+/g, " ").trim() });
      walk(sub, [...prefix, name]);
    }
    if (children.length > 0) tree.set(prefix.join(" "), children);
  };

  walk(program, []);
  return tree;
}

/** Long-form global options, minus the ones every shell already handles. */
function globalOptions(program: Command): Array<{ flag: string; description: string }> {
  return program.options
    .filter((o) => o.long && o.long !== "--help")
    .map((o) => ({
      flag: o.long as string,
      description: o.description.replace(/\s+/g, " ").trim(),
    }));
}

const names = (children: Child[]) => children.map((c) => c.name).join(" ");

type Options = ReturnType<typeof globalOptions>;

function renderBash(tree: Map<string, Child[]>, options: Options): string {
  const cases = [...tree.entries()]
    .map(([prefix, children]) => `    ${JSON.stringify(prefix)}) __seclai_reply "${names(children)}" ;;`)
    .join("\n");

  return `#!/usr/bin/env bash
# seclai bash completion — add to ~/.bashrc:
#   eval "\$(seclai completion bash)"
#
# Generated from the command tree by \`seclai completion bash\`. Do not edit.

__seclai_reply() {
  COMPREPLY=( \$(compgen -W "\$1" -- "\$__seclai_cur") )
}

_seclai_completions() {
  local __seclai_cur prefix i
  __seclai_cur="\${COMP_WORDS[COMP_CWORD]}"

  # Everything typed so far except the program name and the word being
  # completed, with flags dropped, joined by spaces.
  prefix=""
  for ((i = 1; i < COMP_CWORD; i++)); do
    case "\${COMP_WORDS[i]}" in
      -*) continue ;;
    esac
    if [ -z "\$prefix" ]; then
      prefix="\${COMP_WORDS[i]}"
    else
      prefix="\$prefix \${COMP_WORDS[i]}"
    fi
  done

  case "\$__seclai_cur" in
    -*) __seclai_reply "${options.map((o) => o.flag).join(" ")}"; return ;;
  esac

  case "\$prefix" in
${cases}
    *) COMPREPLY=() ;;
  esac
}

complete -F _seclai_completions seclai
`;
}

function renderZsh(tree: Map<string, Child[]>, options: Options): string {
  const cases = [...tree.entries()]
    .map(([prefix, children]) => {
      const described = children
        .map((c) => `'${c.name}:${c.description.replace(/['`$]/g, "")}'`)
        .join(" ");
      return `    ${JSON.stringify(prefix)}) sub=(${described}) ;;`;
    })
    .join("\n");

  const opts = options
    .map((o) => `'${o.flag}[${o.description.replace(/['\]`$]/g, "")}]'`)
    .join(" ");

  return `#compdef seclai
# seclai zsh completion — add to ~/.zshrc:
#   eval "\$(seclai completion zsh)"
#
# Generated from the command tree by \`seclai completion zsh\`. Do not edit.

_seclai() {
  local prefix cur
  local -a sub opts
  cur="\${words[CURRENT]}"

  opts=(${opts})
  if [[ "\$cur" == -* ]]; then
    _describe 'option' opts
    return
  fi

  # Words typed so far, minus the program name, the word being completed, and
  # any flags.
  prefix="\${(j: :)\${(M)words[2,CURRENT-1]:#[^-]*}}"

  case "\$prefix" in
${cases}
    *) return ;;
  esac

  _describe 'command' sub
}

compdef _seclai seclai
`;
}

function renderFish(tree: Map<string, Child[]>, options: Options): string {
  const lines = [...tree.entries()]
    .map(([prefix, children]) =>
      children
        .map(
          (c) =>
            `complete -c seclai -f -n "__seclai_at '${prefix}'" -a "${c.name}" ` +
            `-d "${c.description.replace(/["$`]/g, "")}"`,
        )
        .join("\n"),
    )
    .join("\n");

  const opts = options
    .map(
      (o) =>
        `complete -c seclai -l ${o.flag.replace(/^--/, "")} ` +
        `-d "${o.description.replace(/["$`]/g, "")}"`,
    )
    .join("\n");

  return `# seclai fish completion — save to your completions directory:
#   seclai completion fish > ~/.config/fish/completions/seclai.fish
#
# Generated from the command tree by \`seclai completion fish\`. Do not edit.

function __seclai_prefix
    set -l toks (commandline -opc)
    set -e toks[1]
    set -l out
    for t in \$toks
        if not string match -q -- '-*' \$t
            set -a out \$t
        end
    end
    string join ' ' \$out
end

function __seclai_at
    test (__seclai_prefix) = "\$argv[1]"
end

${lines}

# Global options
${opts}
`;
}

/** Render the completion script for one shell, or undefined if unsupported. */
export function renderCompletion(shell: string, program: Command): string | undefined {
  const tree = collectTree(program);
  const options = globalOptions(program);
  if (shell === "bash") return renderBash(tree, options);
  if (shell === "zsh") return renderZsh(tree, options);
  if (shell === "fish") return renderFish(tree, options);
  return undefined;
}

/** Register the `completion` command for generating shell completion scripts (bash/zsh/fish). */
export function register(program: Command, rt: CliRuntime): void {
  program
    .command("completion")
    .description("Generate shell completion scripts.")
    .argument("<shell>", "Shell type: bash, zsh, or fish.")
    .action((shell: string) => {
      const script = renderCompletion(shell, program);
      if (!script) {
        rt.writeErr(`Unknown shell "${shell}". Use: bash, zsh, or fish.\n`);
        rt.setExitCode(1);
        return;
      }
      rt.writeOut(script);
    });
}
