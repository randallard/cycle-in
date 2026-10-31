/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

// ADR-0019: against the built site (`pnpm e2e` builds first), Chromium only. A spare port, so a
// local run never touches Ryan's dev server and gets its own IndexedDB origin.
const PORT = Number(process.env["E2E_PORT"] ?? 4318);
const CI = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: CI,
  // No retries: a flaky test is a bug in the test, and a retry would hide it.
  retries: 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${String(PORT)}/cycle-in/`,
    trace: "retain-on-failure",
  },
  // The app is dark-first and follows the OS theme, so every check runs in both.
  projects: [
    { name: "light", use: { colorScheme: "light" } },
    { name: "dark", use: { colorScheme: "dark" } },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${String(PORT)} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${String(PORT)}/cycle-in/`,
    reuseExistingServer: !CI,
  },
});
