import test from "node:test";
import assert from "node:assert/strict";
import {
  NO_BLIND_RETRY_KINDS,
  buildRecoveryIncident,
  formatPublicRecoveryRef,
  recoveryRetryPolicy,
  sanitizeRequestId,
} from "./recoveryModel.js";
import { buildSparkHandoff, buildSupportHandoff } from "./recoveryHandoffs.js";
import { RECOVERY_PREVIEW_PATH } from "./recoveryReport.js";

test("public recovery references never expose raw UUIDs or numeric user ids", () => {
  const ref = formatPublicRecoveryRef({
    pillar: "shop",
    requestId: "550e8400-e29b-41d4-a716-446655440000",
    code: "API_ERROR",
  });
  assert.ok(ref.startsWith("HOWDI-REC-shop"));
  assert.equal(ref.includes("550e8400-e29b-41d4-a716-446655440000"), false);
  assert.ok(ref.includes("req-550e8400"));
  assert.equal(sanitizeRequestId("user_id=42"), "user_id42");
  assert.equal(sanitizeRequestId("123456789012345"), "req-89012345");
});

test("payments orders rides jobs refunds payouts block blind retry", () => {
  for (const kind of NO_BLIND_RETRY_KINDS) {
    const incident = buildRecoveryIncident({
      error: { message: "failed", code: "API_ERROR", status: 500 },
      sensitiveKind: kind,
      method: "POST",
    });
    const policy = recoveryRetryPolicy(incident);
    assert.equal(policy.allowAutoRetry, false);
    assert.equal(policy.allowManualRetry, false);
    assert.equal(policy.requireStatusCheck, true);
  }
});

test("safe GET network errors allow manual retry", () => {
  const incident = buildRecoveryIncident({
    error: { message: "timeout", code: "REQUEST_TIMEOUT", status: 0 },
    pillar: "connect",
    method: "GET",
  });
  const policy = recoveryRetryPolicy(incident);
  assert.equal(policy.allowManualRetry, true);
  assert.equal(policy.allowAutoRetry, true);
});

test("recovery preview route is under help, not main navigation pillars", () => {
  assert.equal(RECOVERY_PREVIEW_PATH, "/help/recovery");
  assert.equal(RECOVERY_PREVIEW_PATH.startsWith("/help/"), true);
});

test("support and spark handoffs include public reference only", () => {
  const incident = buildRecoveryIncident({
    error: { message: "Cart failed", requestId: "abc-123", status: 500 },
    pillar: "shop",
    surface: "checkout",
  });
  const support = buildSupportHandoff(incident);
  assert.ok(support.subject.includes(incident.publicRef));
  assert.ok(support.message.includes("Reference:"));
  assert.equal(/user_id|uuid/i.test(support.message), false);
  const spark = buildSparkHandoff(incident);
  assert.ok(spark.prompt.includes(incident.publicRef));
  assert.equal(spark.kind, "spark");
  assert.equal(spark.connectPath, "ask");
});
