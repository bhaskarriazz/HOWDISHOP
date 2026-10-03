// Unified Notifications Center — presentational. Data comes from howdiNotifications.normalizeAll() over the
// existing sources; opening an item calls onOpen(item), which the App routes to the owning destination.
import { FILTERS, filterItems, unreadCount } from './howdiNotifications';
import './HowdiShell.css';

const ICON = { connect: '💬', shop: '🛍', works: '🛠', learn: '🎓', hpay: '₹', system: '🔔' };
const when = (iso) => { const t = Date.parse(iso || ''); if (!Number.isFinite(t)) return ''; const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

export default function HowdiNotificationCenter({ items = [], filter = 'all', onFilter, onOpen, onMarkOne, onMarkAll, loading, error, onRetry }) {
  const list = filterItems(items, filter);
  const total = unreadCount(items);
  return (
    <div className="howdi-nc" data-howdi-notifications>
      <div className="howdi-nc-head">
        <strong>Notifications{total > 0 ? <span className="howdi-nc-count" aria-label={`${total} unread`}>{total}</span> : null}</strong>
        <button type="button" className="howdi-nc-markall" onClick={onMarkAll} disabled={!total}>Mark all read</button>
      </div>
      <div className="howdi-nc-filters" role="tablist" aria-label="Notification categories">
        {FILTERS.map((f) => { const n = unreadCount(items, f.key); return (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => onFilter(f.key)} data-filter={f.key}>
            {f.label}{f.key !== 'all' && n > 0 ? <em>{n}</em> : null}
          </button>); })}
      </div>
      <div className="howdi-nc-list" role="tabpanel">
        {loading && !items.length ? <p className="howdi-nc-empty">Loading…</p> : null}
        {error ? <p className="howdi-nc-error" role="status">{error} <button type="button" onClick={onRetry}>Try again</button></p> : null}
        {!loading && !list.length ? <p className="howdi-nc-empty">{filter === 'all' ? 'You’re all caught up.' : 'Nothing here yet.'}</p> : null}
        {list.map((item) => (
          <div key={item.key} className={`howdi-nc-item ${item.unread ? 'unread' : ''}`} data-key={item.key} data-category={item.category}>
            <button type="button" className="howdi-nc-open" onClick={() => onOpen(item)} disabled={!item.target && !item.unread}
              aria-label={`${item.title}. ${item.message}${item.target ? '' : ' (no page to open)'}`}>
              <span className="howdi-nc-icon" aria-hidden="true">{ICON[item.category]}</span>
              <span className="howdi-nc-text"><b>{item.title}</b>{item.message ? <small>{item.message}</small> : null}<i>{when(item.at)}</i></span>
              {item.unread ? <span className="howdi-nc-dot" aria-hidden="true" /> : null}
            </button>
            {item.unread && item.canMarkOne ? <button type="button" className="howdi-nc-read" onClick={() => onMarkOne(item)} aria-label={`Mark “${item.title}” as read`}>✓</button> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
