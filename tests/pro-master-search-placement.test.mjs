import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { matchesHolisticGoal, matchesHolisticEuroBudget } from "../lib/practitioners/holistic-search-budgets.js";
const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const holistic = source("app/[locale]/holistic-support/page.tsx");
const pro = source("app/[locale]/pro/page.tsx");
const hub = source("components/profi-hub.tsx");
const finder = source("components/master-network-explorer.tsx");
const css = source("components/master-network-explorer.module.css");
test("Approved practitioners are searchable directly in Pro, not Holistic Support", () => {
  assert.doesNotMatch(holistic, /MarketplaceMasterFinder|data-holistic-practitioners|createPractitionerRepository/);
  assert.match(holistic, /<HolisticSupportTopicFilter locale=\{locale\} \/>/);
  assert.doesNotMatch(holistic, /data-holistic-offer=/);
  assert.match(pro, /listPublicPractitioners\(locale\)/);
  assert.match(pro, /createPractitionerCourseRepository\(config\)\.catalog\(\)/);
  assert.match(pro, /approvedSlugs\.has\(row\.practitionerSlug\)/);
  assert.match(pro, /<MarketplaceMasterFinder practitioners=\{practitioners\} courses=\{courses\}/);
  assert.match(hub, /data-profi-master-directory/);
  assert.match(hub, /href="#profi-find-master" prefetch=\{false\} data-profi-path="find"/);
  assert.match(hub, /directoryUnavailable/);
});
test("Compact Pro finder retains filters, public links and 320-430px CSS", () => {
  assert.match(finder, /embedded\?: boolean/);
  assert.match(finder, /embedded=\{embedded\}/);
  assert.match(finder, /data-mentor-embedded=/);
  assert.match(finder, /data-mentor-primary-filters/);
  assert.match(finder, /data-mentor-cards/);
  assert.match(finder, /getPublicServiceDetailHref\(/);
  assert.match(css, /\.embeddedExplorer \.masterQuickBar\{display:flex;grid-template-columns:none;overflow-x:auto/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /@media\(max-width:355px\)/);
  assert.match(css, /min-height:44px/);
});

// These are source/state contracts, not native-browser or request-submission
// acceptance. Render both real components; only React hooks/element creation,
// icons, CSS and the still-unmounted post-Search booking child are substituted.
const topicSource = source("components/holistic-support-topic-filter.tsx");
const inlineSource = source("components/holistic-inline-support-order.tsx");
const compiled = new Map();
function compile(text) {
  if (!compiled.has(text)) {
    const result = ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      reportDiagnostics: true,
    });
    assert.deepEqual(result.diagnostics.filter(row => row.category === ts.DiagnosticCategory.Error), []);
    compiled.set(text, result.outputText);
  }
  return compiled.get(text);
}
const walk = node => Array.isArray(node) ? node.flatMap(walk)
  : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];

function inlineFixture(text = topicSource) {
  const states = new Map(), effects = new Map(), listeners = new Map();
  let active, cursor, dirty = false, pending = [], navigationCalls = 0, fetchCalls = 0;
  const denyNavigation = () => { navigationCalls++; throw new Error("PRO_INLINE_NAVIGATION_FORBIDDEN"); };
  const location = { assign: denyNavigation, replace: denyNavigation };
  Object.defineProperty(location, "href", { set: denyNavigation });
  const window = {
    location, open: denyNavigation, history: { pushState: denyNavigation, replaceState: denyNavigation },
    matchMedia: () => ({ matches: true }),
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
  const react = {
    useState(initial) {
      const owner = active, index = cursor++, slots = states.get(owner);
      if (!slots.has(index)) slots.set(index, typeof initial === "function" ? initial() : initial);
      return [slots.get(index), next => {
        const value = typeof next === "function" ? next(slots.get(index)) : next;
        if (!Object.is(value, slots.get(index))) { slots.set(index, value); dirty = true; }
      }];
    },
    useEffect(callback, dependencies) {
      const owner = active, index = cursor++, slots = effects.get(owner), previous = slots.get(index);
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        slots.set(index, { dependencies: [...dependencies], cleanup: previous?.cleanup });
        pending.push(() => {
          previous?.cleanup?.();
          slots.get(index).cleanup = callback();
        });
      }
    },
  };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const css = { default: new Proxy({}, { get: (_, key) => key }) };
  const common = {
    "react/jsx-runtime": { jsx, jsxs: jsx }, react,
    "next/link": { default: "a" }, "next/image": { default: "img" },
  };
  const load = (text, modules) => {
    const exports = {};
    runInNewContext(compile(text), {
      exports, window, document: { getElementById: () => null },
      CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
      fetch() { fetchCalls++; throw new Error("PRO_INLINE_FETCH_FORBIDDEN"); },
      require(name) { assert.ok(Object.hasOwn(modules, name), "Unexpected component dependency: " + name); return modules[name]; },
    }, { timeout: 1000 });
    return exports;
  };
  const inline = load(inlineSource, { ...common,
    "@/components/remote-energy-support-booking": { RemoteEnergySupportBooking: "UnsubmittedBooking" },
    "@/lib/practitioners/holistic-search-budgets.js": { matchesHolisticGoal, matchesHolisticEuroBudget },
    "./holistic-inline-support-order.module.css": css,
  }).HolisticInlineSupportOrder;
  const filter = load(text, { ...common,
    "lucide-react": { ArrowRight: "svg", BriefcaseBusiness: "svg", Heart: "svg", HeartPulse: "svg" },
    "./holistic-inline-support-order": { HolisticInlineSupportOrder: inline },
    "./holistic-support-topic-filter.module.css": css,
  }).HolisticSupportTopicFilter;
  const render = (component, props) => {
    if (!states.has(component)) { states.set(component, new Map()); effects.set(component, new Map()); }
    for (let cycle = 0; cycle < 8; cycle++) {
      active = component; cursor = 0; dirty = false; pending = [];
      const node = component(props); active = null;
      for (const effect of pending) effect();
      if (!dirty) return node;
    }
    assert.fail("PRO_INLINE_RENDER_DID_NOT_SETTLE");
  };
  return {
    inline, renderTopics: locale => render(filter, { locale }),
    renderOrder: props => render(inline, props),
    counts: () => ({ navigationCalls, fetchCalls }),
    dispose() { for (const slots of effects.values()) for (const value of slots.values()) value.cleanup?.(); },
  };
}

function assertInlineOrder({ text = topicSource, locale = "en", topic = "business", kind = "talisman", surface = 1 } = {}) {
  const fixture = inlineFixture(text);
  const goal = { business: "Work and money", love: "Connection and relationships", health: "Inner balance and calm" }[topic];
  const cardId = kind === "talisman" ? "talisman" : "expert";
  try {
    let nodes = walk(fixture.renderTopics(locale));
    assert.equal(nodes.filter(node => node.type === fixture.inline).length, 0, "PRO_INLINE_CLOSED_BEFORE_CHOICE");
    nodes.find(node => node.props["data-holistic-topic"] === topic).props.onClick();
    nodes = walk(fixture.renderTopics(locale));
    const card = nodes.find(node => node.props["data-holistic-topic-card"] === cardId);
    const controls = walk(card).filter(node => node.type === "button" && node.props["aria-controls"] === "holistic-inline-order");
    assert.equal(controls.length, 2, "Both the actual card title and action must be buttons");
    assert.equal(controls[surface].props.type, "button");
    assert.equal(controls[surface].props.href, undefined);
    controls[surface].props.onClick();
    nodes = walk(fixture.renderTopics(locale));
    const orders = nodes.filter(node => node.type === fixture.inline);
    assert.equal(orders.length, 1, "PRO_INLINE_MUST_OPEN");
    assert.equal(orders[0].props.kind, kind, "PRO_INLINE_CHOSEN_KIND");
    assert.equal(orders[0].props.locale, locale);
    assert.equal(orders[0].props.initialGoal, goal);
    const form = walk(fixture.renderOrder(orders[0].props));
    assert.equal(form.find(node => node.props.id === "holistic-inline-order")?.props["data-holistic-inline-order"], kind);
    assert.deepEqual(form.filter(node => node.props["data-support-choice"] && node.props["aria-pressed"])
      .map(node => node.props["data-support-choice"]), [kind]);
    assert.deepEqual(form.filter(node => node.props["data-support-theme"] && node.props["aria-pressed"])
      .map(node => node.props["data-support-theme"]), [{ business: "business", love: "relationships", health: "wellbeing" }[topic]]);
    assert.equal(form.filter(node => Object.hasOwn(node.props, "data-support-search")).length, 1);
    assert.equal(form.find(node => node.props.id === "holistic-inline-results")?.props.hidden, true);
    assert.equal(form.filter(node => node.type === "UnsubmittedBooking").length, 0);
    assert.deepEqual(fixture.counts(), { navigationCalls: 0, fetchCalls: 0 });
    form.find(node => node.type === "button" && node.props.onClick === orders[0].props.onClose).props.onClick();
    assert.equal(walk(fixture.renderTopics(locale)).filter(node => node.type === fixture.inline).length, 0);
  } finally { fixture.dispose(); }
}

for (const locale of ["en", "ru", "es"]) test(locale + ": both topic-card surfaces open the real inline chooser with the selected kind and theme, then close without navigation", () => {
  for (const topic of ["business", "love", "health"])
    for (const kind of ["talisman", "energy"])
      for (const surface of [0, 1]) assertInlineOrder({ locale, topic, kind, surface });
});

for (const [name, replacement, expected] of [
  ["non-opening handler", "setOrderKind(null);", /PRO_INLINE_MUST_OPEN/],
  ["wrong-kind handler", 'setOrderKind(value === "talisman" ? "energy" : "talisman");', /PRO_INLINE_CHOSEN_KIND/],
  ["navigation fallback", 'window.location.assign("/" + locale + "/services/remote-energy-support");', /PRO_INLINE_NAVIGATION_FORBIDDEN/],
]) test("actual-handler negative control rejects " + name, () => {
  const anchor = "setOrderKind(value);";
  assert.equal(topicSource.split(anchor).length - 1, 1, "Mutation must target the actual shared click handler exactly once");
  assert.throws(() => assertInlineOrder({ text: topicSource.replace(anchor, replacement) }), expected);
});
