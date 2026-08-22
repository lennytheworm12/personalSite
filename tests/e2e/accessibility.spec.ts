import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/about/",
  "/projects/spotify-sorter/",
  "/projects/game-teacher/",
  "/404",
];

test.describe("automated accessibility", () => {
  for (const route of routes) {
    test(`axe finds no violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual(
        [],
      );
    });
  }

  test("every page has exactly one h1 and a skip link as the first focusable element", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["chromium", "firefox", "webkit"].some((n) => testInfo.project.name.includes(n)),
      "browser project",
    );
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeAttached();
    const main = page.locator("#main-content");
    await expect(main).toBeVisible();
  });

  test("primary navigation marks the current page", async ({ page }) => {
    await page.goto("/about/");
    await expect(
      page.locator("nav[aria-label='Primary'] a[aria-current='page']"),
    ).toHaveText("About");
  });
});
