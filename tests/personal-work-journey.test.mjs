import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { coachingIntakeEntryTopic, COACHING_TOPICS } from "../lib/coaching/intake-model.js";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home retains featured offers and testimonials without the retired AI introductory video", () => {
  const home = source("components", "holistic-house-home.tsx");
  const offers = home.indexOf('<HomeFeaturedWorkspace locale={locale} />');
  const testimonials = home.indexOf('<PersonalTestimonials locale={locale} variant="home" />');
  assert.ok(offers > 0 && testimonials > offers);
  assert.doesNotMatch(home, /introVideoContent|HomeIntroVideoSection|<SiteVideoPlayer/);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.match(source("components", "services-solutions.tsx"), /isHome \? allOffers\.filter\(\(offer\) => offer\.id !== "business"\) : allOffers/);
});

test("Services keeps free and paid photo offers after the hero and explicit consultation selector", () => {
  const offers = source("data", "core-service-offers.ts");
  const ui = source("components", "services-studio-offers.tsx");
  const assertLayout = page => {
    const order = ["<ServicesConversionHero", "<PublicConsultationCta", "<ServicesStudioOffers", "<ServicesIntroMedia", "<PersonalTestimonials", "<ServicesDirectoryInvitation"];
    let previous = -1;
    for (const marker of order) { const index = page.indexOf(marker); assert.ok(index > previous, marker); previous = index; }
    assert.match(page, /<ServicesExplorerProvider>/);
    assert.match(page, /id="consultation" serviceBooking/);
    assert.doesNotMatch(page, /<FreeInsightsPaths|<ServicesSolutions|<ServicesTestsIntro/);
  };
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = source(path);
    assertLayout(page);
    assert.throws(() => assertLayout(page.replace("<ServicesStudioOffers", "<RetiredOffers")));
    assert.throws(() => assertLayout(page.replace('id="consultation"', 'id="missing"')));
  }
  for (const id of ["situation", "dao", "alchemy", "hypnotherapy"])
    assert.ok(offers.includes('id: "' + id + '"'), id);
  for (const route of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(ui, /href: "\/" \+ locale \+ "\/tests"/);
  assert.match(ui, /id="free-insights"/);
  assert.match(ui, /price: "€50 \/ 30 min · €100 \/ 60 min"/);
  assert.match(ui, /data-services-studio-free/);
  assert.match(ui, /data-services-studio-paid/);
});

test("three service directions link to real pages, not implied stages", () => {
  const component = source("components", "personal-work-journey.tsx");
  for (const phrase of [
    "Гомеопатия", "Образная терапия", "Расстановки",
    "Homeopathy", "Guided imagery therapy", "Constellations",
    "psychohomeopathy", "imagery-therapy", "systemic-constellations",
    "free-situation-review", "Три направления работы", "three different services",
  ]) assert.ok(component.includes(phrase), "missing text: " + phrase);
  assert.match(component, /text\.services\.map/);
  assert.match(component, /<article className=\{styles\.service\}/);
  assert.match(component, /<Link className=\{styles\.serviceLink\}/);
  assert.doesNotMatch(component, /<ol\b/);
  assert.doesNotMatch(component, /LOCAL_ACQUISITION|selfCheck|self_check_start/);
  assert.doesNotMatch(component, /вылечит|снимает симптомы|cures|guarantees faster|guaranteed results/i);
});

function assertPrivateIntake(intake) {
  assert.match(intake, /setTopic\(coachingIntakeEntryTopic\(window\.location\.search\)\)/);
  assert.match(intake, /href=\{"\/" \+ locale \+ "\/coaching\/intake\?topic=" \+ topic\}/);
  assert.match(intake, /Sign in to save an encrypted private draft/);
  assert.match(intake, /Saving does not send it to a coach or create a booking/);
  assert.match(intake, /This is not a free live call/);
  assert.match(intake, /Keep the photo on your device/);
  assert.match(intake, /Do not send private answers, drawings or test results through WhatsApp, Telegram or email/);
  assert.doesNotMatch(intake, /navigator\.clipboard|ContactChannelChooser|whatsappEnquiryUrl|localStorage|sessionStorage|sendBeacon|fetch\(|XMLHttpRequest/);
}

test("free review and imagery therapy have real EN/RU/ES routes and private, non-automatic preparation", () => {
  const free = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  const imagery = source("app", "[locale]", "services", "imagery-therapy", "page.tsx");
  const form = source("components", "free-situation-review-form.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const consultation = source("components", "personal-consultation-form.tsx");
  assert.match(free, /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(free.includes('{ locale: "' + locale + '" }'), locale);
    assert.ok(free.includes('/' + locale + '/services/free-situation-review'), locale);
    assert.ok(imagery.includes('{ locale: "' + locale + '" }'), locale);
    assert.ok(imagery.includes('/' + locale + '/services/imagery-therapy'), locale);
  }
  assert.match(free, /generateMetadata/);
  assert.match(free, /if \(!isPublicLocale\(locale\)\) notFound\(\)/);
  for (const phrase of ["PersonalServiceLanding", "imagery-therapy", "service={service}"]) assert.ok(imagery.includes(phrase), phrase);
  assert.match(consultation, /service\?: string/);
  assert.match(consultation, /service \? "service" : "personal"/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assertPrivateIntake(intake);
  for (const [before, after] of [
    ['coachingIntakeEntryTopic(window.location.search)', 'window.location.search'],
    ['/coaching/intake?topic=', '/services/book?topic='],
    ['Saving does not send it to a coach or create a booking', 'Saving creates a booking'],
  ]) assert.throws(() => assertPrivateIntake(intake.replace(before, after)), undefined, before);
  assert.throws(() => assertPrivateIntake(intake + '\nnavigator.clipboard.writeText(answers)'));
});

test("service links remain tappable, mobile-safe and keyboard accessible", () => {
  const css = source("components", "personal-work-journey.module.css");
  const detailCss = source("app", "[locale]", "services", "offerings.module.css");
  assert.match(css, /min-height:44px/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(detailCss, /@media\(max-width:800px\)/);
  assert.match(detailCss, /grid-template-columns:1fr/);
});

test("Services hero separates free discovery from optional paid support and confirms terms before booking", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  const css = source("components", "services-conversion-hero.module.css");
  const approved = {
    en: ["Personal guidance for relationships, work and life decisions", "Ask about a personal session · from €50", "Session times and conditions are confirmed before booking or payment."],
    ru: ["Личная работа с вашим вопросом: отношения, работа и решения", "Запросить личную сессию · от €50", "Время встречи и условия подтверждаются до записи и оплаты."],
    es: ["Acompañamiento personal para relaciones, trabajo y decisiones", "Solicitar sesión personal · desde €50", "La hora y las condiciones se confirman antes de reservar o pagar."],
  };
  const assertHero = input => {
    for (const [locale, values] of Object.entries(approved)) {
      const block = input.match(new RegExp("\\b" + locale + ": \\{([\\s\\S]*?)\\n  \\}"))?.[1];
      assert.ok(block, locale);
      for (const value of values) assert.ok(block.includes(JSON.stringify(value)), locale + ": " + value);
    }
    assert.match(input, /href="#free-insights" data-service-hero-cta="free" onClick=\{\(\) => \{ setMode\("online"\); setTopic\("free"\); \}\}/);
    assert.match(input, /href="#consultation" data-service-hero-cta="paid">\s*\{t\.paidCta\}/);
    assert.match(input, /<p className=\{styles\.reassurance\}>\{t\.reassurance\}<\/p>/);
    assert.match(input, /slide\.kind !== "free" \? \(\s*<button[^>]*data-services-slide-request/);
    assert.match(input, /aria-pressed=\{topic === kind\}/);
    assert.match(input, /role="status" aria-live="polite"/);
    assert.match(input, /onFocusCapture=\{\(\) => setPaused\(true\)\}/);
    assert.match(input, /paused \|\| manual \|\| requestOpen \|\| window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
    assert.doesNotMatch(input, /coaching form|ME, GOAL|Draw by hand on paper/);
  };
  assertHero(hero);
  for (const [before, after] of [
    ['href="#free-insights"', 'href="#consultation"'],
    ['href="#consultation"', 'href="#free-insights"'],
    ['setTopic("free")', 'setTopic("business")'],
    ['{t.reassurance}</p>', '</p>'],
    ['from €50', 'free'],
    ['Session times and conditions are confirmed before booking or payment.', 'Your booking is automatically confirmed.'],
    ['aria-pressed={topic === kind}', 'aria-pressed={false}'],
  ]) { assert.ok(hero.includes(before), before); assert.throws(() => assertHero(hero.replace(before, after)), undefined, before); }
  assert.match(css, /\.hero :is\(button,a\):focus-visible\s*\{[^}]*outline:3px solid/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion/);
});

test("wellbeing preselection reaches private intake with only an allowlisted public topic", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const shared = source("components", "free-entry-landing.tsx");
  assert.match(journey, /free-situation-review\?topic=wellbeing/);
  assertPrivateIntake(intake);
  assert.match(shared, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.equal(coachingIntakeEntryTopic('?topic=wellbeing&email=synthetic%40example.invalid&answers=private'), 'wellbeing');
  for (const { id } of COACHING_TOPICS) assert.equal(coachingIntakeEntryTopic('?topic=' + id), id);
  for (const query of ['', '?topic=private%20answer', '?topic=https://example.invalid', '?topic=__proto__', '?topic=synthetic%40example.invalid', '?topic=%2B14165550123']) {
    assert.equal(coachingIntakeEntryTopic(query), 'personal', query);
  }
});
