import test from "node:test";
import assert from "node:assert/strict";
import { buildContinueItems } from "./howdiContinue.js";

const orders = [
  { id: 4182, order_number: "HOW20261003-77", status: "SHIPPED", title: "Crochet tote", delivery_phone: "9848012345" },
  { id: 4183, status: "DELIVERED", title: "Old order" },
  { id: 4184, status: "CONFIRMED", title: "Table runner" },
];
const works = [
  { workCode: "HOWDI-WORK-991", stage: "arrived", title: "Plumbing", jobPin: "7319", journeyId: "55" },
  { workCode: "HOWDI-WORK-992", stage: "open", title: "Electrician" },
  { workCode: "HOWDI-WORK-993", stage: "customer_confirmed", title: "Done job" },
  { workCode: "HOWDI-WORK-994", stage: "completed", title: "AC repair" },
];
const learnerHome = { next_step: { action: "LIVE", title: "Crochet basics", description: "Next class · 3 Oct, 6:00 pm", reference_id: 812 } };

test("orders, works and learning combine in a fixed priority order", () => {
  const out = buildContinueItems({ orders, worksBookings: works, learnerHome, orderLabel: (s) => (s === "CONFIRMED" ? "Confirmed" : s) });
  assert.deepEqual(out.map((x) => [x.kind, x.title, x.status]), [
    ["works", "Plumbing", "Your worker has arrived"],
    ["works", "AC repair", "Check the finished job"],
    ["order", "Crochet tote", "On its way"],
    ["learn", "Crochet basics", "Next class · 3 Oct, 6:00 pm"],
    ["works", "Electrician", "Waiting for a worker"],
    ["order", "Table runner", "Confirmed"],
  ]);
});

test("finished or cancelled journeys never appear", () => {
  const out = buildContinueItems({ orders, worksBookings: works });
  assert.equal(out.some((x) => x.title === "Old order" || x.title === "Done job"), false);
});

test("no ids, codes, PINs, phones or references are ever exposed in an item's display fields", () => {
  const out = buildContinueItems({ orders, worksBookings: works, learnerHome });
  const shown = JSON.stringify(out.map(({ title, status, action }) => ({ title, status, action })));
  for (const leak of ["4182", "HOWDI-WORK", "7319", "9848012345", "812", "HOW20261003", "journey"]) assert.equal(shown.includes(leak), false, leak);
  for (const x of out) assert.deepEqual(Object.keys(x).sort(), ["action", "key", "kind", "priority", "source", "status", "title"]);
  for (const x of out) assert.match(x.key, /^(works|order):\d+$|^learn:next$/);
});

test("nothing is invented: no data means no items; no ride items exist on this branch", () => {
  assert.deepEqual(buildContinueItems({}), []);
  assert.equal(buildContinueItems({ orders, worksBookings: works, learnerHome }).some((x) => x.kind === "ride"), false);
});

test("course continuation and skill journey use lower priority than live work", () => {
  const out = buildContinueItems({ worksBookings: [works[0]], learnerHome: { next_step: { action: "MY_LEARNING", title: "Continue Tailoring", description: "40% complete" } } });
  assert.deepEqual(out.map((x) => x.kind), ["works", "learn"]);
  assert.equal(out[1].action, "Continue");
});

test("deterministic for the same input", () => {
  const a = buildContinueItems({ orders, worksBookings: works, learnerHome });
  const b = buildContinueItems({ orders, worksBookings: works, learnerHome });
  assert.deepEqual(a.map((x) => x.key), b.map((x) => x.key));
});
