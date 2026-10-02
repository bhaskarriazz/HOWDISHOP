import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/dock',
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
