#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importer = path.join(__dirname, "import-lead-packet.mjs");
const validPacket = path.join(__dirname, "fixtures", "valid-lead-packet.json");
const invalidPacket = path.join(__dirname, "fixtures", "invalid-missing-source.json");

function runImport(packet, outDir) {
  return spawnSync(process.execPath, [importer, packet, outDir], {
    encoding: "utf8",
  });
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "franklin-agentic-hub-"));
const validResult = runImport(validPacket, outDir);

if (validResult.status !== 0) {
  console.error("FAIL imports valid packet");
  console.error(validResult.stderr || validResult.stdout);
  process.exit(1);
}

const queueFile = path.join(outDir, "pending_review.jsonl");
const lines = fs.readFileSync(queueFile, "utf8").trim().split("\n");
const record = JSON.parse(lines[0]);

if (lines.length !== 1 || record.queue !== "pending_review" || record.approval_gate.status !== "required") {
  console.error("FAIL writes pending review record with required approval gate");
  console.error(JSON.stringify(record, null, 2));
  process.exit(1);
}

const invalidResult = runImport(invalidPacket, outDir);
if (invalidResult.status !== 1 || !invalidResult.stderr.includes("findings[0].source_url")) {
  console.error("FAIL rejects invalid packet");
  console.error(invalidResult.stderr || invalidResult.stdout);
  process.exit(1);
}

const afterRejectLines = fs.readFileSync(queueFile, "utf8").trim().split("\n");
if (afterRejectLines.length !== 1) {
  console.error("FAIL invalid packet changed pending review queue");
  process.exit(1);
}

console.log("PASS imports valid packet into pending_review queue");
console.log("PASS rejects invalid packet without mutating queue");
