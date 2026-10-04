// One session-scoped adapter over the existing /api/preferences/me contract.
// Ownership is decided by the server session; accountKey is only a UI transition scope.
export function createHomePreferenceSession({ accountKey, token, apiBase, fetchImpl = fetch, normalize, onChange }) {
  let alive = true;
  let prefs = normalize(null);
  let readController = null;
  let writeController = null;
  let writeRevision = 0;

  const publish = (next) => {
    if (!alive) return prefs;
    prefs = normalize(next);
    onChange?.(prefs);
    return prefs;
  };
  const headers = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

  const load = async () => {
    if (!alive || !accountKey || !token) return prefs;
    readController?.abort();
    const controller = new AbortController();
    readController = controller;
    try {
      const response = await fetchImpl(`${apiBase}/api/preferences/me`, {
        cache: "no-store", headers: headers(), signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") throw new Error("Unable to load HOWDI preferences");
      return publish(data.preferences?.home_preferences);
    } catch (error) {
      if (alive && error?.name !== "AbortError") publish(null);
      return prefs;
    }
  };

  const save = async (next) => {
    if (!alive || !accountKey || !token) return prefs;
    const value = publish(typeof next === "function" ? next(prefs) : next);
    const revision = ++writeRevision;
    writeController?.abort();
    const controller = new AbortController();
    writeController = controller;
    try {
      const response = await fetchImpl(`${apiBase}/api/preferences/me`, {
        method: "PUT", headers: headers(), signal: controller.signal,
        body: JSON.stringify({ home_preferences: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") throw new Error("Unable to save HOWDI preferences");
      if (alive && revision === writeRevision) return publish(data.preferences?.home_preferences ?? value);
    } catch {
      // Keep the validated session-only value visible during a transient failure.
    }
    return prefs;
  };

  const cancel = () => {
    if (!alive) return;
    alive = false;
    writeRevision += 1;
    readController?.abort();
    writeController?.abort();
    readController = null;
    writeController = null;
    prefs = normalize(null);
  };

  return { load, save, cancel, get prefs() { return prefs; } };
}
