import { expect, test } from "@playwright/test";

test.describe("small-screen fallback (graph hidden, Index primary)", () => {
  // This suite covers the stable post-intro state; intro behavior lives in
  // mobile.spec.ts.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("portfolio:intro:v1", "done");
    });
  });

  test("the graph island is not visible and causes no overflow", async ({ page }) => {
    test.skip(
      page.viewportSize() === null ||
        (page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) >= 900,
    );
    await page.goto("/");
    await expect(page.locator(".graph-island")).toBeHidden();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("Index remains primary: projects reachable with usable touch targets", async ({
    page,
  }) => {
    test.skip(
      page.viewportSize() === null ||
        (page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) >= 900,
    );
    await page.goto("/");
    await page.waitForSelector('.homepage-island[data-hydrated="true"]');
    const link = page
      .locator(".project-list")
      .getByRole("link", { name: "Spotify Sorter" });
    await expect(link).toBeVisible();
    // Hydration can swap DOM nodes under us; poll until geometry is stable.
    await expect
      .poll(async () => (await link.boundingBox())?.height ?? 0, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(40); // ~44px target guidance
    await link.click();
    await expect(page).toHaveURL(/\/projects\/spotify-sorter\/$/);
  });

  test("identity and contact placeholders remain visible", async ({ page }) => {
    test.skip(
      page.viewportSize() === null ||
        (page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) >= 900,
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bi Phan" }),
    ).toBeVisible();
    await expect(page.locator("#contact-github")).toBeVisible();
  });
});
