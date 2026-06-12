#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(__dirname, "validate-lead-packet.mjs");

const cases = [
  {
    name: "accepts valid packet",
    file: path.join(__dirname, "fixtures", "valid-lead-packet.json"),
    expectedStatus: 0,
    expectedOutput: "Lead packet valid",
  },
  {
    name: "rejects findings without source_url",
    file: path.join(__dirname, "fixtures", "invalid-missing-source.json"),
    expectedStatus: 1,
    expectedOutput: "findings[0].source_url must be non-empty text",
  },
  {
    name: "rejects non-required approval gate without rationale",
    file: path.join(__dirname, "fixtures", "invalid-approved-without-rationale.json"),
    expectedStatus: 1,
    expectedOutput: "non-required approval_gate.status must include an approval rationale",
  },
];

let failures = 0;

for (const testCase of cases) {
  const result = spawnSync(process.execPath, [validator, testCase.file], {
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
