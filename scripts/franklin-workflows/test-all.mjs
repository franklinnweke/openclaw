#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const checks = [
  "scripts/franklin-agentic-hub/test-lead-packet-validator.mjs",
  "scripts/franklin-agentic-hub/test-import-lead-packet.mjs",
  "scripts/franklin-agentic-hub/test-decide-lead-packet.mjs",
  "scripts/franklin-portfolio-proof/test-portfolio-proof-validator.mjs",
  "scripts/franklin-vps-lab/test-preflight-check.mjs",
];

let failures = 0;

for (const check of checks) {
  const result = spawnSync(process.execPath, [check], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout.trim().length > 0) {
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim().length > 0) {
    console.error(result.stderr.trim());
  }

  if (result.status !== 0) {
    failures += 1;
    console.error(`FAIL ${check}`);
  } else {
    console.log(`OK ${check}`);
  }
}

if (failures > 0) {
  console.error(`${failures} Franklin workflow check(s) failed`);
  process.exit(1);
}

console.log("All Franklin workflow checks passed");
