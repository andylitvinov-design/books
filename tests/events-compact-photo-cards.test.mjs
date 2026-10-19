import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/events-discovery.tsx");
const css = read("components/events-discovery.module.css");
const academyCss = read("components/academy-discovery.module.css");
const page = read("app/[locale]/events/page.tsx");
const eventData = read("data/public-events.ts");
const middleware = read("middleware.ts");
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const styles = { default: new Proxy({}, { get: (_, key) => String(key) }) };
const translated = (en, ru, es) => ({ en, ru, es });

function harness(locale) {
  let index = 0;
  const values = [];
  const react = {
    useState(initial) {
      const at = index++;
      if (!(at in values)) values[at] = typeof initial === "function" ? initial() : initial;
      return [values[at], next => {
        values[at] = typeof next === "function" ? next(values[at]) : next;
      }];
    },
    useMemo(fn) { return fn(); },
  };
  const exports = {};
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "a" };
      if (name === "lucide-react") return new Proxy({}, { get: () => "svg" });
      if (name === "./events-discovery.module.css") return styles;
      if (name === "@/components/discovery-section-tabs") return { DiscoverySectionTabs: "tabs" };
      throw new Error("Unexpected import " + name);
    },
    Date, Intl,
  });
  const base = {
    category: "temple",
    format: "in_person",
    timeZone: "America/Toronto",
    city: "Toronto",
    status: "published",
    title: translated("Demo gathering", "Демонстрационная встреча", "Encuentro de prueba"),
    description: translated("Short description.", "Краткое описание.", "Descripción breve."),
    highlights: { en: ["Workshop section"], ru: ["Часть программы"], es: ["Parte del programa"] },
    registrationHref: "https://example.org/register",
  };
  const events = [
    { ...base, id: "upcoming", startsAt: "2099-10-25T19:00:00-04:00", posterUrl: "/example-event.jpg" },
    { ...base, id: "past", startsAt: "2020-01-20T19:00:00-05:00", posterUrl: "/past-event.jpg" },
  ];
  return {
    render() {
      index = 0;
      return exports.EventsDiscovery({ locale, events });
    },
  };
}

test("Events removes Explore by theme and directions while retaining a compact event toolbar", () => {
  assert.doesNotMatch(source, /Explore by theme|themeSection|styles\.categories|categoryIds|themeIcons/);
  assert.match(source, /className=\{styles\.toolbar\}/);
  assert.match(source, /setPast\(true\)/);
  assert.match(source, /event\.status === "published"/);
  assert.match(source, /event\.registrationHref\.trim\(\)/);
  assert.match(css, /\.eventGrid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.eventCard\s*\{[^}]*grid-template-columns:\s*minmax\(114px,\s*32%\)/s);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.eventPoster\s*\{[^}]*object-fit:\s*cover/s);
});

test("Events matches the Academy page shell, hero and catalogue rhythm", () => {
  assert.match(page, /className="library-shell academy-shell"/);
  assert.match(source, /Find your next event/);
  assert.match(source, /styles\.listKicker/);
  assert.match(source, /styles\.count/);
  assert.match(source, /id="hh-events-results"/);
  assert.match(source, /onSubmit=\{submitSearch\}/);
  assert.match(css, /background: linear-gradient\(121deg, #203450 0%, #283d5c 58%, #483a52 100%\)/);
  assert.match(academyCss, /background: linear-gradient\(121deg, #203450 0%, #283d5c 58%, #483a52 100%\)/);
  assert.match(css, /\.form button[^}]*background: #993c5f/s);
  assert.match(css, /\.root\s*\{[^}]*padding: 0 0 48px/s);
  assert.match(css, /\.resultHeading h2[^}]*font: 400/s);
});

test("Public Eventbrite artwork loads from its CDN with strictly route-scoped CSP", () => {
  assert.match(eventData, /posterUrl: "https:\/\/img\.evbuc\.com\//);
  assert.doesNotMatch(eventData, /www\.eventbrite\.ca\/e\/_next\/image/);
  assert.ok(middleware.includes("const eventsPosterImageOrigin = /^\\/(en|ru|es)\\/events\\/?$/"));
  assert.ok(middleware.includes("+ listingImageOrigin + eventsPosterImageOrigin"));
  assert.match(middleware, /eventsPosterImageOrigin[^;]*https:\/\/img\.evbuc\.com/);
  assert.match(source, /onError=\{error => \{ error\.currentTarget\.style\.display = "none"; \}\}/);
});

for (const locale of ["en", "ru", "es"]) {
  test(locale + ": photo-left event cards have working details, registration and past toggle", () => {
    const h = harness(locale);
    let tree = h.render();
    let card = nodes(tree).find(node => node.props?.["data-event-card"] === "upcoming");
    assert.ok(card, "Only the confirmed upcoming event is listed");
    assert.equal(nodes(tree).filter(node => node.props?.["data-event-card"]).length, 1);
    assert.ok(nodes(card).some(node => node.type === "img" && node.props.src === "/example-event.jpg"));
    assert.ok(nodes(card).some(node => node.type === "a" && node.props.href === "https://example.org/register"));
    const button = nodes(card).find(node => node.type === "button" && node.props["aria-controls"]);
    assert.equal(button.props["aria-expanded"], false);
    assert.equal(nodes(card).find(node => node.props.id === button.props["aria-controls"]).props.hidden, true);
    button.props.onClick();
    tree = h.render();
    card = nodes(tree).find(node => node.props?.["data-event-card"] === "upcoming");
    const openedButton = nodes(card).find(node => node.type === "button" && node.props["aria-controls"]);
    assert.equal(openedButton.props["aria-expanded"], true);
    assert.equal(nodes(card).find(node => node.props.id === openedButton.props["aria-controls"]).props.hidden, false);
    assert.ok(nodes(card).some(node => node.type === "li"));
    nodes(tree).find(node => node.type === "button" && node.props["aria-pressed"] === false).props.onClick();
    tree = h.render();
    assert.equal(nodes(tree).filter(node => node.props?.["data-event-card"])[0]?.props["data-event-card"], "past");
    assert.equal(nodes(tree).filter(node => node.type === "a" && node.props.href === "https://example.org/register").length, 0);
  });
}
