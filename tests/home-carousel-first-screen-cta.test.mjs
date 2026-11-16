import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES begin with conversation, not the old consultation carousel",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const first=read("components/home-dialog-first.tsx");
 const carousel=read("components/home-section-carousel.tsx");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 assert.doesNotMatch(home,/HomeSectionCarousel|HomeFeaturedWorkspace|ProfileHubTabs/);
 assert.match(first,/data-home-conversation-hero/);
 assert.match(first,/data-home-intent-form/);
 assert.match(carousel,/data-home-hero-nav="true"/);
});

test("free diagnosis button reveals one compact messenger handoff inside its warm card", () => {
  const banner = read("components/home-free-diagnosis-banner.tsx");
  const css = read("components/home-free-diagnosis-banner.module.css");
  assert.match(banner, /data-home-free-diagnosis-banner/);
  assert.match(banner, /data-home-diagnosis-order/);
  assert.match(banner, /aria-expanded=\{open\}/);
  assert.match(banner, /aria-controls=\{formId\}/);
  assert.match(banner, /hidden=\{!open \|\| websiteMessengerOnlyUi\(\)\}/);
  assert.match(banner, /MandatoryMessengerActions/);
  assert.match(banner, /data-home-diagnosis-request/);
  assert.match(banner, /data-home-diagnosis-channel="whatsapp"/);
  assert.match(banner, /data-home-diagnosis-channel="telegram"/);
  assert.match(banner, /fetch\("\/api\/service-enquiries"/);
  assert.match(banner, /contactConsent: true/);
  assert.match(banner, /function sourcePath\(locale: PublicLocale, context\?: ExpressContext\)/);
  assert.match(banner, /serviceTitle: SERVICE_TITLE/);
  assert.match(banner, /result\?\.saved !== true/);
  assert.match(banner, /setReference\(committedReference\)/);
  assert.match(banner, /data-home-diagnosis-consent/);
  assert.match(banner, /<label htmlFor=\{consentId\}>\{t\.consent\}<\/label>/);
  assert.match(banner, /window\.open\("about:blank", "_blank"\)/);
  assert.match(banner, /handoffWindow\?\.close\(\)/);
  assert.doesNotMatch(banner, /CompactLeadCapture|data-compact-last-slide/);
  assert.match(css, /\.request \{ grid-column: 1\/-1;/);
  assert.match(css, /\.request\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.channels :is\(button,a\) \{[^}]*min-height: 46px/s);
  for (const heading of ["Бесплатная диагностика ситуации", "Free situation assessment", "Evaluación gratuita"]) {
    assert.ok(banner.includes(heading), heading);
  }
  for (const benefit of ["Personal written review", "Личный письменный разбор", "Informe personal escrito"]) {
    assert.ok(banner.includes(benefit), benefit);
  }
});

test("slider and benefit-rich banner fit the first mobile fold without impacting service pages", () => {
  const sliderCss = read("components/services-conversion-hero.module.css");
  const bannerCss = read("components/home-free-diagnosis-banner.module.css");
  assert.match(sliderCss, /\.hero\[data-home-section-carousel\] \.slider \{ height: clamp\(302px, 39svh, 336px\); min-height: 0;/);
  // No opacity fade on the first mobile artwork: avoid an extra LCP paint wait
  // without changing Desktop / Services slider animations.
  assert.match(sliderCss, /\.hero\[data-home-section-carousel\] \.slideMedia \{ animation: none; \}/);
  assert.match(sliderCss, /\.slideMedia \{ position:absolute; inset:0; z-index:0; animation:serviceFade/);
  assert.doesNotMatch(sliderCss, /\.slideMedia \{ position:absolute; inset:0; z-index:0; animation:none/);
  assert.match(sliderCss, /\.hero\[data-home-section-carousel\] \.slider \{ height: 258px; min-height: 0;/);
  assert.match(bannerCss, /@media \(max-width: 365px\)/);
  assert.match(bannerCss, /\.order \{[^}]*min-height: 45px/s);
  assert.match(bannerCss, /\.root :is\(a, button, input\):focus-visible/);
  assert.match(bannerCss, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
});


test("archived consultation carousel retains truthful pricing while Home starts with Ali",()=>{
 const carousel=read("components/home-section-carousel.tsx");
 const browser=read("scripts/verify-home-consultation-first-screen.mjs");
 for(const label of ["Request a consultation · from €50","Запросить консультацию · от €50",
   "Solicitar una consulta · desde €50"])
   assert.ok(carousel.includes('action: "'+label+'"'));
 assert.match(carousel,/data-home-first-screen-cta=\{slide\.key === "services" \? "paid" : undefined\}/);
 assert.match(browser,/data-home-conversation-hero/);
 assert.match(browser,/data-hh-unified-dock/);
 assert.doesNotMatch(browser,/data-profile-video-hero|data-my-space-topics|data-home-first-screen-cta/);
});

