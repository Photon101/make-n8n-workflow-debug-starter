import { readFile } from "node:fs/promises";
import { buildRepairPlan, makeRetrySchedule, normalizeWebhookEvent } from "../src/workflow-debug.mjs";

const webhook = JSON.parse(await readFile(new URL("../examples/n8n-webhook-event.json", import.meta.url)));
const run = JSON.parse(await readFile(new URL("../examples/make-execution-log.json", import.meta.url)));

console.log("Normalized webhook event:");
console.log(JSON.stringify(normalizeWebhookEvent(webhook), null, 2));

console.log("\nRepair plan:");
console.log(JSON.stringify(buildRepairPlan(run), null, 2));

console.log("\nRetry schedule:");
console.log(JSON.stringify(makeRetrySchedule({ attempts: 4, baseDelayMs: 750, maxDelayMs: 5000 }), null, 2));
