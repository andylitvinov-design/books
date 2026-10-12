import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL(process.env.ANALYTICS_SOURCE ?? "../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

// Synchronous component/DOM harness. No script executes and no network API is provided.
export function harness({ pathname = "/en", consent = "granted", hostname = "holistichouse.vercel.app", measurementId = "G-SYNTHETIC" } = {}) {
  let currentPath = pathname;
  let effects = [];
  let refs = [];
  let cursor = 0;
  let cleanup;
  const scripts = [];
  let reloads = 0;
  const window = new EventTarget();
  window.location = { hostname, origin: `https://${hostname}`, pathname, href: `https://${hostname}${pathname}?private_query=SYNTHETIC#private_fragment`, reload() { reloads++; } };
  const document = {
    documentElement: { dataset: { analyticsConsent: consent } },
    title: "Public synthetic page",
    referrer: "https://example.test/source?private_referrer=SYNTHETIC",
    cookie: `holistic_house_analytics_consent=${consent}`,
    createElement: () => ({}),
    head: { appendChild: (script) => { scripts.push(script); } },
  };
  const react = {
    useEffect: (effect) => { effects.push(effect); },
    useRef: (initial) => { const index = cursor++; return refs[index] ??= { current: initial }; },
    useState: (initial) => [initial, () => {}],
  };
  const context = vm.createContext({ window, document, Event, CustomEvent, URL, process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: measurementId } } });
  const modules = new Map();
  function evaluate(path) {
    if (modules.has(path)) return modules.get(path);
    const exports = {};
    const js = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const require = (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
      if (name === "next/navigation") return { usePathname: () => currentPath };
      if (name === "@/lib/public-analytics") return evaluate("lib/public-analytics.ts");
      throw new Error(`Unexpected import: ${name}`);
    };
    vm.runInContext(`(function(require,exports){${js}\n})`, context, { filename: path })(require, exports);
    modules.set(path, exports);
    return exports;
  }
  const analytics = evaluate("components/ga4-analytics.tsx");
  const consentComponent = evaluate("components/analytics-consent.tsx");
  function render(nextPath = currentPath) {
    cleanup?.();
    currentPath = nextPath;
    window.location.pathname = nextPath;
    window.location.href = `${window.location.origin}${nextPath}?private_query=SYNTHETIC#private_fragment`;
    cursor = 0;
    effects = [];
    analytics.Ga4Analytics({ nonce: "synthetic-csp-nonce" });
    cleanup = effects[0]?.();
  }
  return {
    window, document, scripts, render,
    reloads: () => reloads,
    commands: () => Array.from(window.dataLayer ?? [], (command) => Array.from(command)),
    events: () => Array.from(window.dataLayer ?? []).filter((command) => command[0] === "event"),
    consent(value) { document.documentElement.dataset.analyticsConsent = value; window.dispatchEvent(new Event("holistic-house:analytics-consent")); },
    acquisition(event, extra = {}) { window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event, ...extra } })); },
    syncConsent() { effects = []; consentComponent.AnalyticsConsent(); effects[0]?.(); },
    unmount() { cleanup?.(); cleanup = undefined; },
    isPublic: evaluate("lib/public-analytics.ts").isPublicAnalyticsPath,
  };
}

test("Google command queue receives Arguments objects rather than data-model arrays", () => {
  const h = harness(); h.render();
  assert.ok(h.window.dataLayer.length >= 5);
  for (const command of h.window.dataLayer) {
    assert.equal(Array.isArray(command), false);
    assert.equal(Object.prototype.toString.call(command), "[object Arguments]");
  }
});

test("initial command order installs safe defaults before manual-only config and page_view", () => {
  const h = harness(); h.render();
  assert.deepEqual(h.commands().map((c) => [c[0], typeof c[1] === "string" ? c[1] : "date"]), [
    ["consent", "default"], ["set", "date"], ["js", "date"], ["config", "G-SYNTHETIC"], ["consent", "update"], ["event", "page_view"],
  ]);
  assert.equal(h.commands()[3][2].send_page_view, false);
  assert.equal(h.commands()[0][2].analytics_storage, "denied");
  assert.equal(h.commands()[4][2].analytics_storage, "granted");
  for (const c of h.commands().filter((c) => c[0] === "consent")) {
    for (const field of ["ad_storage", "ad_user_data", "ad_personalization"]) assert.equal(c[2][field], "denied");
  }
});

test("no tag or events for denied consent, missing ID, preview host or blocked private paths", () => {
  const cases = [{ consent: "denied" }, { measurementId: "" }, { hostname: "preview.vercel.app" }, { hostname: "localhost" }];
  for (const pathname of ["/admin", "/api/test", "/document-preview/token", "/en/app", "/ru/client/x", "/es/report/x", "/en/prescriptions/x"]) cases.push({ pathname });
  for (const options of cases) {
    const h = harness(options); h.render(); h.acquisition("whatsapp_handoff_click");
    assert.equal(h.scripts.length, 0, JSON.stringify(options));
    assert.equal(h.events().length, 0, JSON.stringify(options));
  }
});

test("grant loads one nonce-bearing tag and repeated consent/effect setup does not duplicate pageviews", () => {
  const h = harness({ consent: "denied" }); h.render(); h.consent("granted"); h.consent("granted"); h.render();
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC");
  assert.equal(h.scripts[0].nonce, "synthetic-csp-nonce");
  assert.equal(h.events().length, 1);
});

test("manual pageview strips query and fragment and public navigation records one new view", () => {
  const h = harness(); h.render(); h.render("/ru/services");
  assert.equal(h.events().length, 2);
  assert.equal(h.events()[1][2].page_location, "https://holistichouse.vercel.app/ru/services");
  assert.equal(h.events()[1][2].page_path, "/ru/services");
  assert.doesNotMatch(JSON.stringify(h.events()), /private_query|private_fragment/);
});

test("acquisition allowlist drops unknown names and never forwards supplied form payload", () => {
  const h = harness(); h.render();
  h.acquisition("lead_received_verified", { answers: "SYNTHETIC" });
  h.acquisition("whatsapp_handoff_click", { answers: "SYNTHETIC", email: "synthetic@example.test" });
  assert.equal(h.events().length, 2);
  assert.equal(h.events()[1][1], "whatsapp_handoff_click");
  assert.doesNotMatch(JSON.stringify(h.events()), /answers|synthetic@example|email/);
});

test("withdrawal and private navigation send storage denial and stop explicit events", () => {
  const h = harness(); h.render();
  h.document.cookie = "holistic_house_analytics_consent=denied"; h.syncConsent();
  assert.equal(h.commands().at(-1)[2].analytics_storage, "denied");
  h.acquisition("whatsapp_handoff_click"); assert.equal(h.events().length, 1);
  h.document.cookie = "holistic_house_analytics_consent=granted";
  h.render("/en/app"); h.syncConsent();
  assert.equal(h.document.documentElement.dataset.analyticsConsent, "denied");
  h.acquisition("whatsapp_handoff_click"); assert.equal(h.events().length, 1);
});

test("effect cleanup removes both event listeners", () => {
  const h = harness(); h.render(); h.unmount();
  h.consent("granted"); h.acquisition("whatsapp_handoff_click");
  assert.equal(h.events().length, 1);
});

test("safe defaults precede config and every explicit event has sanitized context and destination", () => {
  const h = harness(); h.render(); h.acquisition("whatsapp_handoff_click");
  const commands = h.commands();
  assert.equal(commands[1][0], "set");
  const defaults = commands[1][1];
  assert.equal(defaults.page_location, "https://holistichouse.vercel.app/en");
  assert.equal(defaults.page_referrer, "");
  assert.equal(defaults.page_title, "Holistic House");
  for (const event of h.events()) {
    assert.equal(event[2].page_location, "https://holistichouse.vercel.app/en");
    assert.equal(event[2].page_referrer, "");
    assert.equal(event[2].page_title, "Holistic House");
    assert.equal(event[2].send_to, "G-SYNTHETIC");
  }
  assert.doesNotMatch(JSON.stringify(commands), /private_query|private_fragment|private_referrer/);
  assert.equal(h.scripts[0].referrerPolicy, "no-referrer");
});

test("live ga-disable getter blocks private transition before React effects or consent update", () => {
  const h = harness(); h.render();
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], false);
  h.window.location.pathname = "/en/app/private-synthetic-id";
  assert.equal(h.document.documentElement.dataset.analyticsConsent, "granted");
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
  h.acquisition("whatsapp_handoff_click"); h.consent("granted");
  assert.equal(h.events().length, 1);
});

test("live ga-disable getter checks consent and canonical host without rerender", () => {
  const h = harness(); h.render();
  h.document.documentElement.dataset.analyticsConsent = "denied";
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
  h.document.documentElement.dataset.analyticsConsent = "granted";
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], false);
  h.window.location.hostname = "preview.vercel.app";
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
});

test("public to private requests one document reset and only a fresh public document resumes", () => {
  const h = harness(); h.render(); h.render("/en/app"); h.syncConsent();
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
  h.document.title = "PRIVATE SYNTHETIC CLIENT TITLE";
  h.render("/en"); h.syncConsent();
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
  assert.equal(h.reloads(), 1);
  assert.equal(h.events().filter((event) => event[1] === "page_view").length, 1);
  assert.doesNotMatch(JSON.stringify(h.commands()), /PRIVATE SYNTHETIC/);
  const fresh = harness(); fresh.render();
  assert.equal(fresh.events().filter(event => event[1] === "page_view").length, 1);
});

test("stale handler cannot attach old page context after any synchronous URL change", () => {
  const h = harness(); h.render();
  h.window.location.pathname = "/ru/services";
  h.acquisition("whatsapp_handoff_click");
  assert.equal(h.events().length, 1);
  h.render("/ru/services"); h.acquisition("whatsapp_handoff_click");
  assert.equal(h.events().at(-1)[2].page_path, "/ru/services");
});

test("path boundary fails closed for encoded, mixed-case, unlocalized and malformed private routes", () => {
  const h = harness();
  for (const path of ["/app", "/client/x", "/report/x", "/ru/admin", "/en/%61pp/x", "/en/%2561pp/x", "/en/APP/x", "/en/%E0%A4", "/en\\app", "/en/%25252561pp", "//en/app", "/public/../en/app"]) {
    assert.equal(h.isPublic(path), false, path);
  }
  for (const path of ["/en", "/ru/services", "/en/academy/course", "/privacy"]) assert.equal(h.isPublic(path), true, path);
});

test("invalid measurement ID fails closed", () => {
  for (const measurementId of ["GT-SYNTHETIC", "G-BAD ID", "AW-123", "G-", "bad"]) {
    const h = harness({ measurementId }); h.render();
    assert.equal(h.scripts.length, 0);
    assert.equal(h.events().length, 0);
  }
});

test("external opt-out is preserved and direct subsequent opt-out remains effective", () => {
  const h = harness(); h.window["ga-disable-G-SYNTHETIC"] = true; h.render();
  assert.equal(h.events().length, 0);
  h.window["ga-disable-G-SYNTHETIC"] = false; h.consent("granted");
  assert.equal(h.events().length, 1);
  h.window["ga-disable-G-SYNTHETIC"] = true; h.acquisition("whatsapp_handoff_click");
  assert.equal(h.events().length, 1);
});

test("foreign accessor or non-configurable opt-out fails closed without overriding it", () => {
  for (const descriptor of [{ value: false, configurable: false }, { get: () => false, configurable: true }]) {
    const h = harness(); Object.defineProperty(h.window, "ga-disable-G-SYNTHETIC", descriptor); h.render();
    assert.equal(h.scripts.length, 0);
  }
});

test("tag shutdown getter remains active after effect cleanup on a private URL", () => {
  const h = harness(); h.render(); h.unmount();
  h.window.location.pathname = "/en/report/synthetic";
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
});

test("a foreign gtag is not trusted as an initialized matching destination", () => {
  const h = harness(); const calls = [];
  h.window.gtag = (...args) => calls.push(args);
  h.render(); h.syncConsent(); h.acquisition("free_situation_assessment_click");
  assert.equal(h.scripts.length, 0);
  assert.equal(calls.length, 0);
  assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
});

test("withdrawal requests one reset and regrant cannot resume the old SDK document", () => {
  const h = harness(); h.render();
  h.document.cookie = "holistic_house_analytics_consent=denied"; h.syncConsent();
  h.document.cookie = "holistic_house_analytics_consent=granted"; h.syncConsent(); h.syncConsent();
  assert.equal(h.events().filter(event => event[1] === "page_view").length, 1);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.reloads(), 1);
  const fresh = harness(); fresh.render(); fresh.syncConsent();
  assert.equal(fresh.events().filter(event => event[1] === "page_view").length, 1);
});

test("private or denied documents without an owned SDK never reload", () => {
  for (const options of [{ pathname: "/en/app" }, { consent: "denied" }]) {
    const h = harness(options); h.render(); h.syncConsent(); h.render(); h.syncConsent();
    assert.equal(h.scripts.length, 0);
    assert.equal(h.reloads(), 0);
  }
});



test("an unowned pre-existing dataLayer is never activated by our SDK", () => {
  function command() {
    // Exercise a valid foreign gtag command.
    return arguments;
  }
  for (const queue of [[], [command("config", "G-FOREIGN"), command("event", "foreign-event")]]) {
    const h = harness();
    h.window.dataLayer = queue;
    h.render(); h.syncConsent(); h.acquisition("free_situation_assessment_click");
    assert.equal(h.scripts.length, 0);
    assert.equal(h.window.gtag, undefined);
    assert.equal(h.window.dataLayer, queue);
    assert.equal(h.window["ga-disable-G-SYNTHETIC"], true);
  }
});


test("fallback fixture accepts only byte-identical one-step transport retries", () => {
  const fixture = source("scripts/verify-ga4-privacy.mjs");
  const start = fixture.indexOf("const isFallback =");
  const end = fixture.indexOf("function decodedEvents", start);
  const validate = vm.runInNewContext(`(() => { ${fixture.slice(start, end)} return assertFallbackPairs; })()`, { assert, URL });
  const primary = { url: "https://www.google-analytics.com/g/collect?dt=Holistic%20House&extra=a~b+c&v=2", method: "POST", body: null, scenario: "test", phase: "public" };
  const retry = { ...primary, url: "https://www.google.com/g/collect?dt=Holistic%20House&extra=a~b+c&v=2&gaf=1" };
  validate([primary, retry]);
  assert.throws(() => validate([primary, { ...retry, body: "changed" }]));
  assert.throws(() => validate([primary, { ...retry, url: retry.url.replace("%20", "+") }]));
  assert.throws(() => validate([primary, { ...retry, phase: "other" }]));
  assert.throws(() => validate([primary, { ...retry, url: retry.url + "&gaf=1" }]));
  assert.throws(() => validate([primary, retry, retry]));
  assert.throws(() => validate([retry]));
});
