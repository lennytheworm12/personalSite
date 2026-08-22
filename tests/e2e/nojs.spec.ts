import { expect, test } from "@playwright/test";

/**
 * The site must be fully usable with JavaScript disabled: all essential
 * content and navigation ship as generated HTML.
 */
test.describe("no-JavaScript usability", () => {
  for (const route of [
    "/",
    "/about/",
    "/projects/spotify-sorter/",
    "/projects/game-teacher/",
    "/404",
  ]) {
    test(`${route} renders full content without JavaScript`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      const text = await page.locator("body").innerText();
      expect(text.length).toBeGreaterThan(100);
      await expect(page.locator("nav[aria-label='Primary']")).toBeVisible();
      await context.close();
    });
  }

  test("navigation between pages works purely via links (no client JS)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await page.click("a[href='/projects/spotify-sorter/']");
    await expect(page).toHaveURL(/\/projects\/spotify-sorter\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Spotify Sorter" }),
    ).toBeVisible();
    await context.close();
  });

  test("direct refresh of project URLs works without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/projects/game-teacher/");
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Game Teacher" }),
    ).toBeVisible();
    await context.close();
  });
});
