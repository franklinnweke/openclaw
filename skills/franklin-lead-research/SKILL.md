---
name: franklin-lead-research
description: "Research public business leads for Franklin's Agentic-Hub workflow with source verification, confidence scoring, and human approval gates."
metadata: { "openclaw": { "emoji": "F" } }
---

# Franklin Lead Research

Use this skill when Franklin asks for lead, prospect, company, founder,
operator, or client-fit research for Agentic-Hub.

## Operating rules

- Research only public or user-provided information.
- Separate facts from inferences.
- Cite sources for every factual company/person claim.
- Do not invent emails, phone numbers, roles, budgets, needs, or intent.
- Do not send outreach.
- Do not write to CRM.
- Do not use a signed-in browser profile unless Franklin explicitly approves.
- Mark uncertain fields as `unknown` or `needs_review`.
- Prefer a compact packet that Agentic-Hub can validate and queue for human
  review.

## Required output

Return a lead packet with this shape:

```json
{
  "task_id": "lead_research_...",
  "generated_at": "2026-06-12T00:00:00.000Z",
  "lead": {
    "company_name": "Example Co",
    "website": "https://example.com",
    "location": "Toronto, Canada",
    "industry": "commerce",
    "decision_makers": []
  },
  "fit": {
    "summary": "Short fit summary.",
    "service_angles": ["website_qa", "workflow_automation"],
    "confidence": "medium"
  },
  "findings": [
    {
      "claim": "The website has a booking form.",
      "source_url": "https://example.com/book",
      "source_type": "company_site",
      "confidence": "high"
    }
  ],
  "risks": ["No verified decision-maker email found."],
  "recommended_next_action": "Human review before outreach draft.",
  "approval_gate": {
    "status": "required",
    "reason": "Outbound outreach and CRM writes require Franklin approval.",
    "prohibited_actions": ["send_email", "send_dm", "write_crm"]
  }
}
```

## Confidence rules

- `high`: directly supported by an official source or multiple independent
  sources.
- `medium`: supported by one credible public source or a reasonable inference
  from public evidence.
- `low`: weak signal; keep as hypothesis only.

## Source priority

1. Official company website.
2. Official social/profile pages.
3. Government, registry, or marketplace listings.
4. Reputable third-party articles or directories.
5. Search snippets only as leads for further verification, not final evidence.

## Human approval language

When a next step involves outreach or CRM mutation, end with:

```text
Approval required before any outbound message or CRM write.
```

