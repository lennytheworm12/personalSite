import { readdirSync, statSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, relative } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;

// Phase 2 budgets (goal brief M9): homepage JS hard ceiling 200 KiB gzip,
// preferred <= ~100 KiB gzip.
const BUDGET_TOTAL_BYTES = 512 * 1024;
const BUDGET_PAGE_BYTES = 96 * 1024;
const HOME_JS_GZIP_HARD_CEILING = 200 * 1024;
const HOME_JS_GZIP_PREFERRED = 100 * 1024;

const REQUIRED_FILES = [
  "index.html",
  "about/index.html",
  "projects/spotify-sorter/index.html",
  "projects/game-teacher/index.html",
  "404.html",
];

const STATIC_ONLY_FILES = REQUIRED_FILES.filter((f) => f !== "index.html");

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

// 2. Script containment (Phase 2 contract): graph/hydration JS is allowed on
// the homepage only; About/projects/404 remain pure static documents.
for (const file of STATIC_ONLY_FILES) {
  const html = readFileSync(join(DIST, file), "utf8");
  if (/<script\b/i.test(html)) {
    fail(`${file} contains a <script> tag; only the homepage may ship JS`);
  }
  if (/\/_astro\/[^"]*\.js/.test(html)) {
    fail(`${file} references an Astro JS chunk`);
  }
}

// 3. Homepage JS budget measurement.
const homeHtml = readFileSync(join(DIST, "index.html"), "utf8");
const chunkUrls = new Set<string>();
// Matches src/href attributes AND astro-island component-url/renderer-url.
for (const match of homeHtml.matchAll(/[\w-]+="([^"]*_astro\/[^"]*\.js[^"]*)"/g)) {
  chunkUrls.add(match[1]);
}
let jsRawTotal = 0;
let jsGzipTotal = 0;
let chunkCount = 0;
for (const url of chunkUrls) {
  // URLs may carry a deploy base (e.g. /personalSite/_astro/x.js); resolve
  // from the _astro segment so verification works at any base path.
  const astroIndex = url.indexOf("_astro/");
  if (astroIndex === -1) continue;
  const filePath = join(DIST, decodeURI(url.slice(astroIndex)).split("?")[0]);
  try {
    const raw = readFileSync(filePath);
    jsRawTotal += raw.byteLength;
    jsGzipTotal += gzipSync(raw).byteLength;
    chunkCount++;
  } catch {
    fail(`homepage references missing JS chunk: ${url}`);
  }
}
console.info(
  [
    `dist total: ${(function () {
      let total = 0;
      for (const f of walk(DIST)) total += statSync(f).size;
      return (total / 1024).toFixed(1);
    })()} KiB`,
    `homepage HTML: ${(statSync(join(DIST, "index.html")).size / 1024).toFixed(1)} KiB`,
    `homepage JS chunks: ${chunkCount}`,
    `homepage JS raw: ${(jsRawTotal / 1024).toFixed(1)} KiB`,
    `homepage JS gzip: ${(jsGzipTotal / 1024).toFixed(1)} KiB`,
  ].join(" | "),
);
if (jsGzipTotal > HOME_JS_GZIP_HARD_CEILING) {
  fail(
    `homepage JS ${jsGzipTotal} bytes gzip exceeds the Phase 2 hard ceiling of ${HOME_JS_GZIP_HARD_CEILING}; inspect bundle composition before proceeding`,
  );
} else if (jsGzipTotal > HOME_JS_GZIP_PREFERRED) {
  console.warn(
    `WARN: homepage JS ${jsGzipTotal} bytes gzip exceeds the preferred target of ${HOME_JS_GZIP_PREFERRED}`,
  );
}

// 4. Budgets for overall output and per-page size.
let totalBytes = 0;
let largestPageBytes = 0;
for (const filePath of walk(DIST)) {
  const bytes = statSync(filePath).size;
  totalBytes += bytes;
  if (filePath.endsWith(".html")) largestPageBytes = Math.max(largestPageBytes, bytes);
}
if (totalBytes > BUDGET_TOTAL_BYTES) {
  fail(`total dist size ${totalBytes} exceeds budget ${BUDGET_TOTAL_BYTES}`);
}
if (largestPageBytes > BUDGET_PAGE_BYTES) {
  fail(`largest page ${largestPageBytes} exceeds per-page budget ${BUDGET_PAGE_BYTES}`);
}

// 5. Secret / private-data scan over all emitted files.
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
  "verify-build passed: routes, script containment, JS budget, page budgets, secret scan OK",
);
