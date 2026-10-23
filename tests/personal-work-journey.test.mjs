import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

function assertDeferredHome(home, disclosure) {
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/);
  assert.doesNotMatch(home, /<ServicesSolutions/);
  assert.match(disclosure, /import\("\.\/services-solutions"\)\.then\(mod => mod\.ServicesSolutions\)/);
  assert.match(disclosure, /onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
  assert.match(disclosure, /\{expanded \? \(locale === "es"/);
  assert.match(disclosure, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
}

test("home defers the existing four photo offers until the native disclosure opens", () => {
  const home = source("components", "holistic-house-home.tsx");
  const disclosure = source("components", "home-more-disclosure.tsx");
  assertDeferredHome(home, disclosure);
  for (const [before, after] of [['mod.ServicesSolutions', 'mod.Missing'], ['setExpanded(event.currentTarget.open)', 'setExpanded(false)'], ['variant="home"', 'variant="services"']]) {
    assert.ok(disclosure.includes(before));
    assert.throws(() => assertDeferredHome(home, disclosure.replace(before, after)));
  }
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.match(source("components", "services-solutions.tsx"), /isHome \? allOffers\.filter\(\(offer\) => offer\.id !== "business"\) : allOffers/);
});

function assertServicesOrder(page) {
  const markers = ['<ServicesConversionHero', '<ServicesStudioOffers', '<ServicesIntroMedia', '<PersonalTestimonials', '<ServicesMethodVideos', '<PublicConsultationCta', '<ServicesDirectoryInvitation'];
  let previous = -1;
  for (const marker of markers) {
    const index = page.indexOf(marker);
    assert.ok(index > previous, marker + ' must exist in the intended order');
    previous = index;
  }
  assert.match(page, /id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/);
  assert.doesNotMatch(page, /<ServicesSmartDiscovery|<ServiceCart|<FreeInsightsPaths/);
}

test("Services presents studio offers before media, testimonials and gated personal booking", () => {
  const page = source("app", "[locale]", "services", "page.tsx");
  assertServicesOrder(page);
  for (const marker of ['<ServicesStudioOffers', '<PersonalTestimonials', 'serviceBooking', 'wiseEnabled={wisePaymentsEnabled()}', 'paypalPersonalEnabled={personalPayPalEnabled()}']) {
    assert.ok(page.includes(marker));
    assert.throws(() => assertServicesOrder(page.replace(marker, '')));
  }
  const reordered = page.replace('<ServicesStudioOffers', '<TEMP').replace('<PersonalTestimonials', '<ServicesStudioOffers').replace('<TEMP', '<PersonalTestimonials');
  assert.throws(() => assertServicesOrder(reordered));
  const offers = source("data", "core-service-offers.ts");
  for (const route of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
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
  for (const phrase of ["Бесплатный письменный разбор ситуации", "Free Situation Review — personal written reflection", "Revisión escrita gratuita de tu situación", "FreeEntryLanding", "generateStaticParams", "generateMetadata", 'kind="situation"']) {
    assert.ok(free.includes(phrase), phrase);
  }
  const landing = source("components", "free-entry-landing.tsx");
  assert.match(landing, /kind === "situation" \? \(\s*<details className=\{styles.fullQuestionnaire\} data-optional-written-review>[\s\S]*?<FreeSituationReviewForm locale=\{locale\} \/>/);
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

const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
function renderHero(input, locale) {
  const changes = [];
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect() {}, useState: value => [value, () => {}] },
    'next/image': { default: props => jsx('img', props) },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': Object.fromEntries(['ArrowRight', 'ChevronLeft', 'ChevronRight', 'MapPin', 'MonitorPlay'].map(key => [key, () => null])),
    '@/components/static-portrait': { StaticPortrait: () => null },
    '@/components/services-hero-quick-request': { ServicesHeroQuickRequest: () => null },
    '@/components/services-explorer-state': {
      matchingServicesCount: () => 1,
      serviceTopics: ['all', 'personal', 'relationships', 'business', 'reiki', 'free'],
      useServicesExplorer: () => ({mode: 'online', topic: 'all', setMode: value => changes.push(['mode', value]), setTopic: value => changes.push(['topic', value])}),
    },
    './services-conversion-hero.module.css': { default: new Proxy({}, { get: (_, key) => key }) },
  };
  const exports = {};
  const compiled = ts.transpileModule(input, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS}}).outputText;
  runInNewContext(compiled, {exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; }});
  return { tree: exports.ServicesConversionHero({locale}), changes };
}
function assertHeroContract(input) {
  const copy = {
    en: ['Start free · 3 options', 'Ask about a personal session · from €50', 'Session times and conditions are confirmed before booking or payment.'],
    ru: ['Три бесплатных варианта', 'Запросить личную сессию · от €50', 'Время встречи и условия подтверждаются до записи и оплаты.'],
    es: ['Tres opciones gratuitas', 'Solicitar sesión personal · desde €50', 'La hora y las condiciones se confirman antes de reservar o pagar.'],
  };
  for (const [locale, [freeLabel, paidLabel, reassurance]] of Object.entries(copy)) {
    const {tree, changes} = renderHero(input, locale);
    const all = nodes(tree);
    const actions = all.filter(node => node.props['data-service-hero-cta']);
    assert.deepEqual(actions.map(node => [node.type, node.props['data-service-hero-cta'], node.props.href, node.props.children[0]]), [
      ['a', 'free', '#free-insights', freeLabel], ['a', 'paid', '#consultation', paidLabel],
    ]);
    actions[0].props.onClick();
    assert.deepEqual(changes, [['mode', 'online'], ['topic', 'free']]);
    assert.equal(all.filter(node => node.type === 'p' && node.props.className === 'reassurance' && node.props.children === reassurance).length, 1);
  }
}
test("Services hero keeps three free options distinct from paid enquiry and prior agreement", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  assertHeroContract(hero);
  for (const [before, after] of [
    ['href="#consultation"', 'href="#free-insights"'], ['href="#free-insights"', 'href="#consultation"'],
    ['{t.freeCta}', '{t.paidCta}'], ['{t.paidCta}', '{t.freeCta}'],
    ['{t.reassurance}', '"Booked automatically"'],
    ['Session times and conditions are confirmed before booking or payment.', 'Booking confirmed.'],
    ['setMode("online"); setTopic("free");', 'setMode("toronto"); setTopic("all");'],
  ]) {
    assert.ok(hero.includes(before), before);
    assert.throws(() => assertHeroContract(hero.replace(before, after)), undefined, before);
  }
  const css = source("components", "services-conversion-hero.module.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test("wellbeing preselection enters an actual free drawing intake, never a phantom live session", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const freePage = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  assert.match(journey, /free-situation-review\?topic=wellbeing/);
  assert.ok(intake.includes('new URLSearchParams(window.location.search).get("topic")'));
  assert.ok(intake.includes('setTopic(requested as Topic)'));
  assert.ok(intake.includes('"wellbeing"'));
  assert.match(freePage, /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  const landing = source("components", "free-entry-landing.tsx");
  const detailed = landing.indexOf('data-optional-written-review');
  const compact = landing.indexOf('<CompactLeadCapture');
  assert.ok(detailed > 0 && compact > detailed);
  assert.match(landing.slice(detailed, compact), /<FreeSituationReviewForm locale=\{locale\} \/>/);
});

