import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getSitemapEntries, getRobotsPolicy } from "../data/seo.js";
import { auditSeoComponentMount } from "../scripts/verify-seo-source-contracts.mjs";
import { freeEntryModule, compactLeadModule, homeDisclosureModule, expandSeoDynamic, seoNodes, seoText } from "./helpers/seo-source-fixture.mjs";

const origin = "https://holistichouse.vercel.app";
const locales = ["en", "ru", "es"];
const route = "app/[locale]/tests/page.tsx";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const pageSource = read(route);
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");
const config = read("next.config.ts");
const privateSource = read("app/[locale]/client/tests/page.tsx");

test("public /tests guide is separate from private test explorer and has valid metadata", () => {
  assert.ok(existsSync(new URL("../" + route, import.meta.url)));
  assert.match(pageSource, /generateMetadata/);
  assert.match(pageSource, /generateStaticParams/);
  assert.match(pageSource, /languages/);
  assert.match(pageSource, /canonical/);
  assert.match(pageSource, /<FreeEntryLanding locale=\{locale\} kind="tests"/);
  assert.match(landing, /<h1 id="free-entry-title">/);
  assert.match(pageSource, /openGraph:/);
  assert.match(pageSource, /twitter:/);
  assert.match(landing, /\/client\/tests/);
  assert.match(landing, /do not diagnose or treat health conditions/);
  assert.doesNotMatch(config, /source:\s*["']\/\:locale\(en\|ru\|es\)\/tests["'],\s*destination:\s*["']\/\:locale\/client\/tests/);
  assert.match(privateSource, /robots:\s*\{\s*index:\s*false/);
  assert.match(privateSource, /referrer:\s*["']no-referrer/);
  const robots = getRobotsPolicy(origin);
  for (const locale of locales) assert.ok(robots.rules.disallow.includes("/" + locale + "/client"));
});

test("public /tests sitemap entries are absolute, reciprocal and private-path-safe", () => {
  const entries = getSitemapEntries(origin).filter(entry => /^https:\/\/holistichouse\.vercel\.app\/(en|ru|es)\/tests$/.test(entry.url));
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    const locale = new URL(entry.url).pathname.split("/")[1];
    assert.equal(entry.url, origin + "/" + locale + "/tests");
    assert.deepEqual(Object.keys(entry.alternates.languages).sort(), ["en", "es", "ru", "x-default"]);
    for (const other of locales) assert.equal(entry.alternates.languages[other], origin + "/" + other + "/tests");
    assert.equal(entry.alternates.languages["x-default"], origin + "/en/tests");
    assert.equal(entry.changeFrequency, "monthly");
    assert.ok(entry.priority > 0);
    assert.ok(!entry.url.includes("/client/"));
  }
});

test("SEO benefits and the localized non-diagnostic disclaimer handoff are preserved", () => {
  const descriptions = [...pageSource.matchAll(/description: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(descriptions.length, 3);
  for (const description of descriptions) assert.ok(description.length >= 100 && description.length <= 180);
  for (const snippet of [
    "From a feeling to a clearer picture", "От ощущения — к понятной картине", "De una sensación a una imagen más clara",
  ]) assert.ok(landing.includes(snippet) || pageSource.includes(snippet), "Missing translation: " + snippet);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.doesNotMatch(pageSource + landing, /medical diagnosis guaranteed|certified diagnosis|cure your/i);
  const { FreeEntryLanding } = freeEntryModule();
  for (const [locale, limitation] of [["en", /do not diagnose or treat health conditions/], ["ru", /не диагностируют и не лечат заболевания/], ["es", /No diagnostican ni tratan enfermedades/]]) {
    const tree = FreeEntryLanding({ locale, kind: "tests" });
    assert.equal(seoNodes(tree).filter(n => n.type === "h1" && seoText(n).trim()).length, 1);
    const disclaimers = seoNodes(tree).filter(n => typeof n.props?.disclaimer === "string");
    assert.equal(disclaimers.length, 1);
    assert.match(disclaimers[0].props.disclaimer, limitation);
    assert.ok(seoNodes(tree).some(n => n.type === "a" && n.props.href === "/" + locale + "/client/tests"));
  }
});

const flush = () => new Promise(resolve => setImmediate(resolve));

async function renderedFreeLanding(locale, { kind = "tests", states } = {}) {
  const calls = [], effects = [], stateWrites = [];
  const { CompactLeadCapture } = compactLeadModule(locale, { states, effects, stateWrites, globals: {
    fetch: async (url, options) => {
      calls.push({ type: "fetch", url, options });
      return { ok: false, status: 503, json: async () => ({ saved: false }) };
    },
    window: {
      crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
      sessionStorage: { setItem: (...args) => calls.push({ type: "storage", args }) },
      location: { assign: (...args) => calls.push({ type: "navigation", args }) },
    },
    navigator: { sendBeacon: (...args) => calls.push({ type: "beacon", args }) },
    gtag: (...args) => calls.push({ type: "analytics", args }),
  } });
  const { FreeEntryLanding } = freeEntryModule(undefined, { CompactLeadCapture });
  const tree = FreeEntryLanding({ locale, kind });
  const mounts = seoNodes(tree).filter(node => node.type === CompactLeadCapture);
  assert.equal(mounts.length, 1, "Exactly one real compact capture must be mounted");
  const mount = mounts[0];
  const parent = seoNodes(tree).find(node => Array.isArray(node.props?.children) && node.props.children.includes(mount));
  assert.equal(parent.props.children.filter(Boolean).at(-1), mount, "Compact capture remains the final panel");
  const capture = CompactLeadCapture(mount.props);
  for (const effect of effects) effect();
  await flush();
  assert.deepEqual(calls, [], "Mount and effects cannot send, navigate, store or track");
  return { tree, capture, calls, stateWrites };
}

// Owner-merged #1513 (6192682162d8d50ba8d9efe5d776892db0da60e7)
// replaced the old FAQ/end-links panel with this single consented final action.
// Check its actual JSX and the still-rendered SEO content, not orphan copy.faq.
test("public guide renders localized benefits, guest entry and one final consented compact form", async () => {
  const expectations = {
    en: ["From a feeling to a clearer picture", "Your present state", "Not sure which test to take?", /do not diagnose or treat health conditions/, /No marketing\./, /Please do not enter health details/, /No booking or payment/, /sign in if you want to save and track/],
    ru: ["От ощущения — к понятной картине", "Текущее состояние", "Не знаете, какой тест выбрать?", /не диагностируют и не лечат заболевания/, /без рассылок/, /Не пишите сведения о здоровье/, /Без записи и оплаты/, /для сохранения войдите в кабинет/],
    es: ["De una sensación a una imagen más clara", "Tu estado actual", "¿No sabes qué prueba elegir?", /No diagnostican ni tratan enfermedades/, /Sin publicidad\./, /No incluyas datos de salud/, /Sin reserva ni pago/, /inicia sesión para guardarlos/],
  };
  for (const [locale, [outcomeTitle, firstOutcome, captureTitle, limitation, consentCopy, privacy, noBooking, saveOnly]] of Object.entries(expectations)) {
    const { tree, capture } = await renderedFreeLanding(locale);
    const nodes = seoNodes(tree), formNodes = seoNodes(capture);
    assert.equal(seoText(nodes.find(node => node.type === "h2" && node.props.id === "free-outcomes-title")), outcomeTitle);
    const outcomes = nodes.filter(node => node.type === "article");
    assert.equal(outcomes.length, 3);
    assert.equal(seoText(seoNodes(outcomes[0]).find(node => node.type === "h3")), firstOutcome);
    for (const outcome of outcomes) assert.ok(seoNodes(outcome).some(node => node.type === "p" && seoText(node).trim()));
    assert.match(seoText(nodes.find(node => node.props?.id === "how-it-works")), saveOnly);
    const guestLinks = nodes.filter(node => node.type === "a" && node.props.href === "/" + locale + "/client/tests");
    assert.equal(guestLinks.length, 1, "Guest start stays independent of contact capture or sign-in");
    assert.ok(seoText(guestLinks[0]).trim());
    assert.equal(capture.type, "section");
    assert.equal(capture.props.id, "start-free");
    assert.equal(capture.props.lang, locale);
    assert.equal(capture.props["data-compact-last-slide"], "");
    assert.equal(seoText(formNodes.find(node => node.type === "h2")), captureTitle);
    assert.match(seoText(capture), limitation);
    assert.match(seoText(capture), consentCopy);
    assert.match(seoText(capture), privacy);
    assert.match(seoText(capture), noBooking);
    const forms = formNodes.filter(node => node.type === "form");
    assert.equal(forms.length, 1);
    assert.equal(forms[0].props.action, undefined);
    const inputs = formNodes.filter(node => node.type === "input");
    assert.equal(inputs.length, 2, "Only a contact and explicit consent, no private questionnaire");
    const consent = inputs.find(node => node.props.type === "checkbox");
    assert.equal(consent.props.required, true);
    assert.equal(consent.props.checked, false);
    const contact = inputs.find(node => node.props.name === "contact");
    assert.equal(contact.props.value, "");
    assert.equal(contact.props.required, true);
    assert.equal(formNodes.filter(node => node.type === "textarea").length, 0);
    const submit = formNodes.filter(node => node.type === "button" && node.props.type === "submit");
    assert.equal(submit.length, 1);
    assert.equal(submit[0].props.disabled, true);
    assert.doesNotMatch(seoText(tree) + seoText(capture), /medical diagnosis guaranteed|certified diagnosis|cure your/i);
  }
  for (const locale of locales) for (const [kind, anchor] of [["situation", "request-free-review"], ["dao", "request-free-wu-xing"]]) {
    const { tree, capture } = await renderedFreeLanding(locale, { kind });
    assert.equal(capture.props.id, anchor);
    assert.ok(seoNodes(tree).some(node => node.type === "a" && node.props.href === "#" + anchor));
  }
});

test("public compact form requires deliberate consent and submit without leaking contact into URLs", async () => {
  for (const locale of locales) {
    const address = "synthetic-seo@example.test";
    const unconsented = await renderedFreeLanding(locale, { states: [address, false, false, "", ""] });
    const form = seoNodes(unconsented.capture).find(node => node.type === "form");
    form.props.onSubmit({ preventDefault() {} });
    await flush();
    assert.deepEqual(unconsented.calls, [], "Programmatic submit must also reject missing consent");
    const contact = seoNodes(unconsented.capture).find(node => node.type === "input" && node.props.name === "contact");
    contact.props.onChange({ target: { value: address } });
    assert.ok(unconsented.stateWrites.some(write => write.index === 0 && write.value === address));
    await flush();
    assert.deepEqual(unconsented.calls, [], "Typing contact details never submits or tracks");
    const checkbox = seoNodes(unconsented.capture).find(node => node.type === "input" && node.props.type === "checkbox");
    checkbox.props.onChange({ target: { checked: true } });
    assert.ok(unconsented.stateWrites.some(write => write.index === 1 && write.value === true));
    await flush();
    assert.deepEqual(unconsented.calls, [], "Giving consent alone never submits");
    const consented = await renderedFreeLanding(locale, { states: [address, true, false, "", ""] });
    const enabled = seoNodes(consented.capture).find(node => node.type === "button" && node.props.type === "submit");
    assert.equal(enabled.props.disabled, false);
    seoNodes(consented.capture).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    await flush();
    assert.equal(consented.calls.length, 1, "Only the explicit submit performs a request");
    const request = consented.calls[0];
    assert.equal(request.type, "fetch");
    assert.equal(request.url, "/api/service-enquiries");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.credentials, "same-origin");
    assert.equal(request.options.cache, "no-store");
    const body = JSON.parse(request.options.body);
    assert.deepEqual(Object.keys(body).sort(), ["contact", "contactConsent", "locale", "operationId", "serviceTitle", "sourcePath", "website"]);
    assert.deepEqual(body.contact, { displayName: "", email: address, phone: "" });
    assert.equal(body.contactConsent, true);
    assert.equal(body.locale, locale);
    assert.equal(body.sourcePath, "/" + locale + "/tests");
    assert.equal(body.serviceTitle, "Free test starting-point guidance");
  }
});

test("public guide is reachable through each homepage's actual deferred disclosure without signup", async () => {
  const sharedHome = read("components/holistic-house-home.tsx");
  const spanishHome = read("app/es/page.tsx");
  for (const [pageSource, pageExport, localeProp] of [[sharedHome, "HolisticHouseHome", { identifier: "locale" }], [spanishHome, "default", "es"]]) {
    assert.deepEqual(auditSeoComponentMount({ pageSource, pageExport, componentName: "HomeMoreDisclosure",
      moduleSpecifier: "@/components/home-more-disclosure", props: { locale: localeProp } }).failures, []);
  }
  for (const [locale, label] of [["en", "How free self-checks work"], ["ru", "Как работают бесплатные тесты"], ["es", "Cómo funcionan las pruebas"]]) {
    const { HomeMoreDisclosure } = homeDisclosureModule(true);
    const tree = await expandSeoDynamic(HomeMoreDisclosure({ locale, children: null }));
    assert.equal(tree.type, "details");
    assert.ok(seoNodes(tree).some(n => n.type === "summary" && seoText(n).trim()));
    const links = seoNodes(tree).filter(n => n.type === "a" || n.props?.href);
    const guide = links.filter(n => n.props.href === "/" + locale + "/tests");
    assert.equal(guide.length, 1);
    assert.equal(seoText(guide[0]).trim(), label);
    for (const suffix of ["/client/tests", "/academy", "/library"]) assert.ok(links.some(n => n.props.href === "/" + locale + suffix), suffix);
    const closedModule = homeDisclosureModule(false);
    const closed = closedModule.HomeMoreDisclosure({ locale, children: null });
    closed.props.onToggle({ currentTarget: { open: true } });
    closed.props.onToggle({ currentTarget: { open: false } });
    assert.deepEqual(closedModule.stateWrites, [{ index: 0, value: true }, { index: 0, value: false }]);
    assert.ok(seoNodes(closed).some(n => n.type === "noscript"), "No-JS navigation remains available");
    assert.equal(seoNodes(closed).filter(n => n.type?.load).length, 0, "Heavy panels remain deferred until disclosure");
  }
});
