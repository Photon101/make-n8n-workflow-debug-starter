import assert from "node:assert/strict";
import {
  buildRepairPlan,
  makeRetrySchedule,
  normalizeWebhookEvent,
  redactObject,
  traceScenarioRun,
} from "../src/workflow-debug.mjs";

const event = normalizeWebhookEvent({
  source: "make",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer sk-test-secret",
    "X-Request-Id": "req_123",
  },
  body: {
    email: "client@example.com",
    message: "Quote request",
    nested: { api_key: "hidden" },
  },
});

assert.equal(event.eventId, "req_123");
assert.equal(event.method, "POST");
assert.equal(event.headers.authorization, "[REDACTED]");
assert.equal(event.body.email, "[EMAIL]");
assert.equal(event.body.nested.api_key, "[REDACTED]");

const trace = traceScenarioRun({
  runId: "run_1",
  modules: [
    { name: "Webhook", durationMs: 30, response: { status: 200 } },
    {
      name: "Help Scout draft reply",
      durationMs: 6200,
      response: { status: 401, body: { error: "invalid token" } },
    },
  ],
});

assert.equal(trace.status, "failed");
assert.equal(trace.totalSteps, 2);
assert.equal(trace.failedStep.name, "Help Scout draft reply");
assert.equal(trace.slowSteps.length, 1);

const plan = buildRepairPlan({
  modules: [
    { name: "Router filter", response: { status: 200 } },
    { name: "OpenAI structured output", error: "Required field category is missing" },
  ],
});

assert.equal(plan.trace.failedStep.name, "OpenAI structured output");
assert.match(plan.recommendations[0].action, /Repair data mapping/);

assert.deepEqual(makeRetrySchedule({ attempts: 4, baseDelayMs: 500, maxDelayMs: 2000 }), [
  { attempt: 1, delayMs: 500 },
  { attempt: 2, delayMs: 1000 },
  { attempt: 3, delayMs: 2000 },
  { attempt: 4, delayMs: 2000 },
]);

assert.throws(() => makeRetrySchedule({ attempts: 0 }), /positive integer/);

assert.deepEqual(redactObject({ password: "pw", note: "email me at ops@example.com" }), {
  password: "[REDACTED]",
  note: "email me at [EMAIL]",
});

console.log("workflow-debug tests passed");
