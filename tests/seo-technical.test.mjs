import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { auditSeoSources } from "../scripts/verify-seo.mjs";
import { auditDelegatedSeoHeading } from "../scripts/verify-seo-source-contracts.mjs";
import { readSeoSource, freeEntryModule, seoNodes, seoText } from "./helpers/seo-source-fixture.mjs";

const reviewSource = readSeoSource("app/[locale]/services/free-situation-review/page.tsx");
const landingSource = readSeoSource("components/free-entry-landing.tsx");
const reviewContract = (pageSource = reviewSource, componentSource = landingSource) => auditDelegatedSeoHeading({
  pageSource, componentSource, componentName: "FreeEntryLanding", moduleSpecifier: "@/components/free-entry-landing",
  props: { locale: { identifier: "locale" }, kind: "situation" },
});

test("technical SEO audit accepts the tracked public routes and rejects private sitemap paths", () => {
  const report = auditSeoSources({ root: process.cwd() });

  assert.equal(report.ok, true, report.failures.join("\n"));
  assert.equal(report.checked.publicRoutes, 4);
  assert.equal(report.checked.privateRoutes, 4);
  assert.equal(report.checked.prioritySitemapEntries, 15);
});

test("free-review route delegates its single localized H1 to the actual imported landing", () => {
  assert.deepEqual(reviewContract().failures, []);
  const { FreeEntryLanding } = freeEntryModule();
  const titles = {
    en: "See your situation from a fresh perspective.",
    ru: "Взгляните на свою ситуацию под другим углом.",
    es: "Mira tu situación desde otra perspectiva.",
  };
  for (const [locale, title] of Object.entries(titles)) {
    const tree = FreeEntryLanding({ locale, kind: "situation" });
    const headings = seoNodes(tree).filter((node) => node.type === "h1");
    assert.equal(headings.length, 1);
    assert.equal(seoText(headings[0]), title);
    assert.equal(tree.props.lang, locale);
    assert.equal(tree.props["data-free-entry-landing"], "situation");
  }
});

for (const [label, mutatePage, mutateLanding, expected] of [
  ["unmounted import", s => s.replace('return <FreeEntryLanding locale={locale} kind="situation" />;', 'return null;'), s => s, /mount/],
  ["wrong import", s => s.replace('@/components/free-entry-landing', '@/components/unrelated-landing'), s => s, /imported/],
  ["wrong kind", s => s.replace('kind="situation"', 'kind="tests"'), s => s, /prop: kind/],
  ["hardcoded locale", s => s.replace('locale={locale}', 'locale="en"'), s => s, /prop: locale/],
  ["overriding spread", s => s.replace('kind="situation"', 'kind="situation" {...otherProps}'), s => s, /prop/],
  ["duplicate mount", s => s.replace('return <FreeEntryLanding locale={locale} kind="situation" />;', 'return <><FreeEntryLanding locale={locale} kind="situation" /><FreeEntryLanding locale={locale} kind="situation" /></>;'), s => s, /mount/],
  ["duplicate parent H1", s => s.replace('return <FreeEntryLanding locale={locale} kind="situation" />;', 'return <><h1>Duplicate</h1><FreeEntryLanding locale={locale} kind="situation" /></>;'), s => s, /duplicate/],
  ["missing actual heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '<h2 id="free-entry-title">{t.title}</h2>'), /exactly one H1/],
  ["empty heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '<h1 id="free-entry-title"></h1>'), /not be empty/],
  ["duplicate child heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '<h1 id="free-entry-title">{t.title}</h1><h1>Duplicate</h1>'), /exactly one H1/],
  ["unreturned decoy heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '<h2>{t.title}</h2>') + '\nfunction Unused() { return <h1>Decoy</h1>; }', /exactly one H1/],
  ["comment decoy heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '{/* <h1>Decoy</h1> */}'), /exactly one H1/],
  ["uninvoked JSX callback decoy", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '{() => <h1>Decoy</h1>}'), /exactly one H1/],
  ["disabled heading", s => s, s => s.replace('<h1 id="free-entry-title">{t.title}</h1>', '{false && <h1>Decoy</h1>}'), /unconditional/],
]) test("delegated SEO source contract rejects " + label, () => {
  const page = mutatePage(reviewSource), landing = mutateLanding(landingSource);
  assert.ok(page !== reviewSource || landing !== landingSource, "Mutation must apply");
  const report = auditSeoSources({ readSource: path => path === "app/[locale]/services/free-situation-review/page.tsx" ? page
    : path === "components/free-entry-landing.tsx" ? landing : readSeoSource(path) });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), expected);
});

test("sitewide Organization schema references the existing Holistic House brand logo", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes('logo: publicOrigin + "/holistic-house-app.svg"'));
  assert.ok(existsSync(new URL("../public/holistic-house-app.svg", import.meta.url)));
});
