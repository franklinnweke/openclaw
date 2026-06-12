#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(__dirname, "validate-portfolio-proof.mjs");

const cases = [
  {
    name: "accepts public-safe portfolio proof",
    file: path.join(__dirname, "fixtures", "valid-portfolio-proof.json"),
    expectedStatus: 0,
    expectedOutput: "Portfolio proof valid",
  },
  {
    name: "rejects private client claims",
    file: path.join(__dirname, "fixtures", "invalid-private-claim.json"),
    expectedStatus: 1,
    expectedOutput: "contains private or unsafe terms",
  },
  {
    name: "rejects missing evidence",
    file: path.join(__dirname, "fixtures", "invalid-missing-evidence.json"),
    expectedStatus: 1,
    expectedOutput: "evidence must be a non-empty array",
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
