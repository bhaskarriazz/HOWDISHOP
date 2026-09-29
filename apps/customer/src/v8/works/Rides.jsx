import { useCallback, useEffect, useRef, useState } from 'react';
import { groupCustomerRides, recentDestinations, savedAddressText } from '../move/rideHome.mjs';
import { driverAvailability, driverOfferStatus, driverTripTitle } from '../move/driverMove.mjs';
import SendItems from '../move/SendItems';
import './rides.css';

const BASE = '/api/v8/rides';
export const rupees = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((n || 0) / 100);
export const rideWhen = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
export function RidePanel({ id, title, children }) { const admin = id.startsWith('ADM-'); return <section className="ride-panel" data-screen={id}>{admin && <div className="ride-eyebrow">{id} · Proposed extension</div>}<h2>{title}</h2>{children}{admin && <small className="ride-gate">Draft visual — awaiting Bhaskar review · implementation awaiting walkthrough</small>}</section>; }
export function RideField({ label, children }) { return <label className="ride-field"><span>{label}</span>{children}</label>; }
export function RideSafety() { return <aside className="ride-safety"><strong>Safety & support</strong><p>For immediate danger in India, call <a href="tel:112">112</a>. HOWDI Preview does not dispatch emergency help. Ride support goes to the local staff queue.</p><p>No live GPS, SMS or real money. Production licence, permit, insurance and safety gates remain closed.</p></aside>; }
export default function Rides({ api, path = '', nav, onOpenAddresses }) {
  const [config, setConfig] = useState(null), [data, setData] = useState(null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true), [stale, setStale] = useState(false);
  const [places, setPlaces] = useState([]), [placesLoading, setPlacesLoading] = useState(true), [placesError, setPlacesError] = useState('');
  const [repeat, setRepeat] = useState(null), [online, setOnline] = useState(navigator.onLine);
  const lock = useRef(false);
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const [c, d] = await Promise.all([api('GET', BASE + '/config'), api('GET', BASE)]);
    if (!c.ok || !d.ok) {
      const failed = !c.ok ? c : d;
      setError(`${failed.json?.code || (failed.status ? 'ERROR' : 'NETWORK')} · ${failed.json?.message || 'Could not load rides.'}`);
      setStale(true);
      if (failed.json?.code === 'PREVIEW_DISABLED') { setConfig(null); setData(null); }
    } else { setConfig(c.json); setData(d.json); setError(''); setStale(false); }
    setLoading(false);
  }, [api]);
  const loadPlaces = useCallback(async () => {
    setPlacesLoading(true);
    const r = await api('GET', '/api/v8/shop/addresses');
    if (r.ok) { setPlaces(Array.isArray(r.json?.items) ? r.json.items : []); setPlacesError(''); }
    else setPlacesError(r.json?.message || 'Saved addresses could not be loaded.');
    setPlacesLoading(false);
  }, [api]);
  useEffect(() => {
    load(); loadPlaces();
    const timer = setInterval(() => { if (navigator.onLine && !lock.current) load(true); }, 15000);
    const on = () => { setOnline(navigator.onLine); if (navigator.onLine) load(true); else setStale(true); };
    window.addEventListener('online', on); window.addEventListener('offline', on);
    return () => { clearInterval(timer); window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, [load, loadPlaces]);
  const call = async (method, url, body) => {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const signal = AbortSignal.timeout(15000);
      const r = await api(method, url, body, { signal });
      if (!r.ok) {
        const code = r.json?.code || (r.status ? 'ERROR' : 'NETWORK');
        const detail = code === 'OFFER_EXPIRED' ? 'This Ride offer expired or was reassigned. Refresh Driver desk for confirmed offers.'
          : code === 'SLOT_UNAVAILABLE' ? 'This Ride is no longer available because another accepted Ride overlaps. Refresh Driver desk.'
            : code === 'INELIGIBLE' ? 'The server says this driver is not eligible for this Ride. Check Driver desk status.'
              : r.json?.message || 'Request failed. Retry safely.';
        setError(r.aborted ? 'No confirmation received. Retry the same request safely.' : `${code} · ${detail}`);
        if (!r.status) setStale(true);
        return null;
      }
      setMessage(r.json.duplicate ? 'The earlier Ride request was recovered. No second ride was created.' : url.endsWith('/quote') ? '' : 'Preview ride status saved.');
      await load(true);
      return r.json;
    } finally { setBusy(false); lock.current = false; }
  };
  const sub = path.replace(/^\//, '').replace(/^rides\/?/, '');
  const selected = data?.rides?.find(r => r.code === sub);
  const customerRides = data?.rides || [];
  const groups = groupCustomerRides(customerRides);
  const repeatRide = ride => { setRepeat({ ...ride, token: crypto.randomUUID() }); nav('rides'); };
  return <div className="rides"><div className="ride-banner">LOCAL SANDBOX · PREVIEW / TEST ONLY</div>
    <header className="ride-header"><div><span className="ride-eyebrow">HOWDI Move</span><h1>Ride where you need to go.</h1><p>Choose a pickup and destination in {config?.zone || 'the preview pilot'}.</p></div><span className="ride-symbol" aria-hidden="true">↗</span></header>
    <nav className="ride-tabs" aria-label="Move sections"><button className={!sub ? 'ride-tab-active' : ''} aria-current={!sub ? 'page' : undefined} onClick={() => { setRepeat(null); nav('rides'); }}>Ride</button><button className={sub === 'trips' ? 'ride-tab-active' : ''} aria-current={sub === 'trips' ? 'page' : undefined} onClick={() => nav('rides/trips')}>Your rides</button><button onClick={() => nav('rides/items')}>Send Items</button><button className={sub === 'apply' ? 'ride-tab-active' : ''} onClick={() => nav('rides/apply')}>Drive with HOWDI</button>{data?.applications?.some(a => a.state === 'approved') && <button className={sub === 'desk' ? 'ride-tab-active' : ''} onClick={() => nav('rides/desk')}>Driver desk</button>}</nav>
    {!online && <p className="ride-alert" role="alert">Network interrupted. Last confirmed Ride status is shown; actions are paused until reconnection.</p>}
    {stale && online && data && <p className="ride-alert" role="alert">Ride status could not be refreshed. Actions are paused until the server responds.</p>}
    {error && <p className="ride-alert" role="alert">{error} <button type="button" onClick={() => { load(); loadPlaces(); }}>Retry</button></p>}
    {message && <p className="ride-notice" role="status">{message}</p>}
    {!config || !data ? <RidePanel id="RIDE-002" title={loading ? 'Loading Move…' : 'Ride service unavailable'}><p>{loading ? 'Checking pilot availability and your rides.' : 'Ride Preview/Test is unavailable for this account or environment.'}</p><button type="button" onClick={() => load()}>Retry</button></RidePanel> : <fieldset className="ride-body" disabled={busy || !online || stale} aria-busy={busy || loading}>
      {busy && <p role="status">Checking with HOWDI… Please wait.</p>}
      {sub === 'apply' ? <Application applications={data.applications} call={call} zone={config.zone} />
        : sub === 'desk' ? <DriverDesk data={data} call={call} nav={nav} />
        : selected ? <Trip ride={selected} call={call} onRepeat={repeatRide} onRefresh={() => load()} />
        : sub.startsWith('HR-') ? <RidePanel id="RIDE-002" title="Ride unavailable"><p>Permission denied or Ride not found. Open Your rides using the account that requested this trip.</p><button type="button" onClick={() => nav('rides/trips')}>Your rides</button></RidePanel>
        : sub === 'trips' ? <RidePanel id="RIDE-002" title="Your rides"><RideList rides={customerRides} nav={nav} onRepeat={repeatRide} /><button type="button" onClick={() => load()}>Refresh status</button></RidePanel>
        : sub === 'items' ? <SendItems onReturn={() => nav('rides')} />
        : <><div className="ride-home-intro"><div><h2>Where to?</h2><p>Request an Auto or Cab from the classes the pilot has enabled.</p></div><div className="ride-home-count"><b>{groups.current.length}</b><span>current rides</span></div></div><Quote key={repeat?.token || 'new'} config={config} call={call} nav={nav} seed={repeat} rides={customerRides} places={places} placesLoading={placesLoading} placesError={placesError} onRetryPlaces={loadPlaces} onOpenAddresses={onOpenAddresses} /></>}
      <details className="ride-panel ride-notifications"><summary>Preview ride updates ({data.notices?.length || 0})</summary>{data.notices?.map((n, i) => <p key={i}><b>{n.ref}</b> · {n.message}</p>)}{!data.notices?.length && <p>No ride updates yet.</p>}</details>
    </fieldset>}
    <RideSafety />
  </div>;
}
function Quote({ config, call, nav, seed, rides, places, placesLoading, placesError, onRetryPlaces, onOpenAddresses }) {
  const modes = config.modes || [];
  const firstEnabled = modes.find(mode => mode.enabled)?.name || '';
  const [form, setForm] = useState(() => ({ mode: 'instant', zone: config.zone, pickup: seed?.pickup || '', destination: seed?.destination || '', scheduled_at: '', vehicle_class: seed?.quote?.vehicle_class || firstEnabled, accessibility: seed?.quote?.accessibility || 'none', payment: seed?.quote?.payment || 'cash' }));
  const [q, setQ] = useState(null), [localError, setLocalError] = useState(''), [now, setNow] = useState(Date.now());
  const key = useRef(crypto.randomUUID()), pickupInput = useRef(null);
  const selected = modes.find(mode => mode.name === form.vehicle_class);
  const enabled = modes.some(mode => mode.enabled);
  const recent = recentDestinations(rides);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const change = (name, value) => { setForm(f => ({ ...f, [name]: value })); setQ(null); setLocalError(''); };
  const estimate = async (candidate = form) => {
    if (!selected?.enabled) { setLocalError('This vehicle class is unavailable. Choose an enabled class explicitly.'); return; }
    if (candidate.pickup.trim().length < 4 || candidate.destination.trim().length < 4 || candidate.pickup.trim().toLowerCase() === candidate.destination.trim().toLowerCase()) {
      setLocalError('Enter distinct pickup and destination meeting points.'); return;
    }
    const body = { ...candidate };
    if (candidate.mode === 'scheduled') {
      const at = Date.parse(candidate.scheduled_at);
      if (!Number.isFinite(at)) { setLocalError('Choose a valid scheduled pickup time.'); return; }
      body.scheduled_at = new Date(at).toISOString();
    } else delete body.scheduled_at;
    setLocalError('');
    const result = await call('POST', BASE + '/quote', body);
    if (result) { setQ(result); key.current = crypto.randomUUID(); }
  };
  const choosePlace = (address, field = 'destination') => {
    const candidate = { ...form, [field]: address };
    setForm(candidate); setQ(null); setLocalError('');
    if (candidate.pickup.trim().length >= 4 && candidate.destination.trim().length >= 4 && candidate.mode === 'instant') estimate(candidate);
    else if (field === 'destination' && !candidate.pickup.trim()) pickupInput.current?.focus();
  };
  const quoteExpired = q && Date.parse(q.expires_at) <= now;
  return <div className="ride-grid"><RidePanel id="RIDE-001" title="Request a Ride">
    <div className="ride-booking-mode" role="group" aria-label="Ride time"><button type="button" className={form.mode === 'instant' ? 'ride-primary' : ''} aria-pressed={form.mode === 'instant'} onClick={() => change('mode', 'instant')}>Ride now</button><button type="button" className={form.mode === 'scheduled' ? 'ride-primary' : ''} aria-pressed={form.mode === 'scheduled'} onClick={() => change('mode', 'scheduled')}>Schedule a Ride</button></div>
    <p>{form.mode === 'instant' ? 'Request an eligible driver in the local test pilot. There is no production dispatch.' : 'Choose a time 30 minutes to 7 days ahead. A driver must still accept.'}</p>
    <form onSubmit={event => { event.preventDefault(); estimate(); }}>
      <RideField label="Pickup meeting point"><input ref={pickupInput} required maxLength={300} value={form.pickup} onChange={event => change('pickup', event.target.value)} placeholder="Building, entrance or landmark" /></RideField>
      <div className="ride-location-note"><button type="button" disabled>Use current location · unavailable</button><span>Live pickup location and geocoding are not connected in Preview/Test. Enter the exact meeting point yourself.</span></div>
      <RideField label="Destination meeting point"><input required maxLength={300} value={form.destination} onChange={event => change('destination', event.target.value)} placeholder="Where would you like to go?" /></RideField>
      <div className="ride-place-section"><h3>Recent destinations</h3>{recent.length ? <div className="ride-place-list">{recent.map(place => <button type="button" key={place.rideCode} onClick={() => choosePlace(place.address)}><b>{place.address}</b><small>Use as destination</small></button>)}</div> : <p>No completed Ride destinations yet.</p>}</div>
      <div className="ride-place-section"><h3>Saved places</h3><p>From your HOWDI address book. Check the meeting point before requesting a Ride.</p>{placesLoading ? <p role="status">Loading saved addresses…</p> : placesError ? <p className="ride-alert" role="alert">{placesError} <button type="button" onClick={onRetryPlaces}>Retry</button></p> : places.length ? <div className="ride-place-list">{places.map(place => <div className="ride-saved-place" key={place.key}><b>{place.name}</b><small>{savedAddressText(place)}</small><div><button type="button" onClick={() => choosePlace(savedAddressText(place), 'pickup')}>Use as pickup</button><button type="button" onClick={() => choosePlace(savedAddressText(place))}>Use as destination</button></div></div>)}</div> : <p>No saved addresses yet.</p>}{onOpenAddresses && <button type="button" onClick={onOpenAddresses}>Manage saved addresses</button>}</div>
      <h3>Choose a vehicle</h3><div className="ride-mode-grid" role="group" aria-label="Ride class">{modes.map(mode => <button key={mode.name} type="button" aria-pressed={form.vehicle_class === mode.name} className={form.vehicle_class === mode.name ? 'ride-mode-selected' : ''} onClick={() => change('vehicle_class', mode.name)}><b>{mode.name}</b><small>{mode.enabled ? 'Preview available' : 'Unavailable'}</small></button>)}</div>
      <p className={selected?.enabled ? 'ride-notice' : 'ride-alert'} role="status">{selected?.reason || 'No configured vehicle class is available.'}</p>
      {form.vehicle_class === 'Women Special' && !selected?.enabled && <p>Women Special is closed. HOWDI will not move this request to a general driver. Choose another class only if you want to.</p>}
      {!enabled && <p className="ride-alert" role="alert">Ride service is unavailable in this pilot area. No request can be placed.</p>}
      {form.mode === 'scheduled' && <RideField label="Pickup date and time (your device time)"><input required type="datetime-local" value={form.scheduled_at} onChange={event => change('scheduled_at', event.target.value)} /></RideField>}
      <RideField label="Accessibility need"><select value={form.accessibility} onChange={event => change('accessibility', event.target.value)}><option value="none">No additional requirement</option><option value="step_free">Verified step-free vehicle required</option></select></RideField>
      <RideField label="Payment"><select value={form.payment} onChange={event => change('payment', event.target.value)}><option value="cash">Cash · test collection</option><option value="hpay_test">HPay Test · no real charge</option></select></RideField>
      {localError && <p className="ride-alert" role="alert">{localError}</p>}
      <button type="submit" className="ride-primary" disabled={!selected?.enabled}>Review fare and availability</button>
    </form>
  </RidePanel><RidePanel id={form.mode === 'scheduled' ? 'RIDE-013' : 'RIDE-002'} title="Review your Ride">
    {q ? <><div className="ride-route"><span>Pickup · {form.pickup}</span><i /><span>Destination · {form.destination}</span></div><p>{q.vehicle_class} · {q.mode === 'instant' ? 'Ride now' : rideWhen(q.scheduled_at)} · {q.payment === 'cash' ? 'Cash test collection' : 'HPay Test'}</p><div className="ride-fare"><span>Server estimate · Preview/Test</span><strong>{rupees(q.fare.total)}</strong></div><dl><dt>Base fare</dt><dd>{rupees(q.fare.base)}</dd><dt>Scheduled pickup</dt><dd>{rupees(q.fare.scheduled)}</dd><dt>Service</dt><dd>{rupees(q.fare.service)}</dd></dl><p>{q.fare.basis}</p><p>{q.cancellation}</p><p>Quote expires {rideWhen(q.expires_at)}. Driver eligibility and service availability are checked again by the server.</p>{quoteExpired ? <><p className="ride-alert" role="alert">This quote expired. Check a new fare before requesting a Ride.</p><button type="button" onClick={() => estimate()}>Refresh fare</button></> : <button type="button" className="ride-primary" disabled={!selected?.enabled} onClick={async () => { const result = await call('POST', BASE + '/bookings', { quote_code: q.code, request_key: key.current }); if (result?.ride) nav('rides/' + result.ride.code); }}>Request Ride · accept shown fare and cancellation terms</button>}</> : <><div className="ride-route"><span>01 · Your pickup</span><i /><span>02 · Your destination</span></div><p>Choose an enabled class, check the server estimate, then request your Ride.</p><p>Pickup details and vehicle plate remain private until both people confirm disclosure. Check the plate and share the pickup PIN in person.</p></>}
  </RidePanel></div>;
}

function RideList({ rides, nav, onRepeat }) {
  const groups = groupCustomerRides(rides);
  if (!Object.values(groups).some(list => list.length)) return <p>No rides yet. Requested and scheduled rides will appear here.</p>;
  return <div className="ride-history">{[['current', 'Current and upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled or expired']].map(([key, title]) => <section key={key}><h3>{title} <small>{groups[key].length}</small></h3>{groups[key].length ? <div className="ride-list">{groups[key].map(ride => <article key={ride.code}><button type="button" onClick={() => nav('rides/' + ride.code)}><strong>{ride.destination || ride.code}</strong><span>{ride.quote.vehicle_class} · {ride.state.replaceAll('_', ' ')} · {rideWhen(ride.quote.scheduled_at)}</span><span>{rupees(ride.quote.fare.total)} · {ride.quote.payment === 'cash' ? 'Cash test' : 'HPay Test'}</span></button>{key === 'completed' && ride.pickup && ride.destination && <button type="button" className="ride-repeat" onClick={() => onRepeat(ride)}>Repeat route · new fare check</button>}</article>)}</div> : <p>No {title.toLowerCase()} rides.</p>}</section>)}</div>;
}
const appForm = a => Object.fromEntries(Object.entries(a?.details || {}).map(([k,v]) => [k, k.endsWith('_until') && Number.isFinite(Date.parse(v)) ? new Date(Date.parse(v) - new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16) : v]));
function Application({ applications, call, zone }) {
  const [cls, setCls] = useState('Auto'), a = applications.find(a => a.vehicle_class === cls), [form, setForm] = useState(appForm(a)), [saved, setSaved] = useState(a?.code), [kind, setKind] = useState('identity');
  const editable = !a || ['draft', 'info_requested', 'rejected', 'expired'].includes(a.state);
  return <RidePanel id="RIDE-005" title="Drive with HOWDI"><p>Each vehicle class needs its own approval. Worker approval does not permit passenger transport.</p><RideField label="Vehicle class"><select value={cls} onChange={e => { setCls(e.target.value); const app = applications.find(a => a.vehicle_class === e.target.value); setForm(appForm(app)); setSaved(app?.code); }}><option>Auto</option><option>Cab</option></select></RideField><p><b>Status: {a?.state || 'Not started'}</b> · {zone}</p>{a?.reason && <p className="ride-notice">Staff: {a.reason}</p>}
    <fieldset disabled={!editable}><form onSubmit={async e => { e.preventDefault(); const r = await call('PUT', BASE + '/application', { ...form, vehicle_class: cls, ...Object.fromEntries(['licence_until','permit_until','insurance_until'].map(k => [k, form[k] ? new Date(form[k]).toISOString() : ''])) }); if (r) setSaved(r.application.code); }}>
      {['plate', 'licence_until', 'permit_until', 'insurance_until'].map(k => <RideField key={k} label={k.replaceAll('_', ' ')}><input required value={form[k] || ''} type={k.endsWith('until') ? 'datetime-local' : 'text'} onChange={e => setForm({ ...form, [k]: e.target.value })} /></RideField>)}
      <RideField label="Vehicle accessibility"><select value={form.accessibility || 'none'} onChange={e => setForm({ ...form, accessibility: e.target.value })}><option value="none">Standard</option><option value="step_free">Step-free (staff evidence check required)</option></select></RideField>
      {['age_confirmed', 'declaration'].map(k => <label className="ride-check" key={k}><input type="checkbox" checked={!!form[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} />{k === 'age_confirmed' ? 'I am at least 18.' : 'These documents and vehicle details are accurate for preview verification.'}</label>)}<button>Save draft</button></form>
      {saved && <><h3>Private verification documents</h3><p>Saved: {a?.document_kinds?.join(", ") || "none yet"}</p><p>Use synthetic test documents only in this local sandbox. Save changes before submitting.</p><RideField label="Document type"><select value={kind} onChange={e => setKind(e.target.value)}>{['identity', 'licence', 'registration', 'permit', 'insurance', 'safety'].map(k => <option key={k}>{k}</option>)}</select></RideField><RideField label="PNG/JPEG document (up to 1 MB)"><input type="file" accept="image/png,image/jpeg" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const image = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(f); }); await call('POST', BASE + `/applications/${saved}/document`, { kind, image }); }} /></RideField><button className="ride-primary" onClick={() => call('POST', BASE + `/applications/${saved}/submit`, {})}>Submit for staff verification</button></>}
    </fieldset></RidePanel>;
}
function DriverDesk({ data, call, nav }) {
  const applications = data.applications || [], offers = data.offers || [], trips = (data.rides || []).filter(r => r.side === 'driver');
  return <><RidePanel id="RIDE-006" title="Driver desk"><p>Passenger Ride preview. The server checks driver eligibility for every online change, offer, pickup PIN and trip start.</p>
    {!applications.length ? <p className="ride-alert">Driver onboarding is required before you can go online. Start an Auto or Cab application in Drive with HOWDI.</p> : <div className="ride-driver-statuses">{applications.map(a => {
      const status = driverAvailability(a);
      return <article key={a.code} className={`ride-driver-status ${status.tone}`}><div><span className="ride-eyebrow">{a.vehicle_class} verification</span><h3>{status.title}</h3><p>{status.detail}</p><small>{a.document_kinds?.length || 0} document types on file · {a.zone}</small></div>{status.canToggle ? <button className={a.available ? '' : 'ride-primary'} onClick={() => call('POST', BASE + `/applications/${a.code}/availability`, { available: !a.available })}>{a.available ? 'Go offline' : 'Go online'}</button> : <button disabled>{a.state === 'approved' ? 'Online unavailable' : 'Verification required'}</button>}</article>;
    })}</div>}
    <p className="ride-driver-policy">Women Special is unavailable in this pilot. It is not offered as an alternative and cannot be accepted through Driver desk.</p>
    <h3>Incoming Ride offers</h3>{!offers.length && <p>No active offers. Expired or reassigned offers disappear after refresh; check confirmed preview updates and your availability.</p>}{offers.map(r => {
      const active = driverOfferStatus(r) === 'active';
      return <article className="ride-offer" key={r.code}><span className="ride-eyebrow">Ride offer</span><h3>{r.code}</h3><p>{r.quote.zone} · {r.quote.vehicle_class} · {r.quote.mode === 'instant' ? 'Ride now' : rideWhen(r.quote.scheduled_at)}</p>{r.offer_expires_at && <OfferClock until={r.offer_expires_at} />}<p>Server quote {rupees(r.quote.fare.total)} · {r.quote.accessibility}. Pickup and destination remain hidden until both people consent.</p><p className="ride-muted">This is not an earnings promise. Accepting checks availability and eligibility again on the server.</p>{active ? <div className="ride-actions"><button className="ride-primary" onClick={async () => { const x = await call('POST', BASE + `/${r.code}/accept`, {}); if (x) nav('rides/' + r.code); }}>Accept Ride</button><button onClick={() => call('POST', BASE + `/${r.code}/decline`, {})}>Reject</button></div> : <p className="ride-alert">Offer expired. Refresh Driver desk for server-confirmed offers.</p>}</article>;
    })}</RidePanel><RidePanel id="RIDE-008" title="Your driver Rides"><p>Ride state and settlement status come from the Preview/Test server. No production earnings or payout is shown here.</p>{trips.length ? <div className="ride-list">{trips.map(r => <button key={r.code} type="button" onClick={() => nav('rides/' + r.code)}><strong>{driverTripTitle(r)} · {r.code}</strong><span>{r.quote.vehicle_class} · {r.state.replaceAll('_', ' ')} · {rideWhen(r.quote.scheduled_at)}</span></button>)}</div> : <p>No assigned Rides yet.</p>}</RidePanel></>;
}

function RideProgress({ ride, driver = false }) {
  if (['cancelled', 'expired'].includes(ride.state)) return <p className="ride-alert" role="status">{ride.state === 'expired' ? 'The request expired without a driver. No charge was made.' : 'This Ride was cancelled.'}</p>;
  const steps = driver ? ['Ride accepted', 'Pickup verification', 'Trip active', 'Trip completed'] : ['Request sent', 'Driver assigned', 'Pickup verified', 'Trip completed'];
  const index = ride.state === 'requested' ? 0 : ride.state === 'accepted' ? 1 : ride.state === 'in_trip' ? 2 : 3;
  return <ol className="ride-progress" aria-label="Ride progress">{steps.map((step, i) => <li key={step} className={i <= index ? 'on' : ''} aria-current={i === index ? 'step' : undefined}>{step}</li>)}</ol>;
}

function Trip({ ride: r, call, onRepeat, onRefresh }) {
  const [agree, setAgree] = useState(false), [pin, setPin] = useState(''), [cancel, setCancel] = useState(false), [reason, setReason] = useState(''), [kind, setKind] = useState('support'), [stars, setStars] = useState(5);
  const driver = r.side === 'driver', action = (name, body = {}) => call('POST', `${BASE}/${r.code}/${name}`, body), consented = driver ? r.driver_consent : r.customer_consent;
  const title = driver ? driverTripTitle(r) : r.state === 'requested' ? r.matching === 'no_eligible_driver' ? 'No eligible driver yet' : 'Finding your driver' : r.state === 'accepted' ? 'Driver assigned' : r.state === 'in_trip' ? 'Pickup verified · trip active' : r.state === 'completed' ? 'Ride completed' : r.state === 'expired' ? 'Ride request expired' : 'Ride cancelled';
  return <div className="ride-grid"><RidePanel id={driver ? 'RIDE-007' : 'RIDE-002'} title={title}><b className="ride-code">{r.code}</b><RideProgress ride={r} driver={driver} />{r.quote.mode === 'instant' && <p>Ride now · local preview</p>}{r.state === 'requested' && r.offer_expires_at && <OfferClock until={r.offer_expires_at} />}<p>{rideWhen(r.quote.scheduled_at)} · {r.quote.vehicle_class}</p><p>{driver ? `Customer @${r.customer}` : r.driver ? `Driver @${r.driver}` : r.matching === 'no_eligible_driver' ? 'No eligible driver is available for this class, area and accessibility need. No automatic fallback. You can wait, refresh or cancel.' : 'No driver has accepted yet. You can wait, refresh or cancel.'}</p><p>{rupees(r.quote.fare.total)} · {r.quote.payment === 'cash' ? 'Cash test collection' : 'HPay Test'}</p>
    {r.state === 'accepted' && !driver && <p className="ride-notice">A driver accepted. Live arrival and arrived status are unavailable in this pilot. The pickup is verified only when the driver enters your PIN.</p>}
    {r.state === 'accepted' && driver && <p className="ride-notice">Navigate to the disclosed pickup using your own approved navigation tool. HOWDI does not provide a map, live route, or an “arrived” state in this pilot.</p>}
    {r.state === 'in_trip' && <p className="ride-notice">Pickup PIN verified by the server. Trip is active; live tracking and route guidance are unavailable.</p>}
    {r.state === 'requested' && <button type="button" onClick={onRefresh}>Refresh matching status</button>}
    {r.pickup && <div className="ride-route"><span>Pickup · {r.pickup}</span><i /><span>Destination · {r.destination}</span></div>}
    {r.state === 'accepted' && !consented && <div data-screen="RIDE-009"><h3>Confirm exactly what you share</h3><ul>{r.consent_fields.map(f => <li key={f}>{f.replaceAll('_', ' ')}</li>)}</ul><p>Shared only with the other participant for this ride. Phones remain private. No GPS or trusted-contact sharing is enabled. Consent events retain field names only. Contact support for data deletion review.</p><label className="ride-check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />I affirm these fields for this ride.</label><button disabled={!agree} className="ride-primary" onClick={() => action('consent', { fields: r.consent_fields })}>Confirm field disclosure</button></div>}
    {r.state === 'accepted' && consented && !r.plate && <p>Waiting for the other participant to confirm. Plate and driver pickup instructions stay hidden.</p>}
    {r.plate && <p><b>Approved plate: {r.plate}</b></p>}
    {r.pin && <div className="ride-pin" data-screen="RIDE-003"><h3>Check the plate first</h3><strong>{r.pin}</strong><p>Tell the driver this PIN in person. Never send it in chat or notifications. Expires {rideWhen(r.pin_expires_at)}.</p></div>}
    {driver && r.state === 'accepted' && r.plate && <form onSubmit={e => { e.preventDefault(); action('start', { pin }); setPin(''); }}><RideField label="Customer pickup PIN"><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} /></RideField><button className="ride-primary">Verify PIN & start trip</button></form>}
    {r.state === 'in_trip' && driver && <button className="ride-primary" onClick={() => action('complete')}>Complete trip</button>}
    {r.reason && <p>{r.reason}</p>}
    {['requested', 'accepted'].includes(r.state) && <div data-screen="RIDE-010"><button onClick={() => setCancel(!cancel)}>Cancel ride</button>{cancel && <div className="ride-alert"><h3>Confirm cancellation</h3><p>Fee: ₹0. Both sides will be notified. This cannot be undone.</p><RideField label="Cancellation reason"><textarea value={reason} onChange={e => setReason(e.target.value)} /></RideField><button disabled={!reason.trim()} onClick={() => action('cancel', { reason, confirm: true })}>Confirm free cancellation</button><button onClick={() => setCancel(false)}>Keep ride</button></div>}</div>}
    {driver && r.state === 'accepted' && <div data-screen="RIDE-015"><RideField label="Late / no-show explanation"><input value={reason} onChange={e => setReason(e.target.value)} /></RideField><button disabled={!reason.trim()} onClick={() => action('late', { reason })}>Report driver late</button><button disabled={!reason.trim()} onClick={() => action('no-show', { reason })}>Request no-show review</button><p>No-show review opens 15 minutes after pickup. No automatic fee.</p></div>}
    {!driver && ['completed', 'cancelled', 'expired'].includes(r.state) && r.pickup && r.destination && <button type="button" onClick={() => onRepeat(r)}>Repeat route · check a new fare</button>}
  </RidePanel><div>{r.state === 'completed' && <RidePanel id="RIDE-004" title={driver ? 'Payment and settlement status' : 'Payment and receipt'}><div className="ride-fare"><span>Preview total</span><strong>{rupees(r.quote.fare.total)}</strong></div><p>{r.payment_state} · settlement {r.payout_state}</p>{r.payment_state !== 'paid' && r.payment_state !== 'refunded' && (driver && r.quote.payment === 'cash' ? <button className="ride-primary" onClick={() => action('cash')}>Mark test cash received</button> : !driver && r.quote.payment === 'hpay_test' ? <><button className="ride-primary" onClick={() => action('pay')}>Pay / retry HPay Test</button><button data-screen="RIDE-011" onClick={() => action('pay', { test_outcome: 'fail' })}>Test payment failure</button></> : <p>Waiting for payment confirmation.</p>)}{r.ledger?.length ? r.ledger.map(l => <p key={l.reference}><b>{l.kind}: {rupees(l.amount)}</b><br />{l.payment} · {l.reference}</p>) : <p>No payment receipt is recorded yet.</p>}<p>{driver ? 'Settlement is a server status only. This preview does not claim a payout or earnings.' : 'Cash stays cash. HPay Test is a local simulation, with no wallet debit or real charge.'}</p><div data-screen="RIDE-016"><RideField label="Rate the other participant"><select value={stars} onChange={e => setStars(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></RideField><button onClick={() => action('rating', { stars })}>Save rating</button></div></RidePanel>}
    <RidePanel id="RIDE-012" title="Support for this ride"><RideField label="Case type"><select value={kind} onChange={e => setKind(e.target.value)}>{['support', 'lost_item', 'incident', 'refund', 'fee_review', 'appeal', 'cash_dispute'].map(k => <option key={k} value={k}>{k.replaceAll('_', ' ')}</option>)}</select></RideField><RideField label="What happened? Do not include PINs or phone numbers."><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={300} /></RideField><button disabled={!reason.trim()} onClick={() => action('support', { kind, reason })}>Send to local staff queue</button></RidePanel></div></div>;
}

function OfferClock({ until }) { const [now,setNow]=useState(Date.now()); useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);const seconds=Math.max(0,Math.ceil((Date.parse(until)-now)/1000));return <p role="timer">{seconds ? `Offer expires in ${seconds}s` : "Offer expired — refreshing confirmed status…"}</p>; }
