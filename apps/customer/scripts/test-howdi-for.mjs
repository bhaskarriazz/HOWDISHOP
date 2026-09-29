// Use the application's own Vite JSX/CSS pipeline for the focused Node tests.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  await server.ssrLoadModule('/src/howdi-for/howdiFor.test.jsx');
  await server.ssrLoadModule('/src/howdi-for/entryPoints.test.jsx');
  await server.ssrLoadModule('/src/howdi-for/handoffs.test.js');
} finally { await server.close(); }
