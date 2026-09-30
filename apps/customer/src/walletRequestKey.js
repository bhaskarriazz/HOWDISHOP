// HPay production hardening — one request key per wallet action attempt. A double-click or a retry after a network error
// re-sends the same key (the server applies the action once); a new amount or a completed action starts a new key.
// Keys match the server rule: 8–80 of [A-Za-z0-9._:-].
export function newWalletRequestKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return `w-${c.randomUUID()}`;
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createWalletRequestKeys() {
  let pending = null; // { op, amount, key }
  return {
    keyFor(op, amount) {
      if (!pending || pending.op !== op || pending.amount !== amount) pending = { op, amount, key: newWalletRequestKey() };
      return pending.key;
    },
    done() { pending = null; },
  };
}
