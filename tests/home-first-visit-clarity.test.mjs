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

test("three immediate intents replace five filters, seven stages and duplicate My Space cards",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const dialog=read("components/home-dialog-first.tsx");
 const css=read("components/home-dialog-first.module.css");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 assert.doesNotMatch(home,/ProfileHubTabs|HomeFeaturedWorkspace|HomeMoreDisclosure|HomeSectionCarousel/);
 assert.match(dialog,/data-home-intent-form/);
 assert.match(dialog,/data-home-quick-intents/);
 assert.match(dialog,/data-home-continue/);
 assert.match(dialog,/startAli\(/);
 for(const t of ["Для себя","Для бизнеса","For myself","For business","Para mí","Para negocios"])
   assert.ok(dialog.includes(t),t);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/:focus-visible/);
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

test("the initial page only offers navigation; actual consented forms stay on their dedicated pages",()=>{
 const home=read("components/holistic-house-home.tsx");
 const dialog=read("components/home-dialog-first.tsx");
 assert.doesNotMatch(home,/HomepageContactCta|HomeFreeDiagnosisBanner|PublicConsultationCta/);
 assert.match(dialog,/\/client\/tests/);
 assert.match(dialog,/\/academy/);
 assert.match(dialog,/\/services/);
 assert.match(read("components/homepage-contact-cta.tsx"),/data-home-contact-capture/);
});

