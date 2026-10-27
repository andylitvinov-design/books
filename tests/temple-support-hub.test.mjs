import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from "../lib/site-navigation-model.js";
import { safePublicWhatsAppPath } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Holistic Support is the seventh public tab and preserves separate Temple Insights", () => {
  const bar = read("components/mobile-bottom-navigation.tsx");
  const icons = read("components/compact-navigation-icons.ts");
  for (const locale of ["en", "ru", "es"]) {
    const links = getCompactNavigation(locale);
    assert.equal(links.length, 7);
    assert.deepEqual(links.map(item => item.id), ["profile", "courses", "home", "analysis", "alchemy", "pro", "temple"]);
    assert.equal(links[1].href, "/" + locale + "/academy");
    assert.equal(links[2].href, locale === "en" ? "/" : "/" + locale);
    assert.equal(links[3].href, "/" + locale + "/services/free-situation-review");
    assert.equal(links[6].href, "/" + locale + "/holistic-support");
    assert.equal(links[6].label, {en:"Holistic Support",ru:"Холистическая поддержка",es:"Apoyo holístico"}[locale]);
    assert.equal(activeCompactNavigationId("/" + locale + "/holistic-support"), "temple");
    assert.equal(activeCompactNavigationId("/" + locale + "/temple-insights"), "temple");
    assert.ok(getSiteNavigation(locale).some(x => x.id === "temple" && x.label === links[6].label));
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support"), "/" + locale + "/holistic-support");
  }
  assert.equal(safePublicWhatsAppPath("/en/client/report/private"), "");
  assert.match(icons, /analysis: Sparkles/);
  assert.match(icons, /courses: BookOpen/);
  assert.match(icons, /temple: Landmark/);
  assert.match(bar, /temple: 'Holistic Support'/);
  for (const label of ["Holistic Support", "Поддержка", "Apoyo holístico"])
    assert.ok(bar.includes("temple: '" + label + "'"), "missing mobile tab label " + label);
  assert.match(bar, /aria-label=\{item\.ariaLabel\}/);

});

test("Holistic Support seven-column CSS layout retains its mobile breakpoints", () => {
  const css = read("app/ia-v2.css");
  const homeCss = read("app/holistic-house-home.css");
  assert.match(css, /repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(homeCss, /repeat\(7, minmax\(0,1fr\)\)/);
});

test("Holistic Support puts three accessible, photo-backed support choices first in EN/RU/ES", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const chooser = read("components/holistic-support-choices.tsx");
  const ideas = read("components/ideas-discovery.tsx");
  const scenic = read("components/ideas-discovery.module.css");
  const styles = read("app/[locale]/holistic-support/holistic-support.module.css");
  const old = read("app/[locale]/temple-support/page.tsx");
  const locales = read("lib/public-locales.ts");
  const home = read("components/home-explore-sections.tsx");
  const sitemap = read("app/sitemap.ts");

  for (const locale of ["en", "ru", "es"]) {
    assert.ok(page.includes(locale + ": {"), locale + " locale");
    assert.ok(page.includes(locale + ': "/' + locale + '/holistic-support"'));
  }
  assert.ok(old.includes('permanentRedirect("/" + locale + "/holistic-support")'));
  assert.ok(page.includes("data-holistic-support"));
  assert.ok(chooser.includes("data-holistic-first-screen"));
  assert.ok(page.includes('<HolisticSupportChoices locale={locale} />'));
  assert.ok(chooser.includes('<IdeasDiscovery locale={locale} variant="holistic-dao" />'));
  assert.equal((chooser.match(/<IdeasDiscovery /g) || []).length, 1, "reuse existing Dao engine once, only after selection");
  assert.ok(page.indexOf("<HolisticSupportChoices") < page.indexOf("<HolisticSupportTopicFilter"));
  assert.ok(page.indexOf("<HolisticSupportTopicFilter") < page.indexOf("data-holistic-meditations"));
  for (const option of ["meditations", "energy", "dao"]) assert.ok(chooser.includes('data-holistic-choose="' + option + '"'));
  assert.ok(!page.includes("<FreeDiagnosticStart") && !page.includes("<CompactLeadCapture"),
    "the personal coaching form moves to Coaching");
  assert.ok(!page.includes("styles.hero"), "the big coaching hero was removed");
  assert.ok(ideas.includes('variant?: "ideas" | "temple" | "holistic"'));
  assert.ok(ideas.includes("data-holistic-entry"));
  for(const label of [
    "Holistic Support", "Холистическая поддержка", "Apoyo holístico",
    "Get a free symbolic insight", "Получить бесплатную подсказку", "Recibir una reflexión gratuita",
    "Request energy support", "Получить энергетическую поддержку", "Solicitar apoyo energético",
  ]) assert.ok(ideas.includes(label), "missing localized first-screen text: " + label);
  assert.ok(ideas.includes('href={"/" + locale + "/services/remote-energy-support"}'));
  assert.ok(ideas.includes("onClick={() => stageRemoteSupportLandingIntention(question)}"));
  assert.ok(ideas.includes("drawRandomHexagram()"));
  assert.ok(scenic.includes('ideas-pine-sharp.avif'));
  assert.ok(scenic.includes('@media (max-width: 360px)'));
  assert.ok(styles.includes(".primaryEntry"));
  assert.ok(styles.includes(".coachingAside"));
  assert.ok(styles.includes("@media(max-width:350px)"));
  assert.ok(locales.includes("holistic-support"));
  assert.ok(home.includes('path: "/holistic-support"'));
  assert.ok(sitemap.includes("locale + '/holistic-support'"));
  assert.ok(!sitemap.includes("locale + '/temple-support'"));
  assert.ok(existsSync(new URL("../public/images/holistic-house/ideas-pine-sharp.avif", import.meta.url)));
});

test("the thematic energy support path preserves privacy and request journeys without duplicate offers", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const remote = read("components/remote-energy-support-booking.tsx");
  const bridge = read("lib/practitioners/remote-energy-support.js");
  const filter = read("components/holistic-support-topic-filter.tsx");
  assert.ok(page.includes("<HolisticSupportTopicFilter locale={locale} />"));
  assert.doesNotMatch(page, /data-holistic-healing|data-holistic-offer=/);
  assert.match(filter, /<Link href="#meditation-practices" prefetch=\{false\}/);
  assert.match(filter, /data-holistic-order-trigger=\{id\}/);
  assert.match(filter, /aria-controls="holistic-inline-order"/);
  assert.match(filter, /onClick=\{\(\) => openOrder\(id === "talisman" \? "talisman" : "energy"\)\}/);
  assert.match(filter, /<HolisticInlineSupportOrder locale=\{locale\} kind=\{orderKind\}/);
  assert.match(filter, /initialGoal=\{initialGoal\[activeTopic\]\} onKindChange=\{setOrderKind\}/);
  assert.doesNotMatch(filter, /href="#talismans"|href=\{[^}]*services\/remote-energy-support/);
  assert.ok(filter.includes("data-holistic-topic-card={id}"));
  assert.doesNotMatch(page, /MarketplaceMasterFinder|data-holistic-practitioners|createPractitionerRepository/);
  assert.match(read("app/[locale]/pro/page.tsx"), /MarketplaceMasterFinder practitioners=\{practitioners\}/);
  assert.ok(page.includes("data-holistic-coaching-followup"));
  assert.ok(page.includes('href={"/" + locale + "/coaching"}'));
  assert.ok(page.includes("€50 / 30"));
  assert.match(page, /Homeopathy lacks reliable evidence|homeopatía carece|у гомеопатии нет/);
  assert.ok(remote.includes("takeRemoteSupportLandingIntention()"));
  assert.ok(remote.includes("if (stagedIntention) setIntention(stagedIntention)"));
  assert.ok(bridge.includes("stageRemoteSupportLandingIntention"));
  assert.ok(bridge.includes("takeRemoteSupportLandingIntention"));
  assert.doesNotMatch(bridge.slice(bridge.indexOf("// One-use, same-tab handoff")),
    /sessionStorage\.setItem|localStorage\.setItem|fetch\(/);
  assert.doesNotMatch(page, /checkout|charge\(/);
});

test("independent Temple Insights keeps its own diagnostic CTA and natural scenic layout", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const scenic = read("components/ideas-discovery.module.css");
  assert.ok(ideas.includes('variant === "temple" ? <Link'));
  assert.ok(ideas.includes('href={"/" + locale + "/coaching#free-diagnostic-start"}'));
  assert.ok(ideas.includes("data-ideas-personal-diagnostic"));
  assert.ok(ideas.includes("data-ideas-free-test"));
  assert.ok(ideas.includes('const HeadingTag = variant === "temple" || daoFocused ? "h2" : "h1"'));
  assert.ok(scenic.includes('data-temple-mode="true"'));
  assert.ok(scenic.includes('.templeScenic::before'));
});

test("Coaching Lounge owns the former scenic first screen and exactly three distinct pathways in EN/RU/ES", () => {
  const entry = read("components/coaching-lounge-entry.tsx");
  const layout = read("components/coaching-lounge-entry.module.css");
  const lounge = read("components/public-coaching-discovery.jsx");
  const ideas = read("components/ideas-discovery.tsx");
  assert.match(lounge, /<CoachingLoungeEntry locale=\{lang\} selected=\{coachingChoice\} onSelect=\{setCoachingChoice\} \/>/);
  assert.doesNotMatch(lounge, /<CoachingLiveSessionCapture/);
  assert.match(lounge, /data-coaching-human-to-intake/);
  assert.match(lounge, /onClick=\{\(\)=>setCoachingChoice\("session"\)\}/);
  assert.match(entry, /onSelect\(offer\.id as Choice\)/);
  assert.match(entry, /data-coaching-first-screen/);
  assert.match(entry, /hero-olive-incense\.webp/);
  assert.match(entry, /data-coaching-three-paths/);
  assert.match(entry, /data-coaching-hero-choice="free"/);
  assert.match(entry, /data-coaching-hero-choice="session"/);
  assert.match(entry, /data-coaching-hero-choice="deep"/);
  assert.match(entry, /data-coaching-offer=\{offer\.id\}/);
  assert.match(entry, /services\/imagery-therapy#request-session/);
  assert.match(entry, /data-coaching-select=\{offer\.id\}/);
  for (const label of ["Free situation diagnosis","Бесплатная диагностика ситуации","Diagnóstico gratuito de la situación",
    "Personal coaching session","Личная коучинг-сессия","Sesión personal de coaching",
    "Depth-oriented personal work","Глубинная терапия","Trabajo personal profundo"])
    assert.ok(entry.includes(label), "missing locale offer " + label);
  assert.match(entry, /<FreeDiagnosticStart locale=\{locale\} \/>/);
  assert.match(entry, /<CompactLeadCapture locale=\{locale\} variant="inline"/);
  assert.equal((entry.match(/<CompactLeadCapture/g) || []).length, 1);
  assert.match(entry, /sourcePath=\{"\/" \+ locale \+ "\/coaching"\}/);
  assert.match(entry, /formatOptions=\{t\.formats\}/);
  assert.match(entry, /30 min · €50/);
  assert.match(entry, /60 min · €100/);
  assert.match(ideas, /coaching#free-diagnostic-start/);
  assert.match(layout, /@media\(max-width:600px\)/);
  assert.match(layout, /@media\(max-width:350px\)/);
  assert.match(layout, /min-height:44px/);
  assert.match(layout, /:focus-visible/);
  for (const photo of ["hero-olive-incense.webp","andy-about.png","video-posters/hypnotherapy-en-v1.webp"])
    assert.ok(existsSync(new URL("../public/images/holistic-house/" + photo, import.meta.url)));
});

test("Coaching Lounge source path is permitted for real, consented CRM intake but private paths remain blocked", () => {
  const entry = read("components/coaching-lounge-entry.tsx");
  const capture = read("components/compact-lead-capture.tsx");
  const backend = read("lib/practitioners/public-service-enquiry-input.mjs");
  for (const locale of ["en","ru","es"]) {
    assert.equal(safePublicWhatsAppPath("/" + locale + "/coaching"), "/" + locale + "/coaching");
    assert.equal(safePublicWhatsAppPath("/" + locale + "/coaching/intake"), "/" + locale + "/coaching/intake");
  }
  for (const source of ["/en/coaching/secret","/en/coaching?token=private","/en/app/clients","/ru/client/report"])
    if(source.includes("?")) assert.equal(safePublicWhatsAppPath(source), "/en/coaching");
    else assert.equal(safePublicWhatsAppPath(source), "");
  assert.match(entry, /data-coaching-intake/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(backend, /normalizePublicServiceEnquiry/);
  assert.doesNotMatch(entry, /fetch\(|gtag\(|payment_received|payment_captured/);
  assert.doesNotMatch(read("app/[locale]/holistic-support/page.tsx"), /fetch\(|checkout|charge\(/);
});

// Exercise current thematic destinations without a browser, network or real requests.
function assertThematicDestinations(input = read('components/holistic-support-topic-filter.tsx')) {
  const jsx = (type, props) => ({ type, props: props || {} });
  const compiled = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const goals = { business: 'Work and money', love: 'Connection and relationships', health: 'Inner balance and calm' };
  for (const locale of ['en', 'ru', 'es']) for (const topic of Object.keys(goals)) {
    function render(kind = null) {
      let stateIndex = 0;
      const updates = {}, events = [];
      class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
      const window = { dispatchEvent(event) { assert.equal(event.type, 'hh-support-order-open'); assert.equal(event.detail.source, 'topics'); events.push(event); return true; } };
      const modules = {
        react: { useEffect: () => {}, useState: () => {
          const index = stateIndex++;
          return [index === 0 ? topic : kind, value => { updates[index === 0 ? 'topic' : 'kind'] = value; }];
        } },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'next/link': { default: 'a', __esModule: true },
        'next/image': { default: 'img', __esModule: true },
        'lucide-react': { ArrowRight: 'icon', BriefcaseBusiness: 'icon', Heart: 'icon', HeartPulse: 'icon' },
        './holistic-inline-support-order': { HolisticInlineSupportOrder: 'inline-order' },
        './holistic-support-topic-filter.module.css': { default: new Proxy({}, { get: (_, name) => name }), __esModule: true },
      };
      const exports = {};
      runInNewContext(compiled, { exports, window, CustomEvent, require: name => {
        assert.ok(Object.hasOwn(modules, name), name); return modules[name];
      } });
      const nodes = [];
      const walk = node => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        nodes.push(node); walk(node.props?.children);
      };
      walk(exports.HolisticSupportTopicFilter({ locale }));
      return { nodes, updates, events };
    }
    const initial = render();
    assert.deepEqual(initial.nodes.filter(node => node.props['data-holistic-topic-card']).map(node => node.props['data-holistic-topic-card']),
      ['meditation', 'talisman', 'expert']);
    const meditation = initial.nodes.filter(node => node.type === 'a');
    assert.equal(meditation.length, 1, 'Only meditation navigates; other offers open inline');
    assert.equal(meditation[0].props.href, '#meditation-practices');
    assert.equal(meditation[0].props.prefetch, false);
    assert.equal(initial.nodes.filter(node => node.type === 'inline-order').length, 0);
    for (const [offer, expectedKind] of [['talisman', 'talisman'], ['expert', 'energy']]) {
      const buttons = initial.nodes.filter(node => node.props['data-holistic-order-trigger'] === offer);
      assert.equal(buttons.length, 1);
      assert.equal(buttons[0].type, 'button');
      assert.equal(buttons[0].props.type, 'button');
      assert.equal(buttons[0].props['aria-controls'], 'holistic-inline-order');
      assert.equal(buttons[0].props['aria-expanded'], false);
      const eventCount = initial.events.length;
      buttons[0].props.onClick();
      assert.equal(initial.events.length, eventCount + 1, "Each opening coordinates before selecting its kind");
      assert.equal(initial.updates.kind, expectedKind);
      const opened = render(initial.updates.kind);
      const panels = opened.nodes.filter(node => node.type === 'inline-order');
      assert.equal(panels.length, 1);
      assert.equal(panels[0].props.kind, expectedKind);
      assert.equal(panels[0].props.locale, locale);
      assert.equal(panels[0].props.initialGoal, goals[topic]);
      const active = opened.nodes.find(node => node.props['data-holistic-order-trigger'] === offer);
      assert.equal(active.props['aria-expanded'], true);
      panels[0].props.onClose();
      assert.equal(opened.updates.kind, null);
      assert.equal(render(opened.updates.kind).nodes.filter(node => node.type === 'inline-order').length, 0);
    }
  }
}

test('all locale and topic cards keep meditation navigation and explicit inline talisman or energy requests', () => {
  assertThematicDestinations();
});

test('thematic destinations reject retired anchors, wrong request kinds and missing inline forms', () => {
  const input = read('components/holistic-support-topic-filter.tsx');
  for (const [before, after] of [
    ['href="#meditation-practices"', 'href="#talismans"'],
    ['openOrder(id === "talisman" ? "talisman" : "energy")', 'openOrder("energy")'],
    ['{orderKind && (', '{false && ('],
    ['window.dispatchEvent(new CustomEvent("hh-support-order-open", {detail:{source:"topics"}}));', ''],
  ]) {
    assert.ok(input.includes(before), before);
    assert.throws(() => assertThematicDestinations(input.replaceAll(before, after)), { code: 'ERR_ASSERTION' }, before);
  }
});
