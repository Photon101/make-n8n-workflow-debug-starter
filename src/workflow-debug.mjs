const SECRET_KEY_PATTERN = /(authorization|api[-_ ]?key|token|secret|password|cookie|signature|credential)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;

export function normalizeWebhookEvent(input = {}) {
  const headers = normalizeHeaders(input.headers || input.requestHeaders || {});
  const body = input.body ?? input.payload ?? input.data ?? input.json ?? {};
  const method = input.method || input.httpMethod || input.request?.method || "POST";
  const path = input.path || input.url || input.webhookUrl || input.request?.url || "/";
  const eventId = input.id || body.id || headers["x-request-id"] || headers["x-correlation-id"] || null;

  return {
    eventId,
    method: String(method).toUpperCase(),
    path: String(path),
    contentType: headers["content-type"] || null,
    source: input.source || input.platform || inferSource(headers, body),
    headers: redactObject(headers),
    body: redactObject(body),
  };
}

export function traceScenarioRun(run = {}) {
  const steps = Array.isArray(run.steps) ? run.steps : Array.isArray(run.modules) ? run.modules : [];
  const normalizedSteps = steps.map((step, index) => normalizeStep(step, index));
  const failedStep = normalizedSteps.find((step) => step.status === "failed") || null;
  const slowSteps = normalizedSteps.filter((step) => step.durationMs >= 5000);
  const totalDurationMs = normalizedSteps.reduce((sum, step) => sum + step.durationMs, 0);

  return {
    runId: run.id || run.runId || null,
    status: failedStep ? "failed" : "passed",
    totalSteps: normalizedSteps.length,
    totalDurationMs,
    failedStep,
    slowSteps,
    steps: normalizedSteps,
  };
}

export function buildRepairPlan(run = {}) {
  const trace = traceScenarioRun(run);
  const recommendations = [];

  if (!trace.failedStep) {
    recommendations.push({
      priority: "low",
      action: "Add regression test data",
      reason: "No failing step was detected, so preserve this successful payload as a known-good fixture.",
    });
    return { trace, recommendations };
  }

  const failure = classifyFailure(trace.failedStep);
  recommendations.push(...failure.recommendations);

  for (const slowStep of trace.slowSteps) {
    recommendations.push({
      priority: "medium",
      action: `Add timeout and retry controls to ${slowStep.name}`,
      reason: `${slowStep.name} took ${slowStep.durationMs}ms, which is slow enough to cause intermittent Make or n8n failures.`,
    });
  }

  return { trace, recommendations };
}

export function makeRetrySchedule({ attempts = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("attempts must be a positive integer");
  }
  return Array.from({ length: attempts }, (_, index) => {
    const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** index);
    return { attempt: index + 1, delayMs };
  });
}

export function redactObject(value) {
  if (Array.isArray(value)) return value.map((item) => redactObject(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactObject(nested),
      ]),
    );
  }
  if (typeof value === "string") {
    return value.replace(BEARER_PATTERN, "Bearer [REDACTED]").replace(EMAIL_PATTERN, "[EMAIL]");
  }
  return value;
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]),
  );
}

function inferSource(headers, body) {
  if (headers["x-hub-signature"] || headers["x-hub-signature-256"]) return "meta-webhook";
  if (body.object === "whatsapp_business_account") return "whatsapp-cloud-api";
  if (body.conversation || body.mailbox || body.customer) return "help-scout";
  return "unknown";
}

function normalizeStep(step, index) {
  const statusCode = Number(step.statusCode || step.response?.status || step.httpStatus || 0) || null;
  const error = step.error || step.exception || step.message || null;
  const failed = Boolean(error) || (statusCode !== null && statusCode >= 400);
  return {
    index,
    name: step.name || step.module || step.node || `step-${index + 1}`,
    status: failed ? "failed" : "passed",
    statusCode,
    durationMs: Number(step.durationMs || step.duration || 0) || 0,
    request: redactObject(step.request || {}),
    response: redactObject(step.response || {}),
    error: typeof error === "string" ? redactObject(error) : redactObject(error || null),
  };
}

function classifyFailure(step) {
  const statusCode = step.statusCode;
  const text = JSON.stringify(step).toLowerCase();

  if (statusCode === 401 || statusCode === 403 || /unauthori[sz]ed|invalid token|forbidden/.test(text)) {
    return plan("high", `Fix authentication for ${step.name}`, "The failing step points to an expired, missing, or incorrectly scoped credential.");
  }
  if (statusCode === 404 || /not found|unknown endpoint/.test(text)) {
    return plan("high", `Check endpoint URL and path mapping for ${step.name}`, "The API did not recognize the requested resource.");
  }
  if (statusCode === 429 || /rate limit|too many requests/.test(text)) {
    return plan("medium", `Add throttling and retry handling to ${step.name}`, "The upstream API is rate limiting the automation.");
  }
  if (statusCode && statusCode >= 500) {
    return plan("medium", `Add retry and dead-letter handling after ${step.name}`, "The upstream service returned a server error.");
  }
  if (/cannot read|undefined|null|missing|required|schema|validation/.test(text)) {
    return plan("high", `Repair data mapping before ${step.name}`, "The failing step looks like a missing or mismatched field in the payload.");
  }
  if (/timeout|timed out|econnreset|network/.test(text)) {
    return plan("medium", `Add timeout-safe retry controls to ${step.name}`, "The failure appears network-related.");
  }

  return plan("medium", `Inspect request and response payloads for ${step.name}`, "The failure needs payload-level inspection before changing the scenario.");
}

function plan(priority, action, reason) {
  return { recommendations: [{ priority, action, reason }] };
}
