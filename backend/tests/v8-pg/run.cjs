#!/usr/bin/env node
// V8 real-PostgreSQL runner. V8_PG_URL supplies a disposable server (role needs CREATEDB); nothing in that database is touched.
//   V8_PG_URL=postgresql://postgres@127.0.0.1:5440/postgres node backend/tests/v8-pg/run.cjs
// Each suite runs twice on fresh scratch databases: once on "<name>_preview" with the sandbox (outbox ON) and once on an ordinary
// name with the same HOWDI_PREVIEW_SANDBOX=1 flag (outbox must stay OFF).
const { Pool } = require('pg'); const { spawnSync } = require('node:child_process'); const fs = require('node:fs'); const path = require('node:path');
const base = process.env.V8_PG_URL; if (!base) { console.error('V8_PG_URL is required'); process.exit(2); }
const withDb = (n) => { const u = new URL(base); u.pathname = '/' + n; return u.toString(); };
(async () => {
  const admin = new Pool({ connectionString: withDb('postgres') }); let failed = 0;
  for (const f of fs.readdirSync(__dirname).filter((x) => /^\d\d-.*\.cjs$/.test(x)).sort()) {
    for (const sandbox of [true, false]) {
      const db = `howdi_v8_${f.slice(0, 2)}_${process.pid}_${Date.now().toString(36)}${sandbox ? '_preview' : '_scratch'}`;
      await admin.query(`CREATE DATABASE "${db}"`);
      try {
        const r = spawnSync(process.execPath, [path.join(__dirname, f)], { env: { ...process.env, WORKER_PG_URL: withDb(db), HOWDI_PREVIEW_SANDBOX: '1', V8_EXPECT_SANDBOX: sandbox ? '1' : '0', HOWDI_ALLOWED_ORIGINS: 'http://127.0.0.1:5178,http://localhost:5178', HOWDI_PUBLIC_APP_URL: '', HOWDI_TRUSTED_PROXIES: '' }, encoding: 'utf8', timeout: 300000 });
        process.stdout.write(r.stdout.split('\n').filter((l) => /FAIL|passed/.test(l)).join('\n') + '\n');
        console.log(`${r.status === 0 ? 'PASS' : 'FAIL'}  ${f} [${sandbox ? 'sandbox' : 'no-sandbox'}]`); if (r.status !== 0) failed++;
      } finally { await admin.query(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`); }
    }
  }
  await admin.end(); process.exit(failed ? 1 : 0);
})();
