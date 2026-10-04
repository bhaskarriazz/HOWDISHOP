import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const path=process.env.C1_V8_SOURCE || new URL('../src/v8/V8Shell.jsx',import.meta.url);
const source=readFileSync(path,'utf8');
const preferenceSource=readFileSync(new URL('../src/v8/V8Personalization.jsx',import.meta.url),'utf8');
test('V8 bottom bar renders Spark with its canonical name regardless of personalLabel',()=>{
  assert.match(source,/p\.area === "spark" \? "Spark" : p\.personalLabel \|\| p\.label/);
});
test('V8 bottom bar forwards the canonical area key, never the personal label',()=>{
  assert.match(source,/onNavigate\(p\.area\)/);
  assert.doesNotMatch(source,/onNavigate\(p\.personalLabel/);
});
test('account scope changes synchronously discard the prior in-memory dock before rendering',()=>{
  assert.match(preferenceSource,/if\s*\(state\.scope\s*!==\s*scope\)\s*setState\(\{\s*scope,\s*prefs:\s*cleanV8HomePrefs\(null\)\s*\}\)/);
  assert.match(preferenceSource,/state\.scope\s*===\s*scope\s*\?\s*state\.prefs\s*:\s*cleanV8HomePrefs\(null\)/);
});
