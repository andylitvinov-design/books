import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN RU ES show free-first offers and paid requests with distinct CTA and detail actions", () => {
  const offers = read("components/home-featured-workspace.tsx");
  const css = read("components/home-featured-workspace.module.css");
  assert.match(offers, /data-home-offer-primary=\{offer\.id\}/);
  assert.match(offers, /data-home-offer-details=\{offer\.id\}/);
  for (const token of ["Пройти курс Рейки бесплатно","Заказать бесплатный письменный разбор",
    "Пройти коуч-сессию бесплатно","Request a session · from €50","Solicitar revisión escrita gratis"])
    assert.ok(offers.includes(token), token);
  assert.match(css, /\.offerPrimary \{ background: #742c42/);
  assert.match(css, /min-height: 44px/);
});

test("five early topic filters replace duplicated offer, test and My Space sections", () => {
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
  for (const key of ["energy","love","business","services","courses"])
    assert.ok(more.includes('data-home-topic-filter="' + key + '"'));
  assert.match(more, /\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
  const style = read("components/home-more-disclosure.module.css");
  assert.match(style, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(style, /@media \(max-width: 640px\)/);
  assert.match(style, /\.filters \.chip:nth-child\(3\) \{ grid-column: 1 \/ -1; \}/);
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
  assert.match(nav, /id: 'academy'/);
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
