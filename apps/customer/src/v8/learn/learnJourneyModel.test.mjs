// P8 learner journey helpers (TG-LRN-04/06, LRN-WORK-001 file rules) — pure tests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkWorkFile, costing, explainPath, isConfirmedDraft, pathQueries } from "./learnJourneyModel.js";

test("P8 correction 1: Ready to Sell succeeds only on an explicit status === 'draft' from the Vendor API", () => {
  assert.equal(isConfirmedDraft({ product: { public_key: "PRD-AAAAAAAAAAAA", status: "draft", price: 520 } }), true);
  for (const bad of [
    null, undefined, {}, { product: null }, { product: {} }, { product: { status: "published" } }, { product: { status: "DRAFT" } },
    { product: { status: "" } }, { product: { status: undefined } }, { product: { status: ["draft"] } }, { product: "draft" }, { status: "draft" },
  ]) assert.equal(isConfirmedDraft(bad), false, JSON.stringify(bad));
  // the component gates its success state on the helper (fail closed), and never calls publish
  const src = fs.readFileSync(new URL("./LearnJourney.jsx", import.meta.url), "utf8");
  const sell = src.slice(src.indexOf("export function ReadyToSell"), src.indexOf("export function PathFinder"));
  assert.match(sell, /if \(!isConfirmedDraft\(r\.json\)\) \{ setState\(\{ busy: false, err: [^}]*product: null \}\); return; \}\s*setState\(\{ busy: false, err: "", code: "", product: r\.json\.product \}\)/);
  assert.doesNotMatch(sell, /\/publish/);
});

test("path queries go strictest first and relax level → time → language → goal", () => {
  const q = pathQueries({ goal: "project", lang: "Telugu", time: "under1h" });
  assert.deepEqual(q.map((x) => x.relaxed), [[], ["level"], ["level", "time"], ["level", "time", "lang"], ["level", "time", "lang", "goal"]]);
  assert.deepEqual(q[0].state.goal, ["project"]); assert.deepEqual(q[0].state.lang, ["Telugu"]); assert.deepEqual(q[0].state.time, ["under1h"]); assert.deepEqual(q[0].state.level, ["beginner"]);
  assert.deepEqual(q.at(-1).state.goal, []); assert.deepEqual(q.at(-1).state.lang, []);
});

test("'explore', 'any' and unknown answers add no constraint", () => {
  const q = pathQueries({ goal: "explore", lang: "any", time: "forever" });
  assert.equal(q.length, 2);
  assert.deepEqual(q[0].state.goal, []); assert.deepEqual(q[0].state.lang, []); assert.deepEqual(q[0].state.time, []);
});

test("explanation separates what matched from what was widened, without outcome promises", () => {
  const e = explainPath({ goal: "sell", lang: "Hindi", time: "1to3h" }, ["level", "time"]);
  assert.deepEqual(e.matched, ["Make things I could sell", "Taught in Hindi"]);
  assert.deepEqual(e.loosened, ["Takes 1 – 3 hours", "Beginner friendly"]);
  assert.doesNotMatch(JSON.stringify(e), /guarantee|earn|income|job/i);
});

test("costing worksheet is transparent arithmetic on the learner's own numbers", () => {
  assert.deepEqual(costing({ materials: 250, extras: 30, hours: 2, rate: 120, margin: 0 }), { materials: 250, extras: 30, labour: 240, cost: 520, margin: 0, price: 520 });
  assert.equal(costing({ materials: 100, hours: 1, rate: 100, margin: 25 }).price, 250);
  assert.deepEqual(costing({ materials: -5, extras: "abc", hours: NaN, rate: 1e12, margin: -10 }), { materials: 0, extras: 0, labour: 0, cost: 0, margin: 0, price: 0 });
  assert.equal(costing({ hours: 5000, rate: 100 }).labour, 100000, "hours are capped");
});

test("evidence file rules mirror the server (type + size)", () => {
  assert.equal(checkWorkFile({ type: "image/jpeg", size: 1000 }).kind, "image");
  assert.equal(checkWorkFile({ type: "video/mp4", size: 19 * 1024 * 1024 }).kind, "video");
  assert.equal(checkWorkFile({ type: "image/png", size: 6 * 1024 * 1024 }).ok, false);
  assert.equal(checkWorkFile({ type: "video/webm", size: 21 * 1024 * 1024 }).ok, false);
  for (const t of ["image/svg+xml", "text/html", "application/pdf", "image/gif", ""]) assert.equal(checkWorkFile({ type: t, size: 10 }).ok, false, t);
  assert.equal(checkWorkFile(null).ok, false);
});
