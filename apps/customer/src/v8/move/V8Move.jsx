// MOVE-NAV-001 — owner's six-pillar amendment, separate from the approved 318 register.
import { useApi, SignInCard } from '../connect/common';
import Rides from '../works/Rides';

export default function V8Move({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin }) {
  const api = useApi(apiBase, getAuthHeaders);
  if (!user) return <div className="v8-page"><div className="v8-page-inner"><h1>HOWDI Move</h1><SignInCard title="Sign in to book a ride" message="Use your HOWDI account for rides and your Rider desk. Preview booking remains gated." onSignIn={onRequireLogin} /></div></div>;
  return <div className="v8-page"><Rides api={api} path={`rides${path ? '/' + path : ''}`} nav={next => onNavigate(String(next).replace(/^rides\/?/, ''))} /></div>;
}
