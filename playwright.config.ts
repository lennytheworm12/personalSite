import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4321 --strictPort",
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    // Wide desktop
    {
      name: "desktop-wide-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    // Typical laptop
    {
      name: "laptop-firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 720 } },
    },
    // Narrow phone (WebKit unavailable in this environment: missing system
    // libraries that require sudo; emulated with Chromium instead).
    {
      name: "phone-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 } },
    },
    // Tall phone
    {
      name: "tall-phone-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } },
    },
    // Landscape phone
    {
      name: "landscape-phone-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 740, height: 360 } },
    },
  ],
});
