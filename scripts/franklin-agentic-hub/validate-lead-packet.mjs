#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node scripts/franklin-agentic-hub/validate-lead-packet.mjs <packet.json>";
const REQUIRED_TOP_LEVEL = [
  "task_id",
  "generated_at",
  "lead",
  "fit",
  "findings",
  "risks",
  "recommended_next_action",
  "approval_gate",
];
const CONFIDENCE = new Set(["low", "medium", "high"]);
const SOURCE_TYPES = new Set([
  "company_site",
  "official_profile",
  "registry",
  "marketplace",
  "article",
  "directory",
  "other",
]);
const PROHIBITED_ACTIONS = new Set([
  "send_email",
  "send_dm",
  "write_crm",
  "use_signed_in_browser",
  "deploy",
  "purchase",
]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function push(condition, errors, message) {
  if (!condition) {
    errors.push(message);
  }
}

export function validatePacket(packet) {
  const errors = [];

  push(isObject(packet), errors, "packet must be an object");
  if (!isObject(packet)) {
    return errors;
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    push(Object.hasOwn(packet, key), errors, `missing top-level field: ${key}`);
  }

  push(hasText(packet.task_id), errors, "task_id must be a non-empty string");
  push(
    hasText(packet.generated_at) && !Number.isNaN(Date.parse(packet.generated_at)),
    errors,
    "generated_at must be an ISO date-time string",
  );

  validateLead(packet.lead, errors);
  validateFit(packet.fit, errors);
  validateFindings(packet.findings, errors);
  validateRisks(packet.risks, errors);
  push(hasText(packet.recommended_next_action), errors, "recommended_next_action must be non-empty text");
  validateApprovalGate(packet.approval_gate, errors);

  return errors;
}

function validateLead(lead, errors) {
  push(isObject(lead), errors, "lead must be an object");
  if (!isObject(lead)) {
    return;
  }
  for (const key of ["company_name", "website", "location", "industry"]) {
    push(hasText(lead[key]), errors, `lead.${key} must be non-empty text`);
  }
  push(Array.isArray(lead.decision_makers), errors, "lead.decision_makers must be an array");
  if (Array.isArray(lead.decision_makers)) {
    lead.decision_makers.forEach((person, index) => {
      push(isObject(person), errors, `lead.decision_makers[${index}] must be an object`);
      if (!isObject(person)) {
        return;
      }
      for (const key of ["name", "role", "source_url"]) {
        push(hasText(person[key]), errors, `lead.decision_makers[${index}].${key} must be non-empty text`);
      }
      push(CONFIDENCE.has(person.confidence), errors, `lead.decision_makers[${index}].confidence is invalid`);
    });
  }
}

function validateFit(fit, errors) {
  push(isObject(fit), errors, "fit must be an object");
  if (!isObject(fit)) {
    return;
  }
  push(hasText(fit.summary), errors, "fit.summary must be non-empty text");
  push(Array.isArray(fit.service_angles) && fit.service_angles.length > 0, errors, "fit.service_angles must be a non-empty array");
  if (Array.isArray(fit.service_angles)) {
    fit.service_angles.forEach((angle, index) => {
      push(hasText(angle), errors, `fit.service_angles[${index}] must be non-empty text`);
    });
  }
  push(CONFIDENCE.has(fit.confidence), errors, "fit.confidence is invalid");
}

function validateFindings(findings, errors) {
  push(Array.isArray(findings) && findings.length > 0, errors, "findings must be a non-empty array");
  if (!Array.isArray(findings)) {
    return;
  }
  findings.forEach((finding, index) => {
    push(isObject(finding), errors, `findings[${index}] must be an object`);
    if (!isObject(finding)) {
      return;
    }
    for (const key of ["claim", "source_url"]) {
      push(hasText(finding[key]), errors, `findings[${index}].${key} must be non-empty text`);
    }
    push(SOURCE_TYPES.has(finding.source_type), errors, `findings[${index}].source_type is invalid`);
    push(CONFIDENCE.has(finding.confidence), errors, `findings[${index}].confidence is invalid`);
  });
}

function validateRisks(risks, errors) {
  push(Array.isArray(risks), errors, "risks must be an array");
  if (Array.isArray(risks)) {
    risks.forEach((risk, index) => {
      push(typeof risk === "string", errors, `risks[${index}] must be text`);
    });
  }
}

function validateApprovalGate(approvalGate, errors) {
  push(isObject(approvalGate), errors, "approval_gate must be an object");
  if (!isObject(approvalGate)) {
    return;
  }
  push(["required", "approved", "rejected"].includes(approvalGate.status), errors, "approval_gate.status is invalid");
  push(hasText(approvalGate.reason), errors, "approval_gate.reason must be non-empty text");
  push(
    Array.isArray(approvalGate.prohibited_actions) && approvalGate.prohibited_actions.length > 0,
    errors,
    "approval_gate.prohibited_actions must be a non-empty array",
  );
  if (Array.isArray(approvalGate.prohibited_actions)) {
    approvalGate.prohibited_actions.forEach((action, index) => {
      push(PROHIBITED_ACTIONS.has(action), errors, `approval_gate.prohibited_actions[${index}] is invalid`);
    });
  }
  if (approvalGate.status !== "required") {
    push(
      approvalGate.reason.toLowerCase().includes("franklin") || approvalGate.reason.toLowerCase().includes("approval"),
      errors,
      "non-required approval_gate.status must include an approval rationale",
    );
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(USAGE);
    process.exit(2);
  }

  const abs = path.resolve(file);
  let packet;
  try {
    packet = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    console.error(`Failed to read JSON packet: ${error.message}`);
    process.exit(2);
  }

  const errors = validatePacket(packet);
  if (errors.length > 0) {
    console.error(`Lead packet invalid: ${abs}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Lead packet valid: ${abs}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
