import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { V8BottomBar, V8Rail, V8_PILLARS } from '../../src/v8/V8Shell';
import { V8CustomizeHome, useV8CommonHomePrefs } from '../../src/v8/V8Personalization';
import '../../src/v8/v8.css';

function Shell() {
  const [account, setAccount] = useState('alice');
  const [prefs, save] = useV8CommonHomePrefs(account);
  const [active, navigate] = useState('home');
  const [customize, setCustomize] = useState(false);
  const [mounted, setMounted] = useState(true);
  const pillars = prefs.dock.filter(id => !prefs.hiddenDock.includes(id)).map(id => V8_PILLARS.find(p => p.area === id));
  return <div className="howdi-app v8">
    <main style={{ marginLeft: 'var(--v8-rail)' }}>
      <h1>Dock integration fixture</h1>
      <label>Account<select value={account} onChange={e => setAccount(e.target.value)}><option>alice</option><option>bob</option></select></label>
      <button onClick={() => setMounted(false)}>Unmount dock</button>
      <button onClick={() => navigate('move')}>External navigation</button>
      <output data-testid="active">{active}</output>
      <output hidden data-testid="prefs">{JSON.stringify(prefs)}</output>
    </main>
    <V8Rail active={active} onNavigate={navigate} pillars={pillars} />
    {mounted && <V8BottomBar active={active} onNavigate={navigate} pillars={pillars} onCustomize={() => setCustomize(true)} />}
    <V8CustomizeHome open={customize} prefs={prefs} onSave={save} onClose={() => setCustomize(false)} />
  </div>;
}
createRoot(document.getElementById('root')).render(<Shell />);
