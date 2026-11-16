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
  assert.match(css, /\.offerPrimary \{/);
  assert.match(css, /border: 1px solid #742c42/);
  assert.match(css, /background: #742c42; color: #fff/);
  assert.match(css, /min-height: 44px/);
});

test("Dialog-first homepage replaces old 'five early topic filters replace duplicated offer,' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("main menu prioritizes Energy Love Business and retains full legacy catalogues", () => {
  const nav = read("components/site-navigation.tsx");
  assert.match(nav, /site-nav-free-entry/);
  assert.match(nav, /getCompactNavigation\(activeLocale\)/);
  assert.match(nav, /\['energy', 'love', 'business'\]/);
  assert.match(nav, /id: 'services'/);
  assert.match(nav, /id: 'practice'/);
  assert.match(nav, /id: 'insights'/);
  assert.match(nav, /site-nav-about-entry/);
  assert.match(nav, /site-main-menu-more/);
  assert.match(nav, /mainMenuItems\.map/);
});

test("Dialog-first homepage replaces old 'final consented capture remains after seven stages' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

