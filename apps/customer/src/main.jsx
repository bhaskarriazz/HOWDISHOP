import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import './ux-recovery.css';
import { V8UiProvider, applyV8Prefs, loadV8Prefs } from './v8/V8System.jsx';
// V8 MY-011 / ACC-002: apply the saved theme, text size, motion and contrast before first paint (no light flash in dark mode).
try { applyV8Prefs(loadV8Prefs()); } catch { /* defaults */ }
// /admin is the separate HOWDI staff console (never linked from the customer app).
const V8Admin = lazy(() => import('./v8/admin/V8Admin.jsx'));
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);
createRoot(document.getElementById('root')).render(<StrictMode><V8UiProvider>{isAdmin ? <Suspense fallback={null}><V8Admin /></Suspense> : <App />}</V8UiProvider></StrictMode>);
