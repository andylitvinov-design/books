import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { auditSeoSources, auditFreeEntryLandingSources } from "../scripts/verify-seo.mjs";

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

const situationRoute = readFileSync(new URL("../app/[locale]/services/free-situation-review/page.tsx", import.meta.url), "utf8");
const freeEntryLanding = readFileSync(new URL("../components/free-entry-landing.tsx", import.meta.url), "utf8");

test("situation SEO follows its actual delegated localized heading, not an inline duplicate", () => {
  const report = auditFreeEntryLandingSources(situationRoute, freeEntryLanding);
  assert.equal(report.ok, true, report.failures.join("\n"));
});

for (const [label, target, before, after] of [
  ["missing import", "route", 'import { FreeEntryLanding }', 'import { OtherLanding }'],
  ["wrong destination", "route", 'return <FreeEntryLanding', 'return <OtherLanding'],
  ["wrong entry kind", "route", 'kind="situation"', 'kind="tests"'],
  ["missing locale", "route", 'locale={locale}', 'locale="en"'],
  ["duplicate route H1", "route", 'return <FreeEntryLanding', 'return <><h1>Duplicate</h1><FreeEntryLanding'],
  ["missing component export", "landing", 'export function FreeEntryLanding(', 'function FreeEntryLanding('],
  ["wrong copy kind", "landing", 'const t = copy[locale][kind]', 'const t = copy[locale].tests'],
  ["missing main language", "landing", 'lang={locale}', 'lang="en"'],
  ["missing H1", "landing", '<h1 id="free-entry-title">{t.title}</h1>', '<h2 id="free-entry-title">{t.title}</h2>'],
  ["commented H1", "landing", '<h1 id="free-entry-title">{t.title}</h1>', '{/* <h1 id="free-entry-title">{t.title}</h1> */}'],
  ["empty H1", "landing", '<h1 id="free-entry-title">{t.title}</h1>', '<h1 id="free-entry-title"></h1>'],
  ["duplicate component H1", "landing", '<h1 id="free-entry-title">{t.title}</h1>', '<h1 id="free-entry-title">{t.title}</h1><h1>Duplicate</h1>'],
]) test("delegated source audit rejects " + label, () => {
  const source = target === "route" ? situationRoute : freeEntryLanding;
  assert.ok(source.includes(before), "mutation must apply to actual source");
  const changed = source.replace(before, after);
  const report = auditFreeEntryLandingSources(target === "route" ? changed : situationRoute,
    target === "landing" ? changed : freeEntryLanding);
  assert.equal(report.ok, false, "source audit accepted " + label);
  assert.ok(report.failures.length > 0);
});
