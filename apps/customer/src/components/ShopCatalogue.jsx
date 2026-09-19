import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ShopCatalogue.css";

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
        <div className="sc-card-foot"><CreatorLine creator={product.creator} onOpen={onCreator} /></div>
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

export default function ShopCatalogue({ apiBase, onExit }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [priceDraft, setPriceDraft] = useState({ minPrice: "", maxPrice: "" });
  const [list, setList] = useState({ status: "loading", products: [], total: 0, hasMore: false, facets: null, message: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceError, setPriceError] = useState("");
  const lastOpened = useRef("");
  const savedScroll = useRef(0);
  const resultsRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setList((prev) => ({ ...prev, status: "loading", message: "" }));
    setMoreError("");
    fetchJson(`${base}/api/shop/catalogue/products?${buildQuery(filters, 0)}`, controller.signal)
      .then((body) => setList({ status: "ready", products: body.products || [], total: body.total || 0, hasMore: Boolean(body.hasMore), facets: body.facets || null, message: "" }))
      .catch((error) => { if (error.name !== "AbortError") setList({ status: "error", products: [], total: 0, hasMore: false, facets: null, message: error.message }); });
    return () => controller.abort();
  }, [base, filters, reloadKey]);

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
      const body = await fetchJson(`${base}/api/shop/catalogue/products?${buildQuery(filters, list.products.length)}`);
      setList((prev) => {
        const seen = new Set(prev.products.map((p) => p.id));
        return { ...prev, products: [...prev.products, ...(body.products || []).filter((p) => !seen.has(p.id))], total: body.total || prev.total, hasMore: Boolean(body.hasMore) };
      });
    } catch (error) { setMoreError(error.message || "Couldn't load more products"); }
    setLoadingMore(false);
  }, [base, filters, list.products.length]);

  const patch = (changes) => setFilters((prev) => ({ ...prev, ...changes }));
  const submitSearch = (event) => {
    event.preventDefault();
    const q = searchText.trim();
    setFilters((prev) => ({ ...prev, q, sort: q ? "relevance" : prev.sort === "relevance" ? "newest" : prev.sort }));
  };
  const clearAll = () => { setFilters(EMPTY_FILTERS); setSearchText(""); setPriceDraft({ minPrice: "", maxPrice: "" }); setPriceError(""); };
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
    if (key === "q") { setSearchText(""); setFilters((p) => ({ ...p, q: "", sort: p.sort === "relevance" ? "newest" : p.sort })); }
    else if (key === "category") patch({ category: "", subcategory: "" });
    else if (key === "price") { setPriceDraft({ minPrice: "", maxPrice: "" }); patch({ minPrice: "", maxPrice: "" }); }
    else if (key === "inStock") patch({ inStock: false });
    else patch({ [key]: "" });
  };

  if (detailId) {
    return (
      <div className="sc-root" data-shop-catalogue="detail">
        <ProductDetail apiBase={base} productId={detailId} onBack={closeDetail} onOpenRelated={openDetail} onCreator={showCreator} />
      </div>
    );
  }

  return (
    <div className="sc-root" data-shop-catalogue="browse">
      <header className="sc-header">
        <div>
          <p className="sc-kicker">HOWDI SHOP</p>
          <h2 className="sc-title">Shop handmade</h2>
          <p className="sc-sub">Browse pieces from real creators.</p>
        </div>
        {onExit ? <button type="button" className="sc-btn sc-btn-ghost" onClick={onExit}>Shop home</button> : null}
      </header>

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
  );
}
