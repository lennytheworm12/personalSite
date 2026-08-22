import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/about/",
  "/projects/spotify-sorter/",
  "/projects/game-teacher/",
  "/404",
];

test.describe("responsive layout", () => {
  for (const route of routes) {
    test(`${route} has no horizontal overflow at any supported viewport`, async ({
      page,
    }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("200% zoom (simulated via half-size viewport on chromium)", () => {
  test("content remains usable and readable at 200% zoom", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 400 }, // 640x800 desktop equivalent at 200%
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `${route} overflows at 200% zoom by ${overflow}px`,
      ).toBeLessThanOrEqual(1);
    }
    await context.close();
  });
});

test.describe("reduced motion", () => {
  test("pages render completely with prefers-reduced-motion: reduce", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/projects/spotify-sorter/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Spotify Sorter" }),
    ).toBeVisible();
    // No animation or transition is defined anywhere in the Goal 1 UI.
    const animated = await page.evaluate(
      () =>
        [...document.querySelectorAll("body *")].filter((el) => {
          const style = window.getComputedStyle(el);
          return (
            style.animationName !== "none" ||
            (style.transitionDuration !== "0s" && style.transitionDuration !== "")
          );
        }).length,
    );
    expect(animated).toBe(0);
    await context.close();
  });
});
