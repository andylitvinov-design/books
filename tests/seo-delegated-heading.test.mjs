import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { auditSeoSources } from "../scripts/verify-seo.mjs";
import { auditDelegatedHeading, delegatedHeadingPage, delegatedHeadingComponent } from "../scripts/seo-delegated-heading.mjs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read(delegatedHeadingPage);
const component = read(delegatedHeadingComponent);
const mount = '<FreeEntryLanding locale={locale} kind="situation" />';
const h1 = '<h1 id="free-entry-title">{t.title}</h1>';
const emptyCopy = JSON.stringify(Object.fromEntries(["en", "ru", "es"].map((locale) => [locale,
  { situation: { title: "", outcomes: [], steps: [], bullets: [] }, common: {} }])));
function replaceExactly(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, "Mutation must change exactly one real source expression");
  return source.replace(before, after);
}
function report(pageSource = page, componentSource = component) {
  return auditSeoSources({ readSource: (path) => path === delegatedHeadingPage ? pageSource
    : path === delegatedHeadingComponent ? componentSource : read(path) });
}
const expected = [
  { locale: "en", text: "Free personal express review with Andrey." },
  { locale: "ru", text: "Личная экспресс-диагностика с Андреем." },
  { locale: "es", text: "Revisión personal exprés gratuita con Andrey." },
];

// Execute the real wrapper and real leaf with a closed import map. Unrelated
// UI/video/contact modules are inert tags/data, never framework/provider code.
// This verifies the leaf-owned H1, not headings potentially owned by those stubs.
function load(source, filename, dependencies) {
  const compiled = ts.transpileModule(source, { fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert.equal((compiled.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  const require = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), "Unexpected fixture dependency: " + name);
    return dependencies[name];
  };
  new vm.Script(compiled.outputText, { filename }).runInNewContext({ exports, require, process: { env: {} } }, { timeout: 1000 });
  return exports;
}
function renderer(pageSource = page, componentSource = component) {
  const jsx = (type, props) => typeof type === "function" ? type(props || {}) : ({ type, props });
  const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
  const videos = Array.from({ length: 5 }, (_, index) => ({ id: "synthetic-" + index, language: "en", title: "Synthetic fixture" }));
  const leaf = load(componentSource, delegatedHeadingComponent, {
    "react/jsx-runtime": runtime,
    "next/image": "Image", "next/link": "Link",
    "lucide-react": Object.fromEntries(["ArrowLeft", "ArrowRight", "CheckCircle2", "ShieldCheck", "Sparkles"].map((name) => [name, name])),
    "@/components/public-site-header": { PublicSiteHeader: "PublicSiteHeader" },
    "@/components/compact-lead-capture": { CompactLeadCapture: "CompactLeadCapture" },
    "@/components/personal-express-enquiry": { PersonalExpressEnquiry: "PersonalExpressEnquiry" },
    "@/components/telegram-diagnostic-entry": { TelegramDiagnosticEntry: "TelegramDiagnosticEntry" },
    "@/components/free-situation-review-form": { FreeSituationReviewForm: "FreeSituationReviewForm" },
    "@/components/site-video-player": { SiteVideoPlayer: "SiteVideoPlayer" },
    "@/data/service-video-library": { getServiceVideoMedia: () => null },
    "@/components/personal-testimonials": { PersonalTestimonials: "PersonalTestimonials",
      locallyArchivedVideoPosterIds: new Set(), testimonialVideos: { en: videos, ru: videos, es: videos } },
    "./free-entry-landing.module.css": new Proxy({}, { get: (_, key) => String(key) }),
  });
  const wrapper = load(pageSource, delegatedHeadingPage, {
    "react/jsx-runtime": runtime,
    "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
    "@/components/free-entry-landing": leaf,
    "@/data/academy/catalog": { isPublicLocale: (locale) => ["en", "ru", "es"].includes(locale) },
    "@/data/site-metadata": { metadataBaseFor: () => new URL("https://holistichouse.vercel.app") },
  });
  return (locale) => wrapper.default({ params: Promise.resolve({ locale }) });
}
const nodes = (tree) => tree == null || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes)
  : [tree, ...nodes(tree.props?.children)];
const headings = (tree) => nodes(tree).filter((node) => node.type === "h1").map((node) => node.props.children);

test("delegated source audit follows the mounted import and resolves all three localized H1 values", () => {
  assert.deepEqual(auditDelegatedHeading(page, component), { ok: true, failures: [], headings: expected });
  assert.deepEqual(report().failures, []);
});
test("real wrapper renders the real leaf-owned H1 once for EN/RU/ES", async () => {
  const render = renderer();
  for (const { locale, text } of expected) assert.deepEqual(headings(await render(locale)), [text]);
});
for (const [name, target, before, after, failure] of [
  ["removed mount despite retained import", "page", mount, "null", /must return the imported/],
  ["wrong mounted component", "page", mount, '<OtherLanding locale={locale} kind="situation" />', /must return the imported/],
  ["wrong imported module", "page", '"@/components/free-entry-landing"', '"@/components/unrelated-landing"', /actual free-entry-landing import/],
  ["wrong selected kind", "page", mount, '<FreeEntryLanding locale={locale} kind="tests" />', /situation heading/],
  ["hard-coded route locale", "page", mount, '<FreeEntryLanding locale="en" kind="situation" />', /route locale/],
  ["removed H1 despite metadata and title strings", "component", h1, '<h2 id="free-entry-title">{t.title}</h2>', /exactly one unconditional H1/],
  ["comment-only H1", "component", h1, '{/* <h1 id="free-entry-title">{t.title}</h1> */}', /exactly one unconditional H1/],
  ["unused H1 outside returned markup", "component", h1, '{null}', /exactly one unconditional H1/],
  ["conditional H1", "component", h1, '{false ? ' + h1 + ' : null}', /exactly one unconditional H1/],
  ["duplicate H1", "component", h1, h1 + h1, /exactly one unconditional H1/],
  ["template-only H1", "component", h1, '<template>' + h1 + '</template>', /exactly one unconditional H1/],
  ["H1 below a component that may drop children", "component", h1, '<PersonalTestimonials>' + h1 + '</PersonalTestimonials>', /exactly one unconditional H1/],
  ["hidden H1 ancestor", "component", h1, '<div hidden>' + h1 + '</div>', /exactly one unconditional H1/],
  ["inline-hidden H1", "component", h1, '<h1 id="free-entry-title" style={{ display: "none" }}>{t.title}</h1>', /exactly one unconditional H1/],
  ["shadowed mounted import", "page", "  return " + mount, "  function FreeEntryLanding() { return null; }\n  return " + mount, /Mounted import is shadowed/],
  ["mutated route locale", "page", "export default async function FreeSituationReviewPage({ params }: Props) {\n  const { locale } = await params;", "export default async function FreeSituationReviewPage({ params }: Props) {\n  let { locale } = await params;\n  locale = \"en\";", /bindings must be const|mutation/],
  ["mutated leaf kind", "component", "  const t = copy[locale][kind];", '  kind = "tests";\n  const t = copy[locale][kind];', /mutation/],
  ["mutated heading copy", "component", "  const t = copy[locale][kind];", '  copy.en.situation.title = "";\n  const t = copy[locale][kind];', /mutation/],
  ["shadowed heading copy", "component", "  const t = copy[locale][kind];", '  function copy() { return null; }\n  const t = copy[locale][kind];', /binding is shadowed/],
  ["destructured mounted import", "page", "  return " + mount, "  const { FreeEntryLanding } = { FreeEntryLanding: () => null };\n  return " + mount, /Mounted import is shadowed/],
  ["array-destructured mounted import", "page", "  return " + mount, "  const [FreeEntryLanding] = [() => null];\n  return " + mount, /Mounted import is shadowed/],
  ["destructured heading copy", "component", "  const t = copy[locale][kind];", '  const { copy } = { copy: ' + emptyCopy + ' };\n  const t = copy[locale][kind];', /binding is shadowed/],
  ["opaque root-copy mutation call", "component", "  const t = copy[locale][kind];", '  Object.assign(copy[locale][kind], { title: "" });\n  const t = copy[locale][kind];', /Unsupported heading-data use/],
  ["opaque root-copy mutation initializer", "component", "  const t = copy[locale][kind];", '  const ignored = Object.assign(copy[locale][kind], { title: "" });\n  const t = copy[locale][kind];', /Unsupported heading-data use/],
  ["opaque selected-copy mutation", "component", "  const t = copy[locale][kind];", '  const t = copy[locale][kind];\n  const ignored = Object.assign(t, { title: "" });', /Unsupported heading-data use/],
  ["opaque selected-title escape", "component", "  const t = copy[locale][kind];", '  const t = copy[locale][kind];\n  const ignored = consume(t.title);', /Unsupported heading-data use/],
  ["opaque module initializer", "component", "const copy = {", "const opaque = unknownCall();\nconst copy = {", /Heading data must be literal/],
  ["opaque leaf initializer", "component", "  const t = copy[locale][kind];", '  const opaque = unknownCall();\n  const t = copy[locale][kind];', /Unsupported leaf prelude grammar/],
  ["unconditional abort before mount", "page", "  return " + mount, "  notFound();\n  return " + mount, /Unsupported wrapper statement grammar/],
  ["fixed-language lookup", "component", "copy[locale][kind]", "copy.en[kind]", /both the mounted locale and kind/],
  ["fixed-kind lookup", "component", "copy[locale][kind]", "copy[locale].tests", /both the mounted locale and kind/],
  ["missing actual exported component", "component", "export function FreeEntryLanding", "function FreeEntryLanding", /actual exported/],
]) test("delegated source audit rejects " + name, () => {
  let changed = replaceExactly(target === "page" ? page : component, before, after);
  if (name === "unused H1 outside returned markup") changed += '\nfunction UnmountedHeading() { return ' + h1 + '; }\n';
  const result = target === "page" ? report(changed) : report(page, changed);
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], failure);
});
for (const { locale, text } of expected) test(`delegated source audit rejects an empty ${locale} heading`, () => {
  const changed = replaceExactly(component, JSON.stringify(text), '" "');
  const result = report(page, changed);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`Empty ${locale} heading`));
});
test("actual-source controls remove the rendered heading, not just a source marker", async () => {
  for (const [pageSource, componentSource] of [
    [replaceExactly(page, mount, "null"), component],
    [replaceExactly(page, mount, '<OtherLanding locale={locale} kind="situation" />') + '\nfunction OtherLanding() { return null; }\n', component],
    [replaceExactly(page, "  return " + mount, "  function FreeEntryLanding() { return null; }\n  return " + mount), component],
    [page, replaceExactly(component, h1, '<h2 id="free-entry-title">{t.title}</h2>')],
  ]) {
    const render = renderer(pageSource, componentSource);
    for (const { locale } of expected) assert.deepEqual(headings(await render(locale)), []);
  }
});
test("source proof fails closed on unsupported copy-object aliases", () => {
  const changed = replaceExactly(component, "  const t = copy[locale][kind];", "  const labels = copy;\n  const t = labels[locale][kind];");
  const result = auditDelegatedHeading(page, changed);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /literal heading data/);
});
test("source proof follows a genuine imported-component alias, not a literal tag-name whitelist", async () => {
  const changed = replaceExactly(replaceExactly(page, "import { FreeEntryLanding }", "import { FreeEntryLanding as Landing }"), mount, '<Landing locale={locale} kind="situation" />');
  assert.deepEqual(auditDelegatedHeading(changed, component), { ok: true, failures: [], headings: expected });
  const render = renderer(changed);
  for (const { locale, text } of expected) assert.deepEqual(headings(await render(locale)), [text]);
});
test("destructured import shadows actually remove the mounted H1", async () => {
  for (const declaration of ['const { FreeEntryLanding } = { FreeEntryLanding: () => null };', 'const [FreeEntryLanding] = [() => null];']) {
    const changed = replaceExactly(page, "  return " + mount, "  " + declaration + "\n  return " + mount);
    assert.equal(report(changed).ok, false);
    const render = renderer(changed);
    for (const { locale } of expected) assert.deepEqual(headings(await render(locale)), []);
  }
});
test("destructured data shadows and opaque mutation calls actually empty the rendered H1", async () => {
  for (const changed of [
    replaceExactly(component, "  const t = copy[locale][kind];", '  const { copy } = { copy: ' + emptyCopy + ' };\n  const t = copy[locale][kind];'),
    replaceExactly(component, "  const t = copy[locale][kind];", '  Object.assign(copy[locale][kind], { title: "" });\n  const t = copy[locale][kind];'),
    replaceExactly(component, "  const t = copy[locale][kind];", '  const ignored = Object.assign(copy[locale][kind], { title: "" });\n  const t = copy[locale][kind];'),
    replaceExactly(component, "  const t = copy[locale][kind];", '  const t = copy[locale][kind];\n  const ignored = Object.assign(t, { title: "" });'),
  ]) {
    assert.equal(report(page, changed).ok, false);
    const render = renderer(page, changed);
    for (const { locale } of expected) assert.deepEqual(headings(await render(locale)), [""]);
  }
});
test("unconditional abort control actually prevents rendering", async () => {
  const changed = replaceExactly(page, "  return " + mount, "  notFound();\n  return " + mount);
  assert.equal(report(changed).ok, false);
  const render = renderer(changed);
  for (const { locale } of expected) await assert.rejects(render(locale), /NOT_FOUND/);
});
test("rejected locale/kind flow mutations actually render the wrong localized heading", async () => {
  const routeLocale = replaceExactly(page,
    "export default async function FreeSituationReviewPage({ params }: Props) {\n  const { locale } = await params;",
    'export default async function FreeSituationReviewPage({ params }: Props) {\n  let { locale } = await params;\n  locale = "en";');
  for (const [pageSource, componentSource, checked] of [
    [routeLocale, component, expected.filter((item) => item.locale !== "en")],
    [page, replaceExactly(component, "  const t = copy[locale][kind];", '  kind = "tests";\n  const t = copy[locale][kind];'), expected],
    [page, replaceExactly(component, "copy[locale][kind]", "copy.en[kind]"), expected.filter((item) => item.locale !== "en")],
    [page, replaceExactly(component, "copy[locale][kind]", "copy[locale].tests"), expected],
  ]) {
    assert.equal(report(pageSource, componentSource).ok, false);
    const render = renderer(pageSource, componentSource);
    for (const { locale, text } of checked) assert.notDeepEqual(headings(await render(locale)), [text]);
  }
});
test("explicit inline hiding is present in the real rendered H1 props and fails the source proof", async () => {
  const changed = replaceExactly(component, h1, '<h1 id="free-entry-title" style={{ display: "none" }}>{t.title}</h1>');
  assert.equal(report(page, changed).ok, false);
  const render = renderer(page, changed);
  for (const { locale } of expected) {
    const found = nodes(await render(locale)).filter((node) => node.type === "h1");
    assert.equal(found.length, 1);
    assert.equal(found[0].props.style.display, "none");
  }
});
for (const [name, path, before, after, failure] of [
  ["page metadata", delegatedHeadingPage, "generateMetadata", "removedMetadata", /generateMetadata/],
  ["page canonical/alternate metadata", delegatedHeadingPage, "alternates:", "removedAlternates:", /alternates:/],
  ["first-party course link", "components/yggdrasil-free-initiation.tsx", 'href={root + "/basic-course"}', 'href={root + "/removed-course"}', /Missing first-party course entry/],
]) test("delegation does not bypass the existing " + name + " guard", () => {
  const changed = replaceExactly(read(path), before, after);
  const result = auditSeoSources({ readSource: (requested) => requested === path ? changed : read(requested) });
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], failure);
});
