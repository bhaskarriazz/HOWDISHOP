// HOWDI V8 shell — NAV-001 (desktop text rail), NAV-002 (desktop header, fixed order),
// NAV-003 (one floating mobile bar), NAV-004 (quick actions live in the profile hub, never a second bar).
// Pure presentation: every action is a callback owned by App, so no navigation logic is duplicated here.
import { forwardRef } from "react";

export const V8_PILLARS = [
  { area: "home", label: "Home" },
  { area: "connect", label: "Connect" },
  { area: "shop", label: "Shop" },
  { area: "works", label: "Works" },
  { area: "learn", label: "Learn & Earn" },
];

const PATHS = {
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2",
  spark: "M12 3l1.8 4.9L19 9.6l-4.3 2.7L13.5 18 12 13.4 10.5 18l-1.2-5.7L5 9.6l5.2-1.7Z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-6 9a6 6 0 0 0 12 0M12 18v3",
  pin: "M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  chev: "M6 9l6 6 6-6",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15ZM10 20a2 2 0 0 0 4 0",
  cart: "M3 4h2l2.4 11h10.2L20 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5h4v5",
  connect: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8c.4-3.3 3-5 6-5s5.6 1.7 6 5M14.5 15.2c.5-.1 1-.2 1.5-.2 2.6 0 4.6 1.5 5 4",
  shop: "M5 8h14l-1 12H6ZM9 8V6a3 3 0 0 1 6 0v2",
  works: "M4 8h16v11H4ZM9 8V5h6v3M4 13h16",
  learn: "M3 9l9-4 9 4-9 4-9-4Zm4 2v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  comment: "M4 5h16v11H9l-5 4Z",
  bookmark: "M6 4h12v16l-6-4-6 4Z",
  check: "M5 12.5l4.2 4.2L19 7",
  shield: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6Z",
  store: "M4 9l1.5-5h13L20 9M4 9h16v11H4ZM4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M10 20v-5h4v5",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c.5-3.6 3.4-6 7-6s6.5 2.4 7 6M17 11a3 3 0 1 0-1-5.8M22 19c-.3-2.4-1.8-4.2-4-5",
  box: "M4 7l8-4 8 4v10l-8 4-8-4ZM4 7l8 4 8-4M12 11v10",
  filter: "M4 6h16M7 12h10M10 18h4",
  play: "M8 5v14l11-7Z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  alert: "M12 8v5M12 16.5v.5M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
  empty: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  x: "M6 6l12 12M18 6 6 18",
};

export function V8Icon({ name, size = 20, fill = false, stroke = 1.8, className, title }) {
  const d = PATHS[name] || PATHS.box;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : "true"} role={title ? "img" : undefined}
      fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

export function V8Rail({ active, onNavigate }) {
  return (
    <aside className="v8-rail" aria-label="HOWDI">
      <button type="button" className="v8-logo" onClick={() => onNavigate("home")} aria-label="HOWDI Home">HOWDI</button>
      <nav aria-label="Main">
        {V8_PILLARS.map((p) => (
          <button key={p.area} type="button" aria-current={active === p.area ? "page" : undefined} onClick={() => onNavigate(p.area)}>{p.label}</button>
        ))}
      </nav>
    </aside>
  );
}

function Avatar({ user, avatar, onClick, expanded }) {
  const name = String(user?.full_name || user?.name || "").trim();
  return (
    <button type="button" className="v8-avatar-btn" onClick={onClick} aria-expanded={expanded} aria-label={`My HOWDI${name ? `, ${name}` : ""}`}>
      {avatar ? <img src={avatar} alt="" /> : (name.charAt(0).toUpperCase() || "H")}
    </button>
  );
}

// Header order is fixed by V8 Gate NAV-002: Search · Ask HOWDI · Location … HPay · Notifications · Cart (Shop only) · Profile.
export const V8Header = forwardRef(function V8Header({
  user, avatar, search, onSearchChange, onSearchSubmit, searchRef, searchPlaceholder,
  askActive, onAsk, location, onLocation, locationOpen,
  unread, onNotifications, showCart, cartCount, onCart, onHPay,
  onProfile, profileOpen, onSignIn, onHome,
}, ref) {
  const bell = (
    <button type="button" className="v8-icon-btn" onClick={onNotifications} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
      <V8Icon name="bell" size={22} />{unread > 0 ? <em>{unread > 99 ? "99+" : unread}</em> : null}
    </button>
  );
  const cart = showCart ? (
    <button type="button" className="v8-icon-btn" onClick={onCart} aria-label={`Cart${cartCount ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ", empty"}`}>
      <V8Icon name="cart" size={22} />{cartCount > 0 ? <em>{cartCount}</em> : null}
    </button>
  ) : null;
  const profile = user
    ? <Avatar user={user} avatar={avatar} onClick={onProfile} expanded={profileOpen} />
    : <button type="button" className="v8-signin" onClick={onSignIn}>Sign in</button>;
  return (
    <header className="v8-header" ref={ref}>
      <button type="button" className="v8-logo v8-mobile-only" onClick={onHome} aria-label="HOWDI Home">HOWDI</button>
      <form className="v8-search" role="search" onSubmit={onSearchSubmit}>
        <V8Icon name="search" size={19} />
        <label className="v8-sr" htmlFor="v8-global-search">Search HOWDI</label>
        <input id="v8-global-search" ref={searchRef} type="search" value={search} maxLength={80} placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)} autoComplete="off" />
      </form>
      <button type="button" className="v8-ask v8-desktop-only" aria-pressed={Boolean(askActive)} onClick={onAsk}>
        <V8Icon name="spark" size={17} fill /><b>Ask HOWDI</b>
      </button>
      <button type="button" className="v8-location" onClick={onLocation} aria-expanded={Boolean(locationOpen)} aria-controls="howdi-location-panel" aria-label={`Location: ${location}. Change location`}>
        <V8Icon name="pin" size={18} /><span>{location}</span><V8Icon name="chev" size={16} />
      </button>
      <span className="v8-spacer v8-desktop-only" />
      <button type="button" className="v8-hpay" onClick={onHPay} aria-label="Open HPay">HPay</button>
      <span className="v8-desktop-only" style={{ display: "contents" }}>{bell}{cart}</span>
      {profile}
      <span className="v8-mobile-only v8-mobile-actions">{bell}{cart}</span>
    </header>
  );
});

export function V8BottomBar({ active, onNavigate }) {
  return (
    <nav className="v8-bottombar" aria-label="Main">
      {V8_PILLARS.map((p) => (
        <button key={p.area} type="button" aria-current={active === p.area ? "page" : undefined} onClick={() => onNavigate(p.area)}>
          <V8Icon name={p.area} size={22} /><span>{p.area === "learn" ? "Learn & Earn" : p.label}</span>
        </button>
      ))}
    </nav>
  );
}

// Visible review label so a preview can never be mistaken for another build (user requirement).
export function V8BuildLabel() {
  const build = import.meta.env.VITE_HOWDI_BUILD;
  if (!build) return null;
  return <div className="v8-build" aria-hidden="true">{build}</div>;
}

export function V8State({ kind = "empty", icon, title, message, actionLabel, onAction }) {
  return (
    <div className={`v8-state ${kind === "error" ? "v8-error" : ""}`} role={kind === "error" ? "alert" : "status"}>
      <span className="v8-state-icon"><V8Icon name={icon || (kind === "error" ? "alert" : "empty")} size={24} /></span>
      <b>{title}</b>
      {message ? <p>{message}</p> : null}
      {onAction ? <button type="button" className={`v8-btn ${kind === "error" ? "v8-btn-soft" : "v8-btn-primary"}`} onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}
