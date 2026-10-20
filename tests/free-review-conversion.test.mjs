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

test("landing explains the symbolic drawing review and introduces prices only at final selection", () => {
  for (const key of ["t.steps.map", "t.directions.map", "t.faqs.map", "topic.cards.map"]) assert.ok(landing.includes(key));
  for (const topic of ["Работа и бизнес", "Relationships & family", "Bienestar y estrés"]) assert.ok(landing.includes(topic));
  assert.ok(landing.includes("/services/alchemy-of-soul"));
  assert.ok(landing.includes('href="#request-free-review"'));
  assert.ok(landing.includes('href="#situations"'));
  assert.ok(landing.includes('id="personal-consultation"'));
  assert.ok(landing.includes("getHomeopathyLocaleParams"));
  assert.ok(landing.includes("isPublicLocale"));
  assert.doesNotMatch(landing, /€0|€50|€100/, "Monetary amounts must be in the final selector, not editorial copy");
  assert.equal((landing.match(/<FreeReviewQuickRequest locale=\{locale\} \/>/g) ?? []).length, 1);
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

test("first contact highlights benefits and the only messenger selector appears at the end", () => {
  assert.match(quickRequest, /<ContactChannelChooser/);
  assert.match(quickRequest, /namePlaceholder/);
  assert.match(quickRequest, /questionPlaceholder/);
  assert.match(quickRequest, /whatsappEnquiryUrl\(\{/);
  assert.match(quickRequest, /service_request_start/);
  assert.doesNotMatch(quickRequest, /<FreeDrawingIntake|fetch\(|localStorage|sessionStorage/);
  const hero = landing.slice(landing.indexOf('className={styles.contentGrid}'), landing.indexOf('</section>', landing.indexOf('className={styles.contentGrid}')));
  assert.ok(!hero.includes('<FreeReviewQuickRequest'), "Hero explains the value before format selection");
  assert.ok(!hero.includes('€50') && !hero.includes('€100'));
  assert.ok(landing.includes('variant="all"'), "Preserve all sourced video testimonials");
  assert.ok(landing.indexOf('className={styles.details}') < landing.indexOf('variant="all"'), "Explain drawing process before testimonials");
  assert.ok(landing.includes('className={styles.finalRequest} id="request-free-review"'));
  assert.ok(landing.includes('className={styles.finalCapture} id="personal-consultation"'));
});

test("the final capture offers all three localized consultation formats with exact message handoff", () => {
  for (const marker of ['type ConsultationFormat = "free" | "mini" | "full"', 'const formats: ConsultationFormat[] = ["free", "mini", "full"]',
    'type="radio"', 'checked={format === value}', 'onChange={() => setFormat(value)}',
    'option: [selected.label, selected.detail, selected.price].join(" · ")',
    'request: selected.request', 'data-consultation-option={value}', '"data-consultation-format": format']) {
    assert.ok(quickRequest.includes(marker), "Missing price/selection/handoff contract: " + marker);
  }
  for (const label of ["Бесплатная консультация", "Мини-сессия", "Полноценная сессия",
    "Free consultation", "Mini session", "Full session",
    "Consulta gratuita", "Mini sesión", "Sesión completa"]) {
    assert.ok(quickRequest.includes(label), "Missing localized option: " + label);
  }
  for (const price of ["€50", "€100", "Бесплатно", "Free", "Gratis"]) {
    assert.ok(quickRequest.includes(price), "Missing exact price: " + price);
  }
  assert.match(quickRequest, /no live call/i);
  assert.match(quickRequest, /без созвона/i);
  assert.match(quickRequest, /sin llamada/i);
  assert.match(quickRequest, /No booking or payment is made automatically/);
  assert.doesNotMatch(quickRequest, /localStorage|sessionStorage|fetch\(|sendBeacon|checkout\/api/);
  assert.equal((landing.match(/<FreeReviewQuickRequest locale=\{locale\} \/>/g) ?? []).length, 1,
    "Pricing and format selection belongs in a single final request form");
});

test("mobile design presents topic cards, deeper-work link and one final selector", () => {
  for (const value of [".contentGrid", ".situations", ".situationGrid", ".outcomes", ".steps", ".alchemy", ".finalRequest", ".directions", ".about", ".faq"]) assert.ok(css.includes(value));
  assert.ok(css.includes("@media(max-width:767px)"));
  assert.match(landing, /className=\{styles\.heroActions\}/);
  assert.match(css, /\.heroActions\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.heroActions a\{min-height:48px/);
  assert.match(css, /\.situationGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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
  assert.equal(byClass("heroSecondary")?.props.href, "#situations");
  assert.equal(byClass("situations")?.props.id, "situations");
  assert.equal(nodes(byClass("situationGrid")).filter(node => node.type === "article").length, 4);
  assert.ok(all.some(node => node.type === "FreeSituationReviewForm" && node.props.locale === locale), "Keep the optional drawing questionnaire");
  const finalCapture = byClass("finalCapture");
  assert.equal(finalCapture?.props.id, "personal-consultation", "Keep original incoming service links working");
  assert.equal(byClass("finalRequest")?.props.id, "request-free-review");
  assert.ok(finalCapture && nodes(finalCapture).filter(node => node.type === "FreeReviewQuickRequest").length === 1,
    "Only the final section offers format selection");
  assert.equal(all.filter(node => node.type === "FreeReviewQuickRequest").length, 1);
  assert.ok(all.indexOf(byClass("situations")) < all.indexOf(byClass("outcomes")), "Questions precede benefit cards");
  assert.ok(all.indexOf(byClass("outcomes")) < all.indexOf(byClass("details")), "Explain the drawing process early");
  const videoIndex = all.findIndex(node => node.type === "ServiceVideoShowcase");
  assert.ok(videoIndex > all.indexOf(byClass("details")), "Process precedes the video");
  assert.ok(all.indexOf(byClass("alchemy")) < all.indexOf(finalCapture), "Deeper work precedes the final selection");
  assert.ok(all.indexOf(byClass("faq")) < all.indexOf(byClass("alchemy")), "Pricing remains after FAQs");
  assert.equal(byClass("paid"), undefined, "No separate early price panel");
  assert.equal(byClass("capturePanel"), undefined, "No format chooser before the value explanation");
  assert.equal(byClass("scope"), undefined, "No duplicated free scope");
  assert.equal(byClass("directions")?.type, "details");
  const alchemyLink = nodes(byClass("alchemy")).find(node => typeof node.props?.href === "string" && node.props.href.endsWith("/services/alchemy-of-soul"));
  assert.equal(alchemyLink?.props.href, "/" + locale + "/services/alchemy-of-soul");
  assert.ok(!textOf(tree).includes("€50") && !textOf(tree).includes("€100"), "No paid prices in editorial content");
  const faq = textOf(byClass("faq"));
  const clauses = {
    en: ["does not include a live call", "not a medical diagnosis, psychiatric diagnosis or prescription"],
    ru: ["Бесплатного созвона в этот формат не входит", "не медицинский или психиатрический диагноз или назначение лечения"],
    es: ["No incluye una llamada en directo", "sin diagnósticos médicos o psiquiátricos ni recetas"],
  };
  for (const clause of clauses[locale]) assert.ok(faq.includes(clause), clause);
  assert.ok(textOf(byClass("safety")).length > 50, "Visible safety explanation remains");
}

for (const locale of ["en", "ru", "es"]) {
  test(`${locale}: rendered free intake and optional paid enquiry have distinct working targets and visible limits`, async () => {
    assertLandingContract(await renderLanding(landing, locale), locale);
  });
}

test("landing contract rejects a missing final anchor, misrouted CTA and hidden safety copy", async () => {
  for (const [before, after] of [
    ['id="personal-consultation"', 'id="missing-paid-anchor"'],
    ['className={styles.heroPrimary} href="#request-free-review"', 'className={styles.heroPrimary} href="#personal-consultation"'],
    ['id="request-free-review"', 'id="missing-review-anchor"'],
    ["{item.a}", "{null}"],
    ["{t.transparency}", "{null}"],
  ]) {
    assert.ok(landing.includes(before), "Negative control must mutate the actual page");
    const tree = await renderLanding(landing.replace(before, after), "en");
    assert.throws(() => assertLandingContract(tree, "en"), { name: "AssertionError" });
  }
});
