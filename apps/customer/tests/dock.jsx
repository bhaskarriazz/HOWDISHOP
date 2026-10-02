import { useState } from "react";
import { createRoot } from "react-dom/client";
import { V8BottomBar, V8Rail, V8_PILLARS } from "../src/v8/V8Shell";
import "../src/v8/v8.css";

function DockFixture() {
  const [active, setActive] = useState("home");
  const [mounted, setMounted] = useState(true);
  const [customizations, setCustomizations] = useState(0);
  const [navigations, setNavigations] = useState(0);
  const [pillars, setPillars] = useState(V8_PILLARS);
  window.dockFixture = { setMounted, setPillars };
  const navigate = (area) => { setActive(area); setNavigations((n) => n + 1); };
  return <div className="howdi-app v8">
    <V8Rail active={active} onNavigate={navigate} pillars={pillars} />
    <output id="customizations">{customizations}</output>
    <output id="navigations">{navigations}</output>
    <button id="outside" type="button">Outside dock</button>
    {mounted && <V8BottomBar active={active} onNavigate={navigate} pillars={pillars} onCustomize={() => setCustomizations((n) => n + 1)} />}
  </div>;
}
createRoot(document.getElementById("root")).render(<DockFixture />);
