#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importer = path.join(__dirname, "import-lead-packet.mjs");
const decider = path.join(__dirname, "decide-lead-packet.mjs");
const validPacket = path.join(__dirname, "fixtures", "valid-lead-packet.json");
const taskId = JSON.parse(fs.readFileSync(validPacket, "utf8")).task_id;

function runScript(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
  });
}

function readJsonLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "franklin-agentic-hub-decide-"));
const importResult = runScript(importer, [validPacket, outDir]);
if (importResult.status !== 0) {
  console.error("FAIL imports packet before decision");
  console.error(importResult.stderr || importResult.stdout);
  process.exit(1);
}

const weakApproval = runScript(decider, [outDir, taskId, "approve", "Looks good"]);
if (weakApproval.status !== 1 || !weakApproval.stderr.includes("at least 12 characters")) {
  console.error("FAIL rejects weak approval reason");
  console.error(weakApproval.stderr || weakApproval.stdout);
  process.exit(1);
}

const missingFranklin = runScript(decider, [
  outDir,
  taskId,
  "approve",
  "Human approval was reviewed.",
]);
if (missingFranklin.status !== 1 || !missingFranklin.stderr.includes("Franklin")) {
  console.error("FAIL requires Franklin in approval reason");
  console.error(missingFranklin.stderr || missingFranklin.stdout);
  process.exit(1);
}

const approval = runScript(decider, [
  outDir,
  taskId,
  "approve",
  "Franklin approved this lead for draft preparation only.",
]);
if (approval.status !== 0) {
  console.error("FAIL records approval decision");
  console.error(approval.stderr || approval.stdout);
  process.exit(1);
}

const decisions = readJsonLines(path.join(outDir, "decisions.jsonl"));
const approved = readJsonLines(path.join(outDir, "approved.jsonl"));
if (
  decisions.length !== 1 ||
  approved.length !== 1 ||
  decisions[0].queue !== "approved" ||
  !decisions[0].still_prohibited_actions.includes("send_email") ||
  decisions[0].next_allowed_action !== "prepare_draft_for_human_review"
) {
  console.error("FAIL writes safe approval audit record");
  console.error(JSON.stringify(decisions[0], null, 2));
  process.exit(1);
}

const duplicate = runScript(decider, [
  outDir,
  taskId,
  "reject",
  "Franklin rejected this duplicate decision.",
]);
if (duplicate.status !== 1 || !duplicate.stderr.includes("already has a decision")) {
  console.error("FAIL rejects duplicate decision");
  console.error(duplicate.stderr || duplicate.stdout);
  process.exit(1);
}

console.log("PASS rejects weak or ambiguous approval reasons");
console.log("PASS records approval with outbound actions still prohibited");
console.log("PASS rejects duplicate decisions");
