import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "desktop-only suite");

async function scan(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe("Goal 3 state accessibility", () => {
  test("home with search open has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('.homepage-island[data-hydrated="true"]');
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#homepage-search-input").fill("react");
    await expect(page.locator(".search-results")).toBeVisible();
    await scan(page);
  });

  for (const slug of ["spotify-sorter", "game-teacher"]) {
    test(`project-focus scene (${slug}) has no axe violations`, async ({ page }) => {
      await page.goto(`/?focus=${slug}`);
      await page.waitForSelector('.homepage-island[data-hydrated="true"]');
      await expect(page.getByText(/Focused on/i)).toBeVisible();
      await scan(page);
    });
  }

  test("index view has no axe violations", async ({ page }) => {
    await page.goto("/?view=index");
    await page.waitForSelector('.homepage-island[data-hydrated="true"]');
    await expect(page.locator("#project-index")).toBeVisible();
    await scan(page);
  });
});
