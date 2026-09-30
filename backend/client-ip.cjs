'use strict';
// =====================================================================================
// HOWDI — client IP resolution for rate-limit keys (shared by K5A Connect Home and K5B Global Search).
//
// Trust boundary:
//   - By default NOTHING the client sends is trusted: X-Forwarded-For, Forwarded, X-Real-IP, X-Client-IP,
//     True-Client-IP, CF-Connecting-IP, … are ignored and the key is the direct TCP peer (req.socket.remoteAddress).
//   - Forwarded addresses are honoured ONLY when the immediate peer is an explicitly configured trusted proxy
//     (HOWDI_TRUSTED_PROXIES = comma-separated IPs and/or CIDRs, IPv4 or IPv6). Then X-Forwarded-For is walked from the
//     RIGHT, skipping hops that are themselves trusted proxies; the first untrusted hop is the client. Entries to the left
//     of it (which the client controls) are never used. Any malformed hop stops the walk and the last trusted address is
//     used instead, so garbage can never mint a fresh key.
//   - Only X-Forwarded-For is read, and only in that case. `Forwarded` / `X-Real-IP` etc. are never read.
//   - A header being present is never a reason to trust it.
// =====================================================================================
const net = require('node:net');

function normaliseIp(value) {
  let v = String(value ?? '').trim();
  if (!v) return null;
  if (v.startsWith('[') && v.includes(']')) v = v.slice(1, v.indexOf(']'));             // [v6]:port
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d{1,5}$/.test(v)) v = v.slice(0, v.lastIndexOf(':')); // v4:port
  const pct = v.indexOf('%'); if (pct > 0) v = v.slice(0, pct);                           // zone id
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) v = mapped[1];
  const kind = net.isIP(v);
  if (!kind) return null;
  return kind === 6 ? v.toLowerCase() : v;
}

// BlockList does exact + CIDR matching for both families without hand-written bit maths.
function parseTrustedProxies(spec, logger = console) {
  const list = new net.BlockList();
  const accepted = [], rejected = [];
  for (const raw of String(spec || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [addr, bits, extra] = raw.split('/');
    const ip = normaliseIp(addr);
    if (!ip || extra !== undefined) { rejected.push(raw); continue; }
    const family = net.isIP(ip) === 6 ? 'ipv6' : 'ipv4';
    if (bits === undefined) { list.addAddress(ip, family); accepted.push(ip); continue; }
    const n = Number(bits), max = family === 'ipv6' ? 128 : 32;
    if (!/^\d{1,3}$/.test(bits) || n < 0 || n > max) { rejected.push(raw); continue; }
    list.addSubnet(ip, n, family); accepted.push(`${ip}/${n}`);
  }
  if (rejected.length && logger) logger.warn(`[HOWDI client-ip] ignoring invalid HOWDI_TRUSTED_PROXIES entries: ${rejected.join(', ')}`);
  return { list, accepted, rejected };
}

function createClientIpResolver({ trustedProxies = process.env.HOWDI_TRUSTED_PROXIES, logger = console } = {}) {
  const { list, accepted } = parseTrustedProxies(trustedProxies, logger);
  const isTrusted = (ip) => !!ip && accepted.length > 0 && list.check(ip, net.isIP(ip) === 6 ? 'ipv6' : 'ipv4');

  function clientIp(req) {
    const peer = normaliseIp(req && req.socket && req.socket.remoteAddress);
    if (!peer) return 'unknown';
    if (!isTrusted(peer)) return peer;                                   // untrusted peer: never read any forwarded header
    const raw = req.headers ? req.headers['x-forwarded-for'] : undefined;
    const hops = (Array.isArray(raw) ? raw.join(',') : String(raw || '')).split(',').map((s) => s.trim()).filter((s) => s !== '');
    let current = peer;                                                  // last address we have reason to believe
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = normaliseIp(hops[i]);
      if (!hop) return current;                                          // malformed hop: stop, keep the trusted address
      if (!isTrusted(hop)) return hop;                                   // first untrusted hop from the right = client
      current = hop;
    }
    return current;                                                      // every hop was a trusted proxy
  }
  return { clientIp, isTrusted, trusted: accepted.slice() };
}

module.exports = { createClientIpResolver, parseTrustedProxies, normaliseIp };
