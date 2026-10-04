const assert = require("node:assert/strict");
const fs = require("node:fs");
const api = process.env.B1_API_BASE || "http://127.0.0.1:5000";
const { accounts, password } = JSON.parse(fs.readFileSync("artifacts/b1-runtime/accounts.json", "utf8"));
async function request(path, body) {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, json: await response.json() };
}
(async () => {
  const login = await request("/api/auth/login", { email: accounts.a.email, password });
  assert.equal(login.status, 200, "A must be able to log in after backend restart");
  const preferences = await fetch(`${api}/api/preferences/me`, { headers: { Authorization: `Bearer ${login.json.token}` } });
  const data = await preferences.json();
  assert.equal(preferences.status, 200);
  assert.deepEqual(data.preferences.home_preferences.dock, ["vibe", "shop", "spark", "move", "works", "learn"]);
  assert.deepEqual(data.preferences.home_preferences.dockLabels, { vibe: "Videos", works: "Jobs" });
  console.log("PASS PostgreSQL restart: authenticated login restored A's persisted customized dock and aliases from the same PostgreSQL service.");
})().catch((error) => { console.error(error); process.exitCode = 1; });