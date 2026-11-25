import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SEO_AUDIT_ASSET_URL, SEO_AUDIT_SITE, readSeomatorSnapshot, validateSeomatorSnapshot,
} from "../lib/seo/seomator-snapshot.mjs";
import { buildSeomatorSnapshot } from "../scripts/build-seomator-snapshot.mjs";

const runUrl = "https://github.com/andylitvinov-design/books/actions/runs/12345";
const asOf = "2026-11-20T15:30:00.000Z";
const raw = {
  url: SEO_AUDIT_SITE, overallScore: 84, crawledPages: 24,
  categoryResults: [
    { categoryId: "core", score: 78, failCount: 1, warnCount: 1, results: [
      { ruleId: "core-canonical-present", status: "fail", name: "Canonical URL present",
        suggestion: "Check canonical links, https://private.example/hidden?k=SECRET" },
      { ruleId: "core-title", status: "pass", name: "Title tag" },
    ] },
    { categoryId: "i18n", score: 91, failCount: 0, warnCount: 1, results: [
      { ruleId: "hreflang-reciprocity", status: "warn", name: "Hreflang reciprocal" },
    ] },
  ],
};
const build = (old = null, overrides = {}) =>
  buildSeomatorSnapshot(raw, old, { asOf, runUrl, version: "8.0.1", ...overrides });

test("SEOmator reports become bounded, validated public-only snapshots", () => {
  const snap = build();
  assert.equal(snap.score, 84);
  assert.equal(snap.crawledPages, 24);
  assert.equal(snap.categories.length, 2);
  assert.deepEqual(snap.history, [{ asOf, score: 84 }]);
  assert.deepEqual(snap.findings.map(f => f.status), ["fail", "warn"]);
  assert.ok(!JSON.stringify(snap).includes("private.example"));
  assert.equal(validateSeomatorSnapshot(snap, new Date("2026-11-21T12:00:00Z")).status, "live");
});

test("historical scores never turn an outdated audit into a current measurement", () => {
  const prior = build();
  const current = build(prior, { asOf: "2026-11-27T15:30:00.000Z" });
  assert.deepEqual(current.history.map(h => h.score), [84, 84]);
  assert.equal(validateSeomatorSnapshot(current, new Date("2026-12-30T12:00:00Z")).status, "stale");
  assert.equal(validateSeomatorSnapshot({ ...current, score: "84" }).status, "invalid");
  assert.equal(validateSeomatorSnapshot({ ...current, site: "https://example.com/" }).status, "invalid");
});

test("unverified, wrong-site, missing-measurement audits are not published", () => {
  for (const variant of [
    { ...raw, error: true }, { ...raw, url: "http://localhost/" },
    { ...raw, overallScore: null }, { ...raw, crawledPages: 0 },
    { ...raw, categoryResults: [] },
  ]) assert.throws(() => buildSeomatorSnapshot(variant, null, { asOf, runUrl }), /SEOMATOR/);
  assert.throws(() => buildSeomatorSnapshot(raw, null, { asOf, runUrl: "https://evil.example/" }), /SEOMATOR/);
});

test("reader fetches only the fixed public release URL, no credentials", async () => {
  const expected = build();
  const live = await readSeomatorSnapshot(async (url, request) => {
    assert.equal(url, SEO_AUDIT_ASSET_URL);
    assert.equal(request.next.revalidate, 3600);
    assert.equal(request.headers, undefined);
    return { status: 200, ok: true, text: async () => JSON.stringify(expected) };
  });
  assert.equal(live.score, 84);
  assert.equal((await readSeomatorSnapshot(async () => ({status:404,ok:false}))).status, "not_run");
  assert.equal((await readSeomatorSnapshot(async () => {throw Error("offline");})).status, "unavailable");
});

test("protected SEO dashboard reuses existing recommendations and displays dated audit without private routes", () => {
  const source = readFileSync(new URL("../app/admin/seo/page.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/admin/seo/seo-dashboard.module.css", import.meta.url), "utf8");
  assert.match(source, /requireAdminRequest/);
  assert.match(source, /readSeomatorSnapshot/);
  assert.match(source, /SeoRecommendations/);
  assert.match(source, /data-seomator-audit/);
  assert.match(css, /\.auditHistory/);
  assert.doesNotMatch(source, /SEOMATOR_TOKEN|GH_TOKEN|GITHUB_TOKEN/);
});
