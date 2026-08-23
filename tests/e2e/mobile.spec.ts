import { expect, test, type Page } from "@playwright/test";

test.skip(({ viewport }) => (viewport?.width ?? 1280) > 767, "mobile-only suite");

const INTRO_KEY = "portfolio:intro:v1";
const VIEW_KEY = "portfolio:view:v1";

async function gotoHydrated(page: Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector('.homepage-island[data-hydrated="true"]');
}

test.describe("mobile boot defaults", () => {
  test("clean root with completed intro boots to Index primary; graph hidden by CSS-free logic", async ({
    page,
  }) => {
    await page.addInitScript(
      ([k]) => window.localStorage.setItem(k!, "done"),
      [INTRO_KEY],
    );
    await gotoHydrated(page);
    await expect(page.locator("#project-index")).toBeVisible();
    // Index is the active view: graph section is aria-hidden.
    await expect(page.locator(".homepage-view-index")).toBeVisible();
  });

  test("?view=graph overrides everything and shows the mobile graph", async ({
    page,
  }) => {
    await page.addInitScript(([k]) => window.localStorage.removeItem(k!), [INTRO_KEY]);
    await gotoHydrated(page, "/?view=graph");
    await expect(page.locator(".graph-canvas")).toBeVisible();
    await expect(page.getByText(/Index is the stable way to browse/i)).toBeVisible();
    // Person and both projects placed in the phone composition.
    for (const id of ["person:bi", "project:spotify-sorter", "project:game-teacher"]) {
      await expect(page.locator(`[data-node-id="${id}"]`)).toBeVisible();
    }
  });

  test("URL intent beats stored preference", async ({ page }) => {
    await page.addInitScript(
      ([vk]) => {
        window.localStorage.setItem(vk!, "index");
        window.localStorage.setItem("portfolio:intro:v1", "done");
      },
      [VIEW_KEY],
    );
    await gotoHydrated(page, "/?view=graph");
    await expect(page.locator(".graph-canvas")).toBeVisible();

    const page2 = await page.context().newPage();
    await page2.addInitScript(
      ([vk]) => {
        window.localStorage.setItem(vk!, "graph");
        window.localStorage.setItem("portfolio:intro:v1", "done");
      },
      [VIEW_KEY],
    );
    await gotoHydrated(page2, "/?view=index");
    await expect(page2.locator("#project-index")).toBeVisible();
    await page2.close();
  });
});

test.describe("first-visit intro", () => {
  test("eligible first visit shows Skip immediately and auto-completes to Index", async ({
    page,
  }) => {
    await page.addInitScript(([k]) => window.localStorage.removeItem(k!), [INTRO_KEY]);
    await gotoHydrated(page);
    // Graph visual plays the intro; Skip is visible immediately.
    await expect(page.locator(".intro-overlay")).toBeVisible();
    const skip = page.getByRole("button", { name: "Skip to projects" });
    await expect(skip).toBeVisible();
    // Auto-completion (~2.8s) hands control to Index.
    await expect(page.locator(".intro-overlay")).toBeHidden({ timeout: 5000 });
    await expect(page.locator("#project-index")).toBeVisible();
    const done = await page.evaluate(
      ([k]) => window.localStorage.getItem(k!),
      [INTRO_KEY],
    );
    expect(done).toBe("done");
  });

  test("Skip stops the intro immediately and records completion", async ({ page }) => {
    await page.addInitScript(([k]) => window.localStorage.removeItem(k!), [INTRO_KEY]);
    await gotoHydrated(page);
    await expect(page.locator(".intro-overlay")).toBeVisible();
    await page.getByRole("button", { name: "Skip to projects" }).click();
    await expect(page.locator(".intro-overlay")).toHaveCount(0);
    await expect(page.locator("#project-index")).toBeVisible();
    const done = await page.evaluate(
      ([k]) => window.localStorage.getItem(k!),
      [INTRO_KEY],
    );
    expect(done).toBe("done");
  });

  test("returning visits do not replay the intro", async ({ page }) => {
    await page.addInitScript(
      ([k]) => window.localStorage.setItem(k!, "done"),
      [INTRO_KEY],
    );
    await gotoHydrated(page);
    await expect(page.locator(".intro-overlay")).toHaveCount(0);
    await expect(page.locator("#project-index")).toBeVisible();
  });
});

test.describe("mobile project preview (?focus=)", () => {
  test("focus deep link opens the stable preview card instead of a spatial scene", async ({
    page,
  }) => {
    await page.addInitScript(([k]) => window.localStorage.removeItem(k!), [INTRO_KEY]);
    await gotoHydrated(page, "/?focus=spotify-sorter");
    // Intro bypassed.
    await expect(page.locator(".intro-overlay")).toHaveCount(0);
    const preview = page.locator(".mobile-project-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Spotify Sorter");
    // Stationary actions.
    for (const name of ["View Case Study", "Index", "Home", "Back"]) {
      await expect(
        preview.getByRole("link", { name }).or(preview.getByRole("button", { name })),
      ).toBeVisible();
    }
    await preview.getByRole("link", { name: "View Case Study" }).click();
    await expect(page).toHaveURL(
      /\/personalSite\/projects\/spotify-sorter\/$|\/projects\/spotify-sorter\/$/,
    );
  });

  test("tapping a project node in mobile Graph mode opens the preview", async ({
    page,
  }) => {
    await page.addInitScript(([k]) => window.localStorage.removeItem(k!), [INTRO_KEY]);
    await gotoHydrated(page, "/?view=graph");
    await page.click('[data-node-id="project:game-teacher"]');
    await expect(page.locator(".mobile-project-preview")).toContainText("Game Teacher");
  });
});

test.describe("mobile layout safety", () => {
  test("no horizontal overflow on any page", async ({ page }) => {
    for (const url of ["/", "/about/", "/?view=graph", "/?focus=game-teacher"]) {
      await page.goto(url);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${url} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("search works from the mobile Index view", async ({ page }) => {
    await page.addInitScript(
      ([k]) => window.localStorage.setItem(k!, "done"),
      [INTRO_KEY],
    );
    await gotoHydrated(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#homepage-search-input").fill("react");
    await expect(page.locator(".search-results")).toBeVisible();
  });
});
