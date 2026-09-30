// HOWDI V8 — Learn Experience helpers (P8). Pure: no React, no DOM, no network.
//   Find My Learning Path (LRN-PATH-001): three answers → an ordered list of catalogue queries, relaxed one constraint at a
//   time, so the recommendation is always explainable ("matched" vs "relaxed") and never invented.
//   Ready to Sell (LRN-SELL-001): a transparent costing worksheet — a calculator, not a sales or income promise.
//   Show My Work (LRN-WORK-001): client-side file checks mirroring the server limits.
import { emptyDiscovery } from "./learnDiscovery.js";

export const PATH_GOALS = Object.freeze([["project", "Make something I can use or gift"], ["sell", "Make things I could sell"], ["certificate", "Earn a certificate"], ["explore", "Just explore"]]);
export const PATH_TIMES = Object.freeze([["under1h", "Under 1 hour"], ["1to3h", "1 – 3 hours"], ["over3h", "More than 3 hours"], ["any", "Not sure yet"]]);
const GOAL_LABEL = Object.fromEntries(PATH_GOALS); const TIME_LABEL = Object.fromEntries(PATH_TIMES);

// Answers → candidate discovery states, strictest first. Beginner level is preferred but relaxed first.
export function pathQueries({ goal, lang, time } = {}) {
  const base = { ...emptyDiscovery() };
  const facets = [];
  if (goal && goal !== "explore" && GOAL_LABEL[goal]) facets.push(["goal", goal]);
  if (lang && lang !== "any") facets.push(["lang", lang]);
  if (time && time !== "any" && TIME_LABEL[time]) facets.push(["time", time]);
  const build = (keep, beginner) => {
    const s = { ...base, level: beginner ? ["beginner"] : [] };
    for (const [k, v] of keep) s[k] = [v];
    return s;
  };
  const out = [{ state: build(facets, true), relaxed: [] }, { state: build(facets, false), relaxed: ["level"] }];
  // relax time, then language, then goal (the learner's goal is kept longest)
  const order = ["time", "lang", "goal"];
  let keep = facets.slice(); const relaxed = ["level"];
  for (const k of order) {
    if (!keep.some(([x]) => x === k)) continue;
    keep = keep.filter(([x]) => x !== k); relaxed.push(k);
    out.push({ state: build(keep, false), relaxed: relaxed.slice() });
  }
  return out;
}

export function explainPath(answers, relaxed) {
  const matched = []; const loosened = [];
  const put = (cond, text) => (cond ? loosened : matched).push(text);
  if (answers.goal && answers.goal !== "explore") put(relaxed.includes("goal"), GOAL_LABEL[answers.goal]);
  if (answers.lang && answers.lang !== "any") put(relaxed.includes("lang"), `Taught in ${answers.lang}`);
  if (answers.time && answers.time !== "any") put(relaxed.includes("time"), `Takes ${TIME_LABEL[answers.time].toLowerCase()}`);
  put(relaxed.includes("level"), "Beginner friendly");
  return { matched, loosened };
}

// Ready to Sell worksheet. All inputs are the learner's own numbers; nothing is assumed about demand or income.
export function costing({ materials = 0, extras = 0, hours = 0, rate = 0, margin = 0 } = {}) {
  const n = (v, max) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.min(x, max) : 0; };
  const m = n(materials, 500000), e = n(extras, 500000), h = n(hours, 1000), r = n(rate, 100000), g = n(margin, 500);
  const labour = Math.round(h * r);
  const cost = Math.round(m + e + labour);
  const price = Math.max(cost ? 1 : 0, Math.round(cost * (1 + g / 100)));
  return { materials: Math.round(m), extras: Math.round(e), labour, cost, margin: g, price };
}

// Ready to Sell completes only when the authoritative Vendor API explicitly confirms the saved listing is a draft.
// Anything else (missing product, missing/other status) fails closed: never shown as a successful draft.
export const isConfirmedDraft = (json) => Boolean(json && typeof json === "object" && json.product && typeof json.product === "object" && json.product.status === "draft");

export const WORK_LIMITS =Object.freeze({ image: 5 * 1024 * 1024, video: 20 * 1024 * 1024 });
const OK_TYPES = { "image/jpeg": "image", "image/png": "image", "image/webp": "image", "video/mp4": "video", "video/webm": "video", "video/quicktime": "video" };
export function checkWorkFile(file) {
  if (!file) return { ok: false, message: "Choose a photo or a short clip." };
  const kind = OK_TYPES[String(file.type || "").toLowerCase()];
  if (!kind) return { ok: false, message: "Use a JPG, PNG or WebP photo, or an MP4, WebM or MOV clip." };
  if (file.size > WORK_LIMITS[kind]) return { ok: false, message: kind === "video" ? "Clips can be up to 20 MB." : "Photos can be up to 5 MB." };
  return { ok: true, kind };
}

export const STEP_ICON = Object.freeze({ lesson: "play", materials: "box", share: "camera", revise: "refresh", wait: "clock", certificate: "star", done: "check" });
