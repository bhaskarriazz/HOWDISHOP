// "Continue where you left off" — presentational only. The App passes items built by
// buildContinueItems() and one onOpen(item) handler that reuses the owning pillar's existing navigation.
import './HowdiShell.css';

const ICON = { works: '🛠', order: '🛍', learn: '🎓' };

export default function HowdiContinue({ items = [], onOpen }) {
  if (!items.length) return null;
  return (
    <section className="howdi-continue" aria-labelledby="howdi-continue-title" data-howdi-continue>
      <h2 id="howdi-continue-title">Continue where you left off</h2>
      <ul>
        {items.slice(0, 3).map((item) => (
          <li key={item.key}>
            <button type="button" className={`howdi-continue-row p${item.priority}`} onClick={() => onOpen(item)} data-kind={item.kind}>
              <span className="howdi-continue-icon" aria-hidden="true">{ICON[item.kind] || '•'}</span>
              <span className="howdi-continue-text"><b>{item.title}</b><small>{item.status}</small></span>
              <span className="howdi-continue-action">{item.action}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
