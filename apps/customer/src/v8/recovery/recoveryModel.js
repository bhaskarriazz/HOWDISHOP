// NG49 — Recovery & Support Engine (shared model, no React)

/** Domains that must never auto-retry; user must review status or contact support. */
export const NO_BLIND_RETRY_KINDS = Object.freeze([
  "payment",
  "order",
  "ride",
  "job",
  "refund",
  "payout",
]);

export const RECOVERY_KINDS = Object.freeze({
  NETWORK: "network",
  TIMEOUT: "timeout",
  SESSION: "session",
  SERVER: "server",
  VALIDATION: "validation",
  PERMISSION: "permission",
  UNKNOWN: "unknown",
});

const SAFE_AUTO_RETRY_KINDS = new Set([RECOVERY_KINDS.NETWORK, RECOVERY_KINDS.TIMEOUT]);

/**
 * Public-safe reference for support (no internal user ids, DB ids, or UUIDs).
 */
export function formatPublicRecoveryRef({
  pillar = "general",
  surface = "",
  requestId = "",
  code = "",
  createdAt = "",
} = {}) {
  const parts = ["HOWDI-REC"];
  const p = String(pillar || "general").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (p) parts.push(p);
  const rid = sanitizeRequestId(requestId);
  if (rid) parts.push(rid);
  else {
    const c = String(code || "GEN").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
    if (c) parts.push(c);
  }
  const stamp = String(createdAt || "").replace(/[^0-9TZ:-]/g, "").slice(0, 24);
  if (stamp) parts.push(stamp);
  return parts.join("-").slice(0, 80);
}

export function sanitizeRequestId(requestId) {
  const raw = String(requestId || "").trim();
  if (!raw) return "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return `req-${raw.slice(0, 8).toLowerCase()}`;
  }
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) return `req-${cleaned.slice(-8)}`;
  return cleaned;
}

export function classifyRecoveryKind(error, meta = {}) {
  const code = String(error?.code || meta.code || "").toUpperCase();
  const status = Number(error?.status || meta.status || 0);
  if (code === "REQUEST_TIMEOUT" || error?.name === "AbortError") return RECOVERY_KINDS.TIMEOUT;
  if (status === 401 || code === "SESSION_EXPIRED" || code === "UNAUTHORIZED") return RECOVERY_KINDS.SESSION;
  if (status === 403 || code === "FORBIDDEN") return RECOVERY_KINDS.PERMISSION;
  if (status === 400 || status === 422 || code === "VALIDATION_ERROR") return RECOVERY_KINDS.VALIDATION;
  if (status >= 500) return RECOVERY_KINDS.SERVER;
  if (code === "NON_JSON_RESPONSE" || status === 0) return RECOVERY_KINDS.NETWORK;
  return RECOVERY_KINDS.UNKNOWN;
}

export function isSensitiveRecoveryContext(meta = {}) {
  const kind = String(meta.sensitiveKind || meta.transactionKind || "").toLowerCase();
  if (kind && NO_BLIND_RETRY_KINDS.includes(kind)) return true;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  return tags.some((t) => NO_BLIND_RETRY_KINDS.includes(String(t).toLowerCase()));
}

/**
 * @returns {{ allowAutoRetry: boolean, allowManualRetry: boolean, requireStatusCheck: boolean, message: string }}
 */
export function recoveryRetryPolicy(incident) {
  const sensitive = isSensitiveRecoveryContext(incident);
  const kind = incident?.kind || RECOVERY_KINDS.UNKNOWN;
  if (sensitive) {
    return {
      allowAutoRetry: false,
      allowManualRetry: false,
      requireStatusCheck: true,
      message:
        "This involves money, an order, a ride, a job, or a payout. HOWDI won’t repeat the action automatically. Check the latest status in the journey, then contact Help & Support if it still looks wrong.",
    };
  }
  if (kind === RECOVERY_KINDS.SESSION) {
    return {
      allowAutoRetry: false,
      allowManualRetry: false,
      requireStatusCheck: false,
      message: "Your session ended. Sign in again to continue. Anything you were writing stays on this page.",
    };
  }
  if (kind === RECOVERY_KINDS.VALIDATION || kind === RECOVERY_KINDS.PERMISSION) {
    return {
      allowAutoRetry: false,
      allowManualRetry: false,
      requireStatusCheck: false,
      message: incident?.userMessage || "Review the details and try again when you’re ready.",
    };
  }
  const allowAuto = SAFE_AUTO_RETRY_KINDS.has(kind);
  return {
    allowAutoRetry: allowAuto,
    allowManualRetry: allowAuto || kind === RECOVERY_KINDS.SERVER,
    requireStatusCheck: false,
    message: incident?.userMessage || "Something didn’t load. You can try again without losing what you’ve typed.",
  };
}

export function buildRecoveryIncident({
  error = null,
  pillar = "general",
  surface = "",
  action = "",
  method = "GET",
  sensitiveKind = "",
  tags = [],
  draftScope = "",
  userMessage = "",
  requestId = "",
} = {}) {
  const kind = classifyRecoveryKind(error, { code: error?.code, status: error?.status });
  const createdAt = new Date().toISOString();
  const meta = { sensitiveKind, tags, method: String(method || "GET").toUpperCase() };
  const sensitive = isSensitiveRecoveryContext(meta);
  const publicRef = formatPublicRecoveryRef({
    pillar,
    surface,
    requestId: requestId || error?.requestId,
    code: error?.code || kind,
    createdAt: createdAt.slice(0, 19),
  });
  const policy = recoveryRetryPolicy({
    kind,
    sensitiveKind,
    tags,
    userMessage: userMessage || error?.message,
  });
  return {
    id: `${publicRef}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    pillar: String(pillar || "general").toLowerCase(),
    surface: String(surface || "").slice(0, 120),
    action: String(action || "").slice(0, 120),
    method: String(method || "GET").toUpperCase(),
    sensitiveKind: sensitiveKind || (sensitive ? tags.find((t) => NO_BLIND_RETRY_KINDS.includes(String(t).toLowerCase())) : ""),
    tags: [...tags],
    publicRef,
    requestId: sanitizeRequestId(requestId || error?.requestId),
    status: Number(error?.status || 0),
    code: String(error?.code || "").slice(0, 64),
    userMessage: String(userMessage || error?.message || "Something went wrong.").slice(0, 280),
    draftScope: String(draftScope || "").slice(0, 80),
    createdAt,
    policy,
    preview: false,
  };
}

export function buildPreviewRecoveryIncident() {
  const incident = buildRecoveryIncident({
    error: { message: "We couldn’t refresh your cart.", code: "REQUEST_TIMEOUT", status: 0 },
    pillar: "shop",
    surface: "cart",
    action: "load-cart",
    method: "GET",
    draftScope: "shop:cart-notes",
    userMessage: "Your cart didn’t refresh. Your items are still saved on this device.",
  });
  return { ...incident, preview: true, id: "preview-recovery-incident" };
}
