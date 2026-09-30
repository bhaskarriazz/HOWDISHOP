import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ShopCatalogue.css";
import { ShopActionsContext, useShopWishlistActions, WishlistHeart, ActionNotice, ProductActions, WishlistPanel } from "./ShopProductActions";

// HOWDI Shop S1 — Catalogue & Product Discovery.
// Browse / search / filter / sort published products and open a product detail.
// Read-only: no cart, wishlist, coupon, checkout or payment behaviour lives here (later batches).
// Data comes only from the public /api/shop/catalogue/* endpoints. There is deliberately no demo-product fallback:
// when the API fails the user sees an error state with a retry, and an empty catalogue shows an empty state.

const PAGE_SIZE = 24;
const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["relevance", "Relevance"],
];
const EMPTY_FILTERS = {
  q: "", category: "", subcategory: "", colour: "", material: "", creator: "",
  minPrice: "", maxPrice: "", inStock: false, sort: "newest",
};

const money = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
};

function buildQuery(filters, offset) {
  const p = new URLSearchParams();
  for (const key of ["q", "category", "subcategory", "colour", "material", "creator", "minPrice", "maxPrice"]) {
    const value = String(filters[key] ?? "").trim();
    if (value) p.set(key, value);
  }
  if (filters.inStock) p.set("inStock", "true");
  // Relevance only makes sense with a search term; the API rejects it otherwise.
  const sort = filters.sort === "relevance" && !String(filters.q).trim() ? "newest" : filters.sort;
  if (sort) p.set("sort", sort);
  p.set("limit", String(PAGE_SIZE));
  if (offset) p.set("offset", String(offset));
  return p.toString();
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || !body || body.status === "error") {
    const error = new Error((body && body.message) || "Something went wrong");
    error.httpStatus = response.status;
    throw error;
  }
  return body;
}

function ProductImage({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <div className={`sc-img sc-img-empty ${className}`} role="img" aria-label={alt ? `${alt} (no image)` : "No image"}>No image</div>;
  return <img className={`sc-img ${className}`} src={src} alt={alt || ""} loading="lazy" onError={() => setBroken(true)} />;
}

function V8ProductImg({ src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return src && !broken ? <img className="v8-pcard-img" src={src} alt="" loading="lazy" onError={() => setBroken(true)} /> : <div className="v8-pcard-img v8-noimg">No photo yet</div>;
}

function Price({ price, large = false }) {
  if (!price) return null;
  return (
    <p className={`sc-price ${large ? "sc-price-large" : ""}`}>
      <strong>{money(price.current)}</strong>
      {price.onSale && price.original ? (
        <>
          <s aria-label={`Original price ${money(price.original)}`}>{money(price.original)}</s>
          {price.discountPercent ? <span className="sc-sale-badge">{price.discountPercent}% off</span> : null}
        </>
      ) : null}
    </p>
  );
}

function Availability({ availability }) {
  if (!availability) return null;
  return <span className={`sc-stock sc-stock-${availability.state}`}>{availability.label}</span>;
}

function Reviews({ reviews }) {
  // Only real review data is ever shown; the API sends "No reviews yet" when no source exists.
  if (reviews && reviews.count > 0 && reviews.average != null) {
    return <span className="sc-reviews">★ {Number(reviews.average).toFixed(1)} ({reviews.count})</span>;
  }
  return <span className="sc-reviews sc-reviews-none">{(reviews && reviews.label) || "No reviews yet"}</span>;
}

function CreatorLine({ creator, onOpen }) {
  if (!creator) return null;
  const name = creator.display_name || (creator.public_username ? `@${creator.public_username}` : "");
  if (!name) return null;
  return (
    <span className="sc-creator">
      {creator.avatar ? <img className="sc-avatar" src={creator.avatar} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}
      {creator.public_username && onOpen ? (
        <button type="button" className="sc-link" onClick={() => onOpen(creator.public_username)} aria-label={`Show all products by ${name}`}>{name}</button>
      ) : <span>{name}</span>}
      {creator.public_username ? <span className="sc-handle">@{creator.public_username}</span> : null}
    </span>
  );
}

function ProductCard({ product, onOpen, onCreator }) {
  return (
    <li className="sc-card-item">
      <article className="sc-card" data-product-id={product.id}>
        <button type="button" className="sc-card-open" data-card-id={product.id} onClick={() => onOpen(product.id)} aria-label={`View ${product.name}, ${money(product.price.current)}, ${product.availability.label}`}>
          <ProductImage src={product.image} alt={product.name} />
          <span className="sc-card-body">
            <span className="sc-card-title">{product.name}</span>
            <Price price={product.price} />
            <span className="sc-card-meta">
              <Availability availability={product.availability} />
              <Reviews reviews={product.reviews} />
            </span>
          </span>
        </button>
        <div className="sc-card-foot"><CreatorLine creator={product.creator} onOpen={onCreator} /><WishlistHeart productId={product.id} name={product.name} /></div>
      </article>
    </li>
  );
}

function GridSkeleton() {
  return (
    <div className="sc-status" role="status" aria-live="polite" aria-busy="true">
      <span className="sc-sr">Loading products…</span>
      <ul className="sc-grid" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => <li key={i} className="sc-card-item"><div className="sc-card sc-skeleton"><div className="sc-img" /><div className="sc-skel-line" /><div className="sc-skel-line sc-skel-short" /></div></li>)}
      </ul>
    </div>
  );
}

function StateBox({ kind, title, message, actionLabel, onAction }) {
  return (
    <div className={`sc-state sc-state-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {onAction ? <button type="button" className="sc-btn" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

function ProductDetail({ apiBase, productId, onBack, onOpenRelated, onCreator }) {
  const [state, setState] = useState({ status: "loading", product: null, message: "" });
  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [confirmed, setConfirmed] = useState({ id: "", status: "idle", selection: null });
  const [reloadKey, setReloadKey] = useState(0);
  const headingRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", product: null, message: "" });
    setColour(""); setSize(""); setImageIndex(0); setConfirmed({ id: "", status: "idle", selection: null });
    fetchJson(`${apiBase}/api/shop/catalogue/products/${encodeURIComponent(productId)}`, controller.signal)
      .then((body) => {
        const product = body.product;
        setState({ status: "ready", product, message: "" });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ status: error.httpStatus === 404 ? "notfound" : "error", product: null, message: error.message });
      });
    return () => controller.abort();
  }, [apiBase, productId, reloadKey]);

  useEffect(() => { if (state.status === "ready") headingRef.current?.focus(); }, [state.status, productId]);

  const product = state.product;
  const variants = useMemo(() => (product && Array.isArray(product.variants) ? product.variants : []), [product]);
  const colours = useMemo(() => [...new Set(variants.map((v) => v.colour).filter(Boolean))], [variants]);
  // A dimension with a single possible value is selected for the shopper.
  const activeColour = colour || (colours.length === 1 ? colours[0] : "");
  const sizesForColour = useMemo(() => [...new Set(variants.filter((v) => !activeColour || !v.colour || v.colour === activeColour).map((v) => v.size).filter(Boolean))], [variants, activeColour]);
  const activeSize = size || (sizesForColour.length === 1 ? sizesForColour[0] : "");
  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    if (colours.length && !activeColour) return null;
    const needsSize = variants.some((v) => v.size);
    if (needsSize && !activeSize) return null;
    return variants.find((v) => (!colours.length || v.colour === activeColour) && (!needsSize || v.size === activeSize)) || null;
  }, [variants, colours, activeColour, activeSize]);

  // Ask the server to validate the chosen variant; it is authoritative for stock.
  useEffect(() => {
    if (!selectedVariant) { setConfirmed({ id: "", status: "idle", selection: null }); return undefined; }
    const controller = new AbortController();
    setConfirmed({ id: selectedVariant.id, status: "loading", selection: null });
    fetchJson(`${apiBase}/api/shop/catalogue/products/${encodeURIComponent(productId)}?variant=${encodeURIComponent(selectedVariant.id)}`, controller.signal)
      .then((body) => setConfirmed({ id: selectedVariant.id, status: "ok", selection: body.product && body.product.selection }))
      .catch((error) => { if (error.name !== "AbortError") setConfirmed({ id: selectedVariant.id, status: error.httpStatus === 404 ? "gone" : "error", selection: null }); });
    return () => controller.abort();
  }, [apiBase, productId, selectedVariant]);

  const onKeyDown = (event) => { if (event.key === "Escape") { event.stopPropagation(); onBack(); } };

  if (state.status === "loading") return <div className="sc-detail" onKeyDown={onKeyDown}><button type="button" className="sc-btn sc-btn-ghost" onClick={onBack}>← Back to products</button><GridSkeleton /></div>;
  if (state.status === "notfound") return <div className="sc-detail" onKeyDown={onKeyDown}><button type="button" className="sc-btn sc-btn-ghost" onClick={onBack}>← Back to products</button><StateBox kind="empty" title="This product isn't available" message="It may have been removed or is not currently listed." actionLabel="Browse products" onAction={onBack} /></div>;
  if (state.status === "error") return <div className="sc-detail" onKeyDown={onKeyDown}><button type="button" className="sc-btn sc-btn-ghost" onClick={onBack}>← Back to products</button><StateBox kind="error" title="We couldn't load this product" message={state.message} actionLabel="Try again" onAction={() => setReloadKey((k) => k + 1)} /></div>;

  const live = confirmed.status === "ok" && confirmed.selection ? confirmed.selection : selectedVariant;
  const gone = confirmed.status === "gone";
  const images = selectedVariant && selectedVariant.images && selectedVariant.images.length ? selectedVariant.images : product.images || [];
  const shownImage = images[Math.min(imageIndex, Math.max(0, images.length - 1))] || "";
  const shownPrice = live && !gone ? live.price : product.price;
  const shownAvailability = live && !gone ? live.availability : product.availability;
  const needsChoice = variants.length > 1 && !selectedVariant;
  const specs = product.specifications ? Object.entries(product.specifications) : [];

  return (
    <div className="sc-detail" onKeyDown={onKeyDown}>
      <button type="button" className="sc-btn sc-btn-ghost" onClick={onBack}>← Back to products</button>
      <ActionNotice />
      <div className="sc-detail-grid">
        <section className="sc-gallery" aria-label="Product images">
          <ProductImage src={shownImage} alt={product.name} className="sc-gallery-main" />
          {images.length > 1 ? (
            <ul className="sc-thumbs">
              {images.map((src, i) => (
                <li key={`${src}-${i}`}>
                  <button type="button" className="sc-thumb" aria-pressed={i === imageIndex} aria-label={`Show image ${i + 1} of ${images.length}`} onClick={() => setImageIndex(i)}>
                    <ProductImage src={src} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="sc-info">
          {product.category ? <p className="sc-crumb">{product.category}{product.subcategory ? ` › ${product.subcategory}` : ""}</p> : null}
          <h2 className="sc-detail-title" tabIndex={-1} ref={headingRef}>{product.name}</h2>
          <div className="sc-detail-meta"><CreatorLine creator={product.creator} onOpen={onCreator} /><Reviews reviews={product.reviews} /></div>
          <Price price={shownPrice} large />
          <p className="sc-availability" role="status" aria-live="polite">
            <Availability availability={shownAvailability} />
            {live && !gone && confirmed.status === "ok" && typeof live.stock === "number" && live.stock > 0 ? <span className="sc-stock-units"> · {live.stock} available</span> : null}
          </p>
          {gone ? <p className="sc-note sc-note-warn" role="alert">This option is no longer available. <button type="button" className="sc-link" onClick={() => setReloadKey((k) => k + 1)}>Refresh options</button></p> : null}
          {confirmed.status === "error" ? <p className="sc-note" role="status">Couldn't confirm live stock for this option.</p> : null}

          {variants.length ? (
            <div className="sc-variants">
              {colours.length ? (
                <fieldset className="sc-fieldset">
                  <legend>Colour{activeColour ? `: ${activeColour}` : ""}</legend>
                  <div className="sc-options" role="group" aria-label="Colour">
                    {colours.map((c) => {
                      const all = variants.filter((v) => v.colour === c);
                      const soldOut = all.every((v) => !v.availability.inStock);
                      return <button key={c} type="button" className="sc-chip" aria-pressed={activeColour === c} onClick={() => { setColour(c); setSize(""); setImageIndex(0); }}>{c}{soldOut ? " (sold out)" : ""}</button>;
                    })}
                  </div>
                </fieldset>
              ) : null}
              {sizesForColour.length ? (
                <fieldset className="sc-fieldset">
                  <legend>Size{activeSize ? `: ${activeSize}` : ""}</legend>
                  <div className="sc-options" role="group" aria-label="Size">
                    {sizesForColour.map((s) => {
                      const match = variants.find((v) => (!activeColour || !v.colour || v.colour === activeColour) && v.size === s);
                      const soldOut = match ? !match.availability.inStock : false;
                      return <button key={s} type="button" className="sc-chip" aria-pressed={activeSize === s} onClick={() => setSize(s)}>{s}{soldOut ? " (sold out)" : ""}</button>;
                    })}
                  </div>
                </fieldset>
              ) : null}
              {needsChoice ? <p className="sc-note">Choose {colours.length && !activeColour ? "a colour" : "a size"} to see availability for that option.</p> : null}
            </div>
          ) : (product.colours.length || product.sizes.length) ? (
            <dl className="sc-facts">
              {product.colours.length ? <><dt>Colours</dt><dd>{product.colours.join(", ")}</dd></> : null}
              {product.sizes.length ? <><dt>Sizes</dt><dd>{product.sizes.join(", ")}</dd></> : null}
            </dl>
          ) : null}

          <ProductActions product={product} selectedVariant={selectedVariant} needsChoice={needsChoice} availability={shownAvailability} />

          {product.description || product.shortDescription ? <div className="sc-block"><h3>About this piece</h3><p>{product.description || product.shortDescription}</p></div> : null}
          {product.highlights && product.highlights.length ? <ul className="sc-highlights">{product.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul> : null}

          <dl className="sc-facts">
            {product.materials.length ? <><dt>Materials</dt><dd>{product.materials.join(", ")}</dd></> : null}
            {product.productType ? <><dt>Type</dt><dd>{product.productType}</dd></> : null}
            {product.processingDays > 0 ? <><dt>Made to order in</dt><dd>{product.processingDays} {product.processingDays === 1 ? "day" : "days"}</dd></> : null}
            {product.personalisation && product.personalisation.enabled ? <><dt>Personalisation</dt><dd>{product.personalisation.details || "Available"}</dd></> : null}
            {product.careInstructions ? <><dt>Care</dt><dd>{product.careInstructions}</dd></> : null}
            {specs.map(([k, v]) => <div key={k} className="sc-fact-row"><dt>{k}</dt><dd>{String(v)}</dd></div>)}
          </dl>
        </section>
      </div>

      {product.related && product.related.length ? (
        <section className="sc-related" aria-labelledby="sc-related-title">
          <h3 id="sc-related-title">You may also like</h3>
          <ul className="sc-grid">{product.related.map((p) => <ProductCard key={p.id} product={p} onOpen={onOpenRelated} onCreator={onCreator} />)}</ul>
        </section>
      ) : null}
    </div>
  );
}

export default function ShopCatalogue({ apiBase, onExit, signedIn = false, getAuthHeaders, onRequireLogin, onAddToCart, onBuyNow, openProductId, onOpenProductHandled,
  v8 = false, collection = "", onCollectionChange, initialQuery = "", notice = "", onQueryCleared, cartSummary = null, onOpenCart, onCheckout }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const actions = useShopWishlistActions({ apiBase: base, signedIn, getAuthHeaders, onRequireLogin, onAddToCart, onBuyNow });
  const [view, setView] = useState("browse");
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, q: String(initialQuery || "").trim(), sort: String(initialQuery || "").trim() ? "relevance" : "newest" }));
  const [searchText, setSearchText] = useState(String(initialQuery || ""));
  // V8: a collection (e.g. Handmade Crochet) is a saved query inside the one Shop, never a separate page.
  const collectionTerm = v8 && collection === "crochet" ? "crochet" : "";
  const effective = useMemo(() => (collectionTerm ? { ...filters, q: [collectionTerm, filters.q].filter(Boolean).join(" ") } : filters), [filters, collectionTerm]);
  useEffect(() => {
    if (!v8) return;
    const q = String(initialQuery || "").trim();
    setSearchText(q);
    setFilters((prev) => ({ ...prev, q, sort: q ? "relevance" : prev.sort === "relevance" ? "newest" : prev.sort }));
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  const [priceDraft, setPriceDraft] = useState({ minPrice: "", maxPrice: "" });
  const [list, setList] = useState({ status: "loading", products: [], total: 0, hasMore: false, facets: null, message: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState("");

  // A saved product opened from a wishlist screen elsewhere in the app lands straight on its product page.
  useEffect(() => {
    if (!openProductId) return;
    setView("browse");
    setDetailId(String(openProductId));
    window.scrollTo?.({ top: 0 });
    if (onOpenProductHandled) onOpenProductHandled();
  }, [openProductId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceError, setPriceError] = useState("");
  const lastOpened = useRef("");
  const savedScroll = useRef(0);
  const resultsRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setList((prev) => ({ ...prev, status: "loading", message: "" }));
    setMoreError("");
    fetchJson(`${base}/api/shop/catalogue/products?${buildQuery(effective, 0)}`, controller.signal)
      .then((body) => setList({ status: "ready", products: body.products || [], total: body.total || 0, hasMore: Boolean(body.hasMore), facets: body.facets || null, message: "" }))
      .catch((error) => { if (error.name !== "AbortError") setList({ status: "error", products: [], total: 0, hasMore: false, facets: null, message: error.message }); });
    return () => controller.abort();
  }, [base, effective, reloadKey]);

  // Coming back from a product: restore scroll position and return focus to the card that was opened.
  useEffect(() => {
    if (detailId || !lastOpened.current) return;
    const id = lastOpened.current;
    lastOpened.current = "";
    window.scrollTo?.({ top: savedScroll.current });
    resultsRef.current?.querySelector(`[data-card-id="${CSS.escape(String(id))}"]`)?.focus({ preventScroll: true });
  }, [detailId]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true); setMoreError("");
    try {
      const body = await fetchJson(`${base}/api/shop/catalogue/products?${buildQuery(effective, list.products.length)}`);
      setList((prev) => {
        const seen = new Set(prev.products.map((p) => p.id));
        return { ...prev, products: [...prev.products, ...(body.products || []).filter((p) => !seen.has(p.id))], total: body.total || prev.total, hasMore: Boolean(body.hasMore) };
      });
    } catch (error) { setMoreError(error.message || "Couldn't load more products"); }
    setLoadingMore(false);
  }, [base, effective, list.products.length]);

  const patch = (changes) => setFilters((prev) => ({ ...prev, ...changes }));
  const submitSearch = (event) => {
    event.preventDefault();
    const q = searchText.trim();
    setFilters((prev) => ({ ...prev, q, sort: q ? "relevance" : prev.sort === "relevance" ? "newest" : prev.sort }));
  };
  const clearAll = () => { if (onQueryCleared) onQueryCleared(); setFilters(EMPTY_FILTERS); setSearchText(""); setPriceDraft({ minPrice: "", maxPrice: "" }); setPriceError(""); };
  const applyPrice = (event) => {
    event.preventDefault();
    const { minPrice, maxPrice } = priceDraft;
    const valid = (v) => v === "" || /^\d{1,8}(\.\d{1,2})?$/.test(v);
    if (!valid(minPrice) || !valid(maxPrice)) { setPriceError("Enter prices as numbers, e.g. 499 or 499.50"); return; }
    if (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice)) { setPriceError("Minimum price can't be higher than maximum"); return; }
    setPriceError(""); patch({ minPrice, maxPrice });
  };
  const openDetail = (id) => { if (!detailId) savedScroll.current = window.scrollY || 0; lastOpened.current = String(id); setDetailId(String(id)); window.scrollTo?.({ top: 0 }); };
  const closeDetail = () => setDetailId("");
  const showCreator = (username) => { setDetailId(""); setSearchText(""); setFilters({ ...EMPTY_FILTERS, creator: username }); };

  const facets = list.facets || { categories: [], colours: [], materials: [], price: { min: 0, max: 0 } };
  const activeCategory = facets.categories.find((c) => c.name.toLowerCase() === filters.category.toLowerCase());
  const chips = [
    filters.q && ["q", `Search: “${filters.q}”`],
    filters.category && ["category", filters.category],
    filters.subcategory && ["subcategory", filters.subcategory],
    filters.colour && ["colour", `Colour: ${filters.colour}`],
    filters.material && ["material", `Material: ${filters.material}`],
    filters.creator && ["creator", `Creator: @${filters.creator}`],
    (filters.minPrice || filters.maxPrice) && ["price", `Price: ${filters.minPrice ? money(filters.minPrice) : "any"} – ${filters.maxPrice ? money(filters.maxPrice) : "any"}`],
    filters.inStock && ["inStock", "In stock"],
  ].filter(Boolean);
  const removeChip = (key) => {
    if (key === "q") { if (onQueryCleared) onQueryCleared(); setSearchText(""); setFilters((p) => ({ ...p, q: "", sort: p.sort === "relevance" ? "newest" : p.sort })); }
    else if (key === "category") patch({ category: "", subcategory: "" });
    else if (key === "price") { setPriceDraft({ minPrice: "", maxPrice: "" }); patch({ minPrice: "", maxPrice: "" }); }
    else if (key === "inStock") patch({ inStock: false });
    else patch({ [key]: "" });
  };

  if (detailId) {
    return (
      <ShopActionsContext.Provider value={actions}>
        <div className="sc-root" data-shop-catalogue="detail">
          <ProductDetail apiBase={base} productId={detailId} onBack={closeDetail} onOpenRelated={openDetail} onCreator={showCreator} />
        </div>
      </ShopActionsContext.Provider>
    );
  }

  if (view === "wishlist") {
    return (
      <ShopActionsContext.Provider value={actions}>
        <div className="sc-root" data-shop-catalogue="wishlist">
          <WishlistPanel onBack={() => setView("browse")} renderCard={(p) => <ProductCard key={p.id} product={p} onOpen={openDetail} onCreator={showCreator} />} />
        </div>
      </ShopActionsContext.Provider>
    );
  }

  // ================= V8 browse (SHP-001, board 16): one canonical Shop; Handmade Crochet is a collection chip =================
  if (v8) {
    const crochetOn = collection === "crochet";
    const setCollection = (next) => { if (onCollectionChange) onCollectionChange(next); };
    const makers = new Set(list.products.map((p) => p.creator && p.creator.public_username).filter(Boolean)).size;
    const cartItems = (cartSummary && cartSummary.items) || [];
    const cartUnits = cartItems.reduce((n, it) => n + Math.max(1, Number(it.quantity) || 1), 0);
    const lastLine = cartItems[cartItems.length - 1];
    const heroImage = (list.products.find((p) => p.image) || {}).image || "";
    const stockClass = (a) => (!a ? "" : a.state === "out_of_stock" ? "out" : a.lowStock ? "low" : "");
    const renderV8Card = (product) => (
      <li key={product.id}>
        <article className="v8-card v8-pcard" data-product-id={product.id}>
          <button type="button" className="v8-pcard-open" data-card-id={product.id} onClick={() => openDetail(product.id)} aria-label={`View ${product.name}, ${money(product.price.current)}, ${product.availability.label}`}>
            <V8ProductImg src={product.image} />
            <span className="v8-pcard-body">
              <b>{product.name}</b>
              <span className="v8-pcard-line">
                <span className="v8-price">{money(product.price.current)}</span>
                {product.price.onSale && product.price.discountPercent ? <span className="v8-sale">{product.price.discountPercent}% off</span> : null}
                <span className={`v8-stock ${stockClass(product.availability)}`}>{product.availability.label}</span>
              </span>
              <span className="v8-pcard-line v8-muted">{product.reviews && product.reviews.count > 0 && product.reviews.average != null ? `★ ${Number(product.reviews.average).toFixed(1)} (${product.reviews.count})` : (product.reviews && product.reviews.label) || "No reviews yet"}</span>
            </span>
          </button>
          <div className="v8-heart-btn"><WishlistHeart productId={product.id} name={product.name} /></div>
          {product.creator && product.creator.public_username ? (
            <div className="v8-pcard-foot">
              <span className="v8-ava">{product.creator.avatar ? <img src={product.creator.avatar} alt="" /> : String(product.creator.display_name || product.creator.public_username).charAt(0).toUpperCase()}</span>
              <button type="button" className="v8-handle" onClick={() => showCreator(product.creator.public_username)} aria-label={`Show all products by @${product.creator.public_username}`}>@{product.creator.public_username}</button>
            </div>
          ) : null}
        </article>
      </li>
    );
    return (
      <ShopActionsContext.Provider value={actions}>
        <div className="v8-shop" data-shop-catalogue="browse" data-collection={crochetOn ? "crochet" : "all"}>
          <div className="v8-shop-main">
            <section className="v8-collection-hero" aria-labelledby="v8-shop-title" style={heroImage ? { "--v8-hero-img": `url("${heroImage.replace(/["\\]/g, "")}")` } : undefined}>
              <span className="v8-pill">Shop</span>
              <h1 id="v8-shop-title">{crochetOn ? "Handmade Crochet" : "HOWDI Shop"}</h1>
              <p>{crochetOn ? "Cozy creations from our maker community" : "Handmade pieces from independent makers"}</p>
              <div className="v8-collection-facts">
                <span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7l8-4 8 4v10l-8 4-8-4ZM4 7l8 4 8-4M12 11v10" /></svg>{list.status === "ready" ? `${list.total} ${list.total === 1 ? "product" : "products"}` : "Loading…"}</span>
                {list.status === "ready" && !list.hasMore && makers ? <span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c.5-3.6 3.4-6 7-6s6.5 2.4 7 6" /></svg>{makers} independent {makers === 1 ? "maker" : "makers"}</span> : null}
                <span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>Supports independent makers</span>
              </div>
            </section>

            {notice ? <p className="v8-shop-note" role="status">{notice}</p> : null}
            <ActionNotice />

            <nav className="v8-chips" aria-label="Shop collections and categories">
              <button type="button" className="v8-chip" aria-pressed={!crochetOn && !filters.category} onClick={() => { setCollection(""); patch({ category: "", subcategory: "" }); }}>All</button>
              <button type="button" className="v8-chip" aria-pressed={crochetOn} onClick={() => setCollection(crochetOn ? "" : "crochet")}>Handmade Crochet</button>
              {facets.categories.map((c) => (
                <button key={c.name} type="button" className="v8-chip" aria-pressed={filters.category.toLowerCase() === c.name.toLowerCase()} onClick={() => patch({ category: filters.category.toLowerCase() === c.name.toLowerCase() ? "" : c.name, subcategory: "" })}>{c.name} <span className="v8-count">{c.count}</span></button>
              ))}
            </nav>

            <div className="v8-toolbar">
              <form className="v8-inline-search" role="search" onSubmit={submitSearch}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" /></svg>
                <label className="v8-sr" htmlFor="v8-shop-search">{crochetOn ? "Search in Handmade Crochet" : "Search the Shop"}</label>
                <input id="v8-shop-search" type="search" value={searchText} maxLength={80} placeholder={crochetOn ? "Search in Handmade Crochet…" : "Search handmade bags, home decor…"} onChange={(e) => setSearchText(e.target.value)} />
              </form>
              <button type="button" className="v8-tool" aria-expanded={filtersOpen} aria-controls="v8-shop-filters" onClick={() => setFiltersOpen((v) => !v)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filters{chips.length ? ` (${chips.length})` : ""}
              </button>
              <button type="button" className="v8-tool" aria-pressed={filters.inStock} onClick={() => patch({ inStock: !filters.inStock })}>In stock</button>
              <label className="v8-sort"><span>Sort by</span>
                <select value={filters.sort === "relevance" && !filters.q ? "newest" : filters.sort} onChange={(e) => patch({ sort: e.target.value })}>
                  {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value} disabled={value === "relevance" && !filters.q}>{label}</option>)}
                </select>
              </label>
            </div>

            {filtersOpen ? (
              <div id="v8-shop-filters" className="v8-card v8-filter-panel" role="group" aria-label="Filters">
                <form onSubmit={applyPrice}>
                  <label><span>Price (₹)</span>
                    <span className="v8-price-pair">
                      <input inputMode="decimal" aria-label="Minimum price" placeholder="Min" value={priceDraft.minPrice} onChange={(e) => setPriceDraft((d) => ({ ...d, minPrice: e.target.value }))} />
                      <span aria-hidden="true">–</span>
                      <input inputMode="decimal" aria-label="Maximum price" placeholder="Max" value={priceDraft.maxPrice} onChange={(e) => setPriceDraft((d) => ({ ...d, maxPrice: e.target.value }))} />
                      <button type="submit" className="v8-btn">Apply</button>
                    </span>
                  </label>
                  {priceError ? <p className="sc-field-error" role="alert">{priceError}</p> : null}
                </form>
                <label><span>Colour</span>
                  <select value={filters.colour} onChange={(e) => patch({ colour: e.target.value })}>
                    <option value="">Any colour</option>
                    {facets.colours.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                  </select>
                </label>
                <label><span>Material</span>
                  <select value={filters.material} onChange={(e) => patch({ material: e.target.value })}>
                    <option value="">Any material</option>
                    {facets.materials.map((m) => <option key={m.name} value={m.name}>{m.name} ({m.count})</option>)}
                  </select>
                </label>
              </div>
            ) : null}

            <div className="v8-mobile-title"><h1>{crochetOn ? "Handmade Crochet" : "HOWDI Shop"}</h1><small>{list.status === "ready" ? `${list.total} ${list.total === 1 ? "product" : "products"}` : "Loading…"}</small></div>

            {chips.length ? (
              <ul className="v8-active-filters" aria-label="Active filters">
                {chips.map(([key, label]) => <li key={key}><button type="button" className="v8-chip" aria-pressed="true" onClick={() => removeChip(key)} aria-label={`Remove filter ${label}`}>{label} ×</button></li>)}
                <li><button type="button" className="v8-link" onClick={clearAll}>Clear all</button></li>
              </ul>
            ) : null}

            <div ref={resultsRef}>
              {list.status === "loading" ? (
                <div role="status" aria-busy="true"><span className="v8-sr">Loading products…</span>
                  <ul className="v8-grid" aria-hidden="true">{Array.from({ length: 8 }).map((_, i) => <li key={i}><div className="v8-card v8-pcard"><div className="v8-skel" style={{ aspectRatio: "1 / .82", borderRadius: 0 }} /><div style={{ padding: 12, display: "grid", gap: 8 }}><div className="v8-skel" style={{ height: 12, width: "80%" }} /><div className="v8-skel" style={{ height: 12, width: "50%" }} /></div></div></li>)}</ul>
                </div>
              ) : null}
              {list.status === "error" ? (
                <div className="v8-card v8-state v8-error" role="alert">
                  <b>We couldn’t load products</b><p>Please check your connection and try again.</p>
                  <button type="button" className="v8-btn v8-btn-soft" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
                </div>
              ) : null}
              {list.status === "ready" && !list.products.length ? (
                <div className="v8-card v8-state" role="status">
                  <span className="v8-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2" /></svg></span>
                  <b>{chips.length || crochetOn ? "No results found" : "No products are listed yet"}</b>
                  <p>{filters.q ? `We couldn’t find any products matching “${filters.q}”. Try different keywords or clear some filters.` : chips.length || crochetOn ? "Try removing a filter or browsing all of the Shop." : "New handmade pieces from our makers will appear here soon."}</p>
                  {chips.length || crochetOn ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => { clearAll(); setCollection(""); }}>Clear filters</button> : null}
                </div>
              ) : null}
              {list.status === "ready" && list.products.length ? (
                <>
                  <ul className="v8-grid">{list.products.map((p) => renderV8Card(p))}</ul>
                  {moreError ? <p className="sc-field-error" role="alert">{moreError}</p> : null}
                  {list.hasMore ? <div style={{ textAlign: "center", marginTop: 18 }}><button type="button" className="v8-btn v8-btn-primary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button></div> : null}
                </>
              ) : null}
            </div>
          </div>

          <aside className="v8-shop-rail" aria-label="Shop side panel">
            <section className="v8-card v8-rail-card v8-collection-card">
              <h2>{crochetOn ? "Handmade Crochet" : "Handmade on HOWDI"}</h2>
              <p>{crochetOn ? "From cozy wearables to home decor — handmade crochet pieces made by independent makers." : "Every piece is listed by an independent maker with a public @handle."}</p>
              <div className="v8-trust">
                <span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>Handmade</span>
                <span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9l1.5-5h13L20 9M4 9h16v11H4Z" /></svg>Small makers</span>
                <span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6Z" /></svg>Public @handles</span>
              </div>
              {!crochetOn ? <button type="button" className="v8-btn v8-btn-soft v8-btn-block" style={{ marginTop: 14 }} onClick={() => setCollection("crochet")}>Explore Handmade Crochet</button> : null}
            </section>

            <section className={`v8-card v8-rail-card v8-cart-card ${cartItems.length ? "" : "v8-cart-empty"}`} aria-label="Your cart">
              <h2><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11h10.2L20 7H6.2" /></svg>Your cart ({cartUnits}){cartItems.length ? <button type="button" className="v8-link" onClick={onOpenCart}>View cart</button> : null}</h2>
              {cartItems.length ? (
                <>
                  <div className="v8-cart-line">
                    {lastLine && lastLine.image ? <img src={lastLine.image} alt="" /> : <span className="v8-cart-noimg" />}
                    <span><b>{lastLine.name}</b><small>{lastLine.price} · Qty {Math.max(1, Number(lastLine.quantity) || 1)}</small></span>
                  </div>
                  {cartItems.length > 1 ? <p style={{ marginTop: 8 }}>+ {cartItems.length - 1} more {cartItems.length - 1 === 1 ? "item" : "items"}</p> : null}
                  <div className="v8-cart-total"><span>Subtotal</span><b>{money(cartSummary.subtotal)}</b></div>
                  <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onCheckout}>Go to checkout · {money(cartSummary.subtotal)}</button>
                </>
              ) : <p>Your cart is empty. Items you add will show here.</p>}
            </section>
          </aside>
        </div>
      </ShopActionsContext.Provider>
    );
  }

  return (
    <ShopActionsContext.Provider value={actions}>
    <div className="sc-root" data-shop-catalogue="browse">
      <header className="sc-header">
        <div>
          <p className="sc-kicker">HOWDI SHOP</p>
          <h2 className="sc-title">Shop handmade</h2>
          <p className="sc-sub">Browse pieces from real creators.</p>
        </div>
        <div className="sc-header-actions">
          <button type="button" className="sc-btn" onClick={() => setView("wishlist")}>♡ Wishlist{signedIn && actions.wishlist.ids.length ? ` (${actions.wishlist.ids.length})` : ""}</button>
          {onExit ? <button type="button" className="sc-btn sc-btn-ghost" onClick={onExit}>Shop home</button> : null}
        </div>
      </header>
      <ActionNotice />

      <form className="sc-search" role="search" onSubmit={submitSearch}>
        <label className="sc-sr" htmlFor="sc-search-input">Search products</label>
        <input id="sc-search-input" type="search" value={searchText} maxLength={80} placeholder="Search bags, blankets, creators’ pieces…" onChange={(e) => setSearchText(e.target.value)} />
        <button type="submit" className="sc-btn sc-btn-primary">Search</button>
      </form>

      <nav className="sc-cats" aria-label="Categories">
        <button type="button" className="sc-chip" aria-pressed={!filters.category} onClick={() => patch({ category: "", subcategory: "" })}>All</button>
        {facets.categories.map((c) => (
          <button key={c.name} type="button" className="sc-chip" aria-pressed={filters.category.toLowerCase() === c.name.toLowerCase()} onClick={() => patch({ category: c.name, subcategory: "" })}>{c.name} <span className="sc-count">{c.count}</span></button>
        ))}
      </nav>
      {activeCategory && activeCategory.subcategories.length ? (
        <nav className="sc-cats sc-subcats" aria-label={`${activeCategory.name} subcategories`}>
          <button type="button" className="sc-chip" aria-pressed={!filters.subcategory} onClick={() => patch({ subcategory: "" })}>All {activeCategory.name}</button>
          {activeCategory.subcategories.map((s) => (
            <button key={s.name} type="button" className="sc-chip" aria-pressed={filters.subcategory.toLowerCase() === s.name.toLowerCase()} onClick={() => patch({ subcategory: s.name })}>{s.name} <span className="sc-count">{s.count}</span></button>
          ))}
        </nav>
      ) : null}

      <div className="sc-toolbar">
        <button type="button" className="sc-btn sc-filter-toggle" aria-expanded={filtersOpen} aria-controls="sc-filters" onClick={() => setFiltersOpen((v) => !v)}>Filters{chips.length ? ` (${chips.length})` : ""}</button>
        <p className="sc-total" role="status" aria-live="polite">{list.status === "ready" ? `${list.total} ${list.total === 1 ? "product" : "products"}` : ""}</p>
        <label className="sc-sort">
          <span>Sort by</span>
          <select value={filters.sort === "relevance" && !filters.q ? "newest" : filters.sort} onChange={(e) => patch({ sort: e.target.value })}>
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value} disabled={value === "relevance" && !filters.q}>{label}</option>)}
          </select>
        </label>
      </div>

      {chips.length ? (
        <ul className="sc-active" aria-label="Active filters">
          {chips.map(([key, label]) => <li key={key}><button type="button" className="sc-chip sc-chip-active" onClick={() => removeChip(key)} aria-label={`Remove filter ${label}`}>{label} ×</button></li>)}
          <li><button type="button" className="sc-link" onClick={clearAll}>Clear all</button></li>
        </ul>
      ) : null}

      <div className="sc-layout">
        <aside id="sc-filters" className={`sc-filters ${filtersOpen ? "sc-open" : ""}`} aria-label="Filters">
          <fieldset className="sc-fieldset">
            <legend>Price (₹)</legend>
            <form onSubmit={applyPrice} className="sc-price-form">
              <label><span className="sc-sr">Minimum price</span><input inputMode="decimal" placeholder={facets.price.max ? `Min ${facets.price.min}` : "Min"} value={priceDraft.minPrice} onChange={(e) => setPriceDraft((d) => ({ ...d, minPrice: e.target.value }))} /></label>
              <span aria-hidden="true">–</span>
              <label><span className="sc-sr">Maximum price</span><input inputMode="decimal" placeholder={facets.price.max ? `Max ${facets.price.max}` : "Max"} value={priceDraft.maxPrice} onChange={(e) => setPriceDraft((d) => ({ ...d, maxPrice: e.target.value }))} /></label>
              <button type="submit" className="sc-btn">Apply</button>
            </form>
            {priceError ? <p className="sc-field-error" role="alert">{priceError}</p> : null}
          </fieldset>
          <label className="sc-check"><input type="checkbox" checked={filters.inStock} onChange={(e) => patch({ inStock: e.target.checked })} /> In stock only</label>
          <label className="sc-select"><span>Colour</span>
            <select value={filters.colour} onChange={(e) => patch({ colour: e.target.value })}>
              <option value="">Any colour</option>
              {facets.colours.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
              {filters.colour && !facets.colours.some((c) => c.name.toLowerCase() === filters.colour.toLowerCase()) ? <option value={filters.colour}>{filters.colour} (0)</option> : null}
            </select>
          </label>
          <label className="sc-select"><span>Material</span>
            <select value={filters.material} onChange={(e) => patch({ material: e.target.value })}>
              <option value="">Any material</option>
              {facets.materials.map((m) => <option key={m.name} value={m.name}>{m.name} ({m.count})</option>)}
              {filters.material && !facets.materials.some((m) => m.name.toLowerCase() === filters.material.toLowerCase()) ? <option value={filters.material}>{filters.material} (0)</option> : null}
            </select>
          </label>
        </aside>

        <div className="sc-results" ref={resultsRef}>
          {list.status === "loading" ? <GridSkeleton /> : null}
          {list.status === "error" ? <StateBox kind="error" title="We couldn't load products" message={list.message || "Please check your connection and try again."} actionLabel="Try again" onAction={() => setReloadKey((k) => k + 1)} /> : null}
          {list.status === "ready" && !list.products.length ? (
            chips.length
              ? <StateBox kind="empty" title="No products match your filters" message="Try removing a filter or searching for something else." actionLabel="Clear filters" onAction={clearAll} />
              : <StateBox kind="empty" title="No products are listed yet" message="New handmade pieces from our creators will appear here soon." />
          ) : null}
          {list.status === "ready" && list.products.length ? (
            <>
              <ul className="sc-grid">{list.products.map((p) => <ProductCard key={p.id} product={p} onOpen={openDetail} onCreator={showCreator} />)}</ul>
              {moreError ? <p className="sc-field-error" role="alert">{moreError}</p> : null}
              {list.hasMore ? <div className="sc-more"><button type="button" className="sc-btn sc-btn-primary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button></div> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
    </ShopActionsContext.Provider>
  );
}
