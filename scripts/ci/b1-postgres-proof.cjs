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
async function completeOnboarding(account, token, suffix) {
  // These are real CI accounts. Complete the required profile through the same authenticated
  // endpoint used by the onboarding UI so the browser gate starts at Home for a valid reason.
  const handle = `b1gate${suffix}${String(Date.now())}${process.pid}`.toLowerCase();
  const result = await request("/api/v8/onboarding/profile", {
    token,
    method: "POST",
    body: { displayName: account.name, publicUsername: handle, interests: ["Learning"], acceptTerms: true },
  });
  assert.equal(result.status, 200, `real onboarding API failed for ${account.email}: ${JSON.stringify(result.json)}`);
  assert.equal(result.json.profile?.public_username, handle, "onboarding must persist the public profile handle");
  return handle;
}
async function run() {
  try {
    const schema = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name='user_preferences' AND column_name='home_preferences'");
    assert.equal(schema.rows[0]?.data_type, "jsonb", "clean bootstrap must install JSONB home_preferences");

    const tokenA = await register(accounts.a);
    const tokenB = await register(accounts.b);
    const handleA = await completeOnboarding(accounts.a, tokenA, "a");
    const handleB = await completeOnboarding(accounts.b, tokenB, "b");
    const userA = await pool.query("SELECT id FROM users WHERE email=$1", [accounts.a.email]);
    const userB = await pool.query("SELECT id FROM users WHERE email=$1", [accounts.b.email]);
    assert.ok(userA.rows[0]?.id && userB.rows[0]?.id, "registered users must be persisted in real PostgreSQL");
    const idA = Number(userA.rows[0].id), idB = Number(userB.rows[0].id);
    const profiles = await pool.query("SELECT user_id,public_username FROM howdi_connect_profiles WHERE user_id=ANY($1::bigint[]) ORDER BY user_id", [[idA, idB]]);
    assert.equal(profiles.rows.length, 2, "both CI accounts must complete required onboarding before browser login");
    assert.equal(profiles.rows.find((row) => Number(row.user_id) === idA)?.public_username, handleA);
    assert.equal(profiles.rows.find((row) => Number(row.user_id) === idB)?.public_username, handleB);

    const defaultsA = await request("/api/preferences/me", { token: tokenA });
    const defaultsB = await request("/api/preferences/me", { token: tokenB });
    assert.equal(defaultsA.status, 200);
    assert.equal(defaultsB.status, 200);
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
    const readA = await request("/api/preferences/me?user_id=" + idB, { token: tokenA });
    const readB = await request("/api/preferences/me?user_id=" + idA, { token: tokenB });
    assert.deepEqual(readA.json.preferences.home_preferences.dock, ["vibe", "shop", "spark", "move", "works", "learn"]);
    assert.deepEqual(readA.json.preferences.home_preferences.dockLabels, { vibe: "Videos", works: "Jobs" });
    assert.deepEqual(readB.json.preferences.home_preferences.dock, defaultDock, "A's forged IDs cannot read B state and B is unchanged");

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
    console.log("PASS PostgreSQL: clean schema, real authenticated onboarding for A/B, per-account rows, IDOR read/write denial, forged IDs ignored, logout revocation, new-login reload. A's saved custom dock is queued for restart proof.");
  } finally {
    await pool.end();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
