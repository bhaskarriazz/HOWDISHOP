import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';

const V8Admin = lazy(() => import('./v8/admin/V8Admin.jsx'));
const isAdminRoute = /^\/admin(\/|$)/.test(window.location.pathname);
const isAdmin = isAdminRoute || (import.meta.env.DEV && window.location.pathname === '/');
if (import.meta.env.DEV && window.location.pathname === '/') {
  window.history.replaceState(null, '', '/admin');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Suspense fallback={null}><V8Admin /></Suspense> : <App />}
  </StrictMode>
);
