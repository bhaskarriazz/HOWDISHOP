// P8 Learn Discovery client state (TG-LRN-01/02/03) — pure tests, run with `node --test`.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FILTER_KEYS, activeCount, cardFacts, clearAll, discoveryApiQuery, discoveryChips, discoverySearch, effectiveSort, emptyDiscovery,
  mediaSrc, parseDiscoveryParams, reconcileApplied, recoverySuggestions, removeChip, toggleValue,
} from "./learnDiscovery.js";

test("URL round-trip restores exactly the same discovery state", () => {
  const s = { ...emptyDiscovery(), q: "granny square", goal: ["project"], lang: ["Telugu"], level: ["beginner", "advanced"], price: ["free"], skill: ["Crochet & Handmade"], format: ["live"], time: ["1to3h"], materials: ["none"], sort: "price_low", from: "for-students" };
  const qs = discoverySearch(s);
  assert.deepEqual(parseDiscoveryParams(qs), s);
  assert.equal(discoverySearch(parseDiscoveryParams(qs)), qs, "canonical");
});

test("unknown keys and values never survive parsing (no ids, no session data in shared URLs)", () => {
  const s = parseDiscoveryParams("?userId=7&saved=1&goal=hack&level=expert&price=0&sort=drop&from=evil.com&lang=<script>&skill=Cooking&q=%00yarn");
  assert.deepEqual(s.goal, []); assert.deepEqual(s.level, []); assert.deepEqual(s.price, []); assert.deepEqual(s.lang, []);
  assert.deepEqual(s.skill, ["Cooking"]); assert.equal(s.sort, ""); assert.equal(s.from, ""); assert.equal(s.q, "yarn");
  assert.doesNotMatch(discoverySearch(s), /userId|saved|evil|script/);
});

test("relevance sort only with a query; default sort omitted from the URL", () => {
  assert.equal(parseDiscoveryParams("?sort=relevance").sort, "");
  assert.equal(effectiveSort(parseDiscoveryParams("")), "newest");
  assert.equal(effectiveSort(parseDiscoveryParams("?q=yarn")), "relevance");
  assert.equal(discoverySearch({ ...emptyDiscovery(), sort: "" }), "");
});

test("P7 handoff marker is kept in the URL but never sent to the API", () => {
  const s = parseDiscoveryParams("?from=for-students&q=crochet&level=beginner");
  assert.equal(s.from, "for-students");
  assert.match(discoverySearch(s), /from=for-students/);
  const api = discoveryApiQuery(s, 24, 12);
  assert.doesNotMatch(api, /from=/); assert.match(api, /offset=24/); assert.match(api, /limit=12/);
});

test("chips, toggle, remove and Clear all", () => {
  let s = toggleValue(emptyDiscovery(), "level", "beginner");
  s = toggleValue(s, "price", "free"); s = { ...s, q: "yarn", sort: "relevance" };
  const chips = discoveryChips(s);
  assert.deepEqual(chips.map((c) => c.label), ["“yarn”", "Beginner", "Free"]);
  assert.equal(activeCount(s), 2);
  const noQ = removeChip(s, chips[0]); assert.equal(noQ.q, ""); assert.equal(noQ.sort, "");
  assert.deepEqual(removeChip(s, chips[2]).price, []);
  assert.deepEqual(toggleValue(s, "level", "beginner").level, []);
  const cleared = clearAll({ ...s, from: "for-students" });
  assert.equal(activeCount(cleared), 0); assert.equal(cleared.q, ""); assert.equal(cleared.from, "for-students");
});

test("server-applied filters win (an unknown language is dropped)", () => {
  const s = { ...emptyDiscovery(), lang: ["Klingon", "Telugu"], level: ["beginner"] };
  const r = reconcileApplied(s, { lang: ["Telugu"], level: ["beginner"] });
  assert.deepEqual(r.lang, ["Telugu"]); assert.deepEqual(r.level, ["beginner"]);
});

test("empty-state recovery suggests dropping one real filter at a time", () => {
  const tips = recoverySuggestions({ ...emptyDiscovery(), q: "zz", time: ["over3h"], level: ["advanced"] });
  assert.equal(tips.length, 3);
  assert.equal(tips[0].next.q, "");
  assert.deepEqual(tips[1].next.time, []);
  assert.deepEqual(tips[2].next.level, []);
});

test("card facts come only from returned metadata; no popularity claims", () => {
  const f = cardFacts({ minutes: 140, lessons: 7, formats: ["video", "live"], live_class: true, certificate_available: true, materials_count: 2, materials_cost: 550, level: "intermediate" });
  assert.equal(f.duration, "2 h 20 min"); assert.deepEqual(f.formats, ["Video", "Live class"]);
  assert.deepEqual(f.support, ["Live class with teacher", "Certificate"]);
  assert.equal(f.materials, "Materials ≈ ₹550 extra"); assert.equal(f.level, "Intermediate");
  assert.equal(cardFacts({ minutes: 0, materials_count: 3 }).materials, "3 materials listed");
  assert.equal(cardFacts({ minutes: 45 }).materials, "No materials needed");
  assert.equal(cardFacts({ minutes: 0 }).duration, null);
  assert.doesNotMatch(JSON.stringify(f), /bestseller|popular|trending/i);
});

test("media URLs resolve against the API origin and reject anything else", () => {
  assert.equal(mediaSrc("http://api.test/", "/api/v8/media/abc.jpg"), "http://api.test/api/v8/media/abc.jpg");
  assert.equal(mediaSrc("http://api.test", "https://cdn.test/x.jpg"), "https://cdn.test/x.jpg");
  for (const bad of ["javascript:alert(1)", "http://insecure.test/x.jpg", "/api/v8/media/../../etc/passwd?x", "//evil.test/x.jpg", ""]) assert.equal(mediaSrc("http://api.test", bad), "", bad);
});

test("every filter key is represented in the canonical URL order", () => {
  assert.deepEqual(FILTER_KEYS, ["goal", "lang", "level", "price", "skill", "format", "time", "materials"]);
});
