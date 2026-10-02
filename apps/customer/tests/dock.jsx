import { useState } from "react";
import { createRoot } from "react-dom/client";
import { V8BottomBar, V8Rail, V8_DOCK_ITEMS } from "../src/v8/V8Shell";
import { V8Spark } from "../src/v8/V8Spark";
import { useV8CommonHomePrefs, V8CustomizeHome } from "../src/v8/V8Personalization";
import "../src/v8/v8.css";

function DockFixture() {
  const [sparkOpen, setSparkOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [mounted, setMounted] = useState(true);
  const [customizations, setCustomizations] = useState(0);
  const [navigations, setNavigations] = useState(0);
  const [overridePillars, setPillars] = useState(null);
  const [account, setAccount] = useState("alpha");
  const [prefs, save] = useV8CommonHomePrefs(account);
  const pillars = overridePillars || prefs.dock.filter(id => !prefs.hiddenDock.includes(id)).map(id => ({ ...V8_DOCK_ITEMS.find(p => p.area === id), personalLabel: prefs.dockLabels[id] }));
  window.dockFixture = { setMounted, setPillars, setAccount, prefs, save };
  const navigate = (area) => { if (area === "spark") { setSparkOpen(true); return; } setActive(area); setNavigations((n) => n + 1); };
  return <div className="howdi-app v8">
    <V8Rail active={active} onNavigate={navigate} pillars={pillars} />
    <output id="active">{active}</output>
    <button id="customize" style={{ position: "fixed", top: 180, right: 20 }} onClick={() => setCustomizeOpen(true)}>Customize</button>
    <V8Spark open={sparkOpen} onClose={() => setSparkOpen(false)} onNavigate={navigate} onCustomize={() => setCustomizeOpen(true)} />
    <V8CustomizeHome open={customizeOpen} prefs={prefs} onSave={save} onClose={() => setCustomizeOpen(false)} />
    <output id="customizations">{customizations}</output>
    <output id="navigations">{navigations}</output>
    <button id="outside" type="button">Outside dock</button>
    <div id="content-end" style={{ position: "fixed", bottom: "var(--v8-bottom)" }}>Content</div>
    {mounted && <V8BottomBar active={active} onNavigate={navigate} pillars={pillars} iconStyle={prefs.dockIconStyle} onCustomize={() => setCustomizations((n) => n + 1)} />}
  </div>;
}
createRoot(document.getElementById("root")).render(<DockFixture />);
