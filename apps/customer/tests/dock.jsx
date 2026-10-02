import { useState } from "react";
import { createRoot } from "react-dom/client";
import { V8BottomBar, V8Rail, V8_PILLARS } from "../src/v8/V8Shell";
import { useV8CommonHomePrefs } from "../src/v8/V8Personalization";
import "../src/v8/v8.css";

function DockFixture() {
  const [active, setActive] = useState("home");
  const [mounted, setMounted] = useState(true);
  const [customizations, setCustomizations] = useState(0);
  const [navigations, setNavigations] = useState(0);
  const [overridePillars, setPillars] = useState(null);
  const [account, setAccount] = useState("alpha");
  const [prefs, save] = useV8CommonHomePrefs(account);
  const pillars = overridePillars || prefs.dock.filter(id => !prefs.hiddenDock.includes(id)).map(id => V8_PILLARS.find(p => p.area === id));
  window.dockFixture = { setMounted, setPillars, setAccount, prefs, save };
  const navigate = (area) => { setActive(area); setNavigations((n) => n + 1); };
  return <div className="howdi-app v8">
    <V8Rail active={active} onNavigate={navigate} pillars={pillars} />
    <output id="customizations">{customizations}</output>
    <output id="navigations">{navigations}</output>
    <button id="outside" type="button">Outside dock</button>
    <div id="content-end" style={{ position: "fixed", bottom: "var(--v8-bottom)" }}>Content</div>
    {mounted && <V8BottomBar active={active} onNavigate={navigate} pillars={pillars} onCustomize={() => setCustomizations((n) => n + 1)} />}
  </div>;
}
createRoot(document.getElementById("root")).render(<DockFixture />);
