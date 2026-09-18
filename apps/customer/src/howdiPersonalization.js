const STORAGE_KEY = "howdi_taste_events_v1";
const RECENT_KEY = "howdi_recently_viewed_v1";

function safeRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function pid(p) {
  return String(p?.id ?? p?.product_id ?? p?._id ?? p?.name ?? "");
}

function normalize(v) {
  return String(v ?? "").trim().toLowerCase();
}

export function recordTasteEvent(event = {}) {
  const events = safeRead(STORAGE_KEY, []);
  events.unshift({ ...event, at: Date.now() });
  safeWrite(STORAGE_KEY, events.slice(0, 500));
}

export function rememberRecentlyViewed(product, customerId = "") {
  if (!product) return;
  const key = customerId ? `${RECENT_KEY}:${customerId}` : RECENT_KEY;
  const list = safeRead(key, []);
  const id = pid(product);
  const next = [product, ...list.filter((x) => pid(x) !== id)].slice(0, 24);
  safeWrite(key, next);
}

function scoreProduct(product, ctx = {}) {
  const events = safeRead(STORAGE_KEY, []);
  const productId = pid(product);
  let score = 0;
  for (const e of events) {
    if (ctx.customerId && e.customerId && String(e.customerId) !== String(ctx.customerId)) continue;
    if (String(e.productId ?? "") === productId) {
      score += e.type === "purchase" ? 8 : e.type === "cart" ? 5 : e.type === "wishlist" ? 4 : 2;
    }
    const hay = normalize([product?.name, product?.category, product?.subcategory, product?.tags].flat().join(" "));
    const sig = normalize([e.category, e.subcategory, e.tags].flat().join(" "));
    if (sig && hay.includes(sig)) score += 1;
  }
  return score;
}

export function getPersonalizedProducts(products = [], ctx = {}) {
  return [...products].sort((a, b) => scoreProduct(b, ctx) - scoreProduct(a, ctx));
}

export function getCartRecommendations(cart = [], products = [], ctx = {}) {
  const inCart = new Set(cart.map(pid));
  return getPersonalizedProducts(products.filter((p) => !inCart.has(pid(p))), ctx).slice(0, 8);
}

export function getWishlistRecommendations(wishlist = [], products = [], ctx = {}) {
  const saved = new Set(wishlist.map(pid));
  return getPersonalizedProducts(products.filter((p) => !saved.has(pid(p))), ctx).slice(0, 8);
}

export function getPersonalizedOffers(products = [], ctx = {}) {
  return getPersonalizedProducts(products, ctx).slice(0, 6);
}

export function getTasteSummary({ customerId } = {}) {
  const events = safeRead(STORAGE_KEY, []).filter(
    (e) => !customerId || !e.customerId || String(e.customerId) === String(customerId)
  );
  if (!events.length) return "Explore HOWDI and your recommendations will become more personal.";
  const counts = events.reduce((a, e) => {
    a[e.type || "view"] = (a[e.type || "view"] || 0) + 1;
    return a;
  }, {});
  const parts = [];
  if (counts.view) parts.push(`${counts.view} views`);
  if (counts.wishlist) parts.push(`${counts.wishlist} saved`);
  if (counts.cart) parts.push(`${counts.cart} cart signals`);
  if (counts.purchase) parts.push(`${counts.purchase} purchases`);
  return `Personalised from your HOWDI activity: ${parts.join(", ")}.`;
}
