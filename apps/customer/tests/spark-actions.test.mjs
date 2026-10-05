import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSparkResults, sparkSearchQuery, sparkTargetFor } from "../src/v8/connect/sparkActions.mjs";

test("Spark removes request verbs and time words from the canonical search query", () => {
  assert.equal(sparkSearchQuery("Find a plumber for me tomorrow at 10"), "plumber");
  assert.equal(sparkSearchQuery("crochet class near Warangal"), "crochet class warangal");
});

test("Spark accepts only approved canonical result routes", () => {
  const rows = normalizeSparkResults([
    { type: "person", title: "Mira", route: "/@mira.crafts" },
    { type: "product", title: "Crochet Tote", route: "/shop/products/PRD-0123456789AB" },
    { type: "worker", title: "Suresh", route: "/works/workers/WRK-SURESH-01" },
    { type: "course", title: "Crochet Basics", route: "/learn/courses/CRS-0123456789AB" },
  ]);
  assert.deepEqual(rows.map((x) => [x.type, x.title]), [
    ["person", "Mira"], ["product", "Crochet Tote"], ["worker", "Suresh"], ["course", "Crochet Basics"],
  ]);
});

test("Spark rejects unknown types, prototype names and forged destinations", () => {
  const inherited = Object.assign(Object.create({ type: "product", route: "/shop/products/PRD-0123456789AB", title: "Injected" }), {});
  assert.deepEqual(normalizeSparkResults([
    { type: "toString", title: "Bad", route: "/" },
    { type: "constructor", title: "Bad", route: "/" },
    { type: "__proto__", title: "Bad", route: "/" },
    { type: "product", title: "Bad", route: "https://example.invalid/" },
    { type: "worker", title: "Bad", route: "/shop/products/PRD-0123456789AB" },
    inherited,
  ]), []);
});

test("prepared Spark destinations keep canonical feature identity", () => {
  assert.deepEqual(["person", "product", "worker", "course"].map(sparkTargetFor), ["Connect", "Shop", "Work", "Learn"]);
  assert.equal(sparkTargetFor("spark"), "");
});
