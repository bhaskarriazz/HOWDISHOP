const APPROVED_DOCK_KEYS = new Set([
  "connect", "shop", "spark", "move", "works", "learn", "vibe", "hpay", "messages",
]);
const DEFAULT_DOCK = ["connect", "shop", "spark", "move", "works", "learn"];
const APPROVED_HOME_MODULES = new Set([
  "community", "vibe", "following", "tags", "shop", "festival", "move", "works",
  "learn", "continue", "live", "hype", "tips", "trending", "news", "nearby",
]);

function normalizeHomePreferences(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const seen = new Set();
  const valid = (Array.isArray(source.dock) ? source.dock : []).filter((key) =>
    typeof key === "string" && APPROVED_DOCK_KEYS.has(key) && key !== "spark" && !seen.has(key) && seen.add(key));
  const left = valid.slice(0, 2);
  const right = valid.slice(2, 5);
  const fallback = DEFAULT_DOCK.filter((key) => key !== "spark" && !seen.has(key));
  while (left.length < 2 && fallback.length) left.push(fallback.shift());
  while (right.length < 3 && fallback.length) right.push(fallback.shift());

  const labels = Object.fromEntries(Object.entries(source.dockLabels || {}).filter(([key, value]) =>
    APPROVED_DOCK_KEYS.has(key) && key !== "spark" && typeof value === "string" && value.trim())
    .map(([key, value]) => [key, value.trim().slice(0, 12)]));
  const cleanModules = (value) => [...new Set((Array.isArray(value) ? value : []).filter((key) =>
    typeof key === "string" && APPROVED_HOME_MODULES.has(key)))];
  const moduleOrder = cleanModules(source.moduleOrder);
  for (const key of APPROVED_HOME_MODULES) if (!moduleOrder.includes(key)) moduleOrder.push(key);

  return {
    version: 2,
    dock: [...left, "spark", ...right].slice(0, 6),
    hiddenDock: [],
    favoriteDock: [...new Set((Array.isArray(source.favoriteDock) ? source.favoriteDock : []).filter((key) =>
      typeof key === "string" && APPROVED_DOCK_KEYS.has(key)))],
    dockLabels: labels,
    dockIconStyle: source.dockIconStyle === "soft" ? "soft" : "line",
    hiddenModules: cleanModules(source.hiddenModules),
    pinnedModules: cleanModules(source.pinnedModules),
    moduleOrder,
  };
}

module.exports = { DEFAULT_DOCK, APPROVED_DOCK_KEYS, normalizeHomePreferences };
