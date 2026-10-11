import assert from "node:assert/strict";
import test from "node:test";
import { auditSeoSources } from "../scripts/verify-seo.mjs";

test("technical SEO audit accepts the tracked public routes and rejects private sitemap paths", () => {
  const report = auditSeoSources({ root: process.cwd() });

  assert.equal(report.ok, true, report.failures.join("\n"));
  assert.equal(report.checked.publicRoutes, 4);
  assert.equal(report.checked.privateRoutes, 4);
  assert.equal(report.checked.prioritySitemapEntries, 12);
});
