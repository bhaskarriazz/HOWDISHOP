// NG49 — preserve user input across retries and sign-in (device-local only)

const PREFIX = "howdi:recovery-draft:";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveInputDraft(scope, fields = {}) {
  const key = PREFIX + String(scope || "default").slice(0, 80);
  const store = storage();
  if (!store) return false;
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      fields: Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 8000) : v])
      ),
    };
    store.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readInputDraft(scope) {
  const key = PREFIX + String(scope || "default").slice(0, 80);
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.fields && typeof parsed.fields === "object" ? parsed.fields : null;
  } catch {
    return null;
  }
}

export function clearInputDraft(scope) {
  const key = PREFIX + String(scope || "default").slice(0, 80);
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}
