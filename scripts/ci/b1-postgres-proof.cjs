const assert = require("node:assert/strict");
const { Pool } = require("pg");

const api = process.env.B1_API_BASE || "http://127.0.0.1:5000";
const password = process.env.B1_GATE_PASSWORD || "GateOnly2026Pass";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const stamp = `${Date.now()}-${process.pid}`;
const accounts = {
  a: { name: "B1 Gate User A", email: `b1-a-${stamp}@example.test`, phone: `9${String(Date.now()).slice(-9)}` },
  b: { name: "B1 Gate User B", email: `b1-b-${stamp}@example.test`, phone: `8${String(Date.now()).slice(-9)}` },
};
const publicPreferenceFields = ["marketing_email", "order_email", "promotional_notifications", "sms_updates", "push_notifications", "preferred_categories", "preferred_sizes", "preferred_languages", "personalized_recommendations", "save_shopping_activity", "share_analytics_data", "home_preferences"];
const responseEvidence = [];
function assertPublicPreferences(result, label) {
  assert.equal(result.status, 200, label);
  const preferences = result.json.preferences;
  assert.ok(preferences && typeof preferences === "object", `${label}: preference payload present`);
  assert.equal(Object.hasOwn(preferences, "id"), false, `${label}: internal database id absent`);
  assert.equal(Object.hasOwn(preferences, "user_id"), false, `${label}: internal owner id absent`);
  assert.deepEqual(Object.keys(preferences).sort(), [...publicPreferenceFields].sort(), `${label}: exact public preference contract; no internal identity/metadata`);
  for (const field of publicPreferenceFields.slice(0, 5).concat(publicPreferenceFields.slice(8, 11))) assert.equal(typeof preferences[field], "boolean", `${label}: ${field} preserved`);
  for (const field of ["preferred_categories", "preferred_sizes", "preferred_languages"]) assert.ok(Array.isArray(preferences[field]), `${label}: ${field} preserved`);
  assert.ok(preferences.home_preferences && Array.isArray(preferences.home_preferences.dock), `${label}: normalized Home preferences present`);
  responseEvidence.push({ label, status: result.status, payload: result.json, idAbsent: true, userIdAbsent: true });
  console.log(`PASS ${label}: all 12 public preference fields present; id absent; user_id absent; no internal identity fields`);
}
async function request(path, { token, method = "GET", body, query = "" } = {}) {
  const response = await fetch(`${api}${path}${query}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
}
async function register(account) {
  const result = await request("/api/auth/register", { method: "POST", body: { full_name: account.name, email: account.email, phone: account.phone, password, role: "customer" } });
  assert.equal(result.status, 201, `registration failed: ${JSON.stringify(result.json)}`);
  assert.ok(result.json.token, "registration must create a live session");
  return result.json.token;
}
async function login(account) {
  const result = await request("/api/auth/login", { method: "POST", body: { email: account.email, password } });
  assert.equal(result.status, 200, `login failed: ${JSON.stringify(result.json)}`);
  return result.json.token;
}
async function run() {
  try {
    const schema = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='home_preferences'");
    assert.equal(schema.rows[0]?.data_type, "jsonb", "clean bootstrap must install JSONB home_preferences");

    const tokenA = await register(accounts.a);
    const tokenB = await register(accounts.b);
    const userA = await pool.query("SELECT id FROM users WHERE email=$1", [accounts.a.email]);
    const userB = await pool.query("SELECT id FROM users WHERE email=$1", [accounts.b.email]);
    assert.ok(userA.rows[0]?.id && userB.rows[0]?.id, "registered users must be persisted in real PostgreSQL");
    const idA = Number(userA.rows[0].id), idB = Number(userB.rows[0].id);

    const defaultsA = await request("/api/preferences/me", { token: tokenA });
    const defaultsB = await request("/api/preferences/me", { token: tokenB });
    assert.equal(defaultsA.status, 200);
    assert.equal(defaultsB.status, 200);
    assertPublicPreferences(defaultsA, "GET A (initial row creation)");
    assertPublicPreferences(defaultsB, "GET B (initial row creation)");
    const defaultDock = ["connect", "shop", "spark", "move", "works", "learn"];
    assert.deepEqual(defaultsA.json.preferences.home_preferences.dock, defaultDock);
    assert.deepEqual(defaultsB.json.preferences.home_preferences.dock, defaultDock);

    const savedA = {
      version: 2,
      dock: ["vibe", "shop", "move", "works", "learn"],
      dockLabels: { vibe: "Videos", works: "Jobs", spark: "tampered" },
    };
    const putA = await request("/api/preferences/me", { token: tokenA, method: "PUT", body: { user_id: idB, userId: idB, home_preferences: savedA } });
    assert.equal(putA.status, 200);
    assertPublicPreferences(putA, "PUT A (forged B IDs ignored)");
    const readA = await request("/api/preferences/me?user_id=" + idB, { token: tokenA });
    const readB = await request("/api/preferences/me?user_id=" + idA, { token: tokenB });
    assertPublicPreferences(readA, "GET A (forged B query ID ignored)");
    assertPublicPreferences(readB, "GET B (forged A query ID ignored)");
    assert.deepEqual(readA.json.preferences.home_preferences.dock, ["vibe", "shop", "spark", "move", "works", "learn"]);
    assert.deepEqual(readA.json.preferences.home_preferences.dockLabels, { vibe: "Videos", works: "Jobs" });
    assert.deepEqual(readB.json.preferences.home_preferences.dock, defaultDock, "A's forged IDs cannot read B state and B is unchanged");

    await pool.query("DELETE FROM user_preferences WHERE user_id=$1", [idB]);
    const putB = await request("/api/preferences/me?user_id=" + idA, { token: tokenB, method: "PUT", body: { id: idA, user_id: idA, userId: idA, marketing_email: false, preferred_languages: ["English", "Hindi"], home_preferences: { dock: defaultDock } } });
    assertPublicPreferences(putB, "PUT B (initial row creation; forged A IDs ignored)");
    assert.equal(putB.json.preferences.marketing_email, false);
    assert.deepEqual(putB.json.preferences.preferred_languages, ["English", "Hindi"]);
    const aAfterB = await request("/api/preferences/me", { token: tokenA });
    assertPublicPreferences(aAfterB, "GET A (unchanged after forged B write)");
    assert.deepEqual(aAfterB.json.preferences.home_preferences, readA.json.preferences.home_preferences, "B cannot modify A preferences");

    const rows = await pool.query("SELECT user_id,home_preferences FROM user_preferences WHERE user_id=ANY($1::bigint[]) ORDER BY user_id", [[idA, idB]]);
    assert.equal(rows.rows.length, 2, "separate PostgreSQL rows must exist for A and B");
    assert.deepEqual(rows.rows.find((row) => Number(row.user_id) === idA).home_preferences.dockLabels, { vibe: "Videos", works: "Jobs" });
    assert.deepEqual(rows.rows.find((row) => Number(row.user_id) === idB).home_preferences.dock, defaultDock);

    const unauthRead = await request("/api/preferences/me");
    const unauthWrite = await request("/api/preferences/me", { method: "PUT", body: { user_id: idB, home_preferences: savedA } });
    assert.equal(unauthRead.status, 401, "logout/guest reads are protected");
    assert.equal(unauthWrite.status, 401, "logout/guest writes are protected");
    const logout = await request("/api/auth/logout", { token: tokenA, method: "POST" });
    assert.equal(logout.status, 200);
    assert.equal((await request("/api/preferences/me", { token: tokenA })).status, 401, "revoked A token cannot read");
    assert.equal((await request("/api/preferences/me", { token: tokenA, method: "PUT", body: { home_preferences: defaultDock } })).status, 401, "revoked A token cannot write");
    const tokenA2 = await login(accounts.a);
    assert.deepEqual((await request("/api/preferences/me", { token: tokenA2 })).json.preferences.home_preferences.dockLabels, { vibe: "Videos", works: "Jobs" }, "new login reloads A's saved preference");

    await require("node:fs/promises").writeFile("artifacts/b1-runtime/accounts.json", JSON.stringify({ accounts, password }, null, 2));
    await require("node:fs/promises").writeFile("artifacts/b1-runtime/preferences-public-response-proof.json", JSON.stringify({ responseEvidence, ownershipIsolation: "PASS", forgedIdsIgnored: "PASS" }, null, 2));
    console.log("PASS PostgreSQL: clean schema, per-account rows, IDOR read/write denial, forged IDs ignored, logout revocation, new-login reload. A's saved custom dock is queued for restart proof.");
  } finally {
    await pool.end();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
