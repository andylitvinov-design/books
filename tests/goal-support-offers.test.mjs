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
    hrefs: ["/services/free-situation-review?topic=business", "/services/business-consulting#business-offers", "/services/business-consulting#business-direct-request"],
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
