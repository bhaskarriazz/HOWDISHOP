import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MasterAdminApp from './MasterAdminApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode><MasterAdminApp /></StrictMode>
);
