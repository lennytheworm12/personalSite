import { expect, test } from "@playwright/test";

test.skip(({ viewport }) => viewport.width < 900, "graph is hidden on small screens");

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
    expect(edgeCount).toBe(9);
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
    // spotify-sorter: 1 ownership + 1 motivation + 3 technology edges
    await expect(activeEdges).toHaveCount(5);
  });

  test("click pins the node detail; clicking again unpins", async ({ page }) => {
    await page.goto("/");
    const button = page.locator('[data-node-id="project:game-teacher"]');
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".graph-details")).toContainText("Pinned");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
  });

  test("project node links to its case study from the pinned detail region", async ({
    page,
  }) => {
    await page.goto("/");
    // Pin first: pinned detail is immune to pointer travel across other
    // nodes (that is what pinning is for).
    const button = page.locator('[data-node-id="project:game-teacher"]');
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const link = page
      .locator(".graph-details")
      .getByRole("link", { name: "Open the case study" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/projects\/game-teacher\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Game Teacher" }),
    ).toBeVisible();
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

  test("nodes are reachable by keyboard and the Index jump link works", async ({
    page,
  }) => {
    await page.goto("/");
    // Tab into the graph: first graph focus lands inside the island.
    await page.getByRole("link", { name: /jump to the project index/i }).focus();
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
    const jumpLink = page
      .getByRole("link", { name: /jump to the project index/i })
      .first();
    await jumpLink.click();
    await expect(page.locator("#project-index")).toBeInViewport();
  });
});
