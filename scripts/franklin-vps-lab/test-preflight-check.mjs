#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preflight = path.join(__dirname, "preflight-check.mjs");

const cases = [
  {
    name: "accepts loopback ssh tunnel profile",
    file: path.join(__dirname, "fixtures", "safe-vps-preflight.json"),
    expectedStatus: 0,
    expectedOutput: "VPS preflight accepted",
  },
  {
    name: "rejects public exposed profile",
    file: path.join(__dirname, "fixtures", "unsafe-public-vps-preflight.json"),
    expectedStatus: 1,
    expectedOutput: "gateway.bind must be loopback",
  },
];

let failures = 0;

for (const testCase of cases) {
  const result = spawnSync(process.execPath, [preflight, testCase.file], {
    encoding: "utf8",
  });
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  const statusMatches = result.status === testCase.expectedStatus;
  const outputMatches = combinedOutput.includes(testCase.expectedOutput);

  if (!statusMatches || !outputMatches) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(`Expected status ${testCase.expectedStatus}, got ${result.status}`);
    console.error(`Expected output to include: ${testCase.expectedOutput}`);
    console.error(combinedOutput.trim());
    continue;
  }

  console.log(`PASS ${testCase.name}`);
}

if (failures > 0) {
  process.exit(1);
}
