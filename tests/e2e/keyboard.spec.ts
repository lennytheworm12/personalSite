import { expect, test } from "@playwright/test";

test.describe("keyboard navigation and visible focus", () => {
  test("skip link is the first tab stop and moves focus to main content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeFocused();
    await expect(page.locator(".skip-link")).toBeInViewport();
    await page.keyboard.press("Enter");
    // The skip link target must actually receive focus.
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("focus is visible on interactive elements", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab"); // skip link
    const outline = await page.locator(".skip-link").evaluate((el) => {
      el.focus();
      return window.getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe("none");
  });

  test("all navigation links are reachable by keyboard in DOM order", async ({
    page,
  }) => {
    await page.goto("/");
    const labels: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      labels.push(
        await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""),
      );
    }
    // Tab 1 is the skip link; tabs 2-5 are the four primary-nav links.
    expect(labels[0]).toBe("Skip to main content");
    expect(labels.slice(1)).toEqual([
      "Home",
      "Spotify Sorter",
      "Game Teacher",
      "About",
    ]);
  });
});
