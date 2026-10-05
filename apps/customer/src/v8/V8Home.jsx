// HOWDI V8 Common Home — HOME-001 (mixed ecosystem home, board 04) and HOME-002 (section heading, see-all,
// loading / empty / error per section, board 15). Real data only:
//   · Community, Find a Worker, Continue Crochet, Hype, Tips  → GET /api/connect/home (K5A public DTOs)
//   · Crochet Shop                                           → GET /api/shop/catalogue/products (Shop S1)
// Nothing is invented: no fake counts, ratings, distances or member totals. A section with no data shows an
// empty state with a useful next step; a failed request shows ONE retry banner, not an error per section.
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "./V8Shell";

const HOME_SECTIONS = ["forYou", "worksRecommendations", "learnRecommendations", "continueYourJourney", "recommendedCreators", "trendingArticles"];
const money = (n, currency = "INR") => {
  const v = Number(n || 0);
  try { return v.toLocaleString("en-IN", { style: "currency", currency, maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }); }
  catch { return `₹${v}`; }
};
const safeImg = (u) => (typeof u === "string" && /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(u) ? u : "");
const initial = (s) => String(s || "H").replace(/^@/, "").trim().charAt(0).toUpperCase() || "H";
const since = (iso) => {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m || 1}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function Ava({ src, name, small }) {
  const img = safeImg(src);
  return <span className={`v8-ava ${small ? "sm" : ""}`}>{img ? <img src={img} alt="" /> : initial(name)}</span>;
}

function Tile({ accent, icon, title, onSeeAll, seeAllLabel = "See all", children, compact, hidden, order }) {
  if (hidden) return null;
  return (
    <section className="v8-card v8-tile" style={{ order }} data-accent={accent} data-compact={compact ? "" : undefined} aria-labelledby={`v8-tile-${accent}`}>
      <header className="v8-tile-head">
        <span className="v8-tile-ico"><V8Icon name={icon} size={18} /></span>
        <h2 id={`v8-tile-${accent}`}>{title}</h2>
        {onSeeAll ? <button type="button" className="v8-link" onClick={onSeeAll} aria-label={`${seeAllLabel}: ${title}`}>{seeAllLabel}</button> : null}
      </header>
      {children}
    </section>
  );
}

function TileSkeleton({ media = true }) {
  return (
    <div aria-busy="true" aria-label="Loading" role="status" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div className="v8-skel" style={{ width: 40, height: 40, borderRadius: "50%" }} /><div style={{ flex: 1, display: "grid", gap: 6 }}><div className="v8-skel" style={{ height: 12, width: "60%" }} /><div className="v8-skel" style={{ height: 10, width: "40%" }} /></div></div>
      {media ? <div className="v8-skel" style={{ aspectRatio: "16 / 10", width: "100%" }} /> : null}
      <div className="v8-skel" style={{ height: 12, width: "90%" }} /><div className="v8-skel" style={{ height: 12, width: "70%" }} />
    </div>
  );
}

export default function V8Home({ apiBase, getAuthHeaders, user, displayName, onOpen, onOpenProduct, onCreatePost, prefs, onCustomize }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const [home, setHome] = useState({ status: "loading", sections: {} });
  const [shop, setShop] = useState({ status: "loading", product: null });
  const [reload, setReload] = useState(0);
  const signedIn = Boolean(user);

  useEffect(() => {
    const ctl = new AbortController();
    setHome((h) => ({ ...h, status: "loading" }));
    setShop((s) => ({ ...s, status: "loading" }));
    let headers = { Accept: "application/json" };
    try { headers = { ...headers, ...(signedIn && getAuthHeaders ? getAuthHeaders() : {}) }; } catch { /* guest */ }
    fetch(`${base}/api/connect/home?sections=${HOME_SECTIONS.join(",")}`, { signal: ctl.signal, headers, cache: "no-store" })
      .then(async (r) => { const b = await r.json().catch(() => null); if (!r.ok || !b || b.status !== "success") throw new Error("home"); return b; })
      .then((b) => setHome({ status: "ready", sections: b.sections || {} }))
      .catch((e) => { if (e.name !== "AbortError") setHome({ status: "error", sections: {} }); });
    fetch(`${base}/api/shop/catalogue/products?q=crochet&sort=newest&limit=1`, { signal: ctl.signal, headers: { Accept: "application/json" } })
      .then(async (r) => { const b = await r.json().catch(() => null); if (!r.ok || !b || b.status === "error") throw new Error("shop"); return b; })
      .then((b) => setShop({ status: "ready", product: (b.products || [])[0] || null, total: b.total || 0 }))
      .catch((e) => { if (e.name !== "AbortError") setShop({ status: "error", product: null }); });
    return () => ctl.abort();
  }, [base, signedIn, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(() => setReload((n) => n + 1), []);
  const S = home.sections;
  const sec = (key) => {
    if (home.status === "loading") return { state: "loading", items: [] };
    if (home.status === "error") return { state: "error", items: [] };
    const s = S[key] || {};
    if (s.state === "hidden") return { state: "hidden", items: [] };
    if (s.state === "error") return { state: "error", items: [] };
    return { state: (s.items || []).length ? "ready" : "empty", items: s.items || [] };
  };
  const anyError = home.status === "error" || shop.status === "error" || HOME_SECTIONS.some((k) => S[k]?.state === "error");
  const first = String(displayName || user?.full_name || user?.name || "").trim().split(/\s+/)[0];

  // ---------------- tiles
  const community = sec("forYou");
  const works = sec("worksRecommendations");
  const journey = sec("continueYourJourney");
  const learn = sec("learnRecommendations");
  const course = journey.state === "ready" ? journey.items[0] : null;
  const suggested = learn.items[0];
  const hype = sec("recommendedCreators");
  const tips = sec("trendingArticles");
  const tip = tips.items[0];
  const product = shop.product;
  const hidden = (id) => Boolean(prefs?.hiddenModules?.includes(id));
  const rank = (id) => { const pinned = prefs?.pinnedModules || [], order = prefs?.moduleOrder || []; const p = pinned.indexOf(id); return p >= 0 ? p : 100 + Math.max(0, order.indexOf(id)); };
  const errorNote = <p className="v8-muted" style={{ margin: 0 }}>This section isn’t available right now.</p>;

  return (
    <div className="v8-page" data-v8-page="home">
      <div className="v8-page-inner">
        <div className="v8-home-topline">
          <button type="button" className="v8-home-brand" onClick={() => onOpen("home", "home")} aria-label="HOWDI Home">HOWDI</button>
        </div>
        <div className="v8-home-hello">
          <h1>{signedIn ? `Welcome back${first ? `, ${first}` : ""}` : "Welcome to HOWDI"}</h1>
          <p>People. Products. Services. Skills. A kinder, more useful everyday internet.</p>
          {onCustomize ? <button type="button" className="v8-link" onClick={onCustomize}>Customize Home</button> : null}
        </div>

        {anyError ? (
          <div className="v8-banner-error" role="alert">
            <V8Icon name="alert" size={20} />
            <span><b>Some of Home didn’t load.</b> Check your connection — everything that loaded is still shown.</span>
            <button type="button" className="v8-btn v8-btn-soft" onClick={retry}><V8Icon name="refresh" size={16} />Try again</button>
          </div>
        ) : null}

        <div className="v8-home-grid">
          <Tile accent="community" icon="users" title="Community" onSeeAll={() => onOpen("connect", "home")} hidden={hidden("community")} order={rank("community")}>
            {community.state === "loading" ? <TileSkeleton media={false} /> : null}
            {community.state === "error" ? errorNote : null}
            {community.state === "empty" ? <V8State icon="comment" title="No posts yet" message="Be the first to share something with your community." actionLabel="Create a post" onAction={onCreatePost} /> : null}
            {community.state === "ready" ? (
              <div className="v8-post-list">
                {community.items.slice(0, 2).map((it) => (
                  <article key={it.public_key}>
                    <div className="v8-person">
                      <Ava src={it.author?.avatar_url} name={it.author?.display_name} />
                      <span><b>{it.author?.display_name || `@${it.author?.public_username}`}</b><small>@{it.author?.public_username}{it.published_at ? ` · ${since(it.published_at)}` : ""}</small></span>
                    </div>
                    <p className="v8-post-text">{it.content?.title ? <strong>{it.content.title}. </strong> : null}{it.content?.text_excerpt}</p>
                    <div className="v8-counts">
                      <span><V8Icon name="heart" size={18} fill className="v8-heart" />{it.counts?.reactions ?? 0}<span className="v8-sr"> reactions</span></span>
                      <span><V8Icon name="comment" size={18} />{it.counts?.comments ?? 0}<span className="v8-sr"> comments</span></span>
                    </div>
                  </article>
                ))}
                <button type="button" className="v8-link" style={{ justifySelf: "start" }} onClick={() => onOpen("connect", "home")}>Open Connect</button>
              </div>
            ) : null}
          </Tile>

          <Tile accent="shop" icon="shop" title="Crochet Shop" onSeeAll={() => onOpen("shop", "crochet")} hidden={hidden("shop")} order={rank("shop")}>
            {shop.status === "loading" ? <TileSkeleton /> : null}
            {shop.status === "error" ? errorNote : null}
            {shop.status === "ready" && !product ? <V8State icon="shop" title="No crochet pieces listed yet" message="New handmade crochet from our makers will appear here." actionLabel="Browse the Shop" onAction={() => onOpen("shop", "catalogue")} /> : null}
            {product ? (
              <div className="v8-tile-mobile-row has-media">
                {safeImg(product.image) ? <img className="v8-media" src={product.image} alt="" loading="lazy" /> : <div className="v8-media v8-media-empty">No photo yet</div>}
                <div style={{ display: "grid", gap: 8 }}>
                  <b style={{ fontSize: 16, fontWeight: 600 }}>{product.name}</b>
                  <div className="v8-price-row">
                    <span className="v8-price">{money(product.price?.current)}{product.price?.onSale && product.price?.original ? <s>{money(product.price.original)}</s> : null}</span>
                    {product.reviews?.count > 0 && product.reviews?.average != null
                      ? <span className="v8-rating"><V8Icon name="star" size={16} fill />{Number(product.reviews.average).toFixed(1)} <span className="v8-muted">({product.reviews.count})</span></span>
                      : <span className="v8-muted v8-hide-sm">{product.reviews?.label || "No reviews yet"}</span>}
                  </div>
                  <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => onOpenProduct(product.id)}>View &amp; add to cart</button>
                </div>
              </div>
            ) : null}
          </Tile>

          <Tile accent="works" icon="works" title="Find a Worker" onSeeAll={() => onOpen("works", "find")} hidden={hidden("works")} order={rank("works")}>
            {works.state === "loading" ? <TileSkeleton media={false} /> : null}
            {works.state === "error" ? errorNote : null}
            {works.state === "empty" ? <V8State icon="works" title="No verified workers nearby yet" message="We’re verifying local professionals. Try another location." actionLabel="Open Works" onAction={() => onOpen("works", "find")} /> : null}
            {works.state === "ready" ? (
              <>
                <ul className="v8-worker-list">
                  {works.items.slice(0, 3).map((wk) => (
                    <li key={wk.public_key}>
                      <div className="v8-person">
                        <Ava name={wk.display_name} small />
                        <span>
                          <b>{wk.skill}</b>
                          <small>By {wk.display_name} {wk.verified ? <span className="v8-verified" title="Verified worker"><V8Icon name="check" size={14} stroke={2.4} /><span className="v8-sr">verified</span></span> : null}</small>
                        </span>
                      </div>
                      <div className="v8-counts" style={{ fontSize: 13 }}>
                        <span><V8Icon name="pin" size={15} />{wk.service_area}</span>
                        {wk.rating != null ? <span className="v8-rating" style={{ fontSize: 13 }}><V8Icon name="star" size={15} fill />{Number(wk.rating).toFixed(1)}</span> : null}
                        {wk.completed_jobs != null ? <span>{wk.completed_jobs} jobs done</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => onOpen("works", "find")}>Book a service</button>
              </>
            ) : null}
          </Tile>

          <Tile accent="vibe" icon="video" title="Vibe" onSeeAll={() => onOpen("connect", "vibe")} hidden={hidden("vibe")} order={rank("vibe")}>
            <V8State icon="video" title="Social video lives in Connect" message="Open Vibe to watch and share eligible community video." actionLabel="Open Vibe" onAction={() => onOpen("connect", "vibe")} />
          </Tile>

          <Tile accent="move" icon="move" title="Move" onSeeAll={() => onOpen("move", "home")} hidden={hidden("move")} order={rank("move")}>
            {/* Founder-approved MOVE mobile reference: Move entry card. Send Items is not open yet, so it is not advertised. */}
            <button type="button" className="v8-move-entry" data-move-entry onClick={() => onOpen("move", "home")} aria-label="Open HOWDI Move: request a ride">
              <span className="v8-move-entry-copy"><b>Move around easily</b><small>Rides · Your rides · Drive with HOWDI</small></span>
              <span className="v8-move-entry-go" aria-hidden="true"><V8Icon name="chevr" size={20} /></span>
              <span className="v8-move-entry-art" aria-hidden="true"><i>🛺</i><i>🚕</i><i>🏍️</i></span>
            </button>
          </Tile>
        </div>

        <div className="v8-home-grid v8-row2">
          <Tile accent="learn" icon="learn" title={course ? "Continue Crochet" : "Learn Crochet"} onSeeAll={() => onOpen("learn", course ? "my-learning" : "discover")} hidden={hidden("learn") && hidden("continue")} order={Math.min(rank("learn"), rank("continue"))}>
            {learn.state === "loading" ? <TileSkeleton media={false} /> : null}
            {learn.state === "error" && !course ? errorNote : null}
            {course ? (
              <>
                <div className="v8-course">
                  {(() => { const img = safeImg((learn.items.find((c) => c.public_key === course.public_key) || {}).image_url); return img ? <img className="v8-media" src={img} alt="" loading="lazy" /> : <div className="v8-media v8-media-empty"><V8Icon name="play" size={26} fill /></div>; })()}
                  <div>
                    <h3>{course.title}</h3>
                    <span className="v8-muted">{course.category}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <div className="v8-progress" style={{ flex: 1 }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Number(course.progress_percent ?? course.progress ?? 0))} aria-label="Course progress"><i style={{ width: `${Math.min(100, Math.max(0, Number(course.progress_percent ?? course.progress ?? 0)))}%` }} /></div>
                      <b style={{ fontSize: 14 }}>{Math.round(Number(course.progress_percent ?? course.progress ?? 0))}%</b>
                    </div>
                  </div>
                </div>
                <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => onOpen("learn", "my-learning")}>Continue lesson</button>
              </>
            ) : suggested ? (
              <>
                <div className="v8-course">
                  {safeImg(suggested.image_url) ? <img className="v8-media" src={suggested.image_url} alt="" loading="lazy" /> : <div className="v8-media v8-media-empty"><V8Icon name="play" size={26} fill /></div>}
                  <div>
                    <h3>{suggested.title}</h3>
                    <span className="v8-muted">{[suggested.level, suggested.duration_minutes ? `${suggested.duration_minutes} min` : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => onOpen("learn", "discover")}>Start learning</button>
              </>
            ) : learn.state === "empty" ? <V8State icon="learn" title="No courses published yet" message="Crochet classes are being prepared." /> : null}
          </Tile>

          <Tile accent="hype" icon="trend" title="Hype" onSeeAll={() => onOpen("connect", "explore")} hidden={hidden("hype")} order={rank("hype")}>
            {hype.state === "loading" ? <TileSkeleton media={false} /> : null}
            {hype.state === "error" ? errorNote : null}
            {hype.state === "empty" ? <V8State icon="trend" title="Nothing trending yet" message="Creators you might like will show up here." /> : null}
            {hype.state === "ready" ? (
              <ul className="v8-hype-list">
                {hype.items.slice(0, 3).map((c) => (
                  <li key={c.public_username}>
                    <Ava src={c.avatar_url} name={c.display_name} small />
                    <div className="v8-person"><span><b>{c.display_name || `@${c.public_username}`}</b><small>{c.headline || `@${c.public_username}`}</small></span></div>
                  </li>
                ))}
              </ul>
            ) : null}
          </Tile>

          <Tile accent="live" icon="live" title="Live Classes" onSeeAll={() => onOpen("learn", "live")} hidden={hidden("live")} order={rank("live")}>
            <V8State icon="live" title="Find a live class" message="Availability and attendance are shown only by the Learn experience." actionLabel="Open Live Classes" onAction={() => onOpen("learn", "live")} />
          </Tile>

          <Tile accent="tips" icon="bulb" title="Tips" onSeeAll={() => onOpen("connect", "explore")} hidden={hidden("tips")} order={rank("tips")}>
            {tips.state === "loading" ? <TileSkeleton /> : null}
            {tips.state === "error" ? errorNote : null}
            {tips.state === "empty" ? <V8State icon="bulb" title="No tips yet" message="Helpful articles from the community will appear here." /> : null}
            {tip ? (
              <div className={`v8-tile-mobile-row ${safeImg(tip.cover_url) ? "has-media" : ""}`}>
                {safeImg(tip.cover_url) ? <img className="v8-media" src={tip.cover_url} alt="" loading="lazy" /> : null}
                <div style={{ display: "grid", gap: 6 }}>
                  <b style={{ fontSize: 16, fontWeight: 600, color: "var(--v8-ink)" }}>{tip.content?.title || tip.content?.text_excerpt}</b>
                  {tip.content?.title && tip.content?.text_excerpt ? <span className="v8-muted">{tip.content.text_excerpt}</span> : null}
                  <span className="v8-muted" style={{ fontSize: 13 }}>By {tip.author?.display_name || `@${tip.author?.public_username}`}</span>
                </div>
              </div>
            ) : null}
          </Tile>
        </div>

        <section className="v8-community-band" aria-label="About HOWDI">
          <div>
            <h2>Shop. Book. Learn. Earn. Belong.</h2>
            <p>Real people. Real skills. Real opportunities — all in one place.</p>
          </div>
          {hype.state === "ready" && hype.items.length ? (
            <>
              <div className="v8-stack" aria-hidden="true">{hype.items.slice(0, 4).map((c) => <Ava key={c.public_username} src={c.avatar_url} name={c.display_name} />)}</div>
              <p>A growing community of creators, learners and doers.</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
