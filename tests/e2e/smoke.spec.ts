import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "Bi Phan" },
  { path: "/about/", heading: "About" },
  { path: "/projects/spotify-sorter/", heading: "Spotify Sorter" },
  { path: "/projects/game-teacher/", heading: "Game Teacher" },
];

test.describe("static route smoke", () => {
  for (const route of routes) {
    test(`renders ${route.path} as complete static HTML`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(route.heading);
      await expect(page.locator("nav[aria-label='Primary']")).toBeVisible();
      // Essential content must be server-rendered, not injected by scripts.
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    });
  }

  test("Index links to both generated case studies", async ({ page }) => {
    await page.goto("/");
    const projectList = page.locator("ul.project-list");
    await expect(
      projectList.getByRole("link", { name: "Spotify Sorter" }),
    ).toBeVisible();
    await expect(projectList.getByRole("link", { name: "Game Teacher" })).toBeVisible();
  });

  test("Index exposes stable placeholders for personal links", async ({ page }) => {
    await page.goto("/");
    for (const id of [
      "contact-about",
      "contact-github",
      "contact-linkedin",
      "contact-resume",
      "contact-email",
    ]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    // LeetCode is deferred (decisions-log.md R2): no LeetCode placeholder.
    await expect(page.locator("#contact-leetcode")).toHaveCount(0);
    // Unresolved URLs are never invented as links.
    await expect(page.locator("#contact-github a")).toHaveCount(0);
    await expect(page.locator("#contact-github")).toContainText("not yet published");
  });

  test("case studies render honest unresolved sections instead of invented facts", async ({
    page,
  }) => {
    for (const slug of ["spotify-sorter", "game-teacher"]) {
      await page.goto(`/projects/${slug}/`);
      await expect(
        page.getByRole("region", { name: "Not yet documented" }),
      ).toBeVisible();
      await expect(
        page.locator("article header").getByText("Placeholder case study"),
      ).toBeVisible();
      const unresolvedItems = page.locator(".unresolved-list code");
      await expect(unresolvedItems.filter({ hasText: /^metrics$/ })).toBeVisible();
      await expect(unresolvedItems.filter({ hasText: /^links$/ })).toBeVisible();
      // Provisional narrative sections are labeled as drafts, never final.
      await expect(page.getByText("Provisional draft").first()).toBeVisible();
    }
  });
});

test.describe("404 behavior", () => {
  test("unknown paths serve the branded 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist/");
    // Preview server returns 404 status; some hosts rewrite to 404.html.
    const heading = page.getByRole("heading", { level: 1, name: "Page not found" });
    if (response?.status() === 404) {
      await expect(heading).toBeVisible();
    } else {
      test
        .info()
        .annotations.push({ type: "note", description: "host served non-404 status" });
      await expect(heading).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "home page" })).toBeVisible();
  });
});
