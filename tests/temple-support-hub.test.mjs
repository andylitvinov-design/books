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

test("Holistic Support provides two main areas and six concrete choices", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const styles = read("app/[locale]/holistic-support/holistic-support.module.css");
  const old = read("app/[locale]/temple-support/page.tsx");
  const locales = read("lib/public-locales.ts");
  const home = read("components/home-explore-sections.tsx");
  const sitemap = read("app/sitemap.ts");
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(page.includes(locale + ": {"), locale + " page translation");
    assert.ok(page.includes(locale + ': "/' + locale + '/holistic-support"'));
    assert.match(old, /permanentRedirect\("\/" \+ locale \+ "\/holistic-support"\)/);
  }
  assert.match(page, /data-holistic-support/);
  assert.match(page, /data-holistic-insights/);
  assert.match(page, /data-holistic-healing/);
  assert.match(page, /<section className=\{styles.hero\} data-holistic-first-screen aria-labelledby="holistic-support-title">/);
  assert.match(page, /<nav className=\{styles.pathControls\} aria-label=\{t.choose\}>/);
  assert.match(page, /href="#temple-psychic-insights" data-holistic-path="insights"/);
  assert.match(page, /href="#holistic-healing-support" data-holistic-path="healing"/);
  assert.equal((page.match(/data-holistic-path=/g) || []).length, 2, "exactly two hero journeys");
  assert.doesNotMatch(page, /styles\.primaryNav/);
  assert.match(styles, /\.hero\{[^}]*min-height:clamp\(440px/);
  assert.match(styles, /\.pathControls a\{[^}]*min-height:62px/);
  assert.match(styles, /@media\(max-width:650px\)\{[^}]*\.pathControls\{grid-template-columns:1fr/);
  for (const id of ["ai", "express", "master", "energy", "alchemy", "practitioner"])
    assert.ok(page.includes('data-holistic-offer="' + id + '"'), "missing " + id);
  assert.doesNotMatch(page, /data-holistic-tradition|styles\.methods|methodOptions|methodPaths/);
  assert.doesNotMatch(styles, /\.methods\{/);
  assert.match(page, /\/services\/free-situation-review/);
  assert.match(page, /\/services\/remote-energy-support/);
  assert.match(page, /\/services\/alchemy-of-soul/);
  assert.match(page, /data-holistic-practitioner-cta/);
  assert.match(page, /\/pro#profi-practice/);
  assert.match(read("components/profi-hub.tsx"), /id="profi-practice"/);
  for (const label of ["I'm a Master — Offer My Services", "Я мастер — предложить свои услуги", "Soy profesional — ofrecer mis servicios"])
    assert.ok(page.includes(label), "missing practitioner offer: " + label);
  assert.match(styles, /\.option\[data-holistic-offer="practitioner"\]\{grid-column:1\/-1/);
  assert.match(page, /Listings appear only after approval/);
  assert.match(page, /MarketplaceMasterFinder practitioners=\{energyPractitioners\}/);
  assert.match(page, /service.status === "published"/);
  assert.match(page, /\/masters/);
  assert.match(page, /<IdeasDiscovery locale=\{locale\} variant="temple" \/>/);
  assert.match(locales, /holistic-support/);
  assert.match(home, /path: "\/holistic-support"/);
  assert.match(sitemap, /locale \+ '\/holistic-support'/);
  assert.doesNotMatch(sitemap, /locale \+ '\/temple-support'/);
  assert.match(styles, /@media\(max-width:350px\)/);
  for (const image of ["hero-olive-incense.webp", "andy-about.png", "reiki-approved-sunrise-v3.webp", "ideas-zen-landscape.svg"])
    assert.ok(existsSync(new URL("../public/images/holistic-house/" + image, import.meta.url)), "missing media " + image);
});

test("AI Insight is honest about its non-LLM source; master enquiry is CAD 50 for 20 minutes and consented", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const ideas = read("components/ideas-discovery.tsx");
  const capture = read("components/compact-lead-capture.tsx");
  const alchemy = read("app/[locale]/services/alchemy-of-soul/page.tsx");
  assert.match(page, /AI Insight/);
  assert.match(page, /generative AI model is not connected/);
  assert.match(page, /50 CAD \/ 20 мин/);
  assert.match(page, /CAD 50 \/ 20 min/);
  assert.match(page, /sourcePath=\{"\/" \+ locale \+ "\/holistic-support"\}/);
  assert.doesNotMatch(page, /formatOptions=|formatLabel=/);
  assert.match(page, /serviceTitle=\{"Personal Temple Insights with Andrey · CAD 50 \/ 20 min"\}/);
  assert.match(page, /<CompactLeadCapture/);
  assert.match(page, /data-holistic-master/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(page, /Homeopathy lacks reliable evidence|homeopatía carece|у гомеопатии нет/);
  assert.match(ideas, /const isTemple = variant === "temple"/);
  assert.match(ideas, /drawRandomHexagram\(\)/);
  assert.match(alchemy, /isPublicLocale\(locale\)/);
  assert.match(alchemy, /locale: "es"/);
  assert.doesNotMatch(page, /fetch\(|checkout|charge\(/);
});
