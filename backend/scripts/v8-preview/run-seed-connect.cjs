#!/usr/bin/env node
// Preview/Test only: seeds the V8 Connect demo (Vibes, Stories, Live, Spaces, Communities) into a *_preview database.
//   node backend/scripts/v8-preview/run-seed-connect.cjs <pgUrl ending _preview> <vibesDir> <photosDir>
const path = require('path');
const { Client } = require('pg');
const [url, vibeSrc, photoSrc] = process.argv.slice(2);
if (!url || !/_preview(\?|$)/.test(new URL(url).pathname + (new URL(url).search || ''))) { console.error('Refusing: database name must end with _preview'); process.exit(2); }
(async () => {
  const db = new Client({ connectionString: url }); await db.connect();
  const mediaDir = process.env.VIBE_MEDIA_DIR || path.join(__dirname, '..', '..', 'data', 'vibe_media_public');
  console.log(await require('./seed-connect.cjs').seedConnect(db, { mediaDir, vibeSrc, photoSrc }));
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
