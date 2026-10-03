import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import HowdiDockV2 from './components/HowdiDockV2.jsx';
import './App.css';
import './ux-recovery.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <HowdiDockV2 />
  </StrictMode>,
);
