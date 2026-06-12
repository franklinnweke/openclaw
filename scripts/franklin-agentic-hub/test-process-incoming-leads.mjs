#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const processor = path.join(__dirname, "process-incoming-leads.mjs");
const validPacket = path.join(__dirname, "fixtures", "valid-lead-packet.json");
const invalidPacket = path.join(__dirname, "fixtures", "invalid-missing-source.json");

function copyFixture(source, target) {
  fs.copyFileSync(source, target);
}

function readJsonLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "franklin-agentic-hub-batch-"));
const incomingDir = path.join(rootDir, "incoming");
const outDir = path.join(rootDir, "review");
fs.mkdirSync(incomingDir, { recursive: true });
copyFixture(validPacket, path.join(incomingDir, "001-valid.json"));
copyFixture(invalidPacket, path.join(incomingDir, "002-invalid.json"));

const result = spawnSync(process.execPath, [processor, incomingDir, outDir], {
  encoding: "utf8",
});

if (result.status !== 0 || !result.stdout.includes("1 pending_review, 1 rejected_import")) {
  console.error("FAIL processes mixed incoming lead batch");
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

const pending = readJsonLines(path.join(outDir, "pending_review.jsonl"));
const rejected = readJsonLines(path.join(outDir, "rejected_imports.jsonl"));

if (
  pending.length !== 1 ||
  rejected.length !== 1 ||
  pending[0].queue !== "pending_review" ||
  pending[0].approval_gate.status !== "required" ||
  !rejected[0].errors.some((error) => error.includes("findings[0].source_url"))
) {
  console.error("FAIL writes expected batch review records");
  console.error(JSON.stringify({ pending, rejected }, null, 2));
  process.exit(1);
}

console.log("PASS processes valid packets into pending_review");
console.log("PASS records invalid packets as rejected_import");
