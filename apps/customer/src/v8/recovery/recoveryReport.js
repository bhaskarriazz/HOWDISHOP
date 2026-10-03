import { buildPreviewRecoveryIncident, buildRecoveryIncident } from "./recoveryModel.js";
import { dispatchRecoveryReport } from "./recoveryHandoffs.js";
import { saveInputDraft } from "./inputDraftStore.js";

export const RECOVERY_PREVIEW_PATH = "/help/recovery";
export const RECOVERY_OPEN_PAGE_EVENT = "howdi:recovery-open-page";

let lastIncident = null;

export function getLastRecoveryIncident() {
  return lastIncident;
}

export function reportRecoveryFailure(input) {
  const incident = buildRecoveryIncident(input);
  lastIncident = incident;
  dispatchRecoveryReport(incident);
  return incident;
}

export function clearRecoveryIncident() {
  lastIncident = null;
}

export function openRecoveryPreviewPage() {
  saveInputDraft("shop:cart-notes", { note: "Gift wrap please", coupon: "WELCOME10" });
  const incident = buildPreviewRecoveryIncident();
  lastIncident = incident;
  dispatchRecoveryReport(incident);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RECOVERY_OPEN_PAGE_EVENT));
  }
  return incident;
}
