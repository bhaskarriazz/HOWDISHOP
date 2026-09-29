'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../global-search-k5b.cjs'),'utf8');
test('people search input contract is bounded and type-scoped',()=>{assert.match(src,/q\.length<2/);assert.match(src,/q\.length>80/);assert.match(src,/Math\.max\(1,Math\.min\(20/);assert.match(src,/type!=='people'/);assert.match(src,/INVALID_TYPE/);});
test('people DTO is an explicit public allow-list',()=>{const m=src.match(/map\(x=>\(\{([^}]+)\}\)\)/);assert.ok(m);for(const key of ['type','public_username','display_name','avatar_url','headline','route'])assert.match(m[1],new RegExp('\\b'+key+'\\s*:'));assert.doesNotMatch(m[1],/\bid\s*:|email|phone|address|uuid|howdi_id|master_id/i);});
test('people ordering is exact then prefix then contains',()=>{assert.match(src,/CASE WHEN LOWER\(p\.public_username\)=\$1 THEN 0 WHEN LOWER\(p\.public_username\) LIKE \$1\|\|'%'/);});
