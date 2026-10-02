// Browser-only fixture: exercise the real preference hook across account switches.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { V8BottomBar, V8_PILLARS } from "../src/v8/V8Shell";
import { useV8CommonHomePrefs, V8CustomizeHome } from "../src/v8/V8Personalization";
import "../src/v8/v8.css";

function Fixture() {
  const [account, setAccount] = useState("dock-test-a");
  const [prefs, save] = useV8CommonHomePrefs(account);
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const pillars = prefs.dock.filter((area) => !prefs.hiddenDock.includes(area)).map((area) => V8_PILLARS.find((p) => p.area === area));
  return <div className="howdi-app v8">
    <button onClick={() => setAccount((value) => value === "dock-test-a" ? "dock-test-b" : "dock-test-a")}>Switch account</button>
    <button onClick={() => setMounted(false)}>Unmount dock</button>
    <output aria-label="Account">{account}</output>
    <output aria-label="Preferences">{JSON.stringify(prefs)}</output>
    {mounted ? <V8BottomBar active={active} onNavigate={setActive} pillars={pillars} onCustomize={() => setOpen(true)} /> : null}
    <V8CustomizeHome open={open} prefs={prefs} onSave={save} onClose={() => setOpen(false)} />
  </div>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
