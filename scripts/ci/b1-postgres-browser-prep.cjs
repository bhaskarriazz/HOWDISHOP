const assert = require("node:assert/strict");
const fs = require("node:fs");
const { Pool } = require("pg");
const fixturePath = "artifacts/b1-runtime/accounts.json";
const { accounts, password } = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const api = process.env.B1_API_BASE || "http://127.0.0.1:5000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    // Each width must start with new profiles and its own malformed database value.
    // Reusing 390px's accounts let later widths skip onboarding and inherit its reset.
    const viewportAccounts = { "390": accounts };
    for (const width of [768, 1440]) {
      const pair = {};
      for (const key of ["a", "b"]) {
        const stamp = `${width}-${key}-${Date.now()}-${process.pid}`;
        const account = { name: `B1 Gate User ${key.toUpperCase()}`, email: `b1-${stamp}@example.test`, phone: `7${require("node:crypto").randomInt(100000000, 999999999)}` };
        const registered = await fetch(`${api}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: account.name, email: account.email, phone: account.phone, password, role: "customer" }) });
        assert.equal(registered.status, 201, `real registration at ${width}px: ${await registered.text()}`);
        pair[key] = account;
      }
      viewportAccounts[String(width)] = pair;
    }
    for (const [width, pair] of Object.entries(viewportAccounts)) {
    const login = await fetch(`${api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: pair.a.email, password }) });
    const signed = await login.json();
    assert.equal(login.status, 200);
    const headers = { Authorization: `Bearer ${signed.token}`, "Content-Type": "application/json" };
    const reset = await fetch(`${api}/api/preferences/me`, { method: "PUT", headers, body: JSON.stringify({ home_preferences: { dock: ["connect", "shop", "spark", "move", "works", "learn"] } }) });
    assert.equal(reset.status, 200, "test account reset through the real preference API");
    const user = await pool.query("SELECT id FROM users WHERE email=$1", [pair.a.email]);
    await pool.query("UPDATE user_preferences SET home_preferences=$2::jsonb WHERE user_id=$1", [user.rows[0].id, JSON.stringify({ dock: ["connect", "connect", "__proto__", "toString", "spark", "learn"], dockLabels: { spark: "Forged Spark", toString: "bad" } })]);
    const raw = await pool.query("SELECT home_preferences FROM user_preferences WHERE user_id=$1", [user.rows[0].id]);
    assert.deepEqual(raw.rows[0].home_preferences.dock, ["connect", "connect", "__proto__", "toString", "spark", "learn"]);
    assert.equal(raw.rows[0].home_preferences.dockLabels.spark, "Forged Spark");
    console.log(`PASS PostgreSQL malformed-value fixture at ${width}px: separate A/B accounts; DB contains duplicates, inherited-name candidates, and a tampered Spark label; Chromium must prove safe normalization before render.`);
    }
    fs.writeFileSync(fixturePath, JSON.stringify({ accounts, viewportAccounts, password }, null, 2));
  } finally {
    await pool.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
