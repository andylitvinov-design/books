import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from "../lib/site-navigation-model.js";
import { safePublicWhatsAppPath } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Holistic Support is the seventh public tab and preserves separate Temple Insights", () => {
  const bar = read("components/mobile-bottom-navigation.tsx");
  const icons = read("components/compact-navigation-icons.ts");
  const css = read("app/ia-v2.css");
  const homeCss = read("app/holistic-house-home.css");
  for (const locale of ["en", "ru", "es"]) {
    const links = getCompactNavigation(locale);
    assert.equal(links.length, 7);
    assert.deepEqual(links.map(item => item.id), ["home", "analysis", "courses", "profile", "coaching", "pro", "temple"]);
    assert.equal(links[1].href, "/" + locale + "/services/free-situation-review");
    assert.equal(links[2].href, "/" + locale + "/academy");
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
  assert.match(css, /repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(homeCss, /repeat\(7, minmax\(0,1fr\)\)/);
});

test("Holistic Support keeps temple insights and complementary energy, not coaching duplicates", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const style = read("app/[locale]/holistic-support/holistic-support.module.css");
  const old = read("app/[locale]/temple-support/page.tsx");
  assert.match(old, /permanentRedirect\("\/" \+ locale \+ "\/holistic-support"\)/);
  assert.match(page, /data-holistic-first-screen/);
  assert.match(page, /className=\{styles\.compactIntro\}/);
  assert.match(style, /\.compactIntro\{/);
  assert.match(page, /data-holistic-insights/);
  assert.match(page, /data-holistic-offer="ai"/);
  for (const id of ["energy", "alchemy", "practitioner"])
    assert.ok(page.includes('data-holistic-offer="' + id + '"'), id);
  assert.match(page, /data-holistic-healing/);
  assert.match(page, /data-holistic-practitioner-cta/);
  assert.doesNotMatch(page, /MarketplaceMasterFinder|data-holistic-practitioners|createPractitionerRepository/);
  assert.match(page, /\/pro#profi-practice/);
  assert.match(page, /<IdeasDiscovery locale=\{locale\} variant="temple" \/>/);
  assert.match(page, /data-holistic-to-coaching/);
  assert.doesNotMatch(page, /<FreeDiagnosticStart|<CompactLeadCapture|data-holistic-offer="express"|data-holistic-offer="master"/);
  assert.doesNotMatch(page, /className=\{styles\.hero\} data-holistic-first-screen/);
  assert.ok(existsSync(new URL("../public/images/holistic-house/ideas-zen-landscape.svg", import.meta.url)));
});

test("Coaching Lounge owns the former scenic first screen and exactly three distinct pathways in EN/RU/ES", () => {
  const entry = read("components/coaching-lounge-entry.tsx");
  const layout = read("components/coaching-lounge-entry.module.css");
  const lounge = read("components/public-coaching-discovery.jsx");
  const ideas = read("components/ideas-discovery.tsx");
  assert.match(lounge, /<CoachingLoungeEntry locale=\{lang\} \/>/);
  assert.doesNotMatch(lounge, /<CoachingLiveSessionCapture/);
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
