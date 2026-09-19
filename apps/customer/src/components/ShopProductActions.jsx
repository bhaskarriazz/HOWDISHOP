import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import "./ShopProductActions.css";

// HOWDI Shop S2 — Product actions: Wishlist, Add to Cart, Buy Now.
//  * The wishlist is session-authoritative: the browser only ever sends a product id plus the session token.
//    The server decides who the user is, stores only the product id and returns live catalogue cards.
//  * Cart lines are checked against POST /api/shop/cart/validate first, so the price, options and stock that
//    reach the cart are the server's (the same resolver pricing-quote and order creation use).
//  * Saving needs an account. If a visitor tries it, the intent is remembered, the app's login opens, and the
//    save is completed automatically as soon as the visitor is signed in (login continuation).

const PENDING_TTL_MS = 10 * 60 * 1000;

export const ShopActionsContext = createContext(null);
export const useShopActions = () => useContext(ShopActionsContext);

const money = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
};

async function callApi(url, { method = "GET", body, headers = {}, signal } = {}) {
  const response = await fetch(url, {
    method, signal,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok || !data || data.status === "error") {
    const error = new Error((data && data.message) || "Something went wrong");
    error.httpStatus = response.status;
    throw error;
  }
  return data;
}

// Ask the server whether one line can be bought right now and at what price.
async function validateLine(base, line) {
  const data = await callApi(`${base}/api/shop/cart/validate`, { method: "POST", body: { items: [line] } });
  const checked = data.lines && data.lines[0];
  if (!checked) throw new Error("We couldn't check this item. Please try again.");
  if (checked.status !== "ok") {
    const error = new Error(checked.message || "This item can't be added right now.");
    error.code = checked.status;
    throw error;
  }
  return checked;
}

export function useShopWishlistActions({ apiBase, signedIn, getAuthHeaders, onRequireLogin, onAddToCart, onBuyNow }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const [wishlist, setWishlist] = useState({ status: "idle", items: [], ids: [], unavailableCount: 0, message: "" });
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [notice, setNotice] = useState({ kind: "", text: "" });
  const pendingRef = useRef(null);
  const headersRef = useRef(getAuthHeaders);
  headersRef.current = getAuthHeaders;
  const loginRef = useRef(onRequireLogin);
  loginRef.current = onRequireLogin;

  const say = useCallback((kind, text) => setNotice({ kind, text }), []);

  const refresh = useCallback(async () => {
    setWishlist((w) => ({ ...w, status: "loading", message: "" }));
    try {
      const data = await callApi(`${base}/api/shop/wishlist`, { headers: headersRef.current ? headersRef.current() : {} });
      setWishlist({ status: "ready", items: data.items || [], ids: data.ids || [], unavailableCount: data.unavailableCount || 0, message: "" });
    } catch (error) {
      setWishlist({ status: "error", items: [], ids: [], unavailableCount: 0, message: error.message });
    }
  }, [base]);

  const setBusy = (id, on) => setBusyIds((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });

  const save = useCallback(async (productId, { announce = true } = {}) => {
    setBusy(productId, true);
    try {
      const data = await callApi(`${base}/api/shop/wishlist/${encodeURIComponent(productId)}`, { method: "PUT", headers: headersRef.current ? headersRef.current() : {} });
      setWishlist((w) => ({
        ...w, status: w.status === "idle" ? "ready" : w.status, ids: w.ids.includes(productId) ? w.ids : [productId, ...w.ids],
        items: w.items.some((i) => i.id === productId) || !data.item ? w.items : [{ ...data.item, savedAt: new Date().toISOString() }, ...w.items],
      }));
      if (announce) say("ok", "Saved to your wishlist.");
    } catch (error) {
      if (error.httpStatus === 401) { pendingRef.current = { type: "wishlist", productId, at: Date.now() }; say("info", "Please sign in again to save this product."); if (loginRef.current) loginRef.current(); }
      else say("error", error.message || "We couldn't save this product.");
    } finally { setBusy(productId, false); }
  }, [base, say]);

  const remove = useCallback(async (productId) => {
    setBusy(productId, true);
    try {
      await callApi(`${base}/api/shop/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE", headers: headersRef.current ? headersRef.current() : {} });
      setWishlist((w) => ({ ...w, ids: w.ids.filter((id) => id !== productId), items: w.items.filter((i) => i.id !== productId) }));
      say("ok", "Removed from your wishlist.");
    } catch (error) {
      if (error.httpStatus === 401) { say("info", "Please sign in again to update your wishlist."); if (loginRef.current) loginRef.current(); }
      else say("error", error.message || "We couldn't update your wishlist.");
    } finally { setBusy(productId, false); }
  }, [base, say]);

  const isSaved = useCallback((productId) => wishlist.ids.includes(String(productId)), [wishlist.ids]);

  const toggle = useCallback((productId) => {
    const id = String(productId);
    if (!signedIn) {
      pendingRef.current = { type: "wishlist", productId: id, at: Date.now() };
      say("info", "Sign in to save this product. We'll save it as soon as you're in.");
      if (loginRef.current) loginRef.current();
      return;
    }
    if (wishlist.ids.includes(id)) remove(id); else save(id);
  }, [signedIn, wishlist.ids, remove, save, say]);

  // Login continuation + sign-out handling.
  useEffect(() => {
    if (!signedIn) { setWishlist({ status: "idle", items: [], ids: [], unavailableCount: 0, message: "" }); return undefined; }
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
      const pending = pendingRef.current;
      // A remembered intent only survives a short sign-in; a stale one is dropped rather than surprising the user later.
      if (pending && pending.type === "wishlist" && Date.now() - pending.at < PENDING_TTL_MS) { pendingRef.current = null; await save(pending.productId); }
      else pendingRef.current = null;
    })();
    return () => { cancelled = true; };
  }, [signedIn, refresh, save]);

  const cartLine = useCallback(async ({ productId, variant, quantity, meta = {} }) => {
    const checked = await validateLine(base, { productId: String(productId), variantId: variant && variant.id ? String(variant.id) : null, quantity });
    return {
      productId: checked.productId, variantId: checked.variantId || null, quantity: checked.quantity, name: checked.name, image: checked.image || "",
      unitPrice: checked.unitPrice, listPrice: checked.listPrice, available: checked.available,
      colour: (variant && variant.colour) || "", size: (variant && variant.size) || "", variantLabel: checked.variantLabel || "",
      creatorName: (checked.creator && checked.creator.display_name) || "", creatorUsername: (checked.creator && checked.creator.public_username) || "",
      category: meta.category || "", subcategory: meta.subcategory || "",
    };
  }, [base]);

  const addToCart = useCallback(async (args) => { const line = await cartLine(args); if (onAddToCart) onAddToCart(line); return line; }, [cartLine, onAddToCart]);
  const buyNow = useCallback(async (args) => { const line = await cartLine(args); if (onBuyNow) onBuyNow(line); return line; }, [cartLine, onBuyNow]);

  return { signedIn, wishlist, refresh, requestLogin: () => { if (loginRef.current) loginRef.current(); }, isSaved, isBusy: (id) => busyIds.has(String(id)), toggle, remove, notice, clearNotice: () => setNotice({ kind: "", text: "" }), addToCart, buyNow };
}

export function WishlistHeart({ productId, name, className = "" }) {
  const actions = useShopActions();
  if (!actions) return null;
  const saved = actions.isSaved(productId);
  const busy = actions.isBusy(productId);
  return (
    <button
      type="button"
      className={`sc-heart ${saved ? "sc-heart-on" : ""} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      disabled={busy}
      onClick={() => actions.toggle(productId)}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
    </button>
  );
}

export function ActionNotice() {
  const actions = useShopActions();
  if (!actions || !actions.notice.text) return null;
  const { kind, text } = actions.notice;
  return (
    <p className={`sc-action-notice sc-action-${kind || "info"}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}>
      <span>{text}</span>
      <button type="button" className="sc-link" onClick={actions.clearNotice} aria-label="Dismiss message">Dismiss</button>
    </p>
  );
}

// Add to cart / Buy now / Save, for the product being viewed.
export function ProductActions({ product, selectedVariant, needsChoice, availability }) {
  const actions = useShopActions();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState({ kind: "", text: "" });
  useEffect(() => { setQuantity(1); setMessage({ kind: "", text: "" }); }, [product.id, selectedVariant && selectedVariant.id]);
  if (!actions) return null;

  const soldOut = availability && availability.state === "out_of_stock";
  const disabled = Boolean(busy) || needsChoice || soldOut;
  const reason = needsChoice ? "Choose an option to continue" : soldOut ? "Currently out of stock" : "";

  const run = async (kind) => {
    setBusy(kind); setMessage({ kind: "", text: "" });
    try {
      const args = { productId: product.id, variant: selectedVariant, quantity, meta: { category: product.category, subcategory: product.subcategory } };
      const line = kind === "buy" ? await actions.buyNow(args) : await actions.addToCart(args);
      if (kind === "cart") setMessage({ kind: "ok", text: `Added ${line.quantity} × ${line.name} to your cart (${money(line.unitPrice)} each).` });
    } catch (error) {
      setMessage({ kind: "error", text: error.message || "We couldn't add this item." });
    } finally { setBusy(""); }
  };

  return (
    <div className="sc-actions" aria-label="Purchase options">
      <div className="sc-qty" role="group" aria-label="Quantity">
        <button type="button" className="sc-qty-btn" aria-label="Decrease quantity" disabled={quantity <= 1 || Boolean(busy)} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
        <output aria-live="polite" aria-label="Selected quantity">{quantity}</output>
        <button type="button" className="sc-qty-btn" aria-label="Increase quantity" disabled={quantity >= 10 || Boolean(busy)} onClick={() => setQuantity((q) => Math.min(10, q + 1))}>+</button>
      </div>
      <div className="sc-action-row">
        <button type="button" className="sc-btn sc-btn-primary" disabled={disabled} aria-describedby={reason ? "sc-action-reason" : undefined} onClick={() => run("cart")}>{busy === "cart" ? "Adding…" : "Add to cart"}</button>
        <button type="button" className="sc-btn sc-btn-gold" disabled={disabled} aria-describedby={reason ? "sc-action-reason" : undefined} onClick={() => run("buy")}>{busy === "buy" ? "Please wait…" : "Buy now"}</button>
        <WishlistHeart productId={product.id} name={product.name} className="sc-heart-large" />
      </div>
      {reason ? <p id="sc-action-reason" className="sc-note">{reason}</p> : null}
      {message.text ? <p className={`sc-action-notice sc-action-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
    </div>
  );
}

export function WishlistPanel({ onBack, renderCard, onBrowse }) {
  const actions = useShopActions();
  if (!actions) return null;
  const { wishlist, signedIn } = actions;
  return (
    <section className="sc-wishlist" aria-labelledby="sc-wishlist-title">
      <div className="sc-wishlist-head">
        <button type="button" className="sc-btn sc-btn-ghost" onClick={onBack}>← Back to products</button>
        <h2 id="sc-wishlist-title" className="sc-title">Your wishlist</h2>
      </div>
      <ActionNotice />
      {!signedIn ? (
        <div className="sc-state sc-state-empty" role="status">
          <h3>Sign in to see your wishlist</h3>
          <p>Saved products follow you across your devices.</p>
          <button type="button" className="sc-btn sc-btn-primary" onClick={actions.requestLogin}>Sign in</button>
        </div>
      ) : null}
      {signedIn && wishlist.status === "loading" ? <p className="sc-note" role="status">Loading your wishlist…</p> : null}
      {signedIn && wishlist.status === "error" ? (
        <div className="sc-state sc-state-error" role="alert"><h3>We couldn't load your wishlist</h3><p>{wishlist.message}</p><button type="button" className="sc-btn" onClick={actions.refresh}>Try again</button></div>
      ) : null}
      {signedIn && wishlist.status === "ready" && !wishlist.items.length ? (
        <div className="sc-state sc-state-empty" role="status"><h3>Nothing saved yet</h3><p>Tap the heart on any product to keep it here.</p><button type="button" className="sc-btn sc-btn-primary" onClick={onBrowse || onBack}>Browse products</button></div>
      ) : null}
      {signedIn && wishlist.status === "ready" && wishlist.unavailableCount > 0 ? (
        <p className="sc-note" role="status">{wishlist.unavailableCount} saved {wishlist.unavailableCount === 1 ? "item is" : "items are"} no longer available.</p>
      ) : null}
      {signedIn && wishlist.status === "ready" && wishlist.items.length ? <ul className="sc-grid">{wishlist.items.map((p) => renderCard(p))}</ul> : null}
    </section>
  );
}
