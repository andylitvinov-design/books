import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home presents four photo-left offer cards before videos", () => {
  const home = source("components", "holistic-house-home.tsx");
  const cards = home.indexOf('<ServicesSolutions locale={locale} variant="home" />');
  const video = home.indexOf("{introVideoContent}");
  assert.ok(cards > 0 && video > cards);
  assert.match(source("components", "home-intro-video-section.tsx"), /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.match(source("components", "services-solutions.tsx"), /isHome \? allOffers\.filter\(\(offer\) => offer\.id !== "business"\) : allOffers/);
});

test("Services leads with five compact photo offers and enquiry, retaining optional free tests", () => {
  const page = source("app", "[locale]", "services", "page.tsx");
  const offers = source("data", "core-service-offers.ts");
  const ui = source("components", "services-solutions.tsx");
  const hero = source("components", "services-conversion-hero.tsx");
  const choiceIndex = page.indexOf("<ServicesSolutions");
  const testimonials = page.indexOf("<PersonalTestimonials");
  const extra = page.indexOf('id="available-services"');
  assert.ok(choiceIndex > 0 && testimonials > choiceIndex && extra > testimonials);
  assert.match(ui, /allOffers\.filter/);
  assert.match(page, /<ServicesTestsIntro locale=\{locale as Locale\} \/>/);
  assert.doesNotMatch(page, /<FreeInsightsPaths/);
  assert.match(page, /<ServicesConversionHero locale=\{locale as Locale\} \/>/);
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<ServicesTestsIntro"));
  for(const id of ["situation","dao","alchemy","hypnotherapy"])
    assert.ok(offers.includes('id: "' + id + '"'), id);
  for(const route of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(hero, /Get a free written review/);
  assert.doesNotMatch(hero, /Draw by hand on paper|€100/);
  const editorialStart = page.indexOf("const editorialOffers =");
  const renderStart = page.indexOf("  return (");
  assert.ok(editorialStart > 0 && renderStart > editorialStart, "Separate editorial offer data from the rendered Services layout");
  assert.match(page.slice(editorialStart, renderStart), /€50 \/ 30 min · €100 \/ 60 min/);
  assert.doesNotMatch(page.slice(renderStart), /€50|€100/, "Editorial prices remain in metadata; paid card prices are rendered in ServicesSolutions");
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

test("free review and imagery therapy have real EN/RU/ES pages and honest contact journeys", () => {
  const free = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  const imagery = source("app", "[locale]", "services", "imagery-therapy", "page.tsx");
  const form = source("components", "free-situation-review-form.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const consultation = source("components", "personal-consultation-form.tsx");
  for (const phrase of ["Бесплатная диагностика ситуации", "Free Situation Review & Personal Consultation",
    "FreeSituationReviewForm", "getHomeopathyLocaleParams", "generateMetadata", "topic.cards.map", "deeper.title"]) {
    assert.ok(free.includes(phrase), phrase);
  }
  for (const phrase of ["PersonalServiceLanding", "imagery-therapy", "service={service}"]) assert.ok(imagery.includes(phrase), phrase);
  assert.match(consultation, /service\?: string/);
  assert.match(consultation, /service \? "service" : "personal"/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assert.match(intake, /new URLSearchParams\(window\.location\.search\)\.get\("topic"\)/);
  assert.match(intake, /setTopic\(requested as Topic\)/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /const whatsappUrl = whatsappEnquiryUrl\(\{/);
  assert.match(intake, /request: t\.whatsappIntro/);
  assert.match(intake, /<ContactChannelChooser[\s\S]*?whatsappUrl=\{whatsappUrl\}/);
  assert.match(intake, /onChannelClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.match(intake, /Nothing is sent automatically/);
  assert.doesNotMatch(form + intake, /localStorage|sessionStorage|sendBeacon|fetch\(/);
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

test("Services hero separates paid enquiry from free written review without diagnostic steps", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  const css = source("components", "services-conversion-hero.module.css");
  // Owner #996 (f3b6edefc) deliberately rewrote headings and paid enquiry labels.
  // Keep the free written path, optional paid support and prior agreement explicit.
  const approvedCopy = {
    ru: {
      heading: "Личная работа с вашим вопросом: отношения, работа и решения",
      lead: "Начните с бесплатного письменного разбора ситуации, тестов самонаблюдения или символического профиля У-Син. Если нужна личная работа, обсудим индивидуальную сессию с Андреем — от €50 за 30 минут.",
      paidCta: "Запросить личную сессию · от €50",
      small: "Бесплатный разбор — по анкете и рисунку, не видеозвонок. Личная запись и оплата только после согласования.",
    },
    en: {
      heading: "Personal guidance for relationships, work and life decisions",
      lead: "Begin with a free written situation review, wellbeing self-checks or a symbolic Wu Xing profile. For personal support, explore a one-to-one session with Andrey — starting at €50 for 30 minutes.",
      paidCta: "Ask about a personal session · from €50",
      small: "Free review means form and drawing → written feedback, not a live call. Session time and payment are agreed separately.",
    },
    es: {
      heading: "Acompañamiento personal para relaciones, trabajo y decisiones",
      lead: "Empieza con una revisión escrita gratuita, cuestionarios de autoobservación o un perfil simbólico Wu Xing. Si prefieres atención personal, explora sesiones con Andrey desde €50 por 30 minutos.",
      paidCta: "Solicitar sesión personal · desde €50",
      small: "La revisión gratuita incluye formulario y dibujo → respuesta escrita, no una llamada. Las sesiones se acuerdan por separado.",
    },
  };
  const assertHeroContract = input => {
    for (const [locale, fields] of Object.entries(approvedCopy)) {
      const block = input.match(new RegExp("\\b" + locale + ": \\{([\\s\\S]*?)\\n  \\}"))?.[1];
      assert.ok(block, locale + " copy block");
      for (const [field, value] of Object.entries(fields)) {
        assert.ok(block.includes(field + ": " + JSON.stringify(value)), locale + "." + field);
      }
    }
    assert.match(input, /<Link className=\{styles\.cta\} href="#consultation" data-service-hero-cta="paid">\s*\{t\.paidCta\}/);
    assert.match(input, /<Link className=\{styles\.paidLink\} href=\{"\/" \+ locale \+ "\/services\/free-situation-review"\} data-service-hero-cta="free-written-review">\s*\{t\.cta\}/);
    assert.ok(input.indexOf('data-service-hero-cta="paid"') < input.indexOf('data-service-hero-cta="free-written-review"'));
    assert.match(input, /See all three free options/);
    assert.match(input, /href="#free-insights"/);
    assert.match(input, /<p className=\{styles\.small\}>\{t\.small\}<\/p>/);
    assert.doesNotMatch(input, /coaching form|ME, GOAL|Draw by hand on paper/);
  };
  assertHeroContract(hero);
  for (const [before, after] of [
    ["/services/free-situation-review", "/services/alchemy-of-soul"],
    ['href="#consultation"', 'href="/en/services/free-situation-review"'],
    ["{t.paidCta}", "{t.cta}"],
    ["{t.cta}", "{t.paidCta}"],
    ["Session time and payment are agreed separately.", "Session time is automatically confirmed."],
    ["Личная запись и оплата только после согласования.", "Запись подтверждается автоматически."],
    ["Las sesiones se acuerdan por separado.", "La sesión se confirma automáticamente."],
    ["{t.small}", ""],
    ['href="#free-insights"', 'href="#solutions"'],
  ]) {
    assert.ok(hero.includes(before), before);
    assert.throws(() => assertHeroContract(hero.replace(before, after)), undefined, before);
  }
  assert.match(css, /\.paidLink:focus-visible/);
  assert.match(css, /\.actions \.paidLink\{[\s\S]*?min-height:44px/);
  assert.doesNotMatch(hero, /coaching form|ME, GOAL|Draw by hand on paper/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /min-height:60px/);
});

test("wellbeing preselection enters an actual free drawing intake, never a phantom live session", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const freePage = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  assert.match(journey, /free-situation-review\?topic=wellbeing/);
  assert.ok(intake.includes('new URLSearchParams(window.location.search).get("topic")'));
  assert.ok(intake.includes('setTopic(requested as Topic)'));
  assert.ok(intake.includes('"wellbeing"'));
  assert.ok(freePage.indexOf("className={styles.contentGrid}") < freePage.indexOf("className={styles.details}"));
});
