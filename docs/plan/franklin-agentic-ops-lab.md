---
title: "Franklin Agentic Operations Lab"
summary: "Implementation scaffold for an approval-gated OpenClaw operator cockpit around Agentic-Hub, portfolio proof, client QA, and job search workflows."
read_when:
  - Building a personal operating cockpit with OpenClaw
  - Integrating OpenClaw with a lead research or CRM system
  - Designing approval-gated browser, email, CRM, and outreach workflows
---

## Status

Draft implementation scaffold.

This plan intentionally avoids OpenClaw core runtime changes. The first
implementation layer is a workspace/operator package: agent layout, private
skills, data contracts, QA scenarios, and guardrails that can be tested before
any CRM, email, or browser write action is enabled.

## Goal

Create a controlled OpenClaw lab for Franklin Nweke that supports:

- daily personal operating-system review,
- Agentic-Hub lead research with human approval,
- portfolio proof generation,
- job-search research,
- client project QA,
- safe VPS/runtime experiments.

The lab should prove agentic workflow competence without granting broad
autonomy over browser sessions, email, CRM, or production infrastructure.

## Non-goals

- Do not turn one OpenClaw Gateway into a multi-tenant client boundary.
- Do not auto-send outreach, job applications, or CRM updates.
- Do not store secrets in memory files, prompts, or generated reports.
- Do not require a public Gateway exposure path.
- Do not depend on personal browser sessions for the first version.

## Recommended agent layout

Use separate agents because each agent has its own workspace, auth state, and
session store.

```json5
{
  session: {
    dmScope: "per-channel-peer"
  },
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main"
      },
      skills: [
        "franklin-lead-research",
        "franklin-portfolio-proof"
      ]
    },
    list: [
      {
        id: "franklin-os",
        workspace: "~/.openclaw/workspaces/franklin-os",
        skills: ["franklin-portfolio-proof"]
      },
      {
        id: "agentic-hub-research",
        workspace: "~/.openclaw/workspaces/agentic-hub-research",
        skills: ["franklin-lead-research"],
        tools: {
          profile: "coding",
          deny: ["message", "browser", "cron", "gateway"]
        }
      },
      {
        id: "repo-review",
        workspace: "~/.openclaw/workspaces/repo-review",
        tools: {
          profile: "coding",
          alsoAllow: ["browser"]
        }
      },
      {
        id: "client-qa",
        workspace: "~/.openclaw/workspaces/client-qa",
        tools: {
          profile: "coding",
          alsoAllow: ["browser"],
          deny: ["message", "gateway"]
        }
      }
    ]
  },
  tools: {
    exec: {
      mode: "ask",
      strictInlineEval: true
    },
    elevated: {
      enabled: false
    }
  }
}
```

Treat the snippet as a starting point. Verify the effective tool list from the
actual session before running live work.

## Agentic-Hub handoff contract

OpenClaw should return research packets, not mutate Agentic-Hub directly in the
first version.

Flow:

1. Agentic-Hub creates a lead research task.
2. OpenClaw runs an isolated research turn or command job.
3. The agent emits a lead packet that matches
   `scripts/franklin-agentic-hub/lead-packet.schema.json`.
4. `scripts/franklin-agentic-hub/validate-lead-packet.mjs` validates the packet.
5. `scripts/franklin-agentic-hub/import-lead-packet.mjs` appends valid packets
   to a local `pending_review.jsonl` queue.
6. `scripts/franklin-agentic-hub/decide-lead-packet.mjs` records Franklin's
   explicit approve/reject decision in `decisions.jsonl`.
7. Only approved packets can produce draft preparation tasks. Email, DM, CRM,
   signed-in browser use, and other outbound actions remain separate approval
   gates.

## Portfolio proof contract

OpenClaw portfolio work should return public-safe proof packets, not publish
claims directly.

Flow:

1. Franklin or Agentic-Hub selects a project milestone, commit, screenshot, QA
   run, or implementation note.
2. OpenClaw drafts a portfolio proof packet using the
   `franklin-portfolio-proof` skill.
3. `scripts/franklin-portfolio-proof/validate-portfolio-proof.mjs` validates
   the packet.
4. Franklin reviews the packet before it becomes portfolio copy, outreach copy,
   resume material, or job-search evidence.

The proof packet must include evidence references, risk notes, and next actions.
It must not include private client revenue, customer data, credentials, secrets,
or unsupported autonomy claims.

The packet must include:

- task id,
- generated timestamp,
- lead identity,
- source-backed findings,
- confidence,
- approval gate status,
- explicit prohibited action flags.

## Approval boundaries

Always require approval for:

- sending email, LinkedIn, WhatsApp, SMS, or Discord outreach,
- writing to CRM or lead records,
- using a signed-in browser profile,
- running host exec outside sandbox,
- installing skills or plugins,
- changing Gateway bind/auth/network exposure,
- reading private client systems,
- deploying, migrating, deleting, or changing production infrastructure.

## Browser posture

Use the isolated `openclaw` browser profile for:

- public website QA,
- portfolio screenshots,
- public lead website checks,
- staging-flow smoke tests with dedicated staging accounts.

Use the `user` browser profile only when Franklin is present and the task is
explicitly approved.

## VPS posture

Use the VPS as one of:

- an always-on low-risk Gateway reached through SSH tunnel or Tailscale,
- an SSH sandbox backend for repo experiments,
- a disposable Docker demo host.

Do not public-forward the Gateway. Run `openclaw doctor`, `openclaw security
audit --deep`, and `openclaw backup create` before connecting channels.

Use `docs/plan/franklin-vps-runtime-lab.md` and
`scripts/franklin-vps-lab/preflight-check.mjs` before any live VPS run.

## First 7 implementation tasks

1. Install the two private skills from `skills/franklin-*` into the active
   Franklin workspace.
2. Create the four agents listed above.
3. Run a local-only lead research packet through the validator.
4. Add an Agentic-Hub importer that stores valid packets as `pending_review`.
5. Run one portfolio proof draft from local git notes and screenshots.
6. Run one client QA browser report against public or staging URLs only.
7. Review logs, memory writes, cron history, and tool usage before enabling any
   live channel.

## Verification

Minimum proof before live use:

- lead packet validator rejects missing sources,
- lead packet validator rejects approval bypass packets that do not record an
  explicit Franklin approval rationale,
- lead packet importer writes only to a `pending_review` queue,
- lead packet decisions require a human rationale and reject duplicate
  decisions,
- portfolio proof packets require public-safe evidence and reject private
  client or credential claims,
- VPS runtime profiles reject public Gateway exposure before deployment,
- outbound action requests stay in `approval_gate.status = "required"`,
- no fake secret appears in a visible QA-channel reply,
- browser QA uses isolated profile,
- cron or command jobs leave auditable run history,
- memory writes are short, sourced, and public-safe.

## Related files

- `skills/franklin-lead-research/SKILL.md`
- `skills/franklin-portfolio-proof/SKILL.md`
- `scripts/franklin-agentic-hub/lead-packet.schema.json`
- `scripts/franklin-agentic-hub/decide-lead-packet.mjs`
- `scripts/franklin-agentic-hub/test-decide-lead-packet.mjs`
- `scripts/franklin-agentic-hub/import-lead-packet.mjs`
- `scripts/franklin-agentic-hub/test-import-lead-packet.mjs`
- `scripts/franklin-agentic-hub/validate-lead-packet.mjs`
- `scripts/franklin-agentic-hub/test-lead-packet-validator.mjs`
- `scripts/franklin-portfolio-proof/portfolio-proof.schema.json`
- `scripts/franklin-portfolio-proof/validate-portfolio-proof.mjs`
- `scripts/franklin-portfolio-proof/test-portfolio-proof-validator.mjs`
- `docs/plan/franklin-vps-runtime-lab.md`
- `scripts/franklin-vps-lab/preflight-check.mjs`
- `scripts/franklin-vps-lab/test-preflight-check.mjs`
- `qa/scenarios/personal/franklin-agentic-hub-lead-packet.md`
- `qa/scenarios/personal/franklin-portfolio-proof-packet.md`
