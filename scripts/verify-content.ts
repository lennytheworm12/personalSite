import { homeGraph } from "../src/graph/graph-data";
import { FOCUS_LAYOUTS, validateFocusLayouts } from "../src/graph/focus-layouts";
import { HOME_LAYOUTS } from "../src/graph/layouts";
import { validateLayouts } from "../src/graph/layout-validation";
import { FEATURED_PROJECT_SLUGS } from "../src/content/projects";
import { buildSearchIndex } from "../src/search/search-index";
import { HOMEPAGE_VIEWS } from "../src/state/homepage-state";

/**
 * Combined Goal 3–4 content/graph/search/layout verification gate.
 * Import-time validation covers schema/duplicates/hrefs; this script adds
 * cross-model guarantees the build verifier cannot see.
 */

let failures = 0;
const fail = (message: string) => {
  failures++;
  console.error(`FAIL: ${message}`);
};

// 1. Graph validation ran at module load; assert basic shape as a witness.
const byKind = (kind: string) => homeGraph.nodes.filter((n) => n.kind === kind).length;
console.info(
  `graph: ${homeGraph.nodes.length} nodes (${[
    "person",
    "project",
    "story",
    "technology",
    "concept",
  ]
    .map((k) => `${k}:${byKind(k)}`)
    .join(", ")}) / ${homeGraph.edges.length} edges`,
);
if (byKind("person") !== 1) fail("graph must contain exactly one person node");
if (byKind("project") !== FEATURED_PROJECT_SLUGS.length) {
  fail("each featured project must have a graph node");
}

// 2. Home layouts validate for every viewport preset.
try {
  validateLayouts(homeGraph, HOME_LAYOUTS);
  console.info(`layouts: ${Object.keys(HOME_LAYOUTS).length} viewports valid`);
} catch (error) {
  fail(`layout validation failed: ${(error as Error).message}`);
}

// 3. Project-focus layouts cover both featured projects on wide/laptop.
try {
  validateFocusLayouts(homeGraph, FOCUS_LAYOUTS, {
    featuredSlugs: FEATURED_PROJECT_SLUGS,
  });
  console.info(
    `focus layouts: ${FEATURED_PROJECT_SLUGS.length * 2} scenes valid (wide/laptop)`,
  );
} catch (error) {
  fail(`focus layout validation failed: ${(error as Error).message}`);
}

// 4. Search index entries reference valid projects/node ids and no LeetCode.
const index = buildSearchIndex();
const validSlugs = new Set<string>(FEATURED_PROJECT_SLUGS);
for (const entry of index) {
  for (const slug of entry.projectSlugs) {
    if (!validSlugs.has(slug))
      fail(`search entry ${entry.id} references unknown project ${slug}`);
  }
  if (entry.nodeId && !homeGraph.nodes.some((node) => node.id === entry.nodeId)) {
    fail(`search entry ${entry.id} references unknown graph node ${entry.nodeId}`);
  }
}
const serialized = JSON.stringify(index).toLowerCase();
if (serialized.includes("leetcode")) fail("LeetCode must not re-enter any model");
const indexBytes = Buffer.byteLength(serialized, "utf8");
console.info(`search: ${index.length} entries, ${indexBytes} bytes embedded`);

// 5. View values are a closed set.
if (HOMEPAGE_VIEWS.join(",") !== "graph,index") {
  fail(`unexpected homepage views: ${HOMEPAGE_VIEWS.join(",")}`);
}

if (failures > 0) {
  process.exit(1);
}
console.info("verify-content passed: content, graph, layouts, search, views OK");
