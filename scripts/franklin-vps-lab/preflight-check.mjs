#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const USAGE = "Usage: node scripts/franklin-vps-lab/preflight-check.mjs <preflight.json>";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function push(condition, errors, message) {
  if (!condition) {
    errors.push(message);
  }
}

export function validateVpsPreflight(config) {
  const errors = [];

  push(isObject(config), errors, "preflight config must be an object");
  if (!isObject(config)) {
    return errors;
  }

  push(config.gateway?.bind === "loopback", errors, "gateway.bind must be loopback");
  push(config.gateway?.public_exposure === false, errors, "gateway.public_exposure must be false");
  push(config.gateway?.tailscale_mode !== "funnel", errors, "gateway.tailscale_mode must not be funnel");
  push(["token", "password", "trusted-proxy"].includes(config.gateway?.auth_mode), errors, "gateway.auth_mode must require auth");

  push(["ssh_tunnel", "tailscale_serve"].includes(config.access?.method), errors, "access.method must be ssh_tunnel or tailscale_serve");
  push(Number.isInteger(config.access?.remote_port), errors, "access.remote_port must be an integer");
  push(Number.isInteger(config.access?.local_port), errors, "access.local_port must be an integer");

  push(config.agents?.sandbox_mode === "non-main", errors, "agents.sandbox_mode must be non-main");
  push(config.agents?.dm_scope === "per-channel-peer", errors, "agents.dm_scope must be per-channel-peer");

  push(["ask", "deny"].includes(config.tools?.exec_mode), errors, "tools.exec_mode must be ask or deny");
  push(config.tools?.elevated_enabled === false, errors, "tools.elevated_enabled must be false");
  push(config.tools?.browser_profile === "isolated", errors, "tools.browser_profile must be isolated");
  push(config.tools?.email_actions === "disabled", errors, "tools.email_actions must be disabled");
  push(config.tools?.crm_writes === "disabled", errors, "tools.crm_writes must be disabled");

  push(["disabled", "pairing", "allowlist"].includes(config.channels?.dm_policy), errors, "channels.dm_policy must be disabled, pairing, or allowlist");
  push(["disabled", "mention_required", "allowlist"].includes(config.channels?.group_policy), errors, "channels.group_policy must be disabled, mention_required, or allowlist");

  push(config.checks?.doctor === true, errors, "checks.doctor must be true");
  push(config.checks?.security_audit === true, errors, "checks.security_audit must be true");
  push(config.checks?.deep_security_audit === true, errors, "checks.deep_security_audit must be true");
  push(config.checks?.backup_created === true, errors, "checks.backup_created must be true");

  return errors;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(USAGE);
    process.exit(2);
  }

  const abs = path.resolve(file);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    console.error(`Failed to read VPS preflight JSON: ${error.message}`);
    process.exit(2);
  }

  const errors = validateVpsPreflight(config);
  if (errors.length > 0) {
    console.error(`VPS preflight rejected: ${abs}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`VPS preflight accepted: ${abs}`);
}

main();
