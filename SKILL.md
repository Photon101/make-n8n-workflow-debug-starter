---
name: make-n8n-workflow-debugging
description: Use when a user needs Make.com, n8n, Zapier-style, webhook, or API workflow debugging, failed execution-log analysis, retry planning, safe redaction, or handoff documentation for unstable automations.
---

# Make and n8n Workflow Debugging

Use this skill to turn a broken workflow scenario into a traced repair plan with safe diagnostics and repeatable tests.

## Workflow

1. Inspect the workflow export, run history, failed module, webhook payload, and API docs.
2. Normalize webhook payloads and headers before comparing test data with live data.
3. Redact credentials, cookies, tokens, emails, and customer identifiers before writing logs or handoff notes.
4. Trace each module or node in order, recording status code, duration, request shape, response shape, and error text.
5. Classify the failure as auth, endpoint, rate limit, server error, mapping, validation, or network instability.
6. Apply the smallest repair first, then rerun the same fixture before adding new features.
7. Leave a concise handoff note explaining what changed, how to test it, and which credentials or accounts the client controls.

## Local Starter

This repo includes no-dependency JavaScript helpers plus safe fixtures:

```bash
npm test
npm run demo
```

Expected pieces:

- `src/workflow-debug.mjs` for webhook normalization, run-log tracing, failure classification, retry schedules, and redaction.
- `examples/` for safe Make and n8n-style payloads.
- `test/workflow-debug.test.mjs` for regression coverage before adapting client-specific fields.

## Adaptation Notes

- Keep all client credentials out of committed fixtures.
- Prefer copied failed-run payloads over screenshots when possible.
- Fix mapping and auth failures before adding AI or CRM features.
- Add retry and dead-letter behavior only around side effects that are safe to retry.
- Document exactly how the client can reproduce the success path after handoff.
