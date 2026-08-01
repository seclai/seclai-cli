import { Command } from "commander";
import type { CliRuntime, GlobalOptions } from "../helpers.js";
import {
  run,
  createClient,
  printJson,
  withOffsetListOptions,
  offsetListOpts,
  parseNumber,
} from "../helpers.js";

/** Register `email` commands: sending domains, inbound blocklist, inbound health, and agent opt-outs. */
export function register(program: Command, rt: CliRuntime): void {
  const email = program
    .command("email")
    .description("Agent email: sending domains, inbound blocklist, inbound health, and opt-outs.");

  // --- Domains ---

  const domains = email.command("domains").description("Agent-email sending domains.");

  domains
    .command("list")
    .description("List the account's email domains and the plan limits for adding more.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.listEmailDomains());
      });
    });

  domains
    .command("add")
    .description("Add and provision a new agent-email domain. Returns the DNS records to publish.")
    .requiredOption("--kind <kind>", "'vanity' (a subdomain of seclai.com) or 'custom' (your own domain).")
    .requiredOption("--value <domain>", "The domain to add.")
    .option("--delegated", "The domain's DNS is delegated to Seclai, so records are published automatically.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const body: Parameters<typeof client.addEmailDomain>[0] = {
          kind: opts.kind,
          value: opts.value,
        };
        if (opts.delegated) body.delegated = true;
        printJson(rt, await client.addEmailDomain(body));
      });
    });

  domains
    .command("remove")
    .description("Remove a domain and tear down its sending identity and inbound routing.")
    .argument("<domainId>", "Domain ID.")
    .action(async (domainId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.removeEmailDomain(domainId));
      });
    });

  domains
    .command("verify")
    .description("Run a verification check on a domain immediately.")
    .argument("<domainId>", "Domain ID.")
    .action(async (domainId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.verifyEmailDomain(domainId));
      });
    });

  domains
    .command("set-primary")
    .description("Promote a verified domain to the account's primary sending domain.")
    .argument("<domainId>", "Domain ID.")
    .action(async (domainId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.setPrimaryEmailDomain(domainId));
      });
    });

  domains
    .command("use-shared")
    .description("Revert to the shared agent.seclai.com sending and inbound domain.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.useSharedEmailDomain();
        printJson(rt, { ok: true });
      });
    });

  domains
    .command("test-email")
    .description("Send a test message from a verified domain to the account owner.")
    .argument("<domainId>", "Domain ID.")
    .action(async (domainId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.sendEmailDomainTestEmail(domainId));
      });
    });

  domains
    .command("dmarc")
    .description("Get the DMARC aggregate-report summary for a domain.")
    .argument("<domainId>", "Domain ID.")
    .option("--days <n>", "Reporting window in days.", parseNumber)
    .option("--top-sources <n>", "How many sending sources to include.", parseNumber)
    .action(async (domainId: string, opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.getDmarcSummary>[1] = {};
        if (opts.days !== undefined) o.days = opts.days;
        if (opts.topSources !== undefined) o.topSources = opts.topSources;
        printJson(rt, await client.getDmarcSummary(domainId, o));
      });
    });

  // --- Blocked senders ---

  const blocked = email.command("blocked").description("Inbound email sender blocklist.");

  withOffsetListOptions(
    blocked
      .command("list")
      .description("List blocked inbound senders (newest first) and the account's auto-block mode."),
  ).action(async (opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      printJson(rt, await client.listBlockedEmailSenders(offsetListOpts(opts)));
    });
  });

  blocked
    .command("add")
    .description("Block an inbound sender address or domain.")
    .requiredOption("--sender-email <email>", "Sender address, or the domain when --match-type is 'domain'.")
    .option("--match-type <type>", "'address' or 'domain'.", "address")
    .option("--note <text>", "Why the sender was blocked.")
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        // match_type is optional to the API (it defaults to "address") but the
        // generated request type marks it required, because declaring a default
        // is what makes a property required in the schema. Send the schema's
        // own default rather than work around the type.
        const body: Parameters<typeof client.blockEmailSender>[0] = {
          sender_email: opts.senderEmail,
          match_type: opts.matchType,
        };
        if (opts.note !== undefined) body.note = opts.note;
        printJson(rt, await client.blockEmailSender(body));
      });
    });

  blocked
    .command("remove")
    .description("Unblock a sender.")
    .argument("<blockedId>", "Blocklist entry ID.")
    .action(async (blockedId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.unblockEmailSender(blockedId);
        printJson(rt, { ok: true });
      });
    });

  blocked
    .command("auto-block-mode")
    .description("Set whether a governance BLOCK on an authenticated sender auto-adds them to the blocklist.")
    .argument("<mode>", "One of 'disabled', 'input', or 'input_and_output'.")
    .action(async (mode: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.setAutoBlockMode({ mode }));
      });
    });

  // --- Inbound health ---

  const inbound = email.command("inbound").description("Inbound email health and queue control.");

  inbound
    .command("status")
    .description("Get inbound-email quota usage, pause state, and queued-run counts.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.getInboundEmailStatus());
      });
    });

  inbound
    .command("rejections")
    .description("List recently rejected inbound emails and why they were rejected.")
    .option("--agent-id <id>", "Restrict to one agent.")
    .option("--limit <n>", "Maximum rejections to return.", parseNumber)
    .action(async (opts) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        const o: Parameters<typeof client.listInboundEmailRejections>[0] = {};
        if (opts.agentId !== undefined) o.agentId = opts.agentId;
        if (opts.limit !== undefined) o.limit = opts.limit;
        printJson(rt, await client.listInboundEmailRejections(o));
      });
    });

  inbound
    .command("cancel-queued")
    .description("Fail all of the account's queued (over-quota) inbound-email runs at once.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.cancelQueuedEmailRuns());
      });
    });

  inbound
    .command("resume")
    .description("Manually lift the account-wide inbound-email pause.")
    .action(async () => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        printJson(rt, await client.resumeInboundEmail());
      });
    });

  // --- Opt-outs ---

  const optouts = email.command("optouts").description("Recipients who opted out of agent email.");

  withOffsetListOptions(
    optouts
      .command("list")
      .description("List agent-email opt-outs.")
      .option("--agent-id <id>", "Restrict to one agent."),
  ).action(async (opts) => {
    await run(rt, async () => {
      const client = createClient(program.opts<GlobalOptions>());
      const o: Parameters<typeof client.listAgentEmailOptOuts>[0] = offsetListOpts(opts);
      if (opts.agentId !== undefined) o.agentId = opts.agentId;
      printJson(rt, await client.listAgentEmailOptOuts(o));
    });
  });

  optouts
    .command("remove")
    .description("Remove an opt-out so the recipient can receive agent email again.")
    .argument("<optoutId>", "Opt-out ID.")
    .action(async (optoutId: string) => {
      await run(rt, async () => {
        const client = createClient(program.opts<GlobalOptions>());
        await client.removeAgentEmailOptOut(optoutId);
        printJson(rt, { ok: true });
      });
    });
}
