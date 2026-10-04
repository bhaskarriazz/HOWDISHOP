import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon } from "./V8Shell";
import { V8Dialog } from "./V8System";
import { createHomePreferenceSession } from "./homePreferenceSession.mjs";

export const V8_DEFAULT_DOCK = ["connect", "shop", "spark", "move", "works", "learn"];
export const V8_DOCK_CHOICES = [
  ["connect", "Connect"], ["shop", "Shop"], ["spark", "Spark"], ["move", "Move"], ["works", "Work"], ["learn", "Learn"],
  ["vibe", "Vibe"], ["hpay", "HPay"], ["messages", "Messages"],
];
const V8_DOCK_IDS = V8_DOCK_CHOICES.map(([id]) => id);
const V8_DOCK_ID_SET = new Set(V8_DOCK_IDS);
const DOCK_LABEL = Object.fromEntries(V8_DOCK_CHOICES);
export const V8_HOME_MODULES = [
  ["community", "Community"], ["vibe", "Vibe"], ["following", "Following updates"], ["tags", "Tags & mentions"],
  ["shop", "Favorite brands & Shop offers"], ["festival", "Festival offers"], ["move", "Move"], ["works", "Work opportunities"],
  ["learn", "Learn & Earn"], ["continue", "Continue Learning"], ["live", "Live Classes"], ["hype", "Hype"],
  ["tips", "Tips"], ["trending", "Trending"], ["news", "Current affairs / News"], ["nearby", "Communities & nearby discovery"],
];
const V8_HOME_MODULE_ID_SET = new Set(V8_HOME_MODULES.map(([id]) => id));
const validDock = (dock) => {
  const seen = new Set();
  const cleanDock = (Array.isArray(dock) ? dock : []).filter((id) => typeof id === "string" && V8_DOCK_ID_SET.has(id) && id !== "spark" && !seen.has(id) && seen.add(id));
  const left = cleanDock.slice(0, 2);
  const right = cleanDock.slice(2, 5);
  const fallback = V8_DEFAULT_DOCK.filter((id) => id !== "spark" && !seen.has(id));
  while (left.length < 2 && fallback.length) left.push(fallback.shift());
  while (right.length < 3 && fallback.length) right.push(fallback.shift());
  return [...left, "spark", ...right].slice(0, 6);
};
// K5-NG47: all six quick-access positions stay occupied so Spark is always slot 3 / centre.
// Users replace a shortcut instead of hiding it; legacy hiddenDock values are dropped on read.
export const cleanV8HomePrefs = (raw) => ({
  version: 2,
  dock: validDock(raw?.dock),
  hiddenDock: [],
  favoriteDock: Array.isArray(raw?.favoriteDock) ? [...new Set(raw.favoriteDock.filter((x) => typeof x === "string" && V8_DOCK_ID_SET.has(x)))] : [],
  dockLabels: Object.fromEntries(Object.entries(raw?.dockLabels || {}).filter(([id, value]) => V8_DOCK_ID_SET.has(id) && id !== "spark" && typeof value === "string" && value.trim()).map(([id, value]) => [id, value.trim().slice(0, 12)])),
  dockIconStyle: ["line", "soft"].includes(raw?.dockIconStyle) ? raw.dockIconStyle : "line",
  hiddenModules: Array.isArray(raw?.hiddenModules) ? [...new Set(raw.hiddenModules.filter((x) => typeof x === "string" && V8_HOME_MODULE_ID_SET.has(x)))] : [],
  pinnedModules: Array.isArray(raw?.pinnedModules) ? [...new Set(raw.pinnedModules.filter((x) => typeof x === "string" && V8_HOME_MODULE_ID_SET.has(x)))] : [],
  moduleOrder: [...new Set([...(Array.isArray(raw?.moduleOrder) ? raw.moduleOrder : []), ...V8_HOME_MODULES.map(([id]) => id)])].filter((x) => typeof x === "string" && V8_HOME_MODULE_ID_SET.has(x)),
});
function readSessionToken() { try { return localStorage.getItem("howdiSessionToken") || ""; } catch { return ""; } }
export function useV8CommonHomePrefs(accountKey, apiBase) {
  const token = readSessionToken();
  const scope = accountKey && token ? `${String(accountKey)}\u0000${token}` : "guest";
  const [state, setState] = useState(() => ({ scope, prefs: cleanV8HomePrefs(null) }));
  const controllerRef = useRef(null);
  const activeScopeRef = useRef(scope);
  activeScopeRef.current = scope;
  // Clear the previous account's dock synchronously before React commits this new scope.
  if (state.scope !== scope) setState({ scope, prefs: cleanV8HomePrefs(null) });
  const prefs = state.scope === scope ? state.prefs : cleanV8HomePrefs(null);

  useEffect(() => {
    if (!accountKey || !token) {
      controllerRef.current = null;
      setState({ scope, prefs: cleanV8HomePrefs(null) });
      return undefined;
    }
    const controller = createHomePreferenceSession({
      accountKey: String(accountKey), token, apiBase,
      normalize: cleanV8HomePrefs,
      onChange: (next) => { if (activeScopeRef.current === scope) setState({ scope, prefs: next }); },
    });
    controllerRef.current = { scope, controller };
    setState({ scope, prefs: cleanV8HomePrefs(null) });
    controller.load();
    return () => {
      controller.cancel();
      if (controllerRef.current?.controller === controller) controllerRef.current = null;
    };
  }, [scope, apiBase]);

  const save = useCallback((next) => {
    if (activeScopeRef.current !== scope || controllerRef.current?.scope !== scope) return;
    controllerRef.current.controller.save(next);
  }, [scope]);
  return [prefs, save];
}

export function V8CustomizeHome({ open, prefs, onSave, onClose }) {
  const [draft, setDraft] = useState(prefs);
  useEffect(() => { if (open) setDraft(prefs); }, [open, prefs]);
  // Reorder any non-Spark shortcut; a step that would land on the centre skips over Spark.
  const move = (id, delta) => setDraft((p) => {
    const dock = [...p.dock], at = dock.indexOf(id);
    let target = at + delta;
    if (target === 2) target += delta;
    if (id === "spark" || at === 2 || target < 0 || target >= dock.length) return p;
    [dock[at], dock[target]] = [dock[target], dock[at]];
    return { ...p, dock: validDock(dock) };
  });
  const replaceDock = (index, nextId) => setDraft((p) => {
    if (index === 2 || nextId === "spark" || p.dock.includes(nextId)) return p;
    const dock = [...p.dock];
    const oldId = dock[index];
    dock[index] = nextId;
    const dockLabels = { ...p.dockLabels };
    if (oldId !== nextId) delete dockLabels[oldId];
    return { ...p, dock: validDock(dock), dockLabels };
  });
  const setDockLabel = (id, value) => setDraft((p) => ({ ...p, dockLabels: { ...p.dockLabels, [id]: value.slice(0, 12) } }));
  const toggle = (field, id, locked) => setDraft((p) => locked ? p : ({ ...p, [field]: p[field].includes(id) ? p[field].filter((x) => x !== id) : [...p[field], id] }));
  const moveModule = (id, delta) => setDraft((p) => { const order = [...p.moduleOrder], at = order.indexOf(id), target = at + delta; if (target < 0 || target >= order.length) return p; [order[at], order[target]] = [order[target], order[at]]; return { ...p, moduleOrder: order }; });
  const reset = () => setDraft(cleanV8HomePrefs(null));
  return <V8Dialog open={open} title="Customize Home" onClose={onClose} wide>
    <p className="v8-muted">Your saved choices stay with this account. Pinned and hidden choices take priority over recommendations.</p>
    <section className="v8-customize-section"><h3>Personalize floating dock</h3><p>HOWDI logo always opens Home. Spark stays fixed in the centre. Other slots are your personal quick access; changing a shortcut never changes the real HOWDI feature underneath.</p>
      <div className="v8-customize-row"><b>Icon style</b><span>Visual preference only</span><select value={draft.dockIconStyle} onChange={(e) => setDraft((p) => ({ ...p, dockIconStyle: e.target.value }))}><option value="line">Line</option><option value="soft">Soft</option></select></div>
      {draft.dock.map((id, index) => <div className="v8-customize-row" key={`${index}-${id}`}><b>{DOCK_LABEL[id] || id}</b><span>{id === "spark" ? "Fixed centre" : "Quick access"}</span>
        {id === "spark" ? <strong className="v8-dock-lock">Locked</strong> : <select aria-label={`Replace ${DOCK_LABEL[id] || id}`} value={id} onChange={(e) => replaceDock(index, e.target.value)}>{V8_DOCK_CHOICES.filter(([choice]) => choice !== "spark" && (choice === id || !draft.dock.includes(choice))).map(([choice, label]) => <option key={choice} value={choice}>{label}</option>)}</select>}
        <input className="v8-dock-label-input" aria-label={`Personal label for ${DOCK_LABEL[id] || id}`} disabled={id === "spark"} value={draft.dockLabels[id] || ""} maxLength={12} placeholder={DOCK_LABEL[id] || id} onChange={(e) => setDockLabel(id, e.target.value)} />
        <button type="button" aria-label={`Move ${DOCK_LABEL[id] || id} left`} disabled={id === "spark" || index === 0} onClick={() => move(id, -1)}>Move left</button><button type="button" aria-label={`Move ${DOCK_LABEL[id] || id} right`} disabled={id === "spark" || index === draft.dock.length - 1} onClick={() => move(id, 1)}>Move right</button>
      </div>)}
      <small>To change a slot, replace it with another shortcut. Core HOWDI destinations remain available through Home, Search, deep links and product navigation.</small>
    </section>
    <section className="v8-customize-section"><h3>Show on Home Screen</h3>{draft.moduleOrder.map((id, index) => { const label = V8_HOME_MODULES.find(([key]) => key === id)?.[1] || id; return <div className="v8-customize-row" key={id}><b>{label}</b><span>{draft.pinnedModules.includes(id) ? "Pinned" : draft.hiddenModules.includes(id) ? "Hidden" : "Eligible"}</span><button type="button" disabled={index === 0} onClick={() => moveModule(id, -1)}>Move up</button><button type="button" disabled={index === draft.moduleOrder.length - 1} onClick={() => moveModule(id, 1)}>Move down</button><button type="button" onClick={() => toggle("pinnedModules", id)}>{draft.pinnedModules.includes(id) ? "Unpin" : "Pin"}</button><button type="button" onClick={() => toggle("hiddenModules", id)}>{draft.hiddenModules.includes(id) ? "Show" : "Hide"}</button></div>; })}</section>
    <div className="v8-confirm-actions"><button type="button" className="v8-btn" onClick={reset}>Reset</button><span className="v8-spacer"/><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => { onSave(draft); onClose(); }}>Done</button></div>
  </V8Dialog>;
}
