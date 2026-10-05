const assert = require("node:assert/strict");
const fs = require("node:fs");
const { Pool } = require("pg");
const { accounts, password } = JSON.parse(fs.readFileSync("artifacts/b1-runtime/accounts.json", "utf8"));
const api = process.env.B1_API_BASE || "http://127.0.0.1:5000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const login = await fetch(`${api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: accounts.a.email, password }) });
    const signed = await login.json();
    assert.equal(login.status, 200);
    const headers = { Authorization: `Bearer ${signed.token}`, "Content-Type": "application/json" };
    const reset = await fetch(`${api}/api/preferences/me`, { method: "PUT", headers, body: JSON.stringify({ home_preferences: { dock: ["connect", "shop", "spark", "move", "works", "learn"] } }) });
    assert.equal(reset.status, 200, "test account reset through the real preference API");
    const user = await pool.query("SELECT id FROM users WHERE email=$1", [accounts.a.email]);
    await pool.query("UPDATE user_preferences SET home_preferences=$2::jsonb WHERE user_id=$1", [user.rows[0].id, JSON.stringify({ dock: ["connect", "connect", "__proto__", "toString", "spark", "learn"], dockLabels: { spark: "Forged Spark", toString: "bad" } })]);
    const raw = await pool.query("SELECT home_preferences FROM user_preferences WHERE user_id=$1", [user.rows[0].id]);
    assert.deepEqual(raw.rows[0].home_preferences.dock, ["connect", "connect", "__proto__", "toString", "spark", "learn"]);
    assert.equal(raw.rows[0].home_preferences.dockLabels.spark, "Forged Spark");
    console.log("PASS PostgreSQL malformed-value fixture: DB directly contains duplicates, inherited-name candidates, and a tampered Spark label; Chromium must prove safe normalization before render.");
  } finally {
    await pool.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
