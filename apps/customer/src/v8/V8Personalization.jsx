import { useEffect, useMemo, useState } from "react";
import { V8Dialog, V8Icon } from "./V8Shell";

export const V8_DEFAULT_DOCK = ["home", "connect", "shop", "move", "works", "learn"];
export const V8_HOME_MODULES = [
  ["community", "Community"], ["vibe", "Vibe"], ["following", "Following updates"], ["tags", "Tags & mentions"],
  ["shop", "Favorite brands & Shop offers"], ["festival", "Festival offers"], ["move", "Move"], ["works", "Work opportunities"],
  ["learn", "Learn & Earn"], ["continue", "Continue Learning"], ["live", "Live Classes"], ["hype", "Hype"],
  ["tips", "Tips"], ["trending", "Trending"], ["news", "Current affairs / News"], ["nearby", "Communities & nearby discovery"],
];
const KEY = "howdi.v8.common-home.v1";
const validDock = (dock) => {
  const seen = new Set();
  const clean = (Array.isArray(dock) ? dock : []).filter((id) => V8_DEFAULT_DOCK.includes(id) && !seen.has(id) && seen.add(id));
  return ["home", ...clean.filter((id) => id !== "home"), ...V8_DEFAULT_DOCK.filter((id) => !clean.includes(id) && id !== "home")];
};
const clean = (raw) => ({
  version: 1,
  dock: validDock(raw?.dock),
  hiddenDock: Array.isArray(raw?.hiddenDock) ? raw.hiddenDock.filter((x) => x !== "home" && V8_DEFAULT_DOCK.includes(x)) : [],
  favoriteDock: Array.isArray(raw?.favoriteDock) ? raw.favoriteDock.filter((x) => V8_DEFAULT_DOCK.includes(x)) : [],
  hiddenModules: Array.isArray(raw?.hiddenModules) ? raw.hiddenModules.filter((x) => V8_HOME_MODULES.some(([id]) => id === x)) : [],
  pinnedModules: Array.isArray(raw?.pinnedModules) ? raw.pinnedModules.filter((x) => V8_HOME_MODULES.some(([id]) => id === x)) : [],
  moduleOrder: [...new Set([...(Array.isArray(raw?.moduleOrder) ? raw.moduleOrder : []), ...V8_HOME_MODULES.map(([id]) => id)])].filter((x) => V8_HOME_MODULES.some(([id]) => id === x)),
});
export function useV8CommonHomePrefs(accountKey) {
  const key = `${KEY}:${String(accountKey || "guest")}`;
  const [prefs, setPrefs] = useState(() => clean(null));
  useEffect(() => { try { setPrefs(clean(JSON.parse(localStorage.getItem(key) || "null"))); } catch { setPrefs(clean(null)); } }, [key]);
  const save = (next) => { const value = clean(typeof next === "function" ? next(prefs) : next); setPrefs(value); try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* keep this session only */ } };
  return [prefs, save];
}

export function V8CustomizeHome({ open, prefs, onSave, onClose }) {
  const [draft, setDraft] = useState(prefs);
  useEffect(() => { if (open) setDraft(prefs); }, [open, prefs]);
  const visible = useMemo(() => draft.dock.filter((id) => !draft.hiddenDock.includes(id)), [draft]);
  const move = (id, delta) => setDraft((p) => {
    const dock = [...p.dock], at = dock.indexOf(id), target = at + delta;
    if (id === "home" || target < 1 || target >= dock.length) return p;
    [dock[at], dock[target]] = [dock[target], dock[at]];
    return { ...p, dock };
  });
  const toggle = (field, id, locked) => setDraft((p) => locked ? p : ({ ...p, [field]: p[field].includes(id) ? p[field].filter((x) => x !== id) : [...p[field], id] }));
  const moveModule = (id, delta) => setDraft((p) => { const order = [...p.moduleOrder], at = order.indexOf(id), target = at + delta; if (target < 0 || target >= order.length) return p; [order[at], order[target]] = [order[target], order[at]]; return { ...p, moduleOrder: order }; });
  const reset = () => setDraft(clean(null));
  return <V8Dialog open={open} title="Customize Home" onClose={onClose} wide>
    <p className="v8-muted">Your saved choices stay with this account. Pinned and hidden choices take priority over recommendations.</p>
    <section className="v8-customize-section"><h3>Edit dock</h3><p>Home stays first. Use Move left or Move right; touch users can also hold the dock for about two seconds.</p>
      {draft.dock.map((id, index) => <div className="v8-customize-row" key={id}><b>{V8_DEFAULT_DOCK.find((x) => x === id) === "works" ? "Work" : id[0].toUpperCase() + id.slice(1)}</b><span>{id === "home" ? "Fixed first" : draft.hiddenDock.includes(id) ? "Hidden" : "Visible"}</span><button type="button" disabled={id === "home" || index < 2} onClick={() => move(id, -1)}>Move left</button><button type="button" disabled={id === "home" || index === draft.dock.length - 1} onClick={() => move(id, 1)}>Move right</button><button type="button" disabled={id === "home"} onClick={() => toggle("hiddenDock", id, id === "home")}>{draft.hiddenDock.includes(id) ? "Show" : "Hide"}</button><button type="button" disabled={id === "home"} onClick={() => toggle("favoriteDock", id, id === "home")}>{draft.favoriteDock.includes(id) ? "Unfavorite" : "Favorite"}</button></div>)}
      <small>{visible.length} of 6 dock destinations visible. Hidden destinations remain available through search and Customize Home.</small>
    </section>
    <section className="v8-customize-section"><h3>Show on Home Screen</h3>{draft.moduleOrder.map((id, index) => { const label = V8_HOME_MODULES.find(([key]) => key === id)?.[1] || id; return <div className="v8-customize-row" key={id}><b>{label}</b><span>{draft.pinnedModules.includes(id) ? "Pinned" : draft.hiddenModules.includes(id) ? "Hidden" : "Eligible"}</span><button type="button" disabled={index === 0} onClick={() => moveModule(id, -1)}>Move up</button><button type="button" disabled={index === draft.moduleOrder.length - 1} onClick={() => moveModule(id, 1)}>Move down</button><button type="button" onClick={() => toggle("pinnedModules", id)}>{draft.pinnedModules.includes(id) ? "Unpin" : "Pin"}</button><button type="button" onClick={() => toggle("hiddenModules", id)}>{draft.hiddenModules.includes(id) ? "Show" : "Hide"}</button></div>; })}</section>
    <div className="v8-confirm-actions"><button type="button" className="v8-btn" onClick={reset}>Reset</button><span className="v8-spacer"/><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => { onSave(draft); onClose(); }}>Done</button></div>
  </V8Dialog>;
}
