import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { auditSeoSources } from "../scripts/verify-seo.mjs";

test("technical SEO audit accepts the tracked public routes and rejects private sitemap paths", () => {
  const report = auditSeoSources({ root: process.cwd() });

  assert.equal(report.ok, true, report.failures.join("\n"));
  assert.equal(report.checked.publicRoutes, 4);
  assert.equal(report.checked.privateRoutes, 4);
  assert.equal(report.checked.prioritySitemapEntries, 15);
});

test("sitewide Organization schema references the existing Holistic House brand logo", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes('logo: publicOrigin + "/holistic-house-app.svg"'));
  assert.ok(existsSync(new URL("../public/holistic-house-app.svg", import.meta.url)));
});
