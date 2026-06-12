#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validatePacket } from "./validate-lead-packet.mjs";

const USAGE = [
  "Usage: node scripts/franklin-agentic-hub/import-lead-packet.mjs <packet.json> <out-dir>",
  "",
  "Valid packets are appended to <out-dir>/pending_review.jsonl.",
].join("\n");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function buildReviewRecord(packet, sourceFile) {
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

function appendPendingReview(record, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const queueFile = path.join(outDir, "pending_review.jsonl");
  fs.appendFileSync(queueFile, `${JSON.stringify(record)}\n`, "utf8");
  return queueFile;
}

function main() {
  const [packetFile, outDir] = process.argv.slice(2);
  if (!packetFile || !outDir) {
    console.error(USAGE);
    process.exit(2);
  }

  let packet;
  try {
    packet = readJson(packetFile);
  } catch (error) {
    console.error(`Failed to read packet JSON: ${error.message}`);
    process.exit(2);
  }

  const errors = validatePacket(packet);
  if (errors.length > 0) {
    console.error(`Lead packet import rejected: ${path.resolve(packetFile)}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const record = buildReviewRecord(packet, packetFile);
  const queueFile = appendPendingReview(record, outDir);
  console.log(`Lead packet imported for review: ${queueFile}`);
}

main();
