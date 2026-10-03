// My Spaces / Switch Space — shell entry. One account, different context.
// Only the Personal Space exists today. School, College and Workplace Spaces have no backend yet, so they are
// shown as "Planned" (never as switchable). Business / Store opens the EXISTING Shop seller workspace.
// Nothing here shows or stores an internal id.
import { useEffect, useRef, useState } from 'react';
import './HowdiShell.css';

const SPACES = [
  { key: 'personal', label: 'Personal', note: 'Your HOWDI', state: 'active' },
  { key: 'school', label: 'School', note: 'Classes, results, fees', state: 'planned' },
  { key: 'college', label: 'College', note: 'Courses, exams, placements', state: 'planned' },
  { key: 'business', label: 'Business / Store', note: 'Your seller workspace in Shop', state: 'shop' },
  { key: 'workplace', label: 'Workplace', note: 'Attendance, leave, documents', state: 'planned' },
];

export default function HowdiSpaceSwitcher({ onOpenStore, style }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => { if (wrap.current && !wrap.current.contains(event.target)) setOpen(false); };
    const esc = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="howdi-space" ref={wrap} style={style}>
      <button type="button" className="howdi-space-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="My Spaces">
        <span aria-hidden="true">◫</span><b>Personal</b><i aria-hidden="true">⌄</i>
      </button>
      {open && (
        <div className="howdi-space-panel" role="dialog" aria-label="My Spaces">
          <p className="howdi-space-head"><b>My Spaces</b><small>One account, different context</small></p>
          <ul>
            {SPACES.map((s) => (
              <li key={s.key}>
                {s.state === 'shop' ? (
                  <button type="button" className="howdi-space-row" onClick={() => { setOpen(false); onOpenStore?.(); }}>
                    <span><b>{s.label}</b><small>{s.note}</small></span><em className="go">Open</em>
                  </button>
                ) : (
                  <div className={`howdi-space-row ${s.state}`} aria-current={s.state === 'active' ? 'true' : undefined}>
                    <span><b>{s.label}</b><small>{s.note}</small></span>
                    <em className={s.state}>{s.state === 'active' ? 'Active' : 'Planned'}</em>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="howdi-space-foot">School, College and Workplace Spaces arrive with HOWDI Spaces. Your personal activity is never shared with an organisation.</p>
        </div>
      )}
    </div>
  );
}
