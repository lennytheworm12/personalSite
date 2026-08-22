import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;

const REQUIRED_FILES = [
  "index.html",
  "about/index.html",
  "projects/spotify-sorter/index.html",
  "projects/game-teacher/index.html",
  "404.html",
];

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key id", /AKIA[0-9A-Z]{16}/],
  [
    "generic api key assignment",
    /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}/i,
  ],
  ["github token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ["local username leak", /bphan944/],
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

let failures = 0;
const fail = (message: string) => {
  failures++;
  console.error(`FAIL: ${message}`);
};

// 1. Required generated routes exist as static HTML.
for (const file of REQUIRED_FILES) {
  const path = join(DIST, file);
  try {
    const html = readFileSync(path, "utf8");
    if (!html.includes("<!DOCTYPE html") && !html.includes("<!doctype html")) {
      fail(`${file} is not an HTML document`);
    }
  } catch {
    fail(`required route missing from dist/: ${file}`);
  }
}

// 2. No-JavaScript usability: pages must not depend on client scripts.
for (const file of REQUIRED_FILES) {
  try {
    const html = readFileSync(join(DIST, file), "utf8");
    if (/<script\b/i.test(html)) {
      // Astro may emit tiny inline scripts only if components opt in; the
      // Goal 1 site must ship none.
      fail(`${file} contains a <script> tag; zero client-side JS is required`);
    }
  } catch {
    /* missing-file failure already reported above */
  }
}

// 3. Budgets: total output size and per-page size.
const BUDGET_TOTAL_BYTES = 512 * 1024;
const BUDGET_PAGE_BYTES = 64 * 1024;
let totalBytes = 0;
let largestPageBytes = 0;
for (const filePath of walk(DIST)) {
  const bytes = statSync(filePath).size;
  totalBytes += bytes;
  if (filePath.endsWith(".html")) largestPageBytes = Math.max(largestPageBytes, bytes);
}
console.info(
  `dist totals ${(totalBytes / 1024).toFixed(1)} KiB; largest page ${(largestPageBytes / 1024).toFixed(1)} KiB`,
);
if (totalBytes > BUDGET_TOTAL_BYTES) {
  fail(`total dist size ${totalBytes} exceeds budget ${BUDGET_TOTAL_BYTES}`);
}
if (largestPageBytes > BUDGET_PAGE_BYTES) {
  fail(`largest page ${largestPageBytes} exceeds per-page budget ${BUDGET_PAGE_BYTES}`);
}

// 4. Secret / private-data scan over all emitted files.
for (const filePath of walk(DIST)) {
  const contents = readFileSync(filePath, "utf8");
  for (const [name, pattern] of SECRET_PATTERNS) {
    if (pattern.test(contents)) {
      fail(`possible ${name} found in ${relative(DIST, filePath)}`);
    }
  }
}

if (failures > 0) {
  console.error(`verify-build failed with ${failures} problem(s)`);
  process.exit(1);
}
console.info(
  "verify-build passed: routes, no-JS constraint, budgets, and secret scan OK",
);
