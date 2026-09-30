import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./V8PublicInfo.jsx", import.meta.url), "utf8");

test("public trust pages keep required headings and six-pillar wording", () => {
  for (const heading of ["Privacy information", "Your data & privacy rights", "Help & FAQ", "Contact HOWDI", "About HOWDI", "Our Team"]) {
    assert.ok(source.includes(heading), heading);
  }
  assert.ok(source.includes("Home · Connect · Shop · Move · Work · Learn"));
  assert.ok(source.includes("not a seventh main pillar"));
});

test("FAQ and footer use accessible native controls", () => {
  assert.ok(source.includes("<details key="));
  assert.ok(source.includes("<summary>"));
  assert.ok(source.includes('aria-label="HOWDI information"'));
  assert.ok(source.includes('type="button"'));
});

test("contact page does not publish invented direct contact details", () => {
  assert.equal(/mailto:/i.test(source), false);
  assert.equal(/tel:/i.test(source), false);
  assert.equal(/support@/i.test(source), false);
  assert.ok(source.includes("Public contact details — TBD"));
});

test("privacy copy does not overclaim deletion, retention or certification", () => {
  assert.ok(source.includes("does not prove a complete production erasure pipeline"));
  assert.ok(source.includes("not a certification or guarantee of absolute security"));
  assert.ok(source.includes("Founder/legal + backend verification TBD"));
});

test("team page contains no fabricated named roster", () => {
  assert.ok(source.includes("No repository-approved public team roster"));
  assert.ok(source.includes("Approved team profiles will appear here"));
});
