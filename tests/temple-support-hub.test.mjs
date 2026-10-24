import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from "../lib/site-navigation-model.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("legacy Temple Support remains reachable while six-tab bar separates Insights and Holistic Support", () => {
  const icons=read("components/compact-navigation-icons.ts");
  const css=read("app/ia-v2.css");
  const baseCss=read("app/holistic-house-home.css");
  for (const locale of ["en","ru","es"]) {
    const links=getCompactNavigation(locale);
    assert.equal(links.length,6);
    assert.equal(links[3].href,"/"+locale+"/temple-insights");
    assert.equal(links[4].href,"/"+locale+"/holistic-support");
    assert.equal(activeCompactNavigationId("/"+locale+"/temple-support"),"insights");
    assert.ok(getSiteNavigation(locale).some(link=>link.id==="temple"));
    assert.ok(!links.some(link=>link.id==="temple"));
  }
  assert.ok(icons.includes('insights: Sparkles'));
  assert.ok(icons.includes('support: HeartHandshake'));
  assert.ok(css.includes('repeat(6,minmax(0,1fr))'));
  assert.ok(baseCss.includes('repeat(6, minmax(0,1fr))'));
});

test("Temple Support has EN/RU/ES metadata and three real existing service journeys", () => {
  const page = read("app/[locale]/temple-support/page.tsx");
  const styles = read("app/[locale]/temple-support/temple-support.module.css");
  const ideas = read("components/ideas-discovery.tsx");
  const locales = read("lib/public-locales.ts");
  const home = read("components/home-explore-sections.tsx");
  const sitemap = read("app/sitemap.ts");
  for (const locale of ["en", "ru", "es"]) {
    assert.match(page, new RegExp(locale + ': \\{'));
    assert.ok(page.includes(locale + ': "/' + locale + '/temple-support"'));
    assert.ok(sitemap.includes("/temple-support"));
    assert.ok(home.includes('path: "/temple-support"'));
  }
  assert.match(page, /data-temple-support/);
  assert.match(page, /<IdeasDiscovery locale=\{language\} variant="temple"/);
  assert.match(ideas, /const isTemple = variant === "temple"/);
  assert.match(ideas, /drawRandomHexagram\(\)/);
  assert.match(page, /\/services\/remote-energy-support/);
  assert.match(page, /MarketplaceMasterFinder practitioners=\{templePractitioners\}/);
  assert.match(page, /service.status === "published"/);
  assert.match(page, /\/masters/);
  assert.match(locales, /temple-support/);
  assert.match(styles, /@media\(max-width:350px\)/);
  for (const image of ["hero-olive-incense.webp", "reiki-approved-sunrise-v3.webp", "ideas-zen-landscape.svg"]) {
    assert.ok(existsSync(new URL("../public/images/holistic-house/" + image, import.meta.url)), image + " must exist");
  }
});

test("Temple mode keeps the original privacy model and does not duplicate CRM, booking or payment", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const page = read("app/[locale]/temple-support/page.tsx");
  assert.match(ideas, /\{!isTemple \? <Link href=\{coachingHref\}/);
  assert.match(ideas, /<HeadingTag id="ideas-title">/);
  assert.match(ideas, /\{!isTemple \? <nav className=\{styles\.exploreLinks\}/);
  for (const prohibited of ["sendBeacon(", "localStorage", "sessionStorage", "XMLHttpRequest"]) {
    assert.ok(!ideas.includes(prohibited), prohibited + " leaks symbolic questions");
  }
  assert.doesNotMatch(page, /fetch\(|createLead\(|insert\(|checkout|charge\(/);
});
