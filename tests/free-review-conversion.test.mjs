import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const css = read("app/[locale]/services/free-situation-review/review.module.css");
const form = read("components/free-situation-review-form.tsx");
const quickRequest = read("components/free-review-quick-request.tsx");
const intake = read("components/free-drawing-intake.tsx");
const intakeCss = read("components/free-drawing-intake.module.css");

function assertStaticPortraits(source) {
  const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = ast.statements.filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === "@/components/static-portrait");
  assert.equal(imports.length, 1, "Use the approved static portrait wrapper");
  const bindings = imports[0].importClause?.namedBindings;
  assert.ok(bindings && ts.isNamedImports(bindings));
  assert.ok(bindings.elements.some(node => node.name.text === "StaticPortrait" && (!node.propertyName || node.propertyName.text === "StaticPortrait")));
  const portraits = [];
  const visit = node => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === "StaticPortrait") portraits.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(portraits.length, 2, "Keep both practitioner portrait placements");
  for (const portrait of portraits) {
    const attributes = portrait.attributes.properties;
    assert.ok(attributes.every(node => !ts.isJsxSpreadAttribute(node)), "Do not override verified portrait props");
    const src = attributes.filter(node => ts.isJsxAttribute(node) && node.name.text === "src");
    assert.equal(src.length, 1);
    assert.ok(src[0].initializer && ts.isStringLiteral(src[0].initializer));
    assert.equal(src[0].initializer.text, "/images/holistic-house/andy-about.png");
  }
}

test("portrait contract rejects other components, sources and missing placements", () => {
  for (const altered of [
    landing.replaceAll("<StaticPortrait", "<Image"),
    landing.replaceAll("@/components/static-portrait", "@/components/other-portrait"),
    landing.replace("/images/holistic-house/andy-about.png", "/other.png"),
    landing.replace("<StaticPortrait", "<OtherPortrait"),
    landing.replace("<StaticPortrait", "<StaticPortrait {...unverified}"),
  ]) assert.throws(() => assertStaticPortraits(altered));
});

test("EN, RU, ES free offer is a handwritten drawing diagnostic with a written report", () => {
  for (const phrase of ["Бесплатная диагностика ситуации и личная консультация", "Free Situation Review & Personal Consultation",
    "Revisión gratuita y consulta personal", "Коучинг-форма", "Coaching questionnaire", "Formulario de coaching",
    "ME, MY GOAL and MY PROBLEM", "Я", "МОЯ ЦЕЛЬ", "МИ ПРОБЛЕМА".replace("МИ", "МОЯ")]) {
    assert.ok(landing.includes(phrase) || intake.includes(phrase), "Missing: " + phrase);
  }
  for (const path of ["/en/services/free-situation-review", "/ru/services/free-situation-review", "/es/services/free-situation-review"]) {
    assert.ok(landing.includes(path), "Locale/canonical missing: " + path);
  }
  assertStaticPortraits(landing);
  assert.ok(landing.includes("<FreeSituationReviewForm locale={locale} />"));
  assert.ok(landing.includes('id="request-free-review"'));
});

test("landing explains precisely three free steps and two optional priced live sessions", () => {
  for (const key of ["t.steps.map", "t.directions.map", "t.faqs.map", "t.paidOptions.map"]) assert.ok(landing.includes(key));
  for (const price of ["€50", "€100"]) assert.ok(landing.includes(price));
  for (const mins of ["30 minutes", "60 minutes", "30 минут", "60 минут"]) assert.ok(landing.includes(mins));
  assert.ok(landing.includes("encodeURIComponent(option.message)"));
  assert.ok(landing.includes('href="#request-free-review"'));
  assert.ok(landing.includes("getHomeopathyLocaleParams"));
  assert.ok(landing.includes("isPublicLocale"));
  assert.ok(landing.includes('className={styles.paid}'));
});

test("coaching form is real, ephemeral, mobile-friendly and does not leak responses in WhatsApp URL", () => {
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  for (const field of ["problem", "goal", "obstacle", "tried"]) assert.ok(intake.includes("set" + field[0].toUpperCase() + field.slice(1)), field);
  assert.match(intake, /<form onSubmit=/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /setPrepared\(true\)/);
  assert.match(intake, /readyRef\.current\?\.focus\(\)/);
  assert.match(intake, /Nothing has been sent/);
  assert.match(intake, /aria-live="polite"/);
  assert.match(intake, /whatsappEnquiryUrl\(\{/);
  assert.match(intake, /request: t\.whatsappIntro/);
  assert.match(intake, /<ContactChannelChooser/);
  assert.match(intake, /onChannelClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.doesNotMatch(intake, /encodeURIComponent\((?:answers|problem|goal|obstacle|tried)\)/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|\/api\/app\/|FileReader/);
  assert.match(intake, /attach a photo of my handwritten drawing/);
  assert.match(intake, /Nothing is sent automatically/);
  assert.match(intakeCss, /@media\(max-width:767px\)/);
  assert.match(intakeCss, /focus-visible/);
});

test("first contact stays compact, with messenger handoff and no drawing requirement", () => {
  assert.match(quickRequest, /<ContactChannelChooser/);
  assert.match(quickRequest, /namePlaceholder/);
  assert.match(quickRequest, /questionPlaceholder/);
  assert.match(quickRequest, /whatsappEnquiryUrl\(\{/);
  assert.match(quickRequest, /service_request_start/);
  assert.doesNotMatch(quickRequest, /<FreeDrawingIntake|fetch\(|localStorage|sessionStorage/);
  const hero = landing.slice(landing.indexOf('className={styles.capturePanel}'), landing.indexOf('</section>', landing.indexOf('className={styles.capturePanel}')));
  assert.ok(hero.includes('<FreeReviewQuickRequest'));
  assert.ok(!hero.includes('<FreeSituationReviewForm'), "Detailed questionnaire must not be in the first capture");
  assert.ok(landing.includes('variant="all"'), "Full archived testimonials must appear on this landing");
  assert.ok(landing.indexOf('variant="all"') < landing.lastIndexOf('className={styles.details}'));
  assert.ok(landing.includes('className={styles.finalCapture}'));
});

test("mobile design keeps a clear first-step form and separates paid plans", () => {
  for (const value of [".contentGrid", ".capturePanel", ".steps", ".paid", ".directions", ".about", ".faq", ".closing"]) assert.ok(css.includes(value));
  assert.ok(css.includes("@media(max-width:767px)"));
  assert.match(landing, /className=\{styles\.heroActions\}/);
  assert.match(css, /\.heroActions\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.heroActions a\{min-height:48px/);
  assert.match(css, /\.paid\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.paidOptions a\{min-height:64px/);
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr)"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion"));
});

test("written situation report is never represented as a healthcare diagnosis or cure", () => {
  for (const phrase of ["not a medical diagnosis", "не медицин", "no un diagnóstico"]) assert.ok(landing.includes(phrase), phrase);
  assert.ok(landing.includes("optional"));
  assert.doesNotMatch(landing, /guaranteed cure|лечим все|100% success|medical diagnosis provided/i);
});

// Exercise the actual localized page, replacing only framework/child boundaries.
// In particular, unused copy.scope* fields must not satisfy visible-scope checks.
async function renderLanding(source, locale) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { notFound() { throw new Error("Not found"); } },
    "@/data/academy/catalog": { isPublicLocale: value => ["en", "ru", "es"].includes(value) },
    "./review.module.css": { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  };
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  runInNewContext(compiled, { exports, require: name => modules[name] || new Proxy({ __esModule: true }, {
    get: (target, key) => key in target ? target[key] : String(key),
  }) });
  return exports.default({ params: Promise.resolve({ locale }) });
}
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const textOf = tree => tree == null || typeof tree === "boolean" ? "" : typeof tree !== "object"
  ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join(" ") : textOf(tree.props?.children);

function assertLandingContract(tree, locale) {
  const all = nodes(tree);
  const byClass = name => all.find(node => node.props?.className === name);
  assert.equal(byClass("heroPrimary")?.props.href, "#request-free-review");
  assert.equal(byClass("heroSecondary")?.props.href, "#personal-consultation");
  assert.equal(byClass("capturePanel")?.props.id, "request-free-review");
  assert.ok(nodes(byClass("capturePanel")).some(node => node.type === "FreeReviewQuickRequest" && node.props.locale === locale), "First enquiry must be compact");
  assert.ok(!nodes(byClass("capturePanel")).some(node => node.type === "FreeSituationReviewForm"), "Do not force questionnaire in first capture");
  assert.ok(all.some(node => node.type === "FreeSituationReviewForm" && node.props.locale === locale), "Keep detailed form only after process");
  const finalCapture = byClass("finalCapture");
  assert.ok(finalCapture && nodes(finalCapture).some(node => node.type === "FreeReviewQuickRequest"), "Repeat compact capture at the end");
  assert.ok(all.indexOf(byClass("outcomes")) < all.indexOf(byClass("paid")), "Client outcomes must come before the offer");
  assert.ok(all.indexOf(byClass("faq")) < all.indexOf(byClass("details")), "Explain the process near the bottom");
  assert.ok(all.indexOf(byClass("details")) < all.indexOf(finalCapture), "Repeat enquiry after process");
  const paid = byClass("paid");
  assert.equal(paid?.props.id, "personal-consultation");
  const videoIndex = all.findIndex(node => node.type === "ServiceVideoShowcase");
  assert.ok(videoIndex > all.indexOf(paid), "Separate paid offer must precede the general video");
  assert.equal(byClass("scope"), undefined, "The repeated free scope section stays removed");
  assert.equal(byClass("directions")?.type, "details");
  const options = nodes(paid).filter(node => node.type === "a");
  assert.equal(options.length, 2);
  for (const [index, price] of ["€50", "€100"].entries()) {
    assert.ok(textOf(options[index]).includes(price));
    const url = new URL(options[index].props.href);
    assert.equal(url.origin + url.pathname, "https://wa.me/14376066502");
    assert.ok(url.searchParams.get("text").includes(price));
    assert.ok(url.searchParams.get("text").includes(index === 0 ? "30" : "60"));
  }
  const faq = textOf(byClass("faq"));
  const clauses = {
    en: ["does not include a live call", "not a medical diagnosis, psychiatric diagnosis or prescription"],
    ru: ["Бесплатного созвона в этот формат не входит", "не медицинский или психиатрический диагноз или назначение лечения"],
    es: ["No incluye una llamada en directo", "sin diagnósticos médicos o psiquiátricos ni recetas"],
  };
  for (const clause of clauses[locale]) assert.ok(faq.includes(clause), clause);
  assert.ok(textOf(byClass("safety")).length > 50, "Visible safety explanation must remain");
}

for (const locale of ["en", "ru", "es"]) {
  test(`${locale}: rendered free intake and optional paid enquiry have distinct working targets and visible limits`, async () => {
    assertLandingContract(await renderLanding(landing, locale), locale);
  });
}

test("landing contract rejects broken paid anchors, mixed free/paid navigation and hidden safety copy", async () => {
  for (const [before, after] of [
    ['id="personal-consultation"', 'id="missing-paid-anchor"'],
    ['className={styles.heroPrimary} href="#request-free-review"', 'className={styles.heroPrimary} href="#personal-consultation"'],
    ["{item.a}", "{null}"],
    ["{t.transparency}", "{null}"],
  ]) {
    assert.ok(landing.includes(before), "Negative control must mutate the actual page");
    const tree = await renderLanding(landing.replace(before, after), "en");
    assert.throws(() => assertLandingContract(tree, "en"), { name: "AssertionError" });
  }
});
