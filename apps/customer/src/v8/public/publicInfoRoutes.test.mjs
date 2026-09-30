import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_INFO_LINKS, publicInfoPageForPath, publicInfoPathForPage } from "./publicInfoRoutes.js";

test("canonical public information routes resolve", () => {
  assert.equal(publicInfoPageForPath("/privacy"), "privacy");
  assert.equal(publicInfoPageForPath("/data-rights/"), "data-rights");
  assert.equal(publicInfoPageForPath("/help"), "help");
  assert.equal(publicInfoPageForPath("/contact?from=footer"), "contact");
  assert.equal(publicInfoPageForPath("/about"), "about");
  assert.equal(publicInfoPageForPath("/team"), "team");
});

test("FAQ is a safe alias for Help", () => {
  assert.equal(publicInfoPageForPath("/faq"), "help");
  assert.equal(publicInfoPathForPage("help"), "/help");
});

test("unknown routes are not claimed", () => {
  assert.equal(publicInfoPageForPath("/admin"), null);
  assert.equal(publicInfoPageForPath("/move"), null);
  assert.equal(publicInfoPageForPath("/me/privacy"), null);
  assert.equal(publicInfoPathForPage("legal"), null);
});

test("footer contains the six public information destinations only", () => {
  assert.deepEqual(PUBLIC_INFO_LINKS.map(([key]) => key), ["about", "privacy", "data-rights", "help", "contact", "team"]);
});
