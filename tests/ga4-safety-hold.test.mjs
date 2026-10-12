import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness({ preference = "granted", pathname = "/en", dataset = "granted" } = {}) {
  const cookies = new Map([["holistic_house_analytics_consent", preference], ["_ga", "synthetic"], ["synthetic_auth", "preserve"]]);
  if (!preference) cookies.delete("holistic_house_analytics_consent");
  const scripts = [], calls = [], events = [], listeners = [], states = [];
  let cursor = 0;
  const document = {
    documentElement: { dataset: { analyticsConsent: dataset } },
    head: { appendChild(script) { scripts.push(script); } },
    createElement(type) { return { type }; },
    get cookie() { return [...cookies].map(([key, value]) => key + "=" + value).join("; "); },
    set cookie(value) { const [pair] = value.split(";"); const [key, data] = pair.split("="); if (value.includes("Max-Age=0")) cookies.delete(key); else cookies.set(key, data); },
  };
  const window = { location: { hostname: "holistichouse.vercel.app", pathname, origin: "https://holistichouse.vercel.app" },
    gtag: (...args) => calls.push(args),
    addEventListener: (...args) => listeners.push(args), removeEventListener() {}, dispatchEvent: event => events.push(event),
  };
  const context = vm.createContext({ document, window, Event: class Event { constructor(type) { this.type = type; } }, CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } }, process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-SYNTHETIC" } } });
  const modules = new Map();
  const react = { useEffect: fn => fn(), useRef: value => ({ current: value }), useState(initial) { const i = cursor++; states[i] ??= initial; return [states[i], value => { states[i] = value; }]; } };
  function evaluate(path) {
    if (modules.has(path)) return modules.get(path);
    const exports = {};
    const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } : name === "next/navigation" ? { usePathname: () => window.location.pathname } : name === "@/lib/public-analytics" ? evaluate("lib/public-analytics.ts") : assert.fail("Unknown import: " + name);
    const source = ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.compileFunction(source, ["exports", "require"], { parsingContext: context })(exports, require); modules.set(path, exports); return exports;
  }
  const analytics = evaluate("components/ga4-analytics.tsx"), consent = evaluate("components/analytics-consent.tsx"), publicAnalytics = evaluate("lib/public-analytics.ts");
  return { document, window, cookies, scripts, calls, events, listeners, publicAnalytics, render() { analytics.Ga4Analytics({ nonce: "synthetic" }); consent.AnalyticsConsent(); }, preferences() { cursor = 0; return consent.AnalyticsPreferences(); } };
}
function elements(tree) { if (!tree || typeof tree !== "object") return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(elements)]; }

for (const preference of ["granted", "denied", ""]) {
  test(`safety hold never loads or calls Google with saved preference ${preference || "missing"}`, () => {
    const h = harness({ preference });
    h.render();
    h.window.location.pathname = "/en/app/SYNTHETIC_PRIVATE"; h.render();
    h.window.location.pathname = "/en"; h.render();
    h.document.documentElement.dataset.analyticsConsent = "granted";
    h.publicAnalytics.emitPublicAnalyticsEvent("free_questionnaire_started");
    assert.deepEqual(h.scripts, []); assert.deepEqual(h.calls, []); assert.deepEqual(h.events, []); assert.deepEqual(h.listeners, []);
    assert.equal(h.window.dataLayer, undefined);
    assert.equal(h.cookies.get("holistic_house_analytics_consent"), preference || undefined);
    assert.equal(h.cookies.get("synthetic_auth"), "preserve");
    assert.equal(h.cookies.has("_ga"), false);
  });
}
test("saved grant is retained but effective consent stays denied", () => {
  const h = harness(); h.render();
  assert.equal(h.document.documentElement.dataset.analyticsConsent, "denied");
  assert.equal(h.cookies.get("holistic_house_analytics_consent"), "granted");
  assert.equal(h.publicAnalytics.PUBLIC_ANALYTICS_AVAILABLE, false);
});
test("preferences honestly show the hold, disable grant and permit withdrawal", () => {
  const h = harness(); h.preferences(); const tree = h.preferences();
  const all = elements(tree), buttons = all.filter(item => item.type === "button");
  assert.equal(buttons.length, 2); assert.equal(buttons[0].props.disabled, true); assert.equal(buttons[1].props.disabled, undefined);
  assert.match(JSON.stringify(tree), /temporarily unavailable/); assert.match(JSON.stringify(tree), /Saved preference/);
  buttons[1].props.onClick();
  assert.equal(h.cookies.get("holistic_house_analytics_consent"), "denied");
  assert.equal(h.document.documentElement.dataset.analyticsConsent, "denied");
  assert.equal(h.cookies.get("synthetic_auth"), "preserve");
  assert.deepEqual(h.calls, []); assert.deepEqual(h.events, []); assert.deepEqual(h.scripts, []);
});
