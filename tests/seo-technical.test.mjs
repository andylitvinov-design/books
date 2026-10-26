import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
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

// Real source-root fixtures, never projected/concatenated H1 markup. The optional
// root was added to the verifier; it changes reads, not imported sitemap modules.
const sourcePaths = [
  "data/seo-demand-map.json", "app/[locale]/about/page.tsx",
  "app/[locale]/services/free-situation-review/page.tsx", "app/[locale]/academy/[[...slug]]/page.tsx",
  "components/yggdrasil-free-initiation.tsx", "components/free-entry-landing.tsx", "components/free-entry-landing.module.css",
  "app/[locale]/app/[[...path]]/page.jsx", "app/[locale]/client/[selector]/page.js",
  "app/[locale]/report/[assessmentId]/page.jsx", "app/admin/clients/page.js", "app/sitemap.ts", "app/layout.tsx",
];
function actualSourceFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "hh-seo-source-"));
  try {
    for (const path of sourcePaths) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(new URL("../" + path, import.meta.url), join(root, path));
    }
    return run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const pagePath = "app/[locale]/services/free-situation-review/page.tsx";
const ownerPath = "components/free-entry-landing.tsx";
const h1 = '<h1 id="free-entry-title">{t.title}</h1>';
const mount = '<FreeEntryLanding locale={locale} kind="situation" />';
function edit(root, path, from, to) {
  const file = join(root, path), source = readFileSync(file, "utf8");
  assert.equal(source.split(from).length - 1, 1, "Mutation must change one real source anchor");
  writeFileSync(file, source.replace(from, to));
}

test("source root is a real optional filesystem input; default API still reads the checkout", () => actualSourceFixture((root) => {
  assert.equal(auditSeoSources().ok, true);
  assert.equal(auditSeoSources({ root }).ok, true);
  assert.equal(auditSeoSources({ root: pathToFileURL(root + sep) }).ok, true);
  edit(root, ownerPath, h1, '<h2 id="free-entry-title">{t.title}</h2>');
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /exactly one H1/);
  assert.equal(auditSeoSources().ok, true, "Root mutation cannot alter real checkout or leak between audits");
  assert.throws(() => auditSeoSources({ root: join(root, "missing") }), /ENOENT/);
}));

for (const [name, path, before, after, expected] of [
  ["missing H1", ownerPath, h1, '<h2 id="free-entry-title">{t.title}</h2>', /exactly one H1/],
  ["copied marker without H1", ownerPath, h1, '{"<h1>copied marker</h1>"}', /exactly one H1/],
  ["duplicate H1", ownerPath, h1, h1 + '<h1>Duplicate</h1>', /exactly one H1/],
  ["conditional H1", ownerPath, h1, '{false && ' + h1 + '}', /conditional\/unreachable/],
  ["hidden H1", ownerPath, h1, h1.replace('<h1 ', '<h1 hidden '), /explicitly hidden/],
  ["aria-hidden H1", ownerPath, h1, h1.replace('<h1 ', '<h1 aria-hidden="true" '), /explicitly hidden/],
  ["hidden ancestor", ownerPath, '<div className={styles.heroCopy}>', '<div className={styles.heroCopy} hidden>', /explicitly hidden/],
  ["hidden inline style", ownerPath, h1, h1.replace('<h1 ', '<h1 style={{ display: "none" }} '), /explicitly hidden/],
  ["inert heading", ownerPath, h1, '<template>' + h1 + '</template>', /inert or folded/],
  ["folded heading", ownerPath, h1, '<details>' + h1 + '</details>', /inert or folded/],
  ["unresolved heading ancestor", ownerPath, h1, '<UnknownVisibility>' + h1 + '</UnknownVisibility>', /unresolved component ancestor/],
  ["early owner return", ownerPath, '  const t = copy[locale][kind];', '  return null;\n  const t = copy[locale][kind];', /early\/unreachable/],
  ["wrong owner locale", ownerPath, 'const t = copy[locale][kind];', 'const t = copy.en[kind];', /wrong locale\/kind copy/],
  ["mutated owner locale", ownerPath, '  const t = copy[locale][kind];', '  locale = "en";\n  const t = copy[locale][kind];', /mutated locale\/copy/],
  ["wrong document language", ownerPath, 'lang={locale}', 'lang="en"', /localized main/],
  ["empty localized title", ownerPath, 'title: "Личная экспресс-диагностика с Андреем."', 'title: ""', /missing localized H1 ru/],
  ["wrong route locale", pagePath, mount, '<FreeEntryLanding locale="en" kind="situation" />', /wrong delegated locale\/kind/],
  ["wrong service kind", pagePath, mount, '<FreeEntryLanding locale={locale} kind="dao" />', /wrong delegated locale\/kind/],
  ["wrong source import", pagePath, 'from "@/components/free-entry-landing"', 'from "@/components/unused-heading-owner"', /missing actual import/],
  ["unmounted source delegation", pagePath, mount, '<main />', /one actual delegated owner/],
  ["copied delegation marker", pagePath, mount, '<main>{\'<FreeEntryLanding locale={locale} kind="situation" />\'}</main>', /one actual delegated owner/],
  ["duplicate delegation", pagePath, mount, '<>' + mount + mount + '</>', /one actual delegated owner/],
  ["hidden delegation", pagePath, mount, '<main hidden>' + mount + '</main>', /explicitly hidden/],
  ["conditional delegation", pagePath, mount, '(false && ' + mount + ')', /conditional\/unreachable/],
  ["route ignores requested locale", pagePath, '  const { locale } = await params;', '  const locale = "en";', /route must use requested/],
  ["wrong metadata locale", pagePath, 'const t = copy[locale];', 'const t = copy.en;', /metadata must use requested/],
  ["missing actual title binding", pagePath, 'title: t.title, description: t.description,\n    alternates:', 'title: "Copied title", description: t.description,\n    alternates:', /actual title\/description/],
  ["wrong canonical", pagePath, 'canonical: "/" + locale + "/services/free-situation-review"', 'canonical: "/en/services/free-situation-review"', /wrong self canonical ru/],
  ["wrong hreflang", pagePath, 'es: "/es/services/free-situation-review"', 'es: "/en/services/free-situation-review"', /wrong hreflang/],
  ["wrong metadata origin owner", pagePath, 'metadataBase: metadataBaseFor()', 'metadataBase: "https://other.invalid"', /canonical metadata base/],
  ["early metadata success", pagePath, '  const t = copy[locale];', '  return { title: "Wrong early metadata" };\n  const t = copy[locale];', /early success return/],
  ["missing private noindex", "app/[locale]/client/[selector]/page.js", 'robots: { index: false', 'robots: { index: true', /Private route must remain noindex/],
  ["missing WebSite structured data", "app/layout.tsx", '"@type": "WebSite"', '"@type": "Thing"', /WebSite JSON-LD is missing/],
  ["missing sitemap integration", "app/sitemap.ts", 'getPrioritySitemapEntries(base)', 'getPrioritySitemapEntries("https://other.invalid")', /Priority sitemap entries are not integrated/],
]) test("actual source audit rejects " + name, () => actualSourceFixture((root) => {
  // Two params declarations exist: target the route owner, not the metadata owner.
  if (name === "route ignores requested locale") {
    const file = join(root, path), source = readFileSync(file, "utf8");
    const start = source.indexOf("export default async function FreeSituationReviewPage");
    assert.ok(start > 0);
    writeFileSync(file, source.slice(0, start) + source.slice(start).replace(before, after));
  } else edit(root, path, before, after);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false, name + " must not pass");
  assert.match(report.failures.join("\n"), expected, name + " must fail for the intended source invariant");
}));

test("static heading visibility contract permits explicitly false hidden attributes", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 hidden={false} aria-hidden="false" '));
  assert.equal(auditSeoSources({ root }).ok, true);
}));

// Reviewer counterexamples and adjacent semantic controls are actual source edits.
// Reject unsupported flow rather than assuming the last returned JSX is reached.
for (const [name, path, before, after, expected, all = false] of [
  ["reviewer unreachable owner throw", ownerPath, '  const t = copy[locale][kind];', '  throw new Error("Unreachable heading");\n  const t = copy[locale][kind];', /unsupported owner effect\/control flow/],
  ["reviewer Object.assign bound title", ownerPath, '  const t = copy[locale][kind];', '  const t = copy[locale][kind];\n  Object.assign(t, { title: "" });', /unsupported owner effect\/control flow/],
  ["reviewer computed metadata overwrite", pagePath, 'title: t.title, description: t.description,\n    alternates:', 'title: t.title, description: t.description, ["ti" + "tle"]: "Wrong title",\n    alternates:', /metadata must have explicit noncomputed fields/],
  ["reviewer wrong source destructured property", pagePath, 'const { locale } = await params;', 'const { wrong: locale } = await params;', /requested params.locale property binding/, true],
  ["reviewer wrong metadata parameter property", pagePath, 'generateMetadata({ params }: Props)', 'generateMetadata({ wrong: params }: Props)', /owner must receive actual params property/],
  ["reviewer wrong route parameter property", pagePath, 'FreeSituationReviewPage({ params }: Props)', 'FreeSituationReviewPage({ wrong: params }: Props)', /owner must receive actual params property/],
  ["throw inside owner initializer", ownerPath, 'const common = copy[locale].common;', 'const common = (() => { throw new Error("No heading"); })();', /unsupported owner initializer\/binding/],
  ["conditional termination before return", ownerPath, '  const t = copy[locale][kind];', '  if (true) throw new Error("No heading");\n  const t = copy[locale][kind];', /unsupported owner effect\/control flow/],
  ["assignment to title property", ownerPath, '  const t = copy[locale][kind];', '  const t = copy[locale][kind];\n  t.title = "";', /unsupported owner effect\/control flow/],
  ["Object.defineProperty bound title", ownerPath, '  const t = copy[locale][kind];', '  const t = copy[locale][kind];\n  Object.defineProperty(t, "title", { value: "" });', /unsupported owner effect\/control flow/],
  ["effectful replacement initializer", ownerPath, 'const common = copy[locale].common;', 'const common = Object.assign(t, { title: "" });', /unsupported owner initializer\/binding/],
  ["effectful JSX preceding heading", ownerPath, h1, '{Object.assign(t, { title: "" }) && null}' + h1, /unsupported owner call\/effect/],
  ["assignment JSX preceding heading", ownerPath, h1, '{(t.title = "", null)}' + h1, /unsupported owner mutation/],
  ["effectful JSX attribute", ownerPath, h1, h1.replace('<h1 ', '<h1 data-effect={Object.assign(t, { title: "" })} '), /unsupported owner call\/effect/],
  ["module copy mutation", ownerPath, 'export function FreeEntryLanding(', 'Object.assign(copy.en.situation, { title: "" });\nexport function FreeEntryLanding(', /unsupported module effect\/control flow/],
  ["effectful extra owner declaration", ownerPath, '  const t = copy[locale][kind];', '  const t = copy[locale][kind];\n  const effect = Object.assign(t, { title: "" });', /unsupported owner effect\/control flow/],
  ["duplicate metadata title", pagePath, 'title: t.title, description: t.description,\n    alternates:', 'title: t.title, description: t.description, title: "Wrong title",\n    alternates:', /metadata has duplicate\/unsupported field title/],
  ["duplicate nested canonical", pagePath, 'canonical: "/" + locale + "/services/free-situation-review",', 'canonical: "/" + locale + "/services/free-situation-review", canonical: "/wrong",', /source data has duplicate\/unsupported field canonical/],
  ["computed nested canonical", pagePath, 'canonical: "/" + locale + "/services/free-situation-review",', 'canonical: "/" + locale + "/services/free-situation-review", ["canon" + "ical"]: "/wrong",', /source data must have explicit noncomputed fields/],
  ["extra effectful metadata field", pagePath, 'title: t.title, description: t.description,\n    alternates:', 'title: t.title, description: t.description, other: Object.assign(t, { title: "Wrong" }),\n    alternates:', /unsupported metadata field\/effect/],
  ["locale destructuring default", pagePath, 'const { locale } = await params;', 'const { locale = "en" } = await params;', /requested params.locale property binding/, true],
  ["rest locale binding", pagePath, 'const { locale } = await params;', 'const { ...locale } = await params;', /requested params.locale property binding/, true],
  ["parameter fallback binding", pagePath, 'FreeSituationReviewPage({ params }: Props)', 'FreeSituationReviewPage({ params }: Props = { params: Promise.resolve({ locale: "en" }) })', /owner must receive actual params property/],
  ["wrong owner property binding", ownerPath, 'FreeEntryLanding({ locale, kind }:', 'FreeEntryLanding({ wrong: locale, kind }:', /owner must receive locale\/kind properties/],
  ["owner property default", ownerPath, 'FreeEntryLanding({ locale, kind }:', 'FreeEntryLanding({ locale = "en", kind }:', /owner must receive locale\/kind properties/],
  ["mutable metadata copy binding", pagePath, 'const t = copy[locale];', 'let t = copy[locale];', /missing source binding t/],
  ["hidden heading spread", ownerPath, h1, h1.replace('<h1 ', '<h1 {...{ hidden: true }} '), /unresolved spread/],
  ["metadata spread overwrite", pagePath, 'title: t.title, description: t.description,\n    alternates:', 'title: t.title, description: t.description, ...{ title: "Wrong" },\n    alternates:', /metadata must have explicit noncomputed fields/],
]) test("source grammar rejects " + name, () => actualSourceFixture((root) => {
  if (all) {
    const file = join(root, path), source = readFileSync(file, "utf8");
    assert.equal(source.split(before).length - 1, 2, "Exactly route and metadata params bindings");
    writeFileSync(file, source.replaceAll(before, after));
  } else edit(root, path, before, after);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false, name + " must not pass");
  assert.match(report.failures.join("\n"), expected);
}));

test("supported explicit property aliases preserve actual params and locale identities", () => actualSourceFixture((root) => {
  const file = join(root, pagePath), source = readFileSync(file, "utf8");
  assert.equal(source.split('{ params }: Props').length - 1, 2);
  assert.equal(source.split('const { locale } = await params;').length - 1, 2);
  writeFileSync(file, source.replaceAll('{ params }: Props', '{ params: params }: Props').replaceAll('const { locale } = await params;', 'const { locale: locale } = await params;'));
  edit(root, ownerPath, 'FreeEntryLanding({ locale, kind }:', 'FreeEntryLanding({ kind: kind, locale: locale }:');
  assert.equal(auditSeoSources({ root }).ok, true);
}));

test("comments and a parenthesized pure binding do not invent owner side effects", () => actualSourceFixture((root) => {
  edit(root, ownerPath, 'const common = copy[locale].common;', '/* Object.assign(t, {title: ""}); throw new Error("inert comment"); */\n  const common = (copy[locale].common);');
  assert.equal(auditSeoSources({ root }).ok, true);
}));

test("mapped child cannot shadow the supported video-call binding", () => actualSourceFixture((root) => {
  edit(root, ownerPath, 't.outcomes.map((item, index) => <article key={item.title}>', 't.outcomes.map((siteVideoWatchUrl, index) => <article key={siteVideoWatchUrl(situationVideo.video)}>');
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unsupported owner call\/effect/);
}));

// Complete direct-function grammar: guards, every declarator, and returned route
// expressions. An unsupported shape is not guessed equivalent to current JSX.
for (const [name, path, before, after, expected] of [
  ["reviewer route guard else throw", pagePath, 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) notFound(); else throw new Error("Unreachable valid locale");', /unsupported route preparation\/guard shape/],
  ["reviewer metadata guard else throw", pagePath, 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) return { robots: { index: false } }; else throw new Error("Unreachable metadata");', /unsupported metadata preparation\/guard\/declarator shape/],
  ["reviewer metadata guard else return", pagePath, 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) return { robots: { index: false } }; else return { title: "Wrong early metadata" };', /unsupported metadata preparation\/guard\/declarator shape/],
  ["reviewer metadata extra declarator mutation", pagePath, 'const t = copy[locale];', 'const t = copy[locale], ignored = Object.assign(t, { title: "" });', /unsupported metadata preparation\/guard\/declarator shape/],
  ["reviewer metadata extra declarator throw", pagePath, 'const t = copy[locale];', 'const t = copy[locale], ignored = (() => { throw new Error("Unreachable metadata declarator"); })();', /unsupported metadata preparation\/guard\/declarator shape/],
  ["reviewer route effectful sibling", pagePath, 'return ' + mount + ';', 'return <>{(() => { throw new Error("Unreachable route"); })()}' + mount + '</>;', /unsupported route call\/effect/],
  ["reviewer route effectful attribute", pagePath, mount, '<FreeEntryLanding locale={locale} kind="situation" data-check={(() => { throw new Error("Unreachable route attribute"); })()} />', /unsupported route call\/effect/],
  ["separate same-module metadata mutation via route attribute", pagePath, mount, '<FreeEntryLanding locale={locale} kind="situation" data-check={Object.assign(copy.en, { title: "" })} />', /unsupported route call\/effect/],
  ["metadata mutating declarator before t", pagePath, 'const t = copy[locale];', 'const ignored = Object.assign(copy[locale], { title: "" }), t = copy[locale];', /unsupported metadata preparation\/guard\/declarator shape/],
  ["metadata third declarator cannot be skipped", pagePath, 'const t = copy[locale];', 'const t = copy[locale], harmless = 1, ignored = Object.assign(t, { title: "" });', /unsupported metadata preparation\/guard\/declarator shape/],
  ["metadata pure extra declarator is explicitly unsupported", pagePath, 'const t = copy[locale];', 'const t = copy[locale], harmless = 1;', /unsupported metadata preparation\/guard\/declarator shape/],
  ["route guard effectful else block", pagePath, 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) notFound(); else { Object.assign(copy[locale], { title: "" }); }', /unsupported route preparation\/guard shape/],
  ["metadata guard effectful else block", pagePath, 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) return { robots: { index: false } }; else { throw new Error("Not reached"); }', /unsupported metadata preparation\/guard\/declarator shape/],
  ["route guard empty else is explicitly unsupported", pagePath, 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) notFound(); else {}', /unsupported route preparation\/guard shape/],
  ["route guard extra then statement", pagePath, 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) { notFound(); Object.assign(copy.en, { title: "" }); }', /unsupported route preparation\/guard shape/],
  ["metadata guard extra then statement", pagePath, 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) { Object.assign(copy.en, { title: "" }); return { robots: { index: false } }; }', /unsupported metadata preparation\/guard\/declarator shape/],
  ["route returned sibling assignment", pagePath, 'return ' + mount + ';', 'return <>{(copy.en.title = "", null)}' + mount + '</>;', /unsupported route mutation/],
  ["route attribute assignment", pagePath, mount, '<FreeEntryLanding locale={locale} kind="situation" data-check={(copy.en.title = "")} />', /unsupported route mutation/],
  ["route expression sequence effect", pagePath, 'return ' + mount + ';', 'return (Object.assign(copy.en, { title: "" }), ' + mount + ');', /conditional\/unreachable SEO tree/],
  ["route unknown inert prop is explicitly unsupported", pagePath, mount, '<FreeEntryLanding locale={locale} kind="situation" data-extra="unverified" />', /unsupported route delegation attribute\/prop shape/],
  ["route pure wrapper is explicitly unsupported", pagePath, 'return ' + mount + ';', 'return <>' + mount + '</>;', /unsupported route returned delegation shape/],
  ["named owner replaced by default export", ownerPath, 'export function FreeEntryLanding(', 'export default function FreeEntryLanding(', /missing exported owner FreeEntryLanding/],
  ["generator component", ownerPath, 'export function FreeEntryLanding(', 'export function* FreeEntryLanding(', /unsupported function execution mode/],
  ["async component is outside this synchronous source contract", ownerPath, 'export function FreeEntryLanding(', 'export async function FreeEntryLanding(', /unsupported function execution mode/],
  ["generator route", pagePath, 'export default async function FreeSituationReviewPage(', 'export default async function* FreeSituationReviewPage(', /unsupported function execution mode/],
  ["generator metadata", pagePath, 'export async function generateMetadata(', 'export async function* generateMetadata(', /unsupported function execution mode/],
  ["new module import boundary", ownerPath, 'import Image from "next/image";', 'import Image from "next/image";\nimport { newBoundary } from "new-unverified-boundary";', /unsupported module import shape/],
  ["new binding on existing module boundary", ownerPath, 'ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, Sparkles', 'ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, Sparkles, String', /unsupported module import binding/],
]) test("complete grammar rejects " + name, () => actualSourceFixture((root) => {
  edit(root, path, before, after);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), expected);
}));

test("single-statement guard blocks and parenthesized delegation preserve supported behavior", () => actualSourceFixture((root) => {
  edit(root, pagePath, 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) { notFound(); }');
  edit(root, pagePath, 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) { return { robots: { index: false } }; }');
  edit(root, pagePath, 'return ' + mount + ';', 'return (' + mount + ');');
  assert.equal(auditSeoSources({ root }).ok, true);
}));

for (const [name, from, to] of [
  ["static params preparation mutation", 'export function generateStaticParams() { return', 'export function generateStaticParams() { copy.en.title = ""; return'],
  ["static params generator mode", 'export function generateStaticParams()', 'export function* generateStaticParams()'],
  ["wrong static locale set", 'return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];', 'return [{ locale: "en" }, { locale: "ru" }, { locale: "en" }];'],
]) test("known direct export rejects " + name, () => actualSourceFixture((root) => {
  edit(root, pagePath, from, to);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), /unsupported static|unsupported function execution mode/);
}));

for (const [name, replacement] of [
  ["absent delegated kind", '<FreeEntryLanding locale={locale} />'],
  ["bare delegated locale", '<FreeEntryLanding locale kind="situation" />'],
]) test("incomplete source shape is reported as unverified: " + name, () => actualSourceFixture((root) => {
  edit(root, pagePath, mount, replacement);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.ok(report.failures.length > 0);
  assert.ok(report.failures.every((message) => message.startsWith("Free review SEO: unverified source shape:")));
}));

// AwaitUsing shares a NodeFlags bit with Const; inspect syntax, not that bit alone.
for (const [name, path, from, to] of [
  ["metadata await-using declarator", pagePath, 'const t = copy[locale];', 'await using t = copy[locale];'],
  ["module await-using data binding", pagePath, 'const copy = {', 'await using copy = {'],
  ["owner using declarator", ownerPath, 'const t = copy[locale][kind];', 'using t = copy[locale][kind];'],
  ["ambient owner declaration modifier", ownerPath, 'export function FreeEntryLanding(', 'export declare function FreeEntryLanding('],
]) test("unsupported declaration kind remains unverified: " + name, () => actualSourceFixture((root) => {
  edit(root, path, from, to);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), /missing source binding|unsupported module effect\/control flow|unsupported function execution mode/);
}));

for (const [name, path, from, to] of [
  ["ambient route copy", pagePath, 'const copy = {', 'declare const copy = {'],
  ["ambient component copy", ownerPath, 'const copy = {', 'declare const copy = {'],
  ["ambient metadata local", pagePath, 'const t = copy[locale];', 'declare const t = copy[locale];'],
  ["ambient component local", ownerPath, 'const t = copy[locale][kind];', 'declare const t = copy[locale][kind];'],
]) test("plain runtime const excludes " + name, () => actualSourceFixture((root) => {
  edit(root, path, from, to);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), /unsupported module effect\/control flow|missing source binding t/);
}));

// Successor02 reviewer counterexamples: AST identity, lexical binding and source
// values are checked, not accepted because a descendant contains no known effect.
for (const [name, start] of [
  ["metadata await identifier", "export async function generateMetadata"],
  ["route await identifier", "export default async function FreeSituationReviewPage"],
]) test("closed grammar rejects reviewer " + name, () => actualSourceFixture((root) => {
  const file = join(root, pagePath), source = readFileSync(file, "utf8"), index = source.indexOf(start);
  assert.ok(index > 0);
  const tail = source.slice(index); assert.ok(tail.includes("await params"));
  writeFileSync(file, source.slice(0, index) + tail.replace("await params", "awaitparams"));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), /requested params.locale|metadata preparation\/guard\/declarator/);
}));

for (const [name, expression, expected] of [
  ["reviewer join object coercion", '[{ toString: null }].join(" ")', /join primitive receiver\/coercion/],
  ["reviewer join object method", '[{ toString() { return {}; } }].join(" ")', /source data must have explicit noncomputed fields/],
  ["reviewer unbound approved call", 'String(i + 1)', /unbound owner identifier i/],
  ["reviewer null property through assertion", '(null as unknown as { value: string }).value', /unsupported\/missing own owner property/],
  ["unbound direct identifier", 'missingBoundValue', /unbound owner identifier/],
  ["callback index does not leak", 'index + 1', /unbound owner identifier index/],
  ["inherited record property", 'copy.en.toString', /unsupported\/missing own owner property/],
  ["inherited array property", 't.outcomes.constructor', /unsupported\/missing own owner property/],
  ["missing own property", 't.missing.title', /unsupported\/missing own owner property/],
  ["object addition coercion", '({ toString: null } as unknown as string) + ""', /primitive addition\/coercion/],
  ["null addition coercion is unsupported", 'null + 1', /primitive addition\/coercion/],
  ["nested array join coercion", '[[]].join(" ")', /join primitive receiver\/coercion/],
  ["null join coercion is unsupported", '[null].join(" ")', /join primitive receiver\/coercion/],
  ["boolean join coercion is unsupported", '[false].join(" ")', /join primitive receiver\/coercion/],
  ["sparse array is unsupported", '[,].join(" ")', /expression\/value OmittedExpression/],
  ["spread array is unsupported", '[...t.bullets].join(" ")', /expression\/value SpreadElement/],
  ["raw object is not a JSX child", '({ value: "not a child" })', /JSX child value/],
  ["unknown function in unselected branch", 'false ? (() => "unverified") : null', /expression\/value ArrowFunction/],
  ["unselected value-sensitive path is unverified", 'false ? (null as unknown as { value: string }).value : null', /unverified value path outside finite source domain/],
  ["unsupported optional property", 't?.title', /expression\/value PropertyAccessExpression/],
  ["nonfinite numeric literal", '1e999', /expression\/value FirstLiteralToken/],
  ["bigint is outside supported primitive domain", '1n', /expression\/value BigIntLiteral/],
  ["unknown CSS boundary field", 'styles.unverifiedMissingClass', /unsupported CSS boundary field/],
  ["unknown video boundary field", 'situationVideo ? situationVideo.unverifiedField : null', /unsupported\/missing own owner property/],
]) test("closed binding/value grammar rejects " + name, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, '{' + expression + '}' + h1);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false, name + " must be unverified, never guessed valid");
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), expected);
}));

test("closed grammar reaches JSX-valued props and ordinary attribute expressions", () => actualSourceFixture((root) => {
  edit(root, ownerPath, '<div className={styles.reviewOutcomePhoto}>', '<div data-value={(null as unknown as { value: string }).value} className={styles.reviewOutcomePhoto}>');
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unsupported\/missing own owner property/);
}));

test("structural await permits real parenthesized expressions without merging identifier text", () => actualSourceFixture((root) => {
  const file = join(root, pagePath), source = readFileSync(file, "utf8");
  assert.equal(source.split('await params').length - 1, 2);
  writeFileSync(file, source.replaceAll('await params', '(await (params))'));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, true, report.failures.join("\n"));
}));

test("closed grammar accepts primitive JSX and actual literal own-property values", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, '{"safe"}{1 + 2}{true ? "one" : "two"}{({ value: "safe" } as const).value}' + h1);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, true, report.failures.join("\n"));
}));

test("a missing real CSS source does not become fabricated class data", () => actualSourceFixture((root) => {
  rmSync(join(root, "components/free-entry-landing.module.css"));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape:.*ENOENT/);
}));

for (const [name, before, after, expected] of [
  ["route bitwise guard is not logical negation", 'if (!isPublicLocale(locale)) notFound();', 'if (~isPublicLocale(locale)) notFound();', /route preparation\/guard shape/],
  ["route positive unary guard is not logical negation", 'if (!isPublicLocale(locale)) notFound();', 'if (+isPublicLocale(locale)) notFound();', /route preparation\/guard shape/],
  ["metadata bitwise guard is not logical negation", 'if (!isPublicLocale(locale)) return', 'if (~isPublicLocale(locale)) return', /metadata preparation\/guard\/declarator/],
  ["metadata negative unary guard is not logical negation", 'if (!isPublicLocale(locale)) return', 'if (-isPublicLocale(locale)) return', /metadata preparation\/guard\/declarator/],
]) test("structural contract preserves operator semantics: " + name, () => actualSourceFixture((root) => {
  edit(root, pagePath, before, after);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), expected);
}));

for (const [name, inserted, expected] of [
  ["CSS class boundary cannot stand in for a proven addition operand", '{styles.page + 1}', /primitive addition\/coercion/],
  ["owner self-recursion is not an imported JSX boundary", '<FreeEntryLanding locale={locale} kind={kind} />', /JSX tag binding/],
]) test("named boundary contract rejects " + name, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, inserted + h1);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), expected);
}));

for (const [name, replacement] of [
  ["unknown HTML injection prop", h1.replace('<h1 ', '<h1 dangerouslySetInnerHTML ')],
  ["unknown ref prop", h1.replace('<h1 ', '<h1 ref="unverified" ')],
]) test("finite JSX prop contract rejects " + name, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, replacement);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported owner JSX prop contract/);
}));

// Inline visibility is a finite literal contract, not computed CSS/native proof.
// Real source literals are normalized only by CSS ASCII whitespace/case and a
// conservative number/percentage grammar. Unknown styles stay unverified.
for (const [name, sourceStyle, expected] of [
  ["uppercase display none", '{ display: "NONE" }', /explicitly hidden SEO style/],
  ["ASCII whitespace display none", '{ display: " \\tNoNe\\n" }', /explicitly hidden SEO style/],
  ["uppercase visibility hidden", '{ visibility: "HIDDEN" }', /explicitly hidden SEO style/],
  ["whitespace visibility collapse", '{ visibility: " collapse " }', /explicitly hidden SEO style/],
  ["uppercase content visibility hidden", '{ contentVisibility: "HIDDEN" }', /explicitly hidden SEO style/],
  ["decimal string opacity zero", '{ opacity: "0.00" }', /explicitly hidden SEO style/],
  ["signed string opacity zero", '{ opacity: " -0 " }', /explicitly hidden SEO style/],
  ["fraction string opacity zero", '{ opacity: "+.0" }', /explicitly hidden SEO style/],
  ["exponent string opacity zero", '{ opacity: "0E2" }', /explicitly hidden SEO style/],
  ["percentage opacity zero", '{ opacity: "0%" }', /explicitly hidden SEO style/],
  ["negative opacity clamps to zero", '{ opacity: "-1" }', /explicitly hidden SEO style/],
  ["dynamic display variable", '{ display: "var(--unverified)" }', /unsupported SEO visibility literal/],
  ["inherited visibility is unverified", '{ visibility: "inherit" }', /unsupported SEO visibility literal/],
  ["automatic content visibility is unverified", '{ contentVisibility: "auto" }', /unsupported SEO visibility literal/],
  ["calculated opacity is unverified", '{ opacity: "calc(0)" }', /unsupported SEO opacity literal/],
  ["non-CSS hexadecimal opacity is unverified", '{ opacity: "0x0" }', /unsupported SEO opacity literal/],
  ["nonfinite opacity is unverified", '{ opacity: "NaN" }', /unsupported SEO opacity literal/],
  ["unmodeled ancestor property is unverified", '{ transform: "scale(0)" }', /unsupported SEO ancestor style property/],
  ["string is not a style object", '"display:none"', /unsupported SEO ancestor style object/],
  ["locale binding is not a literal style proof", '{ display: locale }', /unsupported source value locale/],
]) test("literal visibility grammar rejects " + name, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 style={' + sourceStyle + '} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape/);
  assert.match(report.failures.join("\n"), expected);
}));

for (const [name, sourceStyle] of [
  ["case-normalized visible display", '{ display: " BLOCK " }'],
  ["case-normalized visible visibility", '{ visibility: "ViSiBlE" }'],
  ["visible content visibility", '{ contentVisibility: " visible " }'],
  ["positive decimal opacity", '{ opacity: "1.00" }'],
  ["positive percentage opacity", '{ opacity: "50%" }'],
  ["positive numeric opacity", '{ opacity: 1 }'],
]) test("literal visibility grammar permits " + name, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 style={' + sourceStyle + '} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, true, report.failures.join("\n"));
}));

test("literal visibility grammar checks ancestors but does not hide unrelated siblings", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, '<span style={{ display: "NONE" }}>Unrelated hidden sibling</span>' + h1);
  assert.equal(auditSeoSources({ root }).ok, true);
  edit(root, ownerPath, '<div className={styles.heroCopy}>', '<div style={{ opacity: "0.0%" }} className={styles.heroCopy}>');
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /explicitly hidden SEO style/);
}));

for (const display of ["table-column", "table-column-group", "contents"]) test("literal visibility grammar leaves unmodeled layout role unverified: " + display, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 style={{ display: "' + display + '" }} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported SEO visibility literal display/);
}));

for (const token of ['"TRUE"', '"0"', 'null', '" false "']) test("literal visibility grammar leaves unknown aria-hidden token unverified: " + token, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 aria-hidden={' + token + '} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported aria-hidden literal on SEO ancestor/);
}));

test("literal visibility grammar rejects unbound aria-hidden instead of guessing omission", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 aria-hidden={unboundVisibility} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unsupported source value unboundVisibility/);
}));

test("literal visibility grammar ignores asserted types when actual aria-hidden is true", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 aria-hidden={true as false} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /explicitly hidden SEO tree/);
}));

test("literal visibility grammar preserves actual boolean false aria-hidden", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 aria-hidden={false} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, true, report.failures.join("\n"));
}));

for (const token of ['0', 'null']) test("literal visibility grammar leaves nonboolean hidden value unverified: " + token, () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, h1.replace('<h1 ', '<h1 hidden={' + token + '} '));
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported hidden literal on SEO ancestor/);
}));

// Named opaque values are valid only in their declared JSX prop contexts, not
// through a generic primitive/JSX fallback. No imported subtree is executed.
test("closed boundary grammar requires the named video handle rather than a primitive", () => actualSourceFixture((root) => {
  edit(root, ownerPath, 'video={situationVideo.video}', 'video={1}');
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported owner JSX prop value video/);
}));

test("closed boundary grammar does not treat JSX as an arbitrary scalar prop", () => actualSourceFixture((root) => {
  edit(root, ownerPath, h1, '<span data-unverified={<span>Not a scalar prop</span>} />' + h1);
  const report = auditSeoSources({ root });
  assert.equal(report.ok, false);
  assert.match(report.failures.join("\n"), /unverified source shape: unsupported owner JSX prop value data-unverified/);
}));
