import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from "../lib/site-navigation-model.js";
import { safePublicWhatsAppPath } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Holistic Support stays live as the fifth of six bottom destinations with separate Temple Insights", () => {
  const bar = read("components/mobile-bottom-navigation.tsx");
  const icons = read("components/compact-navigation-icons.ts");
  const css = read("app/ia-v2.css");
  const homeCss = read("app/holistic-house-home.css");
  for (const locale of ["en", "ru", "es"]) {
    const links = getCompactNavigation(locale);
    assert.equal(links.length, 6);
    assert.equal(links[3].id, "insights");
    assert.equal(links[3].href, "/" + locale + "/temple-insights");
    assert.equal(links[4].id, "support");
    assert.equal(links[4].href, "/" + locale + "/holistic-support");
    assert.equal(links[4].label, {en:"Holistic Support",ru:"Холистическая поддержка",es:"Apoyo holístico"}[locale]);
    assert.equal(activeCompactNavigationId("/" + locale + "/holistic-support"), "support");
    assert.equal(activeCompactNavigationId("/" + locale + "/temple-insights"), "insights");
    assert.ok(getSiteNavigation(locale).some(x => x.id === "temple" && x.label === "Holistic Support"));
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support"), "/" + locale + "/holistic-support");
  }
  assert.equal(safePublicWhatsAppPath("/en/client/report/private"), "");
  assert.match(icons, /insights: Sparkles/);
  assert.match(icons, /support: HeartHandshake/);
  assert.match(bar, /support: 'Support'/);
  assert.match(bar, /aria-label=\{item\.ariaLabel\}/);
  assert.match(css, /repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(homeCss, /repeat\(6, minmax\(0,1fr\)\)/);
});

test("Holistic Support provides exactly two main areas and five concrete choices", () => {
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
  assert.match(page, /<nav className=\{styles.primaryNav\}/);
  for (const id of ["ai", "express", "master", "energy", "alchemy"])
    assert.ok(page.includes('data-holistic-offer="' + id + '"'), "missing " + id);
  assert.doesNotMatch(page, /data-holistic-tradition|styles\.methods|methodOptions|methodPaths/);
  assert.doesNotMatch(styles, /\.methods\{/);
  assert.match(page, /\/services\/free-situation-review/);
  assert.match(page, /\/services\/remote-energy-support/);
  assert.match(page, /\/services\/alchemy-of-soul/);
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
