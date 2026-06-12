#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validatePacket } from "./validate-lead-packet.mjs";

const USAGE = [
  "Usage: node scripts/franklin-agentic-hub/process-incoming-leads.mjs <incoming-dir> <out-dir>",
  "",
  "Valid lead packets are appended to pending_review.jsonl.",
  "Invalid lead packets are appended to rejected_imports.jsonl.",
].join("\n");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function appendJsonLine(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}

function buildPendingRecord(packet, sourceFile) {
  return {
    queue: "pending_review",
    imported_at: new Date().toISOString(),
    source_file: path.resolve(sourceFile),
    task_id: packet.task_id,
    lead: packet.lead,
    fit: packet.fit,
    findings: packet.findings,
    risks: packet.risks,
    recommended_next_action: packet.recommended_next_action,
    approval_gate: {
      ...packet.approval_gate,
      status: "required",
    },
  };
}

function buildRejectedRecord(sourceFile, errors) {
  return {
    queue: "rejected_import",
    rejected_at: new Date().toISOString(),
    source_file: path.resolve(sourceFile),
    errors,
  };
}

function jsonFiles(incomingDir) {
  return fs
    .readdirSync(incomingDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(incomingDir, entry.name))
    .sort();
}

function processFile(file, outDir) {
  let packet;
  try {
    packet = readJson(file);
  } catch (error) {
    appendJsonLine(path.join(outDir, "rejected_imports.jsonl"), buildRejectedRecord(file, [error.message]));
    return { file, status: "rejected" };
  }

  const errors = validatePacket(packet);
  if (errors.length > 0) {
    appendJsonLine(path.join(outDir, "rejected_imports.jsonl"), buildRejectedRecord(file, errors));
    return { file, status: "rejected" };
  }

  appendJsonLine(path.join(outDir, "pending_review.jsonl"), buildPendingRecord(packet, file));
  return { file, status: "pending_review" };
}

function main() {
  const [incomingDir, outDir] = process.argv.slice(2);
  if (!incomingDir || !outDir) {
    console.error(USAGE);
    process.exit(2);
  }

  let files;
  try {
    files = jsonFiles(incomingDir);
  } catch (error) {
    console.error(`Failed to read incoming lead directory: ${error.message}`);
    process.exit(2);
  }

  if (files.length === 0) {
    console.log("No incoming lead packets found");
    return;
  }

  const results = files.map((file) => processFile(file, outDir));
  const accepted = results.filter((result) => result.status === "pending_review").length;
  const rejected = results.filter((result) => result.status === "rejected").length;
  console.log(`Incoming lead packets processed: ${accepted} pending_review, ${rejected} rejected_import`);
}

main();
