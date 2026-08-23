import { expect, test } from "@playwright/test";

test.skip(
  ({ viewport }) => (viewport?.width ?? 0) < 900,
  "graph is hidden on small screens",
);

const GRAPH_NODES = [
  "person:bi",
  "project:spotify-sorter",
  "project:game-teacher",
  "story:spotify-sorter:motivation",
  "story:game-teacher:motivation",
  "tech:typescript",
  "tech:react",
];

test.describe("graph rendering", () => {
  test("renders the server-side graph with person, projects, and edges", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: /project graph/i })).toBeVisible();
    for (const nodeId of GRAPH_NODES) {
      await expect(page.locator(`[data-node-id="${nodeId}"]`)).toBeVisible();
    }
    // SVG edge layer exists behind the DOM nodes and has drawn all edges.
    const edgeCount = await page.locator(".graph-edges line").count();
    expect(edgeCount).toBe(13); // 9 phase-2 + 4 concept edges
  });

  test("graph is understandable before interaction (details show instructions)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".graph-details")).toContainText("About this graph");
  });

  test("no horizontal overflow caused by the graph", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("graph interaction — pointer", () => {
  test("hover reveals detail and activates related edges", async ({ page }) => {
    await page.goto("/");
    const projectNode = page.locator('[data-node-id="project:spotify-sorter"]');
    await projectNode.hover();
    await expect(page.locator(".graph-details")).toContainText("Spotify Sorter");
    await expect(projectNode).not.toHaveClass(/graph-node-dimmed/);
    // Unrelated nodes dim while a node is active (game-teacher's story has
    // no edge to spotify-sorter).
    await expect(
      page.locator('[data-node-id="story:game-teacher:motivation"]'),
    ).toHaveClass(/graph-node-dimmed/);
    // Edges touching the active node switch to the active style.
    const activeEdges = page.locator(".graph-edge-active");
    // spotify-sorter: ownership + motivation + 3 technology + 2 concept
    await expect(activeEdges).toHaveCount(7);
  });

  test("click pins a supporting-node detail; clicking again unpins", async ({
    page,
  }) => {
    // Contract change (Goal 3): project clicks enter Project Focus
    // (covered by goal3.spec); supporting nodes keep pin-to-detail.
    await page.goto("/");
    await page.waitForSelector('.homepage-island[data-hydrated="true"]');
    const button = page.locator('[data-node-id="tech:typescript"]');
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".graph-details")).toContainText("Pinned");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
  });

  test("technology node lists related projects with case-study links", async ({
    page,
  }) => {
    await page.goto("/");
    await page.hover('[data-node-id="tech:typescript"]');
    const details = page.locator(".graph-details");
    await expect(details.getByRole("link", { name: "Spotify Sorter" })).toBeVisible();
    await expect(details.getByRole("link", { name: "Game Teacher" })).toBeVisible();
  });
});

test.describe("graph interaction — keyboard", () => {
  test("keyboard focus reveals equivalent information to hover", async ({ page }) => {
    await page.goto("/");
    const nodeButton = page.locator('[data-node-id="project:spotify-sorter"]');
    await nodeButton.focus();
    await expect(nodeButton).toBeFocused();
    await expect(page.locator(".graph-details")).toContainText(
      "Details: Spotify Sorter",
    );
    // Focus must not be lost offscreen.
    await expect(nodeButton).toBeInViewport();
  });

  test("Enter/Space pin and Escape clears the pinned state", async ({ page }) => {
    await page.goto("/");
    const button = page.locator('[data-node-id="person:bi"]');
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space"); // toggle again -> unpin
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Enter"); // pin
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-pressed", "false");
  });

  test("keyboard focus overrides incidental pointer hover in the details region", async ({
    page,
  }) => {
    await page.goto("/");
    await page.hover('[data-node-id="person:bi"]');
    await page.focus('[data-node-id="tech:react"]');
    await expect(page.locator(".graph-details")).toContainText("React");
  });

  test("nodes are reachable by keyboard and the view switch reaches the Index", async ({
    page,
  }) => {
    await page.goto("/");
    // Tab from the view-switch controls into graph nodes.
    await page.getByRole("button", { name: "Search" }).focus();
    await page.keyboard.press("Shift+Tab");
    let hops = 0;
    let insideGraph = false;
    while (hops < 20 && !insideGraph) {
      await page.keyboard.press("Tab");
      insideGraph = await page
        .locator(".graph-canvas :focus")
        .count()
        .then((count) => count > 0)
        .catch(() => false);
      hops++;
    }
    expect(insideGraph, "a graph node should be keyboard-reachable").toBe(true);
    // The coordinated Index switch reveals the full index without reload.
    await page.getByRole("button", { name: "Index" }).click();
    await expect(page.locator("#project-index")).toBeVisible();
    await expect(page).toHaveURL(/[?&]view=index/);
    await page.getByRole("button", { name: "Graph" }).click();
    await expect(page.locator(".graph-canvas")).toBeVisible();
  });
});
