import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import './ux-recovery.css';
import { V8UiProvider, applyV8Prefs, loadV8Prefs } from './v8/V8System.jsx';
// V8 MY-011 / ACC-002: apply the saved theme, text size, motion and contrast before first paint (no light flash in dark mode).
try { applyV8Prefs(loadV8Prefs()); } catch { /* defaults */ }
createRoot(document.getElementById('root')).render(<StrictMode><V8UiProvider><App /></V8UiProvider></StrictMode>);
