import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyChangedFiles } from "../scripts/ci-ideas-coaching-scope.mjs";
import { runMobileBrowserCases } from "../scripts/ci-mobile-browser-batch.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ALL = ["coaching", "support", "ideas"];

test("unknown, mixed, shared and missing diff always retain all required browser suites", () => {
  assert.deepEqual(classifyChangedFiles(null), ALL);
  assert.deepEqual(classifyChangedFiles([]), ALL);
  assert.deepEqual(classifyChangedFiles(["components/public-coaching-discovery.jsx"]), ["coaching"]);
  assert.deepEqual(classifyChangedFiles(["app/[locale]/coaching/session/123/page.jsx"]), ["coaching"]);
  assert.deepEqual(classifyChangedFiles(["app/[locale]/holistic-support/page.tsx"]), ["support"]);
  assert.deepEqual(classifyChangedFiles(["components/ideas-discovery.tsx"]), ["support", "ideas"]);
  assert.deepEqual(classifyChangedFiles(["lib/ideas-guidance.mjs"]), ["support", "ideas"]);
  assert.deepEqual(classifyChangedFiles(["components/public-coaching-discovery.jsx", "components/holistic-support-choices.tsx"]), ["coaching", "support"]);
  for (const shared of [
    ".github/workflows/hh-ideas-coaching-public.yml",
    "scripts/ci-mobile-browser-batch.mjs",
    "lib/public-locales.ts",
    "components/coaching-intake-form.tsx",
    "app/api/coaching-diagnostic/route.js",
    "package-lock.json",
  ]) assert.deepEqual(classifyChangedFiles([shared]), ALL, shared);
  assert.deepEqual(classifyChangedFiles(["components/public-coaching-discovery.jsx", "app/layout.tsx"]), ALL);
});

test("one browser launch per engine, two workers max, complete all cases", async () => {
  const before = process.env.HH_BROWSER_QA_PARALLEL;
  process.env.HH_BROWSER_QA_PARALLEL = "2";
  const launches = [], closures = [], seen = [];
  let active = 0, peak = 0;
  const make = name => ({ name: () => name, launch: async () => {
    launches.push(name);
    return { close: async () => { closures.push(name); } };
  } });
  try {
    await runMobileBrowserCases([
      { browserType: make("webkit"), cases: [[1], [2], [3], [4]] },
      { browserType: make("chromium"), cases: [[5], [6]] },
    ], async (type, browser, id) => {
      assert.ok(browser);
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      seen.push(type.name() + ":" + id);
      active--;
    });
    assert.deepEqual(launches, ["webkit", "chromium"]);
    assert.deepEqual(closures, ["webkit", "chromium"]);
    assert.equal(seen.length, 6);
    assert.equal(new Set(seen).size, 6);
    assert.ok(peak <= 2 && peak >= 1);
  } finally {
    if (before === undefined) delete process.env.HH_BROWSER_QA_PARALLEL;
    else process.env.HH_BROWSER_QA_PARALLEL = before;
  }
});

test("failing case fails closed and browser process is always released", async () => {
  const before = process.env.HH_BROWSER_QA_PARALLEL;
  process.env.HH_BROWSER_QA_PARALLEL = "1";
  let closed = false;
  try {
    await assert.rejects(runMobileBrowserCases([
      { browserType: { launch: async () => ({ close: async () => { closed = true; } }) }, cases: [[1], [2]] },
    ], async () => { throw new Error("real browser assertion failed"); }), /real browser assertion failed/);
    assert.equal(closed, true);
  } finally {
    if (before === undefined) delete process.env.HH_BROWSER_QA_PARALLEL;
    else process.env.HH_BROWSER_QA_PARALLEL = before;
  }
});

test("all 35 original Chromium/WebKit locale/viewport combinations stay real and isolated", () => {
  for (const path of [
    "scripts/verify-coaching-lounge-mobile.mjs",
    "scripts/verify-holistic-support-browser.mjs",
    "scripts/verify-ideas-mobile-browser.mjs",
  ]) {
    const script = read(path);
    assert.match(script, /runMobileBrowserCases\(/);
    assert.match(script, /browser\.newContext\(/);
    assert.match(script, /await context\.close\(\)/);
    assert.doesNotMatch(script, /browser\.newPage\(|await browser\.close\(\)/);
    assert.match(script, /browserType: webkit/);
    assert.match(script, /browserType: chromium/);
    assert.match(script, /\["en", "ru", "es"\]/);
  }
  assert.match(read("scripts/verify-coaching-lounge-mobile.mjs"), /\[320, 390, 430\]/);
  assert.match(read("scripts/verify-holistic-support-browser.mjs"), /\["ru", 320, 568\]/);
  assert.match(read("scripts/verify-holistic-support-browser.mjs"), /\["en", 430, 844\]/);
  assert.match(read("scripts/verify-ideas-mobile-browser.mjs"), /const widths = \[320, 375, 390, 430\]/);
});

test("workflow runs original build plus safe scoped real browser tests on pinned OS", () => {
  const yaml = read(".github/workflows/hh-ideas-coaching-public.yml");
  assert.match(yaml, /runs-on: ubuntu-24\.04/);
  assert.match(yaml, /playwright install --with-deps --only-shell chromium webkit/);
  assert.match(yaml, /path: \.next\/cache/);
  assert.match(yaml, /uses: actions\/cache@v4/);
  assert.match(yaml, /HH_BROWSER_QA_PARALLEL: '2'/);
  assert.match(yaml, /node scripts\/ci-ideas-coaching-scope\.mjs/);
  assert.match(yaml, /node scripts\/verify-coaching-lounge-mobile\.mjs/);
  assert.match(yaml, /node scripts\/verify-holistic-support-browser\.mjs/);
  assert.match(yaml, /node scripts\/verify-ideas-mobile-browser\.mjs/);
  assert.match(yaml, /- name: Next\.js production build\n        run: npm run build/);
  assert.match(yaml, /!tests\/holistic-support-mobile-mock-parity\.test\.mjs/);
  assert.ok(!yaml.includes("tests/tests-coaching-switchboard.test.mjs tests/coaching-diagnostic-funnel"));
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
  for (const name of ["COACHING", "SUPPORT", "IDEAS"]) assert.ok(yaml.includes("HH_" + name));
});
