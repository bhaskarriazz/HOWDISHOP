import { useEffect, useState } from "react";
import { V8Icon } from "./V8Shell";
import { V8Dialog } from "./V8System";

export const V8_DEFAULT_DOCK = ["connect", "shop", "spark", "move", "works", "learn"];
export const V8_DOCK_CHOICES = [
  ["connect", "Connect"], ["shop", "Shop"], ["spark", "Spark"], ["move", "Move"], ["works", "Work"], ["learn", "Learn"],
  ["vibe", "Vibe"], ["hpay", "HPay"], ["messages", "Messages"],
];
const V8_DOCK_IDS = V8_DOCK_CHOICES.map(([id]) => id);
const DOCK_LABEL = Object.fromEntries(V8_DOCK_CHOICES);
export const V8_HOME_MODULES = [
  ["community", "Community"], ["vibe", "Vibe"], ["following", "Following updates"], ["tags", "Tags & mentions"],
  ["shop", "Favorite brands & Shop offers"], ["festival", "Festival offers"], ["move", "Move"], ["works", "Work opportunities"],
  ["learn", "Learn & Earn"], ["continue", "Continue Learning"], ["live", "Live Classes"], ["hype", "Hype"],
  ["tips", "Tips"], ["trending", "Trending"], ["news", "Current affairs / News"], ["nearby", "Communities & nearby discovery"],
];
const KEY = "howdi.v8.common-home.v2";
const validDock = (dock) => {
  const seen = new Set();
  const cleanDock = (Array.isArray(dock) ? dock : []).filter((id) => V8_DOCK_IDS.includes(id) && id !== "spark" && !seen.has(id) && seen.add(id));
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
  favoriteDock: Array.isArray(raw?.favoriteDock) ? raw.favoriteDock.filter((x) => V8_DOCK_IDS.includes(x)) : [],
  dockLabels: Object.fromEntries(Object.entries(raw?.dockLabels || {}).filter(([id, value]) => V8_DOCK_IDS.includes(id) && typeof value === "string" && value.trim()).map(([id, value]) => [id, value.trim().slice(0, 12)])),
  dockIconStyle: ["line", "soft"].includes(raw?.dockIconStyle) ? raw.dockIconStyle : "line",
  hiddenModules: Array.isArray(raw?.hiddenModules) ? raw.hiddenModules.filter((x) => V8_HOME_MODULES.some(([id]) => id === x)) : [],
  pinnedModules: Array.isArray(raw?.pinnedModules) ? raw.pinnedModules.filter((x) => V8_HOME_MODULES.some(([id]) => id === x)) : [],
  moduleOrder: [...new Set([...(Array.isArray(raw?.moduleOrder) ? raw.moduleOrder : []), ...V8_HOME_MODULES.map(([id]) => id)])].filter((x) => V8_HOME_MODULES.some(([id]) => id === x)),
});
const readV8HomePrefs = (key) => { try { return cleanV8HomePrefs(JSON.parse(localStorage.getItem(key) || "null")); } catch { return cleanV8HomePrefs(null); } };
export function useV8CommonHomePrefs(accountKey) {
  const key = `${KEY}:${String(accountKey || "guest")}`;
  // Read synchronously per account key: no default-dock flash after refresh, and on an account
  // switch the previous account's dock is never rendered or saved under the new key.
  const [state, setState] = useState(() => ({ key, prefs: readV8HomePrefs(key) }));
  const prefs = state.key === key ? state.prefs : readV8HomePrefs(key);
  if (state.key !== key) setState({ key, prefs });
  const save = (next) => { const value = cleanV8HomePrefs(typeof next === "function" ? next(prefs) : next); setState({ key, prefs: value }); try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* keep this session only */ } };
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
