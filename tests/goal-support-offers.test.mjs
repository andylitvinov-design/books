import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/goal-support-offers.tsx");
const css = read("components/goal-support-offers.module.css");
const sharedCss = read("components/home-featured-workspace.module.css");
const page = read("app/[locale]/explore/[theme]/page.tsx");
const jsx = (type, props) => ({ type, props: props || {} });
const nodes = tree => !tree || typeof tree !== "object" ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const styleMock = { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
const modules = {
  react: { useState: initial => [initial, () => {}] },
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "next/link": { __esModule: true, default: "Link" },
  "next/image": { __esModule: true, default: "Image" },
  "lucide-react": new Proxy({}, { get: (_, name) => String(name) }),
  "./home-featured-workspace.module.css": styleMock,
  "./goal-support-offers.module.css": styleMock,
};
const transpiled = ts.transpileModule(source, {
  fileName: "goal-support-offers.tsx",
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exports = {};
runInNewContext(transpiled, {
  exports,
  require: name => {
    assert.ok(Object.hasOwn(modules, name), "Unexpected import: " + name);
    return modules[name];
  },
});

const expected = {
  energy: {
    ids: ["opora", "reiki", "remote-energy"],
    hrefs: ["/courses/antistress", "/academy/principles-of-energywork/learn", "/services/remote-energy-support"],
    free: [true, true, false],
  },
  love: {
    ids: ["love-review", "family-constellations", "love-imagery"],
    hrefs: ["/services/free-situation-review", "/services/systemic-constellations", "/services/imagery-therapy"],
    free: [true, false, false],
  },
  business: {
    ids: ["business-review", "business-constellations", "business-coaching"],
    hrefs: ["/services/free-situation-review?topic=business", "/services/business-consulting#business-offers", "/services/business-consulting#business-offers"],
    free: [true, false, false],
  },
};

test("each thematic page has exactly three localized cards with real existing destinations", () => {
  for (const locale of ["en", "ru", "es"]) {
    for (const [direction, e] of Object.entries(expected)) {
      const tree = exports.GoalSupportOffers({ locale, direction });
      const section = nodes(tree).find(node => node.type === "section" && node.props["data-goal-support-offers"]);
      assert.equal(section.props["data-goal-support-theme"], direction);
      assert.ok(nodes(tree).some(node => node.type === "h2"));
      const cards = nodes(tree).filter(node => node.type === "article" && node.props["data-goal-support-card"]);
      assert.deepEqual(cards.map(card => card.props["data-goal-support-card"]), e.ids);
      const actions = nodes(tree).filter(node => node.props["data-goal-support-action"]);
      assert.deepEqual(actions.map(link => link.props.href), e.hrefs.map(path => "/" + locale + path));
      assert.ok(actions.every(link => link.type === "Link" && link.props.prefetch === false));
      assert.ok(actions.every(link => nodes(link).some(node => node.type === "ArrowRight")));
      assert.ok(cards.every(card => nodes(card).some(node => node.type === "Image" && node.props.alt === "")));
      assert.ok(cards.every(card => nodes(card).some(node => node.type === "h3" && typeof node.props.children === "string")));
      assert.deepEqual(cards.map(card => card.props["data-home-offer-free"] === "true"), e.free);
      assert.equal(nodes(tree).filter(node => node.type === "span" && /FREE|БЕСПЛАТНО|GRATIS/.test(String(node.props.children))).length, e.free.filter(Boolean).length);
    }
  }
});

test("Details and Request controls are separate, keyboard accessible and do not submit a lead", () => {
  for (const locale of ["en", "ru", "es"]) {
    for (const [direction, e] of Object.entries(expected)) {
      const tree = exports.GoalSupportOffers({ locale, direction });
      const buttons = nodes(tree).filter(node => node.props["data-goal-support-details"]);
      assert.deepEqual(buttons.map(b => b.props["data-goal-support-details"]), e.ids);
      assert.ok(buttons.every(button => button.type === "button"
        && button.props["aria-expanded"] === false
        && button.props["aria-controls"] === "goal-support-info-" + button.props["data-goal-support-details"]
        && typeof button.props["aria-label"] === "string"));
      const panels = nodes(tree).filter(node => node.props.id?.startsWith("goal-support-info-"));
      assert.equal(panels.length, 3);
      assert.ok(panels.every(node => node.props.hidden === true && nodes(node).some(n => n.type === "p")));
    }
  }
  assert.match(page, /\['energy','love','business'\]\.includes\(theme\)/);
  assert.match(page, /<DirectionOffers[^>]+\/>\s*<GoalSupportOffers[^>]+\/>\s*<DirectionExtras/);
  assert.doesNotMatch(source, /fetch\(|sendBeacon|localStorage|sessionStorage|payment_success|lead_created|autoBook/);
});

test("photo-left 320–430px cards reuse approved homepage controls without CSS duplication", () => {
  assert.match(source, /import cardStyles from "\.\/home-featured-workspace\.module\.css"/);
  assert.match(source, /className=\{cardStyles\.offer\}/);
  assert.match(source, /className=\{cardStyles\.offerControls\}/);
  assert.match(source, /className=\{cardStyles\.offerPrimary\}/);
  assert.match(source, /className=\{cardStyles\.offerSecondary\}/);
  assert.match(source, /className=\{cardStyles\.offerMore\}/);
  assert.match(source, /fill loading="lazy" unoptimized/);
  for (const needle of [
    "@media (max-width: 640px)", "@media (max-width: 350px)",
    ".offerControls { display: grid; grid-template-columns: max-content minmax(0, 1fr);",
    ".offerPrimary { align-self: stretch; width: 100%; min-width: 0; min-height: 44px;",
    ".offerSecondary { align-self: stretch; min-width: 0; min-height: 44px;",
    ".offerFreeBadge", "grid-template-areas: \"photo content\"",
    "prefers-reduced-motion", ":focus-visible"
  ]) assert.ok(sharedCss.includes(needle), "Missing shared phone geometry: " + needle);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /\[data-goal-support-theme="love"\]/);
  assert.match(css, /\[data-goal-support-theme="business"\]/);
  for (const image of [
    "/images/holistic-house/course-start-heron.webp",
    "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "/images/holistic-house/andy-about.png",
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
    "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "/images/holistic-house/books-library.webp"
  ]) assert.ok(existsSync(new URL("../public" + image, import.meta.url)), image);
});

test("paid offers are clearly unbooked requests, no medical promises or false free badges", () => {
  assert.match(source, /not a booking or payment/);
  assert.match(source, /no result is guaranteed/);
  assert.match(source, /not a medical treatment/);
  assert.match(source, /€50 for 30 minutes and €100 for 60 minutes/);
  assert.match(source, /не является записью или оплатой/);
  assert.match(source, /не лечение и не гарантия улучшения/);
  assert.match(source, /no es un tratamiento médico/);
  assert.doesNotMatch(source, /diagnose|cure|guaranteed improvement|verified booking/);
});

// Isolated public-source rendering only: no React browser, requests, consent or CRM writes.
function loadPublicModule(path, mocks, globals = {}) {
  const code = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    ...globals, exports,
    require: name => {
      assert.ok(Object.hasOwn(mocks, name), "Unexpected public handoff import: " + name);
      return mocks[name];
    },
  });
  return exports;
}

test("generic paid business coaching opens localized format choices rather than the free-default form", () => {
  for (const locale of ["en", "ru", "es"]) {
    const tree = exports.GoalSupportOffers({ locale, direction: "business" });
    const card = nodes(tree).find(node => node.props["data-goal-support-card"] === "business-coaching");
    const action = nodes(card).find(node => node.props["data-goal-support-action"] === "business-coaching");
    assert.equal(card.props["data-home-offer-free"], undefined);
    assert.equal(action.type, "Link");
    assert.equal(action.props.href, "/" + locale + "/services/business-consulting#business-offers");
    assert.equal(action.props.prefetch, false);
    assert.equal(action.props["data-business-direct-option"], undefined, "No unchosen paid duration is inferred");
    assert.ok(action.props["aria-label"].trim());
  }
});

test("the business choice anchor renders visible localized options and explicit native-link format handoffs", () => {
  const { businessConsultingCopy } = loadPublicModule("data/business-consulting-copy.ts", {});
  const landingMocks = {
    ...modules,
    "@/components/acquisition-event-link": { AcquisitionEventLink: "AcquisitionEventLink" },
    "@/components/contact-channel-chooser": { ContactChannelChooser: "ContactChannelChooser" },
    "@/components/public-site-header": { PublicSiteHeader: "PublicSiteHeader" },
    "@/components/business-website-enquiry": { BusinessWebsiteEnquiry: "BusinessWebsiteEnquiry" },
    "@/components/service-video-showcase": { ServiceVideoShowcase: "ServiceVideoShowcase" },
    "@/lib/whatsapp-enquiry": { whatsappEnquiryUrl: () => "unused-contact-draft" },
    "@/data/business-consulting-copy": { businessConsultingCopy },
    "./business-consulting-landing.module.css": styleMock,
  };
  const { BusinessConsultingLanding } = loadPublicModule("components/business-consulting-landing.tsx", landingMocks);
  const { AcquisitionEventLink } = loadPublicModule("components/acquisition-event-link.tsx", {
    ...modules, "@/data/local-acquisition": { ACQUISITION_EVENTS: [] },
  });
  for (const locale of ["en", "ru", "es"]) {
    const tree = BusinessConsultingLanding({ locale });
    const choices = nodes(tree).filter(node => node.type === "section" && node.props.id === "business-offers");
    assert.equal(choices.length, 1);
    const section = choices[0];
    assert.equal(section.props.hidden, undefined);
    assert.notEqual(section.props["aria-hidden"], true);
    const heading = nodes(section).find(node => node.type === "h2" && node.props.id === section.props["aria-labelledby"]);
    assert.equal(heading.props.children, businessConsultingCopy[locale].offersTitle);
    const cards = nodes(section).filter(node => node.type === "article" && node.props["data-business-offer"]);
    assert.deepEqual(cards.map(card => card.props["data-business-offer"]), ["free", "express", "full"]);
    for (const [index, kind] of ["free", "express", "full"].entries()) {
      const card = cards[index];
      assert.equal(card.props.hidden, undefined);
      assert.ok(nodes(card).some(node => node.type === "h3" && node.props.children === businessConsultingCopy[locale].offers[index].name));
      const links = nodes(card).filter(node => node.type === "AcquisitionEventLink" && node.props.attributes?.["data-business-direct-option"] === kind);
      assert.equal(links.length, 1);
      const link = AcquisitionEventLink(links[0].props);
      assert.equal(link.type, "Link");
      assert.equal(link.props.href, "#business-direct-request");
      assert.equal(link.props["data-business-direct-option"], kind);
      assert.equal(link.props.prefetch, false);
      assert.notEqual(link.props.tabIndex, -1);
      assert.equal(link.props.children[0], { en: "Website request", ru: "Заявка с сайта", es: "Solicitud en la web" }[locale]);
    }
    assert.ok(nodes(tree).some(node => node.type === "BusinessWebsiteEnquiry" && node.props.locale === locale));
  }
  const route = read("app/[locale]/services/business-consulting/page.tsx");
  assert.match(route, /<BusinessConsultingLanding locale=\{locale as BusinessLocale\}/);
  assert.match(route, /if \(!isPublicLocale\(locale\)\) notFound\(\)/);
  assert.doesNotMatch(read("components/acquisition-event-link.tsx"), /preventDefault\(|tabIndex=\{-1\}/);
});

test("explicit business format clicks reach the existing form without silently choosing free", () => {
  for (const locale of ["en", "ru", "es"]) {
    const effects = [];
    const stateUpdates = [];
    let stateIndex = 0;
    let choose;
    class MockElement {
      constructor(kind) { this.kind = kind; }
      closest(selector) {
        assert.equal(selector, "[data-business-direct-option]");
        return { getAttribute: name => name === "data-business-direct-option" ? this.kind : null };
      }
    }
    const { BusinessWebsiteEnquiry } = loadPublicModule("components/business-website-enquiry.tsx", {
      ...modules,
      react: {
        useState: initial => { const index = stateIndex++; return [initial, value => stateUpdates.push([index, value])]; },
        useRef: initial => ({ current: initial }),
        useEffect: effect => effects.push(effect),
      },
      "@/components/phone-country-input": { PhoneCountryInput: "PhoneCountryInput" },
      "@/lib/business-consulting/intake-policy": { parseBusinessReplyContact: () => { throw new Error("No submission in handoff test"); } },
      "@/lib/business-consulting/review-context": { readBusinessReviewContext: () => null },
      "./business-website-enquiry.module.css": styleMock,
    }, {
      Element: MockElement, URLSearchParams,
      window: { location: { search: "" } },
      document: {
        addEventListener: (type, handler) => { assert.equal(type, "click"); choose = handler; },
        removeEventListener: () => {},
      },
    });
    const tree = BusinessWebsiteEnquiry({ locale });
    assert.equal(tree.props.id, "business-direct-request");
    const select = nodes(tree).find(node => node.type === "select" && node.props["data-business-field"] === "format");
    assert.equal(select.props.value, "free", "Generic direct links would otherwise start at free");
    assert.deepEqual(nodes(select).filter(node => node.type === "option").map(node => node.props.value), ["free", "express", "full", "mentoring"]);
    effects.forEach(effect => effect());
    assert.equal(typeof choose, "function");
    for (const kind of ["free", "express", "full", "mentoring"]) {
      stateUpdates.length = 0;
      choose({ target: new MockElement(kind) });
      assert.deepEqual(stateUpdates.filter(([index]) => index === 0), [[0, kind]]);
    }
    stateUpdates.length = 0;
    choose({ target: new MockElement("unlisted") });
    assert.deepEqual(stateUpdates.filter(([index]) => index === 0), []);
  }
});
