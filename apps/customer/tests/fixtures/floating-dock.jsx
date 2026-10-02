import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { V8BottomBar, V8Header, V8Rail, V8_PILLARS } from '../../src/v8/V8Shell';
import { useV8CommonHomePrefs, V8CustomizeHome } from '../../src/v8/V8Personalization';
import '../../src/v8/v8.css';

function Fixture() {
  const [account, setAccount] = useState('dock-test-a');
  const [prefs, save] = useV8CommonHomePrefs(account);
  const [active, navigate] = useState('home');
  const [customize, setCustomize] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const pillars = prefs.dock.filter((id) => !prefs.hiddenDock.includes(id)).map((id) => V8_PILLARS.find((p) => p.area === id));
  return <div className="howdi-app v8">
    <V8Rail active={active} onNavigate={navigate} pillars={pillars} />
    <V8Header search={search} onSearchChange={setSearch} searchRef={searchRef} location="Chennai" user={{ name: 'Test' }} />
    <main className="v8-page"><div className="v8-page-inner">
      <h1>Dock verification</h1><output aria-label="Current pillar">{active}</output>
      <button onClick={() => setAccount((a) => a === 'dock-test-a' ? 'dock-test-b' : 'dock-test-a')}>Switch account</button>
      <button onClick={() => setMounted(false)}>Unmount dock</button>
      <button onClick={() => navigate('learn')}>External Learn navigation</button>
    </div></main>
    {mounted && <V8BottomBar active={active} onNavigate={navigate} pillars={pillars}
      onCustomize={() => setCustomize(true)} onSearch={() => searchRef.current?.focus()} />}
    <V8CustomizeHome open={customize} prefs={prefs} onSave={save} onClose={() => setCustomize(false)} />
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture /></React.StrictMode>);
