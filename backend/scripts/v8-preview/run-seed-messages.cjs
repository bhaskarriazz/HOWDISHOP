#!/usr/bin/env node
// Preview/Test only: seeds the V8 Messages Part B demo into a *_preview database (run after run-seed-closures).
//   node backend/scripts/v8-preview/run-seed-messages.cjs <pgUrl ending _preview> [folder with the demo product photos]
// Product photos are copied into the server's V8 media folder (backend/data/vibe_media_public/v8) when a folder is given.
const { Client } = require('pg'); const fs = require('node:fs'); const path = require('node:path');
const [url, photos] = process.argv.slice(2);
if (!url || !/_preview(\?|$)/.test(new URL(url).pathname + (new URL(url).search || ''))) { console.error('Refusing: database name must end with _preview'); process.exit(2); }
(async () => {
  const { seedMessages, IMAGE_FILES } = require('./seed-messages.cjs');
  if (photos) {
    const dest = path.join(__dirname, '..', '..', 'data', 'vibe_media_public', 'v8'); fs.mkdirSync(dest, { recursive: true });
    for (const f of IMAGE_FILES) { const src = path.join(photos, f); if (fs.existsSync(src) && !fs.existsSync(path.join(dest, f))) fs.copyFileSync(src, path.join(dest, f)); }
  }
  const db = new Client({ connectionString: url }); await db.connect();
  console.log(await seedMessages(db));
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
