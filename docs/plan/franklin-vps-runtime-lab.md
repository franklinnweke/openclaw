---
title: "Franklin VPS Runtime Lab"
summary: "Safe deployment runbook for using a clean VPS as an OpenClaw experiment host without public Gateway exposure."
read_when:
  - Running Franklin's OpenClaw lab on a VPS
  - Checking whether a remote Gateway setup is safe enough for personal workflow experiments
  - Preparing SSH tunnel, Tailscale, or disposable Docker experiments
---

## Status

Draft runbook and preflight contract.

This runbook is for Franklin's personal experimentation VPS. It is not a
multi-client hosting plan and should not be used as a shared security boundary
for unrelated client systems.

## Recommended shape

Start with:

- one dedicated Linux user for the OpenClaw lab,
- Gateway bound to loopback,
- no public port-forward to the Gateway,
- SSH tunnel from Franklin's machine to the VPS,
- non-main sandbox sessions,
- elevated tools disabled,
- host exec denied or approval-gated,
- browser/email/CRM actions disabled until a separate approval flow exists.

Reference docs:

- `docs/gateway/security/exposure-runbook.md`
- `docs/gateway/remote.md`
- `docs/gateway/tailscale.md`

## Do not start with

- public Gateway bind,
- Tailscale Funnel,
- open DM/group policies,
- personal browser sessions on the VPS,
- stored client credentials,
- Docker socket mounts,
- automatic deploy, delete, purchase, email, DM, or CRM-write actions.

## First deployment pass

1. Create or choose a dedicated VPS user.
2. Install OpenClaw and required runtime dependencies.
3. Configure Gateway loopback-only.
4. Configure token or password auth using a secret source, not a committed file.
5. Run:

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

6. Open an SSH tunnel:

```bash
ssh -N -L 18789:127.0.0.1:18789 franklin-vps
```

7. Probe through the tunnel with explicit credentials.
8. Run a local-only lead packet import and portfolio proof validation.
9. Review logs before connecting any messaging channel.

## Preflight file

Use `scripts/franklin-vps-lab/fixtures/safe-vps-preflight.json` as the expected
shape for the first VPS experiment.

Run:

```bash
node scripts/franklin-vps-lab/preflight-check.mjs scripts/franklin-vps-lab/fixtures/safe-vps-preflight.json
```

The preflight intentionally rejects public exposure, Funnel, enabled elevated
tools, open messaging, and direct email/CRM/browser automation.

## Rollback

If anything looks overexposed:

1. Stop the Gateway.
2. Stop SSH tunnels, reverse proxy routes, Serve/Funnel routes, and messaging
   channels.
3. Restore loopback bind.
4. Rotate Gateway and integration credentials.
5. Re-run `openclaw security audit --deep`.
6. Re-enable only one exposure path at a time.
