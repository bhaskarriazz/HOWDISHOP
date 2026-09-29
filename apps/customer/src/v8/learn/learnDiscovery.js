// HOWDI V8 — Learn Discovery (P8 / LRN-DISC-001..003) client state. Pure: no React, no DOM.
// The URL is the source of truth: /learn/courses?q=&goal=&lang=&level=&price=&skill=&format=&time=&materials=&sort=
// Only these keys (plus the P7 `from` origin marker) are read or written. Values are validated here and again by
// the server; the server echoes what it actually applied. Session-specific data (saved, progress) never enters the URL.

export const SKILLS = Object.freeze(["Crochet & Handmade", "Tailoring & Textiles", "Cooking", "Digital skills", "Business & Selling", "Languages", "Wellness"]);

export const FILTERS = Object.freeze({
  goal: { label: "Goal", options: [["certificate", "Get a certificate"], ["project", "Make a finished project"], ["sell", "Start selling"]] },
  lang: { label: "Language", options: null }, // real languages come from the catalogue facets
  level: { label: "Level", options: [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]] },
  price: { label: "Price", options: [["free", "Free"], ["under500", "Under ₹500"], ["500to2000", "₹500 – ₹2,000"], ["over2000", "Over ₹2,000"]] },
  skill: { label: "Skill", options: SKILLS.map((s) => [s, s]) },
  format: { label: "Format", options: [["video", "Video lessons"], ["reading", "Reading lessons"], ["live", "Live class included"]] },
  time: { label: "Time", options: [["under1h", "Under 1 hour"], ["1to3h", "1 – 3 hours"], ["over3h", "Over 3 hours"]] },
  materials: { label: "Materials", options: [["none", "No materials needed"], ["list", "Materials list provided"]] },
});
export const PRIMARY_FILTERS = Object.freeze(["goal", "lang", "level", "price"]);
export const MORE_FILTERS = Object.freeze(["skill", "format", "time", "materials"]);
export const FILTER_KEYS = Object.freeze([...PRIMARY_FILTERS, ...MORE_FILTERS]);
export const SORTS = Object.freeze([["relevance", "Best match"], ["newest", "Newest"], ["learners", "Most learners"], ["shortest", "Shortest first"], ["price_low", "Price: low to high"], ["price_high", "Price: high to low"]]);
export const PAGE_SIZE = 12;

const clean = (v, max) => String(v ?? "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const LANG_RE = /^[\p{L}][\p{L} .'-]{0,39}$/u;
const FROM_RE = /^for-[a-z]{3,20}$/;

function allowed(key, value) {
  if (key === "lang") return LANG_RE.test(value) ? value : null;
  const hit = FILTERS[key].options.find(([v]) => v.toLowerCase() === value.toLowerCase());
  return hit ? hit[0] : null;
}

export const emptyDiscovery = () => ({ q: "", ...Object.fromEntries(FILTER_KEYS.map((k) => [k, []])), sort: "", from: "" });

export function parseDiscoveryParams(search) {
  let params; try { params = new URLSearchParams(search || ""); } catch { params = new URLSearchParams(); }
  const s = emptyDiscovery();
  s.q = clean(params.get("q"), 60);
  for (const key of FILTER_KEYS) {
    const out = [];
    for (const raw of params.getAll(key)) for (const part of String(raw).split(",")) {
      const v = allowed(key, clean(part, 60));
      if (v && !out.includes(v) && out.length < 8) out.push(v);
    }
    s[key] = out;
  }
  const sort = clean(params.get("sort"), 20).toLowerCase();
  s.sort = SORTS.some(([v]) => v === sort) && !(sort === "relevance" && !s.q) ? sort : "";
  const from = clean(params.get("from"), 30);
  s.from = FROM_RE.test(from) ? from : "";
  return s;
}

// Canonical, stable query string (fixed key order, repeated keys). Default sort is omitted.
export function discoverySearch(state) {
  const params = new URLSearchParams();
  if (state.from) params.set("from", state.from);
  if (state.q) params.set("q", state.q);
  for (const key of FILTER_KEYS) for (const v of state[key] || []) params.append(key, v);
  if (state.sort) params.set("sort", state.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function discoveryApiQuery(state, offset = 0, limit = PAGE_SIZE) {
  const params = new URLSearchParams(discoverySearch({ ...state, from: "" }).slice(1));
  params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  return params.toString();
}

export const effectiveSort = (state) => state.sort || (state.q ? "relevance" : "newest");
export const activeCount = (state, keys = FILTER_KEYS) => keys.reduce((n, k) => n + (state[k]?.length || 0), 0);

export function optionLabel(key, value) {
  if (key === "lang") return value;
  return FILTERS[key].options.find(([v]) => v === value)?.[1] || value;
}

export function discoveryChips(state) {
  const chips = [];
  if (state.q) chips.push({ key: "q", value: state.q, label: `“${state.q}”` });
  for (const key of FILTER_KEYS) for (const value of state[key] || []) chips.push({ key, value, label: optionLabel(key, value) });
  return chips;
}

export function toggleValue(state, key, value) {
  const list = state[key] || [];
  return { ...state, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
}
export function removeChip(state, chip) {
  if (chip.key === "q") return { ...state, q: "", sort: state.sort === "relevance" ? "" : state.sort };
  return { ...state, [chip.key]: (state[chip.key] || []).filter((v) => v !== chip.value) };
}
export const clearAll = (state) => ({ ...emptyDiscovery(), from: state.from });

// Reconcile with what the server applied (e.g. an unknown language is dropped server-side).
export function reconcileApplied(state, applied) {
  if (!applied) return state;
  const next = { ...state };
  for (const key of FILTER_KEYS) next[key] = (state[key] || []).filter((v) => (applied[key] || []).includes(v));
  return next;
}

// Honest empty-state help: which single filter to drop to get results back, most restrictive first.
export function recoverySuggestions(state) {
  const out = [];
  if (state.q) out.push({ label: `Search all courses instead of “${state.q}”`, next: { ...state, q: "", sort: "" } });
  for (const key of [...MORE_FILTERS, ...PRIMARY_FILTERS]) if (state[key]?.length) out.push({ label: `Remove ${FILTERS[key].label.toLowerCase()} filter`, next: { ...state, [key]: [] } });
  return out.slice(0, 3);
}

// Card facts: labels only for data the API actually returned.
export function cardFacts(c) {
  const hours = c.minutes >= 60 ? `${Math.floor(c.minutes / 60)} h${c.minutes % 60 ? ` ${c.minutes % 60} min` : ""}` : c.minutes ? `${c.minutes} min` : null;
  const formats = (c.formats || []).map((f) => ({ video: "Video", reading: "Reading", live: "Live class" }[f])).filter(Boolean);
  const support = [c.live_class ? "Live class with teacher" : null, c.certificate_available ? "Certificate" : null].filter(Boolean);
  const materials = c.materials_count ? (c.materials_cost ? `Materials ≈ ₹${Number(c.materials_cost).toLocaleString("en-IN")} extra` : `${c.materials_count} material${c.materials_count === 1 ? "" : "s"} listed`) : "No materials needed";
  return { duration: hours, formats, support, materials, level: c.level ? c.level[0].toUpperCase() + c.level.slice(1) : null };
}

export const mediaSrc = (apiBase, url) => {
  const u = String(url || "");
  if (/^\/api\/v8\/media\/[\w./-]+$/.test(u)) return `${String(apiBase || "").replace(/\/+$/, "")}${u}`;
  return /^https:\/\//.test(u) ? u : "";
};
