import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCompactNavigation } from "../lib/site-navigation-model.js";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN RU ES show free-first offers and paid requests with distinct CTA and detail actions", () => {
  const offers = read("components/home-featured-workspace.tsx");
  const css = read("components/home-featured-workspace.module.css");
  assert.match(offers, /data-home-offer-primary=\{offer\.id\}/);
  assert.match(offers, /data-home-offer-details=\{offer\.id\}/);
  for (const token of ["Пройти курс Рейки бесплатно","Заказать бесплатный письменный разбор",
    "Пройти коуч-сессию бесплатно","Request a session · from €50","Solicitar revisión escrita gratis"])
    assert.ok(offers.includes(token), token);
  const uncommentedCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const primaryRule = uncommentedCss.match(/(?:^|})\s*\.offerPrimary\s*\{([^{}]*)\}/);
  assert.ok(primaryRule, "The primary action has its own declaration block");
  assert.match(primaryRule[1], /(?:^|;)\s*background\s*:\s*#742c42\s*(?:;|$)/);
  assert.match(css, /min-height: 44px/);
});

test("early topic filters and catalogues replace duplicated offer, test and My Space sections", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const more = read("components/home-more-disclosure.tsx");
  for (const source of [home, es]) {
    assert.match(source, /<HomeFeaturedWorkspace locale=/);
    assert.match(source, /<HomeMoreDisclosure locale=/);
    assert.doesNotMatch(source, /HomeFreePaths|FreeInsightsPaths|<HomeFreeDiagnosisBanner|<HomepageTopicJourneys|<HomePersonalSpaceCard|service-home-hero/);
    assert.ok(source.indexOf("<HomeSectionCarousel") < source.indexOf("<HomeMoreDisclosure"), "Keep the photo hero first");
    assert.ok(source.indexOf("<HomeMoreDisclosure") < source.indexOf("<HomeFeaturedWorkspace"), "Topic choices belong immediately after the hero");
    assert.equal((source.match(/<HomeMoreDisclosure/g) || []).length, 1, "One topic picker, no duplicate footer section");
  }
  // Temple Support joined the three topics; its legacy URL preserves each locale.
  const filters = [...more.matchAll(/<Link href=\{"\/" \+ locale \+ "([^"]+)"\}[^>]*data-home-topic-filter="([^"]+)"/g)]
    .map(([, href, key]) => [key, href]);
  assert.deepEqual(filters, [
    ["energy", "/explore/energy"], ["love", "/explore/love"],
    ["business", "/explore/business"], ["temple", "/temple-support"],
    ["services", "/services"], ["courses", "/academy"],
  ], "One localized link per topic or catalogue, without a repeated offer grid");
  assert.match(more, /\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
  const style = read("components/home-more-disclosure.module.css");
  assert.match(style, /\.filters\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(style, /@media \(max-width: 640px\)/);
  const mobile = style.slice(style.indexOf("@media (max-width: 640px)"));
  assert.match(mobile, /\.filters\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*\.82fr\)\s+minmax\(0,\s*1\.18fr\)/);
  assert.match(mobile, /\.filters \.chip:nth-child\(3\) \{ grid-column: auto; \}/);
  assert.match(style, /overflow-wrap: anywhere/);
  assert.match(style, /:focus-visible/);
  for (const phrase of ["Explore by topic", "Выберите тему", "Explora por tema"]) assert.ok(more.includes(phrase));
});

test("main menu prioritizes Energy Love Business and retains full legacy catalogues", () => {
  const nav = read("components/site-navigation.tsx");
  assert.match(nav, /site-nav-free-entry/);
  assert.match(nav, /getCompactNavigation\(activeLocale\)/);
  assert.match(nav, /\['energy', 'love', 'business'\]/);
  assert.match(nav, /id: 'services'/);
  for (const locale of ["en", "ru", "es"]) {
    const courses = getCompactNavigation(locale).filter(item => item.id === "courses");
    assert.equal(courses.length, 1, "One primary course catalogue entry");
    assert.equal(courses[0].href, "/" + locale + "/academy");
    assert.ok(courses[0].label.trim());
  }
  assert.match(nav, /site-nav-about-entry/);
  assert.match(nav, /site-main-menu-more/);
  assert.match(nav, /mainMenuItems\.map/);
});

test("final consented capture remains after seven stages", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  assert.ok(home.indexOf("<HomeMoreDisclosure") < home.indexOf("<HomepageContactCta"));
  assert.ok(spanish.indexOf("<HomeMoreDisclosure") < spanish.indexOf("<PublicConsultationCta"));
  assert.match(read("components/homepage-contact-cta.tsx"), /data-home-contact-capture/);
});
