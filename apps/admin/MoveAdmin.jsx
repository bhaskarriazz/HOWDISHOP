import { useCallback, useEffect, useMemo, useState } from "react";
import "./MoveAdmin.css";

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
async function api(token, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", "x-howdi-admin-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = {};
  try { json = await r.json(); } catch { json = { error: "Invalid JSON response" }; }
  return { ok: r.ok, status: r.status, json };
}

function Drivers({ token }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await api(token, "GET", "/api/admin/v8/move/drivers?class=" + encodeURIComponent(filter));
    if (r.status === 401) return location.reload();
    setRows(r.ok ? (r.json.drivers || []) : []);
    setMsg(r.ok ? "" : (r.json.error || "Failed to load drivers"));
  }, [token, filter]);
  useEffect(() => { load(); }, [load]);

  async function decide(driver, action) {
    const reason = window.prompt(action + " reason (required):");
    if (!reason) return;
    setBusy(driver.id + action); setMsg("");
    const r = await api(token, "POST", `/api/admin/v8/move/drivers/${driver.id}/decide`, {
      action,
      reason,
      target_class: driver.vehicle_class,
      checks: driver.checks || {},
    });
    setBusy("");
    setMsg(r.ok ? `${driver.id}: ${action} recorded` : (r.json.error || "Action failed"));
    if (r.ok) load();
  }

  return <section>
    <div className="section-head">
      <div><div className="eyebrow">ADM-RIDE-001</div><h2>Driver verification queue</h2><p className="muted">Identity, licence, registration, insurance, background and consent must pass before approval.</p></div>
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option>ALL</option><option>AUTO</option><option>BIKE</option><option>CAB</option><option>WOMEN_SPECIAL</option>
      </select>
    </div>
    {msg && <p className={msg.includes("failed") || msg.includes("Cannot") ? "error" : "ok"}>{msg}</p>}
    <div className="grid">
      {rows.map(d => <article className="move-card" key={d.id}>
        <div className="row-between"><div><b>{d.full_name}</b><div className="muted">{d.public_handle} · {d.id}</div></div><span className={"status " + String(d.application_status).toLowerCase()}>{d.application_status}</span></div>
        <dl><dt>Class</dt><dd>{d.vehicle_class}</dd><dt>Plate</dt><dd>{d.vehicle_plate}</dd><dt>Zone</dt><dd>{d.zone_id}</dd><dt>Online</dt><dd>{d.online_status}</dd></dl>
        <div className="checks">
          {Object.entries(d.checks || {}).map(([k,v]) => <span className={v ? "pass" : "fail"} key={k}>{v ? "✓" : "×"} {k}</span>)}
        </div>
        <div className="docs">{(d.documents || []).map((x,i) => <div key={i}><b>{x.name}</b><small>{x.status} · expiry {x.expiry || "—"}</small></div>)}</div>
        <div className="actions">
          <button onClick={() => decide(d,"REQUEST_INFO")} disabled={!!busy}>Ask info</button>
          <button className="danger" onClick={() => decide(d,"REJECT")} disabled={!!busy}>Reject</button>
          <button className="primary" onClick={() => decide(d,"APPROVE")} disabled={!!busy}>Approve</button>
        </div>
      </article>)}
    </div>
  </section>;
}

function Operations({ token }) {
  const [data, setData] = useState({ zones:[], classes:[], rides:[], metrics:{} });
  const [msg,setMsg] = useState("");
  const [gateBusy,setGateBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await api(token,"GET","/api/admin/v8/move/operations");
    if (r.status === 401) return location.reload();
    if (r.ok) setData(r.json); else setMsg(r.json.error || "Failed to load operations");
  },[token]);
  useEffect(()=>{load();},[load]);

  async function pause(target_type,target_id,pause) {
    const reason = window.prompt((pause ? "Pause " : "Resume ") + target_id + " — reason:");
    if (!reason) return;
    const r = await api(token,"POST","/api/admin/v8/move/pause-control",{target_type,target_id,pause,reason});
    setMsg(r.ok ? r.json.message : (r.json.error || "Action failed"));
    if(r.ok) load();
  }
  async function dispatch(ride) {
    const driver_id = window.prompt("Driver application ID (example APP-RD-205):");
    if (!driver_id) return;
    const reason = window.prompt("Manual dispatch reason:");
    if (!reason) return;
    const r = await api(token,"POST",`/api/admin/v8/move/rides/${ride.public_ride_code}/dispatch`,{driver_id,reason});
    const resultMessage = r.ok ? r.json.message : (r.json.error || "Dispatch failed");
    setMsg(resultMessage);
    window.alert(resultMessage);
    if(r.ok) load();
  }

  async function runWomenSpecialNegativeGate() {
    if (!import.meta.env.DEV) return;
    setGateBusy(true);
    let resultMessage = "";
    try {
      const prep = await api(token,"POST","/api/admin/v8/move/review/prepare-women-special-negative",{});
      if (!prep.ok) throw new Error(prep.json.error || "Could not prepare review fixture");

      const attempt = await api(token,"POST","/api/admin/v8/move/rides/HR-334W/dispatch",{
        driver_id:"APP-RD-TEST-MALE",
        reason:"Founder Women Special negative gate verification"
      });

      if (attempt.ok) {
        resultMessage = "FAIL: Women Special ride incorrectly allowed a male/non-eligible driver.";
      } else if (String(attempt.json.error || "").includes("Women Special")) {
        resultMessage = "PASS: Women Special non-fallback gate blocked the male/non-eligible driver.\n\n" + attempt.json.error;
      } else {
        resultMessage = "BLOCKED, but by an unexpected rule: " + (attempt.json.error || "Unknown error");
      }
    } catch (e) {
      resultMessage = "Founder gate setup failed: " + (e?.message || String(e));
    } finally {
      const cleanup = await api(token,"POST","/api/admin/v8/move/review/cleanup-women-special-negative",{}).catch(()=>null);
      if (cleanup && !cleanup.ok) resultMessage += "\nCleanup warning: " + (cleanup.json?.error || "failed");
      setGateBusy(false);
      setMsg(resultMessage);
      window.alert(resultMessage);
      load();
    }
  }

  const m=data.metrics||{};
  return <section>
    <div className="section-head"><div><div className="eyebrow">ADM-RIDE-002</div><h2>Instant dispatch & controls</h2><p className="muted">Zone/class pause controls and guarded manual dispatch.</p></div>{import.meta.env.DEV && <button className="primary" onClick={runWomenSpecialNegativeGate} disabled={gateBusy}>{gateBusy ? "Running founder gate..." : "Run Women Special founder gate"}</button>}</div>
    {msg && <p className={msg.toLowerCase().includes("failed") ? "error" : "ok"}>{msg}</p>}
    <div className="metrics"><div><b>{m.activeRequests ?? 0}</b><span>Active requests</span></div><div><b>{m.activeOffers ?? 0}</b><span>Active offers</span></div><div><b>{m.autoDisabledDrivers ?? 0}</b><span>Auto-disabled</span></div><div><b>{m.avgMatchTimeSeconds ?? "—"}s</b><span>Avg match</span></div></div>
    <h3>Zones</h3><div className="control-grid">{data.zones.map(z=><div className="move-card compact" key={z.id}><b>{z.name}</b><small>{z.id}</small><span className={"status "+(z.is_paused?"rejected":"approved")}>{z.is_paused?"PAUSED":"ACTIVE"}</span><button onClick={()=>pause("ZONE",z.id,!z.is_paused)}>{z.is_paused?"Resume":"Pause"}</button></div>)}</div>
    <h3>Classes</h3><div className="control-grid">{data.classes.map(c=><div className="move-card compact" key={c.id}><b>{c.name}</b><small>{c.id}</small><span className={"status "+(c.is_paused?"rejected":"approved")}>{c.is_paused?"PAUSED":"ACTIVE"}</span><button onClick={()=>pause("CLASS",c.id,!c.is_paused)}>{c.is_paused?"Resume":"Pause"}</button></div>)}</div>
    <h3>Recent rides</h3><div className="table-wrap"><table><thead><tr><th>Ride</th><th>Customer</th><th>Route</th><th>Class</th><th>Status</th><th>Driver</th><th></th></tr></thead><tbody>{data.rides.map(r=><tr key={r.public_ride_code}><td><b>{r.public_ride_code}</b></td><td>{r.customer_handle}</td><td>{r.pickup_name} → {r.drop_name}</td><td>{r.women_special?"WOMEN_SPECIAL":r.vehicle_class}</td><td>{r.status}</td><td>{r.driver_handle||"—"}</td><td><button onClick={()=>dispatch(r)} disabled={r.status!=="MATCHING"}>Dispatch</button></td></tr>)}</tbody></table></div>
  </section>;
}

function Cases({ token }) {
  const [rows,setRows]=useState([]); const [audits,setAudits]=useState([]); const [msg,setMsg]=useState("");
  const load=useCallback(async()=>{
    const [a,b]=await Promise.all([api(token,"GET","/api/admin/v8/move/cases"),api(token,"GET","/api/admin/v8/move/audits")]);
    if(a.status===401||b.status===401)return location.reload();
    if(a.ok)setRows(a.json.cases||[]); else setMsg(a.json.error||"Failed to load cases");
    if(b.ok)setAudits(b.json.audits||[]);
  },[token]);
  useEffect(()=>{load();},[load]);
  async function evidence(x){const r=await api(token,"GET",`/api/admin/v8/move/cases/${x.id}/evidence`); window.alert(r.ok?JSON.stringify(r.json.evidence,null,2):(r.json.error||"Failed")); if(r.ok)load();}
  async function hold(x){const reason=window.prompt((x.payout_hold?"Release":"Apply")+" payout hold — reason:");if(!reason)return;const r=await api(token,"POST",`/api/admin/v8/move/cases/${x.id}/hold`,{hold:!x.payout_hold,reason});setMsg(r.ok?r.json.message:(r.json.error||"Failed"));if(r.ok)load();}
  async function resolve(x){const resolution_notes=window.prompt("Resolution notes:");if(!resolution_notes)return;const r=await api(token,"POST",`/api/admin/v8/move/cases/${x.id}/resolve`,{resolution_notes});setMsg(r.ok?r.json.message:(r.json.error||"Failed"));if(r.ok)load();}
  return <section>
    <div className="section-head"><div><div className="eyebrow">ADM-RIDE-003</div><h2>Incident & support cases</h2><p className="muted">Restricted evidence access, payout holds and resolution are audit logged.</p></div></div>
    {msg&&<p className={msg.includes("Failed")?"error":"ok"}>{msg}</p>}
    <div className="grid">{rows.map(x=><article className="move-card" key={x.id}><div className="row-between"><div><b>{x.id}</b><div className="muted">{x.public_ride_code} · {x.case_type}</div></div><span className={"status "+String(x.status).toLowerCase()}>{x.status}</span></div><dl><dt>Customer</dt><dd>{x.customer_handle}</dd><dt>Driver</dt><dd>{x.driver_handle}</dd><dt>Severity</dt><dd>{x.severity}</dd><dt>Payout hold</dt><dd>{x.payout_hold?"YES":"NO"}</dd></dl><div className="actions"><button onClick={()=>evidence(x)}>Evidence</button><button onClick={()=>hold(x)}>{x.payout_hold?"Release hold":"Hold payout"}</button><button className="primary" onClick={()=>resolve(x)} disabled={x.status==="RESOLVED"}>Resolve</button></div></article>)}</div>
    <h3>Latest Move audit trail</h3><div className="table-wrap"><table><thead><tr><th>When</th><th>Staff</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead><tbody>{audits.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString()}</td><td>{a.staff_handle}</td><td>{a.action}</td><td>{a.target_id}</td><td>{a.reason||"—"}</td></tr>)}</tbody></table></div>
  </section>;
}

export default function MoveAdmin({ token }) {
  const [tab,setTab]=useState("drivers");
  const tabs=useMemo(()=>[
    ["drivers","ADM-RIDE-001","Driver verification"],
    ["ops","ADM-RIDE-002","Dispatch & controls"],
    ["cases","ADM-RIDE-003","Incident & support"],
  ],[]);
  return <div className="move-admin-integrated">
    <div className="move-integrated-head">
      <div><div className="eyebrow">HOWDI MOVE · ADMIN OPERATIONS</div><h2>Move control center</h2><p className="muted">Driver verification, dispatch safeguards, incidents and audited operational controls.</p></div>
      <span className="review-chip">FOUNDER REVIEW</span>
    </div>
    <nav className="move-module-tabs">{tabs.map(([k,id,label])=><button key={k} className={tab===k?"on":""} onClick={()=>setTab(k)}><small>{id}</small><span>{label}</span></button>)}</nav>
    <div className="move-module-body">{tab==="drivers"?<Drivers token={token}/>:tab==="ops"?<Operations token={token}/>:<Cases token={token}/>}</div>
  </div>;
}
