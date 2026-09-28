import { useCallback, useEffect, useState } from 'react';
import MoveAdmin from './MoveAdmin.jsx';
import './MasterAdmin.css';

const API=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/+$/,'');
const TOKEN_KEY='howdiAdminToken';

const NAV=[
  ['control','⌂','Control Tower','ADM-B02'],
  ['access','♙','People & access','ADM-B01'],
  ['shop','▣','Shop operations','ADM-B07'],
  ['works','⌕','Works operations','ADM-B08/B12'],
  ['move','⌁','Move operations','ADM-RIDE'],
  ['learn','▤','Learn & Earn','ADM-B09'],
  ['finance','▰','Finance & HPay','ADM-B05/B13'],
  ['trust','⬡','Trust & safety','ADM-B10'],
  ['support','▱','Support & incidents','ADM-B16'],
  ['audit','▧','Audit','ADM-B11'],
];

const BOARD_INFO={
  shop:{id:'ADM-B07',title:'Shop & vendor operations',description:'Vendor review, listings, catalogue health, fulfilment exceptions and reasoned decisions.',flows:'ADM-SHP',status:'Visual accepted · runtime integration pending'},
  works:{id:'ADM-B08 / ADM-B12',title:'Works & worker operations',description:'Worker verification, jobs, disputes, quality, acceptance-dependent privacy and service controls.',flows:'ADM-WRK',status:'Visual accepted · runtime integration pending'},
  learn:{id:'ADM-B09',title:'Learn & Earn operations',description:'Teacher review, course quality, learner proof, credentials and protected learning operations.',flows:'ADM-LRN',status:'Visual accepted · runtime integration pending'},
  finance:{id:'ADM-B05 / ADM-B13',title:'Finance & HPay',description:'Payout, refund, ledger, settlement, reconciliation, risk and two-person approval controls.',flows:'ADM-FIN',status:'Visual accepted · runtime integration pending'},
  trust:{id:'ADM-B10',title:'Trust, safety & legal',description:'Moderation, legal holds, data protection, family safety and controlled evidence access.',flows:'ADM-TRU',status:'Visual accepted · runtime integration pending'},
};

async function request(token,path,options={}){
  const res=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json','x-howdi-admin-token':token,...(options.headers||{})}});
  const json=await res.json().catch(()=>({}));
  if(!res.ok){const e=new Error(json.error||json.message||'Request failed');e.status=res.status;throw e;}
  return json;
}

function Login({onLogin}){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');
    try{
      const res=await fetch(`${API}/api/admin/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const json=await res.json().catch(()=>({}));
      if(!res.ok||!json.token)throw new Error(json.message||'Sign-in failed');
      localStorage.setItem(TOKEN_KEY,json.token);onLogin(json.token);
    }catch(err){setError(err.message||'Cannot reach HOWDI backend');}
    finally{setBusy(false);}
  }
  return <div className="ma-login">
    <section className="ma-login-brand"><div className="ma-wordmark">HOWDI</div><div className="ma-submark">MASTER ADMIN</div><h1>Internal administration, separated from the customer app.</h1><p>Named access, scoped authority, reasoned decisions and immutable audit.</p></section>
    <form className="ma-login-card" onSubmit={submit}>
      <div className="ma-kicker">ADM-AUTH-001 · REVIEW BUILD</div>
      <h2>Secure admin sign-in</h2>
      <p>Use your named administrator account. Shared admin credentials are not part of the approved target flow.</p>
      <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
      {error&&<div className="ma-alert danger">{error}</div>}
      <button className="ma-primary" disabled={busy}>{busy?'Signing in…':'Continue securely'}</button>
      <div className="ma-login-note">Passkey/MFA and device trust remain gated by ADM-B01 implementation review.</div>
    </form>
  </div>;
}

function Metric({icon,title,value,detail,tone='blue'}){
  return <article className="ma-metric"><span className={`ma-icon ${tone}`}>{icon}</span><div><small>{title}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

function ControlTower({onNavigate}){
  const pulse=[
    ['♙','People & access','72','12','Review user signups, role changes','access'],
    ['▣','Shop operations','48','8','Approve vendor KYC, resolve listings','shop'],
    ['⌕','Works operations','116','30','Assign jobs, review safety flags','works'],
    ['▤','Learn & Earn','36','6','Approve batches, review content','learn'],
    ['▰','Finance & HPay','28','8','Verify payouts, check exceptions','finance'],
    ['⬡','Trust & safety','42','18','Review reports, take moderation action','trust'],
    ['▧','Audit','14','4','Review logs, compliance items','audit'],
  ];
  const approvals=[
    ['User access','Regional Manager role','Delhi NCR · 3 team members','Neha Singh','People Ops','12 Oct 2024','10:24'],
    ['Finance','HPay payout release','₹2,48,000 · 12 vendors','Arjun Mehta','Finance','12 Oct 2024','09:40'],
    ['Vendor access','New shop vendor (KYC)','Sharma Electricals · Jaipur','Ravi Kumar','Shop Ops','11 Oct 2024','18:12'],
    ['Policy','Content exception','Learn & Earn batch material','Priya Nair','Trust & Safety','11 Oct 2024','16:55'],
    ['Finance','High-value refund','₹1,12,000 · Order #WD7842','Karan Malhotra','Customer Support','11 Oct 2024','14:20'],
    ['Safety','Works incident closure','Site #BLR-447 · Review report','S. Iqbal','Works Ops','11 Oct 2024','12:05'],
  ];
  const exceptions=[
    ['Shop & vendor exceptions','▣',[['Vendor KYC pending','28'],['Document expiry (PAN/GST)','14'],['Policy violations (listings)','8'],['Shop deactivations (review)','6']]],
    ['Works safety / job operations','⌕',[['Jobs overdue','30'],['Jobs at risk (delayed)','86'],['Safety incidents (open)','5'],['Vendor compliance expiry','12']]],
    ['Learn & Earn batch quality','▤',[['Batches awaiting approval','18'],['Content under review','9'],['Trainer verification pending','6'],['Learner complaints','4']]],
  ];
  return <div className="b02">
    <div className="b02-urgent"><span className="b02-alert">!</span><b>4 urgent items</b><span><strong>12</strong> high-risk user signups</span><span><strong>8</strong> payment exceptions (HPay)</span><span><strong>5</strong> safety incidents (Works)</span><span><strong>9</strong> policy reports (Trust & safety)</span><button>Review queue →</button></div>
    <section className="b02-kpis">
      <article><div className="b02-kpi-icon">☷</div><div className="b02-kpi-body"><h3>Review queue</h3><div className="b02-kpi-row"><div><strong className="b02-big">134</strong><span className="b02-up">▲ +48</span><p>Items awaiting review</p></div><ul><li><b>72</b>User approvals</li><li><b>28</b>Payment checks</li><li><b>18</b>Policy reports</li><li><b>16</b>Vendor verifications</li></ul></div><button>Review queue →</button></div></article>
      <article><div className="b02-kpi-icon">▰</div><div className="b02-kpi-body"><h3>HPay health</h3><div className="b02-kpi-row"><div><strong className="b02-big">99.2%</strong><p>Payment success rate</p></div><ul><li><b>1,248</b>Today's transactions</li><li><b>6</b>Payment exceptions</li><li><b>2</b>Payouts on hold</li><li><b>0</b>Bank partner issues</li></ul></div><button onClick={()=>onNavigate('finance')}>View HPay →</button></div></article>
      <article><div className="b02-kpi-icon">⌕</div><div className="b02-kpi-body"><h3>Works live jobs</h3><div className="b02-kpi-row"><div><strong className="b02-big">612</strong><p>Active jobs across India</p></div><ul><li><b>496</b>On track</li><li className="hot"><b>86</b>At risk</li><li className="hot"><b>30</b>Overdue</li></ul></div><button onClick={()=>onNavigate('works')}>View works →</button></div></article>
      <article><div className="b02-kpi-icon">♧</div><div className="b02-kpi-body"><h3>Support SLA</h3><div className="b02-kpi-row"><div><strong className="b02-big">92%</strong><p>Within SLA (24h)</p></div><ul><li><b>328</b>Open tickets</li><li><b>302</b>Within SLA</li><li className="hot"><b>26</b>Breaching</li><li className="hot"><b>18</b>Overdue</li></ul></div><button onClick={()=>onNavigate('support')}>View support →</button></div></article>
    </section>
    <section className="b02-main-grid">
      <article className="b02-panel"><header><div><h2><span>▥</span> Operating pulse</h2><p>Key queues and actions across HOWDI operations</p></div><button>View all departments →</button></header><div className="b02-tablewrap"><table><thead><tr><th>Department</th><th>Pending / Open</th><th>High priority</th><th>Action needed</th><th>View</th></tr></thead><tbody>{pulse.map(([icon,name,pending,high,action,dest])=><tr key={name}><td><span className="rowicon">{icon}</span><b>{name}</b></td><td><b>{pending}</b></td><td className="hot"><b>{high}</b></td><td>{action}</td><td><button onClick={()=>onNavigate(dest)}>View →</button></td></tr>)}</tbody></table></div></article>
      <article className="b02-panel"><header><div><h2><span>♙</span> Founder approvals</h2><p>User access, finance and policy approvals requiring founder action</p></div><button>View all approvals →</button></header><div className="b02-tablewrap"><table className="approval-table"><thead><tr><th>Type</th><th>Item</th><th>Requested by</th><th>Date</th><th>Action</th></tr></thead><tbody>{approvals.map((r,i)=><tr key={r[1]}><td><span className={`b02-tag t${i%3}`}>{r[0]}</span></td><td><b>{r[1]}</b><small>{r[2]}</small></td><td><b>{r[3]}</b><small>{r[4]}</small></td><td><b>{r[5]}</b><small>{r[6]}</small></td><td><div className="b02-actions"><button className="approve">Approve</button><button>Reject</button></div></td></tr>)}</tbody></table></div></article>
    </section>
    <section className="b02-exceptions">{exceptions.map(([title,icon,rows])=><article className="b02-panel" key={title}><header><div><h2><span>{icon}</span> {title}</h2><p>{title==='Shop & vendor exceptions'?'Vendors and listings needing attention':title==='Works safety / job operations'?'Live job and safety exceptions':'Training batches and content moderation'}</p></div><button>View all →</button></header><div className="exception-list">{rows.map(([name,count])=><div key={name}><span>{name}</span><b>{count}</b><i>›</i></div>)}</div></article>)}</section>
  </div>;
}
function SecureAccess(){
  return <>
    <div className="ma-tabs"><button className="active">Sign-in methods</button><button>Team access</button><button>Requests</button><button>Sessions & devices</button><button>Security events</button><button>Recovery</button></div>
    <section className="ma-three-col access-top">
      <article className="ma-card"><div className="ma-cardhead"><div><h3>Your security profile</h3><p>Named admin identity</p></div><button>Edit profile</button></div><div className="ma-profile"><div className="ma-avatar">F</div><div><b>Founder</b><span>Founder / CEO</span><span>Corporate Administration</span></div></div><div className="ma-small-grid"><div><span>▣</span><b>Device trust</b><small>Backend gate pending</small></div><div><span>⌘</span><b>Passkey</b><small>ADM-AUTH-001/002</small></div><div><span>⬡</span><b>MFA</b><small>Required target state</small></div><div><span>▰</span><b>Recovery</b><small>Identity review required</small></div></div></article>
      <article className="ma-card"><div className="ma-cardhead"><div><h3>Sign-in methods</h3><p>ADM-B01 visual target</p></div></div>{[['Passkey (recommended)','Primary'],['Authenticator app','Target'],['Hardware security key','Available'],['Backup codes','Set up'],['SMS (fallback only)','Fallback']].map(([a,b])=><div className="ma-setting-row" key={a}><span className="ma-setting-icon">⌘</span><div><b>{a}</b><small>Implementation gate remains open</small></div><span className={`ma-pill ${b==='Fallback'?'red':'blue'}`}>{b}</span></div>)}</article>
      <article className="ma-card"><div className="ma-cardhead"><div><h3>Request access</h3><p>Least-privilege, bounded and approved</p></div></div><div className="ma-form-grid"><label>Department<select disabled><option>Select a department</option></select></label><label>Role bundle<select disabled><option>Select a role bundle</option></select></label><label>Time limit<select disabled><option>30 days (temporary)</option></select></label><label>Reason<textarea disabled placeholder="Describe the work you need to do…"/></label></div><div className="ma-alert info">Interactive access requests stay disabled until ADM-AUTH-004/005 backend enforcement is verified.</div></article>
    </section>
    <section className="ma-two-col"><article className="ma-card"><div className="ma-cardhead"><div><h3>Access request queue</h3><p>Privileged access across teams</p></div><span className="ma-pill amber">Gate open</span></div><div className="ma-empty-approval"><span>⬡</span><b>No fabricated access requests</b><p>Real records will appear after scoped request and dual-review APIs are connected.</p></div></article><article className="ma-card"><div className="ma-cardhead"><div><h3>Active sessions & devices</h3><p>Named sessions only</p></div><span className="ma-pill amber">Partial</span></div><div className="ma-empty-approval"><span>▣</span><b>Session review wiring pending</b><p>The approved view requires revoke, suspicious-session and safe-recovery controls.</p></div></article></section>
  </>;
}

function AuditView({token}){
  const [rows,setRows]=useState([]);const [error,setError]=useState('');
  useEffect(()=>{request(token,'/api/admin/v8/move/audits').then(x=>setRows(x.audits||[])).catch(e=>setError(e.message));},[token]);
  return <><section className="ma-metric-grid"><Metric icon="♙" title="Privileged actions" value={rows.length} detail="Move audit records loaded"/><Metric icon="⚠" title="Approvals awaiting" value="—" detail="Two-person queue not wired" tone="red"/><Metric icon="▥" title="Active incidents" value="—" detail="Open B11 cross-platform gate" tone="red"/><Metric icon="▰" title="Service health" value="—" detail="Reliability feeds pending" tone="aqua"/></section>{error&&<div className="ma-alert warning">{error}</div>}<section className="ma-card"><div className="ma-cardhead"><div><h3>Audit activity</h3><p>Immutable record of connected privileged actions</p></div><span className="ma-pill green">Move audit live</span></div><div className="ma-table-wrap"><table className="ma-table"><thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.staff_handle}</td><td>{x.action}</td><td>{x.target_id}</td><td>{x.reason||'—'}</td></tr>)}{!rows.length&&<tr><td colSpan="5">No connected audit rows yet.</td></tr>}</tbody></table></div></section><section className="ma-safe-states"><h3>Universal safe states</h3><div>{['Loading','Empty state','Offline state','Permission recovery','Isolated error','Duplicate submit','Session expired','Destructive action'].map(x=><article key={x}><b>{x}</b><small>ADM-B11 gate</small></article>)}</div></section></>;
}

function SupportView({token}){
  const [cases,setCases]=useState([]);const [selected,setSelected]=useState(null);const [error,setError]=useState('');
  const load=useCallback(()=>request(token,'/api/admin/v8/move/cases').then(x=>{const r=x.cases||[];setCases(r);setSelected(s=>s||r[0]||null)}).catch(e=>setError(e.message)),[token]);
  useEffect(()=>{load();},[load]);
  return <><section className="ma-metric-grid"><Metric icon="▱" title="Open support cases" value={cases.filter(x=>x.status!=='RESOLVED').length} detail="Connected Move cases"/><Metric icon="◷" title="SLA at risk" value="—" detail="Cross-platform SLA feed pending" tone="red"/><Metric icon="⚠" title="Active incidents" value={cases.filter(x=>x.status!=='RESOLVED').length} detail="Connected Move incident cases" tone="red"/><Metric icon="♙" title="Quality reviews" value="—" detail="Worker quality feed pending"/></section>{error&&<div className="ma-alert warning">{error}</div>}<section className="ma-support-grid"><article className="ma-card"><div className="ma-cardhead"><div><h3>Support command queue</h3><p>Public-safe, scoped case view</p></div></div><div className="ma-table-wrap"><table className="ma-table"><thead><tr><th>Case</th><th>Ride</th><th>Type</th><th>Severity</th><th>Status</th></tr></thead><tbody>{cases.map(x=><tr key={x.id} onClick={()=>setSelected(x)} className={selected?.id===x.id?'selected':''}><td><b>{x.id}</b></td><td>{x.public_ride_code}</td><td>{x.case_type}</td><td><span className={`ma-pill ${String(x.severity).toLowerCase()==='critical'?'red':'amber'}`}>{x.severity}</span></td><td>{x.status}</td></tr>)}{!cases.length&&<tr><td colSpan="5">No Move support cases.</td></tr>}</tbody></table></div></article><article className="ma-card incident-command"><div className="ma-cardhead"><div><h3>Incident command</h3><p>Reasoned high-impact action flow</p></div></div>{selected?<><div className="incident-title"><span className="ma-pill red">{selected.severity}</span><b>{selected.id}</b></div><p>{selected.case_type} · {selected.public_ride_code}</p><dl><dt>Customer</dt><dd>{selected.customer_handle}</dd><dt>Driver</dt><dd>{selected.driver_handle}</dd><dt>Payout hold</dt><dd>{selected.payout_hold?'YES':'NO'}</dd><dt>Status</dt><dd>{selected.status}</dd></dl><div className="ma-alert danger">Escalation, evidence and resolution actions remain available in the connected Move module and are audit logged.</div><button className="ma-primary" onClick={()=>location.hash='move'}>Open connected incident controls</button></>:<div className="ma-empty-approval">Select a case to inspect.</div>}</article></section></>;
}

function BoardPlaceholder({info}){return <section className="ma-board-placeholder"><div className="ma-kicker">{info.id}</div><h2>{info.title}</h2><p>{info.description}</p><div className="ma-placeholder-grid"><article className="ma-card"><h3>Approved visual board</h3><p>{info.status}</p><span className="ma-pill blue">{info.flows}</span></article><article className="ma-card"><h3>Integration rule</h3><p>Reuse verified functionality from the old Admin only after it is mapped to this board. No old shell or styling is carried forward.</p></article><article className="ma-card"><h3>Founder gate</h3><p>1440 / 768 / 390 localhost proof, happy path, loading, empty, error, denied and audit states are still required before PASS.</p></article></div></section>}

export default function MasterAdminApp(){
  const [token,setToken]=useState(()=>localStorage.getItem(TOKEN_KEY)||'');
  const [tab,setTab]=useState(()=>location.hash.replace('#','')||'control');
  useEffect(()=>{const onHash=()=>setTab(location.hash.replace('#','')||'control');addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash)},[]);
  const go=(id)=>{location.hash=id;setTab(id)};
  const current=NAV.find(x=>x[0]===tab)||NAV[0];
  if(!token)return <Login onLogin={setToken}/>;
  return <div className="ma-shell"><aside className="ma-sidebar"><div className="ma-logo"><b>HOWDI</b><span>MASTER ADMIN</span></div><nav>{NAV.map(([id,icon,label,board])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><span className="navglyph">{icon}</span><span>{label}<small>{board}</small></span></button>)}</nav><button className="ma-signout" onClick={()=>{localStorage.removeItem(TOKEN_KEY);setToken('')}}>Sign out</button></aside><div className="ma-workspace"><header className="ma-topbar"><div><div className="ma-page-title">{current[2]}</div><div className="ma-page-sub">{current[3]} · Founder review branch</div></div><div className="ma-global-search">⌕ <input placeholder="Search users, shops, jobs, payments, tickets…"/></div><div className="ma-user"><div className="ma-avatar small">F</div><div><b>Founder</b><span>Master Admin</span></div></div></header><main className="ma-main">{tab==='control'?<ControlTower token={token} onNavigate={go}/>:tab==='access'?<SecureAccess/>:tab==='move'?<MoveAdmin token={token}/>:tab==='audit'?<AuditView token={token}/>:tab==='support'?<SupportView token={token}/>:<BoardPlaceholder info={BOARD_INFO[tab]}/>}</main></div></div>;
}
