// HOWDI V8 — Cashfree checkout helpers (SANDBOX ONLY). The browser never decides that money was added: after the Cashfree
// checkout closes (or the user comes back from a redirect) the wallet asks HOWDI's server, which verifies with Cashfree.
const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
let sdkPromise = null;

export function loadCashfree() {
  if (typeof window === "undefined") return Promise.reject(new Error("No browser"));
  if (window.Cashfree) return Promise.resolve(window.Cashfree({ mode: "sandbox" }));
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK_URL; s.async = true;
      s.onload = () => (window.Cashfree ? resolve(window.Cashfree({ mode: "sandbox" })) : reject(new Error("Cashfree didn’t load")));
      s.onerror = () => { sdkPromise = null; reject(new Error("Cashfree checkout couldn’t load. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

// Server states that end the wait (everything else keeps polling for a while).
export const FINAL_STATES = Object.freeze(["paid", "failed", "user_dropped", "expired", "mismatch"]);
export const REF_RE = /^HCF-[0-9A-F]{16}$/;

// Pending HOWDI reference, kept for this tab only, so a return from a redirect (or a reload) is always verified by HOWDI.
const PENDING_KEY = "howdi.cf.pending";
export const rememberPending = (ref) => { try { if (REF_RE.test(ref)) window.sessionStorage.setItem(PENDING_KEY, ref); } catch { /* storage blocked */ } };
export const takePending = () => { try { const r = window.sessionStorage.getItem(PENDING_KEY); window.sessionStorage.removeItem(PENDING_KEY); return REF_RE.test(r || "") ? r : null; } catch { return null; } };
export const clearPending = () => { try { window.sessionStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ } };

// Web → Popup Checkout first (redirectTarget "_modal"). Redirect Checkout ("_self") only as a fallback: when the popup cannot
// launch, or when Cashfree reports that the chosen payment method must navigate. Whatever happens, the caller then asks HOWDI.
export async function openCheckout(cashfree, paymentSessionId) {
  let result;
  try {
    result = await cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });
  } catch {
    await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" }); // popup could not launch → full-page checkout
    return { mode: "redirect" };
  }
  if (result && result.redirect) return { mode: "redirect" }; // this method continues on Cashfree's page; we verify on return
  return { mode: "popup", closedWithError: Boolean(result && result.error) };
}

export const STATE_TEXT = Object.freeze({
  creating: "Starting a secure Cashfree checkout…",
  checkout: "Complete the payment in the Cashfree popup.",
  redirecting: "Taking you to Cashfree to finish the payment…",
  verifying: "Checking the payment with Cashfree…",
  paid: "Money added.",
  failed: "The payment failed. Nothing was added — you can try again.",
  user_dropped: "The payment was cancelled. Nothing was added.",
  expired: "This payment expired. Start a new one.",
  mismatch: "We couldn’t match this payment. Nothing was added yet — contact HOWDI support with the reference.",
  pending: "Your bank is still confirming the payment. We’ll add the money as soon as Cashfree confirms it.",
});

// Poll HOWDI (not Cashfree) until a final state or the attempt budget runs out.
export async function pollPayment(api, reference, { tries = 15, delayMs = 2000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const r = await api("GET", `/api/v8/hpay/cashfree/orders/${reference}`);
    if (r.ok) { last = r.json; if (FINAL_STATES.includes(r.json.payment?.status)) return last; }
    else if (r.status === 404 || r.status === 401) return { error: r.json?.message || "Payment not found." };
    await sleep(delayMs);
  }
  return last || { error: "We couldn’t confirm the payment yet." };
}
