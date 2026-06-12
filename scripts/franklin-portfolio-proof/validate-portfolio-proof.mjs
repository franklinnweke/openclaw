#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node scripts/franklin-portfolio-proof/validate-portfolio-proof.mjs <proof.json>";
const REQUIRED_TOP_LEVEL = [
  "task_id",
  "generated_at",
  "headline",
  "what_changed",
  "why_it_matters",
  "evidence",
  "public_safe_case_study",
  "risk_notes",
  "next_actions",
];
const EVIDENCE_TYPES = new Set(["commit", "file", "screenshot", "test_output", "run_history", "issue", "other"]);
const PRIVATE_TERMS = [
  "private client revenue",
  "customer data",
  "payment details",
  "credential",
  "password",
  "secret key",
  "access token",
];

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

function containsPrivateTerm(value) {
  if (!hasText(value)) {
    return false;
  }
  const normalized = value.toLowerCase();
  return PRIVATE_TERMS.some((term) => normalized.includes(term));
}

export function validatePortfolioProof(packet) {
  const errors = [];

  push(isObject(packet), errors, "proof packet must be an object");
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
  push(hasText(packet.headline) && packet.headline.length >= 12, errors, "headline must be at least 12 characters");
  push(!containsPrivateTerm(packet.headline), errors, "headline contains private or unsafe terms");
  validateWhatChanged(packet.what_changed, errors);
  push(hasText(packet.why_it_matters), errors, "why_it_matters must be non-empty text");
  push(!containsPrivateTerm(packet.why_it_matters), errors, "why_it_matters contains private or unsafe terms");
  validateEvidence(packet.evidence, errors);
  push(hasText(packet.public_safe_case_study), errors, "public_safe_case_study must be non-empty text");
  push(
    !containsPrivateTerm(packet.public_safe_case_study),
    errors,
    "public_safe_case_study contains private or unsafe terms",
  );
  validateTextArray(packet.risk_notes, "risk_notes", errors);
  validateTextArray(packet.next_actions, "next_actions", errors);

  return errors;
}

function validateWhatChanged(items, errors) {
  push(Array.isArray(items) && items.length > 0, errors, "what_changed must be a non-empty array");
  if (!Array.isArray(items)) {
    return;
  }
  items.forEach((item, index) => {
    push(isObject(item), errors, `what_changed[${index}] must be an object`);
    if (!isObject(item)) {
      return;
    }
    push(hasText(item.summary), errors, `what_changed[${index}].summary must be non-empty text`);
    push(!containsPrivateTerm(item.summary), errors, `what_changed[${index}].summary contains private or unsafe terms`);
    push(
      Array.isArray(item.evidence_refs) && item.evidence_refs.length > 0,
      errors,
      `what_changed[${index}].evidence_refs must be a non-empty array`,
    );
    if (Array.isArray(item.evidence_refs)) {
      item.evidence_refs.forEach((ref, refIndex) => {
        push(hasText(ref), errors, `what_changed[${index}].evidence_refs[${refIndex}] must be non-empty text`);
      });
    }
  });
}

function validateEvidence(items, errors) {
  push(Array.isArray(items) && items.length > 0, errors, "evidence must be a non-empty array");
  if (!Array.isArray(items)) {
    return;
  }
  items.forEach((item, index) => {
    push(isObject(item), errors, `evidence[${index}] must be an object`);
    if (!isObject(item)) {
      return;
    }
    push(hasText(item.id), errors, `evidence[${index}].id must be non-empty text`);
    push(EVIDENCE_TYPES.has(item.type), errors, `evidence[${index}].type is invalid`);
    push(hasText(item.reference), errors, `evidence[${index}].reference must be non-empty text`);
    push(item.public_safe === true, errors, `evidence[${index}].public_safe must be true`);
    push(!containsPrivateTerm(item.reference), errors, `evidence[${index}].reference contains private or unsafe terms`);
  });
}

function validateTextArray(items, field, errors) {
  push(Array.isArray(items) && items.length > 0, errors, `${field} must be a non-empty array`);
  if (!Array.isArray(items)) {
    return;
  }
  items.forEach((item, index) => {
    push(hasText(item), errors, `${field}[${index}] must be non-empty text`);
    push(!containsPrivateTerm(item), errors, `${field}[${index}] contains private or unsafe terms`);
  });
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
    console.error(`Failed to read JSON proof packet: ${error.message}`);
    process.exit(2);
  }

  const errors = validatePortfolioProof(packet);
  if (errors.length > 0) {
    console.error(`Portfolio proof invalid: ${abs}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Portfolio proof valid: ${abs}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
