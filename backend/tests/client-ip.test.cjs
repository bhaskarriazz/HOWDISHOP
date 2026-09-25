// Rate-limit client identity (./client-ip.cjs) — shared by K5A Connect Home and K5B Global Search.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createClientIpResolver, parseTrustedProxies, normaliseIp } = require('../client-ip.cjs');

const quiet = { warn() {} };
const req = (peer, headers = {}) => ({ socket: { remoteAddress: peer }, headers });
const SPOOF_HEADERS = {
  'x-forwarded-for': '203.0.113.9', forwarded: 'for=203.0.113.9;proto=https', 'x-real-ip': '203.0.113.9', 'x-client-ip': '203.0.113.9',
  'true-client-ip': '203.0.113.9', 'cf-connecting-ip': '203.0.113.9', 'x-cluster-client-ip': '203.0.113.9', 'fastly-client-ip': '203.0.113.9', 'x-original-forwarded-for': '203.0.113.9',
};

test('default (no trusted proxies): every forwarded/client-IP header is ignored; the key is the direct peer', () => {
  const { clientIp, trusted } = createClientIpResolver({ trustedProxies: '', logger: quiet });
  assert.deepEqual(trusted, []);
  assert.equal(clientIp(req('198.51.100.7', SPOOF_HEADERS)), '198.51.100.7');
  for (const [k, v] of Object.entries(SPOOF_HEADERS)) assert.equal(clientIp(req('198.51.100.7', { [k]: v })), '198.51.100.7', k);
  assert.equal(clientIp(req('127.0.0.1', { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '127.0.0.1', 'loopback is not implicitly trusted');
  assert.equal(clientIp(req('::ffff:198.51.100.7', SPOOF_HEADERS)), '198.51.100.7', 'IPv4-mapped IPv6 peer is normalised');
  assert.equal(clientIp(req('2001:DB8::1', SPOOF_HEADERS)), '2001:db8::1');
  assert.equal(clientIp(req(undefined, SPOOF_HEADERS)), 'unknown', 'no socket address → one shared key, never a header value');
  assert.equal(clientIp({ headers: SPOOF_HEADERS }), 'unknown');
});

test('the env var is the only source of trust (unset → nothing trusted)', () => {
  const saved = process.env.HOWDI_TRUSTED_PROXIES; delete process.env.HOWDI_TRUSTED_PROXIES;
  try { assert.equal(createClientIpResolver({ logger: quiet }).clientIp(req('10.0.0.5', { 'x-forwarded-for': '203.0.113.9' })), '10.0.0.5'); }
  finally { if (saved !== undefined) process.env.HOWDI_TRUSTED_PROXIES = saved; }
});

test('trusted proxy: the right-most untrusted X-Forwarded-For hop is the client; client-controlled left entries are ignored', () => {
  const { clientIp } = createClientIpResolver({ trustedProxies: '10.0.0.5', logger: quiet });
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '203.0.113.9' })), '203.0.113.9');
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '6.6.6.6, 7.7.7.7, 203.0.113.9' })), '203.0.113.9', 'spoofed left entries never win');
  assert.equal(clientIp(req('10.0.0.5', {})), '10.0.0.5', 'no header → the proxy itself');
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '' })), '10.0.0.5');
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': ['6.6.6.6', '203.0.113.9'] })), '203.0.113.9', 'repeated header lines are joined in order');
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '[2001:db8::9]:443' })), '2001:db8::9');
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '203.0.113.9:5555' })), '203.0.113.9');
});

test('trusted proxy: other forwarded headers are still never read', () => {
  const { clientIp } = createClientIpResolver({ trustedProxies: '10.0.0.5', logger: quiet });
  for (const k of Object.keys(SPOOF_HEADERS).filter((k) => k !== 'x-forwarded-for')) assert.equal(clientIp(req('10.0.0.5', { [k]: '203.0.113.9' })), '10.0.0.5', k);
});

test('trusted proxy chain and CIDRs: trusted hops are skipped from the right', () => {
  const { clientIp } = createClientIpResolver({ trustedProxies: '10.0.0.0/8, 172.16.0.1, fd00::/8', logger: quiet });
  assert.equal(clientIp(req('10.1.2.3', { 'x-forwarded-for': '203.0.113.9, 172.16.0.1, 10.9.9.9' })), '203.0.113.9');
  assert.equal(clientIp(req('fd00::1', { 'x-forwarded-for': '2001:db8::77, fd12::2' })), '2001:db8::77');
  assert.equal(clientIp(req('10.1.2.3', { 'x-forwarded-for': '10.2.2.2, 10.3.3.3' })), '10.2.2.2', 'all hops trusted → the left-most trusted hop reached');
  assert.equal(clientIp(req('11.0.0.1', { 'x-forwarded-for': '203.0.113.9' })), '11.0.0.1', 'peer outside the CIDR is not trusted');
});

test('trusted proxy: a malformed hop stops the walk at the last trusted address (garbage never mints a key)', () => {
  const { clientIp } = createClientIpResolver({ trustedProxies: '10.0.0.5', logger: quiet });
  for (const bad of ['unknown', 'garbage', '999.1.1.1', '1.2.3', '<script>', 'for=1.2.3.4', '1.2.3.4/24', "' OR 1=1", 'x'.repeat(5000)]) {
    assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': bad })), '10.0.0.5', bad.slice(0, 20));
    assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': '203.0.113.9, ' + bad })), '10.0.0.5', 'malformed right-most hop: ' + bad.slice(0, 20));
  }
  assert.equal(clientIp(req('10.0.0.5', { 'x-forwarded-for': 'garbage, 203.0.113.9' })), '203.0.113.9', 'garbage to the left of the client is irrelevant');
});

test('configuration parsing: exact IPs, CIDRs, v4/v6/mapped; invalid entries are rejected (fail closed) and logged', () => {
  const warns = [];
  const p = parseTrustedProxies('10.0.0.5, 192.168.0.0/16, ::1, ::ffff:10.9.9.9, 2001:db8::/32, bogus, 10.0.0.0/33, 1.2.3.4/x, /8, 10.0.0.1/8/9', { warn: (m) => warns.push(m) });
  assert.deepEqual(p.accepted, ['10.0.0.5', '192.168.0.0/16', '::1', '10.9.9.9', '2001:db8::/32']);
  assert.deepEqual(p.rejected, ['bogus', '10.0.0.0/33', '1.2.3.4/x', '/8', '10.0.0.1/8/9']);
  assert.equal(warns.length, 1);
  const { isTrusted } = createClientIpResolver({ trustedProxies: 'bogus', logger: quiet });
  assert.equal(isTrusted('127.0.0.1'), false, 'a fully invalid config trusts nothing');
});

test('normaliseIp', () => {
  assert.equal(normaliseIp('::FFFF:1.2.3.4'), '1.2.3.4');
  assert.equal(normaliseIp('fe80::1%eth0'), 'fe80::1');
  assert.equal(normaliseIp('[::1]:80'), '::1');
  assert.equal(normaliseIp('1.2.3.4:80'), '1.2.3.4');
  for (const bad of ['', null, undefined, 'localhost', '1.2.3.256', ' ']) assert.equal(normaliseIp(bad), null, String(bad));
});

test('wiring: K5A and K5B limiter keys use the trust-aware resolver; the legacy getRequestIp is untouched', () => {
  const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.match(src, /const howdiRateLimitClientIp = require\("\.\/client-ip\.cjs"\)\.createClientIpResolver\(\{ trustedProxies: process\.env\.HOWDI_TRUSTED_PROXIES \}\)\.clientIp;/);
  const k5a = src.slice(src.indexOf('createConnectHomeK5A({'), src.indexOf('createConnectHomeK5A({') + 300);
  const k5b = src.slice(src.indexOf('createSearchK5B({'), src.indexOf('createSearchK5B({') + 300);
  assert.match(k5a, /getRequestIp: howdiRateLimitClientIp/); assert.match(k5b, /getRequestIp: howdiRateLimitClientIp/);
  assert.match(src, /function getRequestIp\(req\) \{\n\s+const forwarded = String\(req\.headers\["x-forwarded-for"\] \|\| ""\)\.split\(","\)\[0\]\.trim\(\);/, 'legacy audit helper unchanged (out of scope)');
});
