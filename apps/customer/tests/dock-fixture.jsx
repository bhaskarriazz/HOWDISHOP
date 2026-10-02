import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { V8BottomBar, V8Rail, V8Header, V8_PILLARS } from '../src/v8/V8Shell';
import { useV8CommonHomePrefs, V8CustomizeHome } from '../src/v8/V8Personalization';
import '../src/App.css';
import '../src/v8/v8.css';
import '../src/ux-recovery.css';

function Fixture() {
  const [account, setAccount] = useState('alice');
  const [active, setActive] = useState('home');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [prefs, save] = useV8CommonHomePrefs(account);
  const pillars = prefs.dock.filter((id) => !prefs.hiddenDock.includes(id))
    .map((id) => V8_PILLARS.find((p) => p.area === id));
  return <div className="howdi-app v8">
    <V8Rail active={active} onNavigate={setActive} pillars={pillars} />
    <V8Header search="" onSearchChange={() => {}} location="Bengaluru" />
    <main className="v8-page"><div className="v8-page-inner">
      <label>Account<select aria-label="Account" value={account} onChange={(e) => setAccount(e.target.value)}>
        <option>alice</option><option>bob</option><option>guest</option>
      </select></label>
      <button onClick={() => setMounted((value) => !value)}>Toggle dock</button>
      <button onClick={() => setActive('shop')}>External Shop route</button>
      <output aria-label="Current route">{active}</output>
      <output aria-label="Saved preferences">{JSON.stringify(prefs)}</output>
    </div></main>
    {mounted && <V8BottomBar active={active} pillars={pillars} onNavigate={setActive} onCustomize={() => setOpen(true)} />}
    <V8CustomizeHome open={open} prefs={prefs} onSave={save} onClose={() => setOpen(false)} />
  </div>;
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
