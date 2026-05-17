# Make and n8n Workflow Debug Starter

Small starter for debugging Make.com, n8n, Zapier-style, webhook, and API automation jobs where a client already has a broken scenario, failed run log, or unstable workflow.

It contains:

- Tested JavaScript helpers for webhook normalization, run-log tracing, failure classification, retry planning, and safe redaction.
- Example n8n webhook and Make execution-log fixtures.
- A no-dependency Node test and demo so behavior can be reviewed before touching a client workspace.

## Quick Start

```bash
npm test
npm run demo
```

## Files

- `src/workflow-debug.mjs`: pure workflow-debugging logic.
- `test/workflow-debug.test.mjs`: regression tests for redaction, failure classification, and retry schedules.
- `tools/demo.mjs`: prints a normalized webhook event and repair plan.
- `examples/`: safe sample webhook and run-log payloads.

## What This Is For

Use this as a starting point when a workflow has problems such as:

- Make modules failing because a mapped field is missing or shaped differently from the test payload.
- n8n webhooks receiving data but downstream nodes not triggering correctly.
- Help Scout, Google Sheets, Twilio, WhatsApp, Stripe, or CRM API modules failing with authentication, validation, or rate-limit errors.
- Automation that works once but fails under retries, null values, or slow upstream services.

## Adaptation Notes

For a real client workflow, export the Make scenario blueprint or n8n workflow JSON, save a failed execution log, and map the failing step into the `modules` shape used by `examples/make-execution-log.json`. Keep credentials and customer data out of fixtures. The redaction helpers are deliberately conservative so you can share diagnostic output without leaking emails, API keys, tokens, cookies, or passwords.

The starter deliberately avoids paid add-ons, OAuth-heavy dependencies, and external services by default.
