import { useEffect, useMemo, useRef, useState } from 'react';
import './HowdiDockV2.css';

const STORAGE_KEY = 'howdi:dock:v2';

const DESTINATIONS = {
  connect: { label: 'Connect', icon: '◎', terms: ['connect', 'home'] },
  shop: { label: 'Shop', icon: '◇', terms: ['shop'] },
  spark: { label: 'Spark', icon: '✦', terms: ['spark', 'ask howdi', 'ask ai'] },
  move: { label: 'Move', icon: '➜', terms: ['move', 'rides', 'ride'] },
  work: { label: 'Work', icon: '⌁', terms: ['works', 'work'] },
  learn: { label: 'Learn', icon: '△', terms: ['learn & earn', 'learn and earn', 'learn'] },
  messages: { label: 'Messages', icon: '□', terms: ['messages', 'message'] },
  hpay: { label: 'HPay', icon: '₹', terms: ['hpay', 'wallet'] },
  vibe: { label: 'Vibe', icon: '▶', terms: ['vibe'] },
  profile: { label: 'My HOWDI', icon: '○', terms: ['my howdi', 'profile'] },
};

const DEFAULT_ITEMS = [
  { key: 'connect', label: 'Connect' },
  { key: 'shop', label: 'Shop' },
  { key: 'spark', label: 'Spark' },
  { key: 'move', label: 'Move' },
  { key: 'work', label: 'Work' },
  { key: 'learn', label: 'Learn' },
];

function readDock() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(saved) || saved.length !== 6) return DEFAULT_ITEMS;
    const sparkCount = saved.filter((item) => item?.key === 'spark').length;
    if (sparkCount !== 1 || saved[2]?.key !== 'spark') return DEFAULT_ITEMS;
    if (saved.some((item) => !DESTINATIONS[item?.key])) return DEFAULT_ITEMS;
    return saved.map((item) => ({
      key: item.key,
      label: String(item.label || DESTINATIONS[item.key].label).slice(0, 14),
    }));
  } catch {
    return DEFAULT_ITEMS;
  }
}

// Navigation handshake with the customer App (no DOM text matching).
// The dock asks; App.jsx answers through its own existing navigation (openNavigationOSArea etc.)
// and marks the request handled. If nothing answers, the destination isn't available on this build.
export function requestHowdiDestination(destination) {
  const detail = { destination, handled: false };
  window.dispatchEvent(new CustomEvent('howdi:navigate', { detail }));
  return detail.handled === true;
}

// Which dock key should look active for the App's current canonical destination.
// A destination that isn't pinned falls back to the pillar that owns it (Messages/Vibe live in Connect).
export function dockActiveKey(active, keys) {
  if (!active) return '';
  if (keys.includes(active)) return active;
  if ((active === 'messages' || active === 'vibe') && keys.includes('connect')) return 'connect';
  return '';
}

export default function HowdiDockV2() {
  const [items, setItems] = useState(readDock);
  const [editing, setEditing] = useState(false);
  const [sparkOpen, setSparkOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState(() => (typeof window !== 'undefined' && window.__howdiActiveDestination) || '');
  const holdTimer = useRef(null);
  const heldRef = useRef(false);

  useEffect(() => {
    const onActive = (event) => setActive(String(event.detail?.destination || ''));
    window.addEventListener('howdi:active', onActive);
    // The App mounts first and may have announced its destination before this listener existed.
    if (window.__howdiActiveDestination) setActive(String(window.__howdiActiveDestination));
    // One permanent bottom navigation on mobile: while the dock is mounted it replaces the legacy mobile bar.
    document.documentElement.classList.add('howdi-dock-v2-on');
    return () => { window.removeEventListener('howdi:active', onActive); document.documentElement.classList.remove('howdi-dock-v2-on'); };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  const usedKeys = useMemo(() => new Set(items.map((item) => item.key)), [items]);

  const beginHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    heldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true; // the release that follows a hold must not navigate
      setEditing(true);
      holdTimer.current = null;
    }, 2000);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const flash = (text) => { setNotice(text); window.setTimeout(() => setNotice(''), 3200); };

  const navigate = (key) => {
    if (editing || heldRef.current) { heldRef.current = false; return; }
    if (key === 'spark') {
      setSparkOpen(true);
      return;
    }
    if (!requestHowdiDestination(key)) flash(`${DESTINATIONS[key].label} isn’t available on HOWDI yet.`);
  };

  const sparkGo = (key) => {
    setSparkOpen(false);
    if (!requestHowdiDestination(key)) flash('That part of HOWDI isn’t available yet.');
  };

  const activeKey = dockActiveKey(active, items.map((item) => item.key));

  const renameItem = (index, label) => {
    if (items[index].key === 'spark') return;
    const clean = label.replace(/\s+/g, ' ').trimStart().slice(0, 14);
    setItems((current) => current.map((item, i) => (i === index ? { ...item, label: clean } : item)));
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (items[index].key === 'spark' || target < 0 || target >= items.length || target === 2) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const replaceItem = (index, key) => {
    if (index === 2 || items[index].key === 'spark') return;
    if (key === 'spark' || usedKeys.has(key)) return;
    const next = [...items];
    next[index] = { key, label: DESTINATIONS[key].label };
    setItems(next);
  };

  const resetDock = () => setItems(DEFAULT_ITEMS);

  return (
    <div className="howdi-dock-v2-root" data-howdi-dock-v2>
      {notice && <div className="howdi-dock-v2-notice" role="status">{notice}</div>}

      <nav
        className="howdi-dock-v2"
        aria-label="HOWDI quick access"
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(event) => {
          event.preventDefault();
          setEditing(true);
        }}
      >
        {items.map((item, index) => {
          const meta = DESTINATIONS[item.key];
          const isSpark = item.key === 'spark';
          return (
            <button
              key={`${item.key}-${index}`}
              type="button"
              className={`howdi-dock-v2-item ${isSpark ? 'is-spark' : ''} ${activeKey === item.key ? 'is-active' : ''}`}
              onClick={() => navigate(item.key)}
              aria-current={activeKey === item.key ? 'page' : undefined}
              aria-label={isSpark ? 'Open Spark' : `Open ${item.label || meta.label}`}
              data-destination={item.key}
            >
              <span className="howdi-dock-v2-icon" aria-hidden="true">{meta.icon}</span>
              <span className="howdi-dock-v2-label">{item.label || meta.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="howdi-dock-v2-edit"
        onClick={() => setEditing(true)}
        aria-label="Customize quick access"
        title="Customize dock"
      >
        ⋯
      </button>

      {editing && (
        <div className="howdi-dock-v2-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditing(false);
        }}>
          <section className="howdi-dock-v2-editor" role="dialog" aria-modal="true" aria-labelledby="howdi-dock-title">
            <div className="howdi-dock-v2-editor-head">
              <div>
                <p className="howdi-dock-v2-kicker">YOUR QUICK ACCESS</p>
                <h2 id="howdi-dock-title">Customize dock</h2>
                <p>Spark stays fixed in the centre. Labels can change without changing what a shortcut opens.</p>
              </div>
              <button type="button" className="howdi-dock-v2-close" onClick={() => setEditing(false)} aria-label="Close">×</button>
            </div>

            <div className="howdi-dock-v2-editor-list">
              {items.map((item, index) => {
                const isSpark = item.key === 'spark';
                return (
                  <div className={`howdi-dock-v2-editor-row ${isSpark ? 'is-locked' : ''}`} key={`edit-${item.key}-${index}`}>
                    <div className="howdi-dock-v2-editor-main">
                      <span className="howdi-dock-v2-editor-icon">{DESTINATIONS[item.key].icon}</span>
                      <div>
                        <strong>{DESTINATIONS[item.key].label}</strong>
                        <small>{isSpark ? 'Fixed global action' : 'Shortcut identity stays unchanged'}</small>
                      </div>
                    </div>

                    {isSpark ? (
                      <span className="howdi-dock-v2-lock">Fixed</span>
                    ) : (
                      <div className="howdi-dock-v2-editor-controls">
                        <input
                          value={item.label}
                          onChange={(event) => renameItem(index, event.target.value)}
                          aria-label={`Rename ${DESTINATIONS[item.key].label}`}
                          maxLength={14}
                        />
                        <select
                          value={item.key}
                          onChange={(event) => replaceItem(index, event.target.value)}
                          aria-label={`Replace ${DESTINATIONS[item.key].label}`}
                        >
                          {Object.entries(DESTINATIONS)
                            .filter(([key]) => key !== 'spark' && (key === item.key || !usedKeys.has(key)))
                            .map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                        </select>
                        <div className="howdi-dock-v2-order">
                          <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0 || index - 1 === 2} aria-label="Move left">←</button>
                          <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1 || index + 1 === 2} aria-label="Move right">→</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="howdi-dock-v2-editor-foot">
              <button type="button" className="howdi-dock-v2-reset" onClick={resetDock}>Reset default</button>
              <button type="button" className="howdi-dock-v2-done" onClick={() => setEditing(false)}>Done</button>
            </div>
          </section>
        </div>
      )}

      {sparkOpen && (
        <div className="howdi-dock-v2-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSparkOpen(false);
        }}>
          <section className="howdi-spark-v2" role="dialog" aria-modal="true" aria-labelledby="howdi-spark-title">
            <div className="howdi-dock-v2-editor-head">
              <div>
                <p className="howdi-dock-v2-kicker">SPARK</p>
                <h2 id="howdi-spark-title">Ask, discover, prepare</h2>
                <p>Spark can prepare a HOWDI action. The owning HOWDI feature still asks you to confirm it.</p>
              </div>
              <button type="button" className="howdi-dock-v2-close" onClick={() => setSparkOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="howdi-spark-v2-actions">
              <button type="button" onClick={() => sparkGo('search')}>Ask HOWDI</button>
              <button type="button" onClick={() => sparkGo('shop')}>Find a product</button>
              <button type="button" onClick={() => sparkGo('work')}>Find a service</button>
              <button type="button" onClick={() => sparkGo('learn')}>Find a class</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
