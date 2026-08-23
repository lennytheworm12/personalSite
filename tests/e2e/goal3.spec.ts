import { expect, test } from "@playwright/test";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "desktop-only suite");

/** Interactions require hydration; SSR-only buttons have no handlers yet. */
async function gotoHydrated(page: import("@playwright/test").Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector('.homepage-island[data-hydrated="true"]');
}

test.describe("search", () => {
  test("typing updates results, highlights graph, and rewrites q without history spam", async ({
    page,
  }) => {
    await gotoHydrated(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.locator("#homepage-search-input");
    await input.fill("reac");
    await expect(page.locator(".search-results")).toBeVisible();
    const countText = await page.locator("#search-results-announce").textContent();
    expect(countText).toMatch(/result/i);

    // Graph did not rearrange: person node keeps its authored coordinates.
    const personLeft = await page
      .locator(".graph-node-slot")
      .first()
      .evaluate((el) => el.style.left);

    // Query typing uses replaceState: at most one extra history entry.
    const entries = await page.evaluate(() => history.length);
    for (const char of ["a", "c", "t"]) {
      await input.fill(`reac${char}`);
      await page.waitForTimeout(50);
    }
    await input.fill("react");
    await expect(page).toHaveURL(/[?&]q=react/);
    const entriesAfter = await page.evaluate(() => history.length);
    expect(entriesAfter - entries).toBeLessThanOrEqual(1);
    // Coordinates unchanged while searching.
    expect(
      await page
        .locator(".graph-node-slot")
        .first()
        .evaluate((el) => el.style.left),
    ).toBe(personLeft);
  });

  test("keyboard navigation selects a technology result and pins its context", async ({
    page,
  }) => {
    await gotoHydrated(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.locator("#homepage-search-input");
    await input.fill("typescript");
    await input.press("ArrowDown");
    await expect(page.locator(".search-result").first()).toHaveClass(
      /search-result-active/,
    );
    await input.press("Enter");
    // Technology result pins its node without entering a project scene.
    await expect(page).not.toHaveURL(/[?&]focus=/);
    const pinnedCount = await page.locator('.graph-node[aria-pressed="true"]').count();
    expect(pinnedCount).toBe(1);
  });

  test("selecting a project result enters Project Focus with pushed history", async ({
    page,
  }) => {
    await gotoHydrated(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#homepage-search-input").fill("Game Teacher");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/[?&]focus=game-teacher/);
    await expect(page.getByText(/Focused on/i)).toBeVisible();
    // Browser Back returns to the pre-focus state.
    await page.goBack();
    await expect(page).not.toHaveURL(/[?&]focus=/);
  });

  test("Escape closes search first", async ({ page }) => {
    await gotoHydrated(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#homepage-search-input").fill("react");
    await page.locator("#homepage-search-input").press("Escape");
    await expect(page.locator(".search-panel")).toHaveCount(0);
  });
});

test.describe("project focus", () => {
  for (const slug of ["spotify-sorter", "game-teacher"]) {
    test(`activating ${slug} enters its curated focus scene`, async ({ page }) => {
      await gotoHydrated(page);
      const title = slug === "spotify-sorter" ? "Spotify Sorter" : "Game Teacher";
      await page.click(`[data-node-id="project:${slug}"]`);
      await expect(page).toHaveURL(new RegExp("[?&]focus=" + slug));
      await expect(
        page.getByText(new RegExp(`Focused on.*${title}`, "i")),
      ).toBeVisible();
      // Controls present.
      await expect(page.getByRole("button", { name: "Back to Home" })).toBeVisible();
      await expect(
        page.locator(".focus-banner").getByRole("link", { name: "View Case Study" }),
      ).toBeVisible();

      // View Case Study navigates to the static route.
      await page
        .locator(".focus-banner")
        .getByRole("link", { name: "View Case Study" })
        .click();
      await expect(page).toHaveURL(new RegExp("/projects/" + slug + "/$"));
    });
  }

  test("Back returns from in-app focus via browser history", async ({ page }) => {
    await gotoHydrated(page);
    await page.click('[data-node-id="project:spotify-sorter"]');
    await expect(page).toHaveURL(/[?&]focus=spotify-sorter/);
    await page.getByRole("button", { name: "Back to Home" }).click();
    await expect(page).not.toHaveURL(/[?&]focus=/);
  });

  test("direct deep link renders focus immediately; visible Back falls back safely", async ({
    page,
  }) => {
    await gotoHydrated(page, "/?focus=spotify-sorter");
    await expect(page.getByText(/Focused on/i)).toBeVisible();
    await expect(page.locator('[data-node-id="project:spotify-sorter"]')).toBeVisible();
    // Deep-link Back must NOT navigate away from the site.
    await page.getByRole("button", { name: "Back to Home" }).click();
    await expect(page).not.toHaveURL(/[?&]focus=/);
    expect(new URL(page.url()).pathname.endsWith("/")).toBe(true);
  });

  test("invalid focus slug recovers to Home", async ({ page }) => {
    await gotoHydrated(page, "/?focus=not-a-real-project");
    await expect(page.getByText(/Focused on/i)).toHaveCount(0);
    await expect(page.locator('[data-node-id="person:bi"]')).toBeVisible();
  });
});

test.describe("hover grace", () => {
  test("pointer travel from node to details preserves the active node", async ({
    page,
  }) => {
    await page.goto("/");
    await page.hover('[data-node-id="project:game-teacher"]');
    await page.locator(".graph-details").hover();
    await expect(page.locator(".graph-details")).toContainText("Game Teacher");
  });

  test("leaving the graph entirely clears hover after the grace period", async ({
    page,
  }) => {
    await page.goto("/");
    await page.hover('[data-node-id="project:game-teacher"]');
    await expect(page.locator(".graph-details")).toContainText("Game Teacher");
    await page.mouse.move(5, 400); // far edge, outside nodes/details
    await page.waitForTimeout(400);
    await expect(page.locator(".graph-details")).toContainText("About this graph");
  });
});
