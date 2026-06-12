#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const USAGE = [
  "Usage: node scripts/franklin-agentic-hub/decide-lead-packet.mjs <out-dir> <task-id> <approve|reject> <reason>",
  "",
  "Records a human decision for a pending lead packet without sending outreach or writing CRM.",
].join("\n");

const OUTBOUND_ACTIONS = new Set([
  "send_email",
  "send_dm",
  "write_crm",
  "use_signed_in_browser",
]);

function readJsonLines(file) {
  if (!fs.existsSync(file)) {
    return [];
  }

  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function appendJsonLine(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}

function findPendingRecord(outDir, taskId) {
  const pendingFile = path.join(outDir, "pending_review.jsonl");
  const records = readJsonLines(pendingFile);
  return records.find((record) => record.task_id === taskId);
}

function existingDecision(outDir, taskId) {
  const decisionsFile = path.join(outDir, "decisions.jsonl");
  const decisions = readJsonLines(decisionsFile);
  return decisions.find((record) => record.task_id === taskId);
}

function requireHumanReason(decision, reason) {
  if (reason.trim().length < 12) {
    throw new Error("reason must be at least 12 characters");
  }

  if (decision === "approve" && !reason.toLowerCase().includes("franklin")) {
    throw new Error("approval reason must explicitly mention Franklin");
  }
}

function buildDecisionRecord(pendingRecord, decision, reason) {
  const prohibitedActions = pendingRecord.approval_gate?.prohibited_actions ?? [];
  const stillProhibited = prohibitedActions.filter((action) => OUTBOUND_ACTIONS.has(action));

  return {
    queue: decision === "approve" ? "approved" : "rejected",
    decided_at: new Date().toISOString(),
    task_id: pendingRecord.task_id,
    decision,
    decision_by: "Franklin Nweke",
    reason,
    lead: {
      company_name: pendingRecord.lead.company_name,
      website: pendingRecord.lead.website,
    },
    source_file: pendingRecord.source_file,
    still_prohibited_actions: stillProhibited,
    next_allowed_action:
      decision === "approve"
        ? "prepare_draft_for_human_review"
        : "archive_without_outreach",
  };
}

function main() {
  const [outDir, taskId, decision, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(" ").trim();

  if (!outDir || !taskId || !decision || !reason) {
    console.error(USAGE);
    process.exit(2);
  }

  if (!["approve", "reject"].includes(decision)) {
    console.error("decision must be approve or reject");
    process.exit(2);
  }

  try {
    requireHumanReason(decision, reason);
  } catch (error) {
    console.error(`Lead packet decision rejected: ${error.message}`);
    process.exit(1);
  }

  let pendingRecord;
  try {
    pendingRecord = findPendingRecord(outDir, taskId);
  } catch (error) {
    console.error(`Failed to read pending queue: ${error.message}`);
    process.exit(2);
  }

  if (!pendingRecord) {
    console.error(`Lead packet decision rejected: no pending record for ${taskId}`);
    process.exit(1);
  }

  let previousDecision;
  try {
    previousDecision = existingDecision(outDir, taskId);
  } catch (error) {
    console.error(`Failed to read decision log: ${error.message}`);
    process.exit(2);
  }

  if (previousDecision) {
    console.error(`Lead packet decision rejected: ${taskId} already has a decision`);
    process.exit(1);
  }

  const record = buildDecisionRecord(pendingRecord, decision, reason);
  const decisionsFile = path.join(outDir, "decisions.jsonl");
  const stateFile = path.join(outDir, `${record.queue}.jsonl`);
  appendJsonLine(decisionsFile, record);
  appendJsonLine(stateFile, record);
  console.log(`Lead packet ${decision} recorded: ${decisionsFile}`);
}

main();
