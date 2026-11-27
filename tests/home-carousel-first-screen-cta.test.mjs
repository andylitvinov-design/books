import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");


test("all Home locales mount the new three-tab page without legacy carousel or catalog",()=>{
 const home=read("components/holistic-house-home.tsx"),es=read("app/es/page.tsx");
 const carousel=read("components/home-section-carousel.tsx");
 const expanded=read("components/home-expanded-catalog.tsx");
 const deferred=read("components/home-deferred-sections.tsx");
 for(const page of [home,es]){
  assert.match(page,/<(?:HomeProgramEntry|HolisticHouseHome) locale=/);
  assert.doesNotMatch(page,/<HomeDeferredSections|<HomeDialogueEntry/);
  assert.doesNotMatch(page,/<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure/);
  assert.doesNotMatch(page,/<HomeFreeDiagnosisBanner|<HomepageTopicJourneys|<HomePersonalSpaceCard/);
 }
 assert.match(deferred,/IntersectionObserver/);
 assert.match(expanded,/<HomeSectionCarousel locale=\{locale\}\s*\/>/);
 assert.match(expanded,/<HomeFeaturedWorkspace locale=\{locale\}\s*\/>/);
 assert.doesNotMatch(carousel,/data-home-quick-booking|data-home-quick-cta/);
 assert.match(carousel,/data-home-hero-nav="true"/);
 assert.match(carousel,/data-home-slide-dot=\{item.key\}/);
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



test("legacy carousel retains its service link; the new Home owns the first screen",()=>{
 const carousel=read("components/home-section-carousel.tsx");
 const browser=read("scripts/verify-home-consultation-first-screen.mjs");
 const entry=read("components/home-dialogue-entry.tsx");
 const home=read("components/holistic-house-home.tsx");
 for(const label of ["Request a consultation · from €50","Запросить консультацию · от €50","Solicitar una consulta · desde €50"])
  assert.ok(carousel.includes('action: "'+label+'"'),"Optional paid action missing: "+label);
 assert.match(carousel,/data-home-first-screen-cta=\{slide\.key === "services" \? "paid" : undefined\}/);
 assert.match(carousel,/key === "cabinet" && locale === "es" \? "\/en\/app"/);
 assert.match(home,/<HomeProgramEntry locale=\{locale\}/);
 assert.doesNotMatch(home,/<HomeSectionCarousel/);
 assert.match(entry,/data-home-intent-form/);
 assert.match(entry,/data-home-send-to-ali/);
 assert.match(browser,/verifyProgramHome/);
 assert.match(browser,/\[\["clarity",3\],\["goal",8\],\["business",8\],\["reiki",5\]\]/);
 assert.match(read("scripts/verify-program-home.mjs"),/data-goal-profile-tab/);
 assert.match(entry,/data-home-intent-option=\{art\.id\}/);
 // The approved seven-slot dock now uses My Reiki; MyVideo lives in Profile.
 assert.match(browser,/"mytube","reiki","coach","ai","services","practice","profile"/);
 assert.doesNotMatch(browser,/data-home-quick-booking|data-home-quick-cta/);
});
