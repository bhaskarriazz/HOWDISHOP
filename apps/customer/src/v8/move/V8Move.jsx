// MOVE-NAV-001 — owner's six-pillar amendment, separate from the approved 318 register.
import { useApi, SignInCard } from '../connect/common';
import Rides from '../works/Rides';

export default function V8Move({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin, onOpenAddresses }) {
  const api = useApi(apiBase, getAuthHeaders);
  if (!user) return <div className="v8-page"><div className="v8-page-inner"><h1>HOWDI Move</h1><SignInCard title="Sign in to request a Ride" message="Use your HOWDI account for Rides and your driver desk. Preview/Test access remains gated." onSignIn={onRequireLogin} /></div></div>;
  return <div className="v8-page"><Rides api={api} path={`rides${path ? '/' + path : ''}`} nav={next => onNavigate(String(next).replace(/^rides\/?/, ''))} onOpenAddresses={onOpenAddresses} /></div>;
}
