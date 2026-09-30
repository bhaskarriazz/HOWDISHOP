#!/usr/bin/env node
// Preview/Test only: seeds the V8 Slice 2 Connect closures demo into a *_preview database (run after run-seed-connect).
//   node backend/scripts/v8-preview/run-seed-closures.cjs <pgUrl ending _preview>
const { Client } = require('pg');
const [url] = process.argv.slice(2);
if (!url || !/_preview(\?|$)/.test(new URL(url).pathname + (new URL(url).search || ''))) { console.error('Refusing: database name must end with _preview'); process.exit(2); }
(async () => {
  const db = new Client({ connectionString: url }); await db.connect();
  console.log(await require('./seed-closures.cjs').seedClosures(db));
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
