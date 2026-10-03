// NG49 — Help/Support and Ask HOWDI (Spark) handoffs

export const RECOVERY_HANDOFF_EVENT = "howdi:recovery-handoff";
export const RECOVERY_REPORT_EVENT = "howdi:recovery-report";

export function buildSupportHandoff(incident) {
  const ref = incident?.publicRef || "HOWDI-REC";
  const subject = `Help with ${incident?.pillar || "HOWDI"} — ref ${ref}`.slice(0, 120);
  const lines = [
    `Reference: ${ref}`,
    incident?.requestId ? `Request trace: ${incident.requestId}` : null,
    incident?.surface ? `Where: ${incident.surface}` : null,
    incident?.userMessage ? `What happened: ${incident.userMessage}` : null,
    incident?.sensitiveKind ? `Topic: ${incident.sensitiveKind} (no automatic retry)` : null,
  ].filter(Boolean);
  return {
    kind: "support",
    subject,
    message: lines.join("\n").slice(0, 4000),
    publicRef: ref,
  };
}

export function buildSparkHandoff(incident) {
  const ref = incident?.publicRef || "HOWDI-REC";
  const prompt = [
    "I need help recovering from an issue in HOWDI.",
    `Reference: ${ref}.`,
    incident?.userMessage ? incident.userMessage : "",
    "What should I do next without repeating a payment or order?",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
  return { kind: "spark", prompt, publicRef: ref, connectPath: "ask" };
}

export function dispatchRecoveryHandoff(payload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECOVERY_HANDOFF_EVENT, { detail: payload }));
}

export function dispatchRecoveryReport(incident) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECOVERY_REPORT_EVENT, { detail: { incident } }));
}
