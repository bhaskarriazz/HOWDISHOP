import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';

const V8Admin = lazy(() => import('./v8/admin/V8Admin.jsx'));
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Suspense fallback={null}><V8Admin /></Suspense> : <App />}
  </StrictMode>
);
