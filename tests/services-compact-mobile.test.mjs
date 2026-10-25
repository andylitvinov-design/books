import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {assertCurrentFreeEntry} from "./helpers/current-free-entry-contract.mjs";
import {assertCurrentHomeDiscovery,currentHomeSource} from "./helpers/current-home-discovery-contract.mjs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const serviceConsultation = '<PublicConsultationCta locale={locale as Locale} id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />';
const originalFreeBadge = '<span className={styles.freeBadge}>{locale === "ru" ? "БЕСПЛАТНО" : locale === "es" ? "GRATIS" : "FREE"}</span>';

test("Services landing has free-first cards and preserves original personal paths", () => {
  const page = read("app/[locale]/services/page.tsx");
  const ui = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  const offers = read("data/core-service-offers.ts");
  const hero = read("components/services-conversion-hero.tsx");
  assert.match(page, /<ServicesStudioOffers locale=/);
  assert.match(page, /<ServicesConversionHero locale=/);
  assert.match(page, /<ServicesIntroMedia locale=/);
  assert.match(page, /<PersonalTestimonials locale=/);
  assert.match(page, /<PublicConsultationCta locale=/);
  assert.match(page, /<ServicesDirectoryInvitation locale=/);
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<ServicesStudioOffers"));
  assert.ok(page.indexOf("<ServicesStudioOffers") < page.indexOf("<ServicesIntroMedia"));
  assert.ok(page.indexOf("<ServicesIntroMedia") < page.indexOf("<PersonalTestimonials"));
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<PublicConsultationCta"));
  assert.ok(page.indexOf("<PublicConsultationCta") < page.indexOf("<ServicesStudioOffers"));
  assert.doesNotMatch(page, /<ServicesSmartDiscovery|<ServiceCart|<FreeInsightsPaths/);
  for (const id of ["tests", "situation", "dao", "alchemy", "hypnotherapy", "business", "constellations", "remote-energy-support"])
    assert.ok(ui.includes('id: "' + id + '"') || ui.includes('session("' + id + '")'), id);
  for (const route of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(ui, /href: "\/" \+ locale \+ "\/tests"/);
  assert.match(ui, /ContactChannelChooser/);
  assert.match(ui, /<details className=\{styles.details\}>/);
  assert.match(ui, /data-services-studio-free/);
  assert.match(ui, /data-services-studio-paid/);
  assert.match(hero, /paidCta: "Ask about a personal session · from €50"/);
  assert.match(hero, /href="#free-insights" data-service-hero-cta="free"/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /min-height:44px/);
  assertBusinessPriceScope(offers);
});

test("homepage mounts current topic and offer discovery while preserving original services, tests and Academy", async (t) => {
  for (const locale of ["en", "ru", "es"]) await assertCurrentHomeDiscovery({locale});
  // PR1786 removes duplicate home grids; PR1816 puts topics before the actual
  // featured workspace. Keep discoverability/offer truth, not retired markup.
  for (const [name,path,before,after,reason,locale = "en"] of [
    ["retired duplicate grid","components/holistic-house-home.tsx",'<HomeFeaturedWorkspace locale={locale} />','<HomeFeaturedWorkspace locale={locale} /><article data-core-service-id="situation" />',/retired duplicate service-card grid/],
    ["missing featured mount","components/holistic-house-home.tsx",'<HomeFeaturedWorkspace locale={locale} />','<div />',/one visible featured workspace/],
    ["missing Spanish topic mount","app/es/page.tsx",'<HomeMoreDisclosure locale="es" />','<div />',/one visible topic navigation/,"es"],
    ["wrong topic ordering","components/holistic-house-home.tsx",'<HomeMoreDisclosure locale={locale} />\n      <HomeFeaturedWorkspace locale={locale} />','<HomeFeaturedWorkspace locale={locale} />\n      <HomeMoreDisclosure locale={locale} />',/Topic navigation follows carousel/],
    ["hidden topic navigation","components/home-more-disclosure.tsx",'<section className={styles.root} data-home-topic-filters','<section hidden className={styles.root} data-home-topic-filters',/one visible topic navigation/],
    ["aria-hidden topic ancestor","components/holistic-house-home.tsx",'<HomeMoreDisclosure locale={locale} />','<div aria-hidden="true"><HomeMoreDisclosure locale={locale} /></div>',/one visible topic navigation/],
    ["display-none topic nav","components/home-more-disclosure.tsx",'<nav className={styles.filters}','<nav style={{display:"none"}} className={styles.filters}',/One visible energy topic/],
    ["visibility-hidden catalogue link","components/home-more-disclosure.tsx",'data-home-topic-filter="services"','style={{visibility:"hidden"}} data-home-topic-filter="services"',/One visible services topic/],
    ["hidden offer ancestor","components/holistic-house-home.tsx",'<HomeFeaturedWorkspace locale={locale} />','<div hidden><HomeFeaturedWorkspace locale={locale} /></div>',/one visible featured workspace/],
    ["aria-hidden offer ancestor","components/holistic-house-home.tsx",'<HomeFeaturedWorkspace locale={locale} />','<div aria-hidden="true"><HomeFeaturedWorkspace locale={locale} /></div>',/one visible featured workspace/],
    ["display-none featured action","components/home-featured-workspace.tsx",'data-home-module-action={offer.id} data-home-offer-primary={offer.id}','style={{display:"none"}} data-home-module-action={offer.id} data-home-offer-primary={offer.id}',/Visible primary action for reiki/],
    ["visibility-hidden original offer link","components/services-studio-offers.tsx",'<h3><Link href={offer.href} prefetch={false}>','<h3><Link style={{visibility:"hidden"}} href={offer.href} prefetch={false}>',/Offer title links to its original landing/],
    ["wrong topic label","components/home-more-disclosure.tsx",'"energy": "Energy"','"energy": "Placeholder"',/Topic\/catalogue label identifies energy/],
    ["wrong catalogue label","components/home-more-disclosure.tsx",'"services": "Todos los servicios"','"services": "Placeholder"',/Topic\/catalogue label identifies services/,"es"],
    ["wrong original offer label","data/core-service-offers.ts",'title: "Бесплатный профиль ресурсов У-Син"','title: "Placeholder"',/Original dao offer keeps its identifiable localized title/,"ru"],
    ["wrong services route","components/home-more-disclosure.tsx",'locale + "/services"','locale + "/retired-services"',/Exact localized services destination/],
    ["wrong Academy route","components/home-more-disclosure.tsx",'locale + "/academy"','locale + "/retired-academy"',/Exact localized courses destination/],
    ["wrong topic route","components/home-more-disclosure.tsx",'locale + "/explore/energy"','locale + "/explore/wrong"',/Exact localized energy destination/],
    ["hidden carousel label","components/home-section-carousel.tsx",'{t.nav[key]}','<span hidden>{t.nav[key]}</span>',/Carousel displays the exact localized services navigation label/],
    ["wrong localized carousel label","components/home-section-carousel.tsx",'tests: "Pruebas"','tests: "Placeholder"',/Carousel displays the exact localized tests navigation label/,"es"],
    ["hidden actual featured image","components/home-featured-workspace.tsx",'<Image src={photos[offer.id]}','<Image hidden src={photos[offer.id]}',/render-exposed decorative photograph/],
    ["hidden featured photo ancestor","components/home-featured-workspace.tsx",'<span className={styles.photo} aria-hidden="true">','<span hidden className={styles.photo} aria-hidden="true">',/render-exposed decorative photograph/],
    ["display-none featured photo ancestor","components/home-featured-workspace.tsx",'<span className={styles.photo} aria-hidden="true">','<span style={{display:"none"}} className={styles.photo} aria-hidden="true">',/render-exposed decorative photograph/],
    ["wrong tests navigation","components/home-section-carousel.tsx",'href: "/client/tests"','href: "/client/wrong"',/Carousel keeps exact tests destination/],
    ["inert tests selector","components/home-section-carousel.tsx",'setIndex(position)','setIndex(0)',/Selecting the real tests dot shows its CTA/],
    ["free badge on paid service","components/home-featured-workspace.tsx",'"reiki", "opora", "profile", "review", "aiCoaching",','"reiki", "opora", "profile", "review", "aiCoaching", "therapist",',/Only the explicitly no-cost offers/],
    ["missing free profile badge","components/home-featured-workspace.tsx",'"reiki", "opora", "profile", "review", "aiCoaching",','"reiki", "opora", "review", "aiCoaching",',/Only the explicitly no-cost offers/],
    ["wrong featured service destination","components/home-featured-workspace.tsx",'alchemy: "/" + locale + "/services/alchemy-of-soul"','alchemy: "/" + locale + "/services/wrong"',/Featured offer preserves exact alchemy destination/],
    ["concealed limitations","components/home-featured-workspace.tsx",'{note && <p>{note}</p>}','{note && <details><summary>Details</summary><p>{note}</p></details>}',/preserves written-review and non-medical/],
    ["wrong featured free label","components/home-featured-workspace.tsx",'en: "FREE", ru: "БЕСПЛАТНО"','en: "PAID", ru: "БЕСПЛАТНО"',/Featured no-cost badge keeps exact localized label/],
    ...["en", "ru", "es"].flatMap(locale => [
      ["wrong original free label in " + locale,"components/services-studio-offers.tsx",originalFreeBadge,'<span className={styles.freeBadge}>PAID</span>',/Original no-cost badge keeps exact localized label/,locale],
      ["other-locale original free label in " + locale,"components/services-studio-offers.tsx",originalFreeBadge,'<span className={styles.freeBadge}>' + (locale === "en" ? "GRATIS" : "FREE") + '</span>',/Original no-cost badge keeps exact localized label/,locale],
      ["missing original free badge in " + locale,"components/services-studio-offers.tsx",originalFreeBadge,'null',/Original situation free\/paid scope is honest/,locale],
      ["hidden original free badge in " + locale,"components/services-studio-offers.tsx",originalFreeBadge,originalFreeBadge.replace('<span ', '<span hidden '),/Original situation free\/paid scope is honest/,locale],
      ["original free badge on paid service in " + locale,"components/services-studio-offers.tsx",'{offer.isFree ? ' + originalFreeBadge,'{(offer.isFree || offer.id === "alchemy") ? ' + originalFreeBadge,/Original alchemy free\/paid scope is honest/,locale],
    ]),
    ["missing written-review limitation","components/home-featured-workspace.tsx",'The free express option is a written review, not a live appointment. A request does not confirm booking.','Free live appointment.',/preserves written-review and non-medical/],
    ["missing non-medical limitation","components/home-featured-workspace.tsx",'Self-tests support reflection; they are not medical diagnoses. Private results require sign-in.','Tests diagnose health conditions.',/preserves written-review and non-medical/],
    ["missing original offers composition","app/[locale]/services/page.tsx",'<ServicesStudioOffers locale={locale as Locale} />','<div />',/services route exposes original situation/],
    ["hidden original offer","components/services-studio-offers.tsx",'hidden={!visible(offer.id)}','hidden={true}',/services route exposes original situation/],
    ["wrong original DAO destination","data/core-service-offers.ts",'route: "dao-health-profile"','route: "wrong-dao"',/Original dao destination is preserved/],
    ["missing paid original prices","components/services-studio-offers.tsx",'price: "€50 / 30 min · €100 / 60 min"','price: "Ask us"',/Original paid offer retains prices/],
    ["missing catalogue invitation","app/[locale]/services/page.tsx",'<ServicesDirectoryInvitation locale={locale as Locale} />','<div />',/mounts the catalogue invitation/],
    ["wrong dedicated catalogue","components/services-studio-extras.tsx",'href={"/" + locale + "/services/catalog"}','href={"/" + locale + "/services"}',/reaches the dedicated public catalogue/],
    ["missing paid consultation","app/[locale]/services/page.tsx",serviceConsultation,'<div />',/one visible paid consultation selector/],
    ["hidden paid consultation ancestor","app/[locale]/services/page.tsx",serviceConsultation,'<div hidden>'+serviceConsultation+'</div>',/one visible paid consultation selector/],
    ["aria-hidden paid consultation ancestor","app/[locale]/services/page.tsx",serviceConsultation,'<div aria-hidden="true">'+serviceConsultation+'</div>',/one visible paid consultation selector/],
    ["lost pre-hydration booking selector","app/[locale]/services/page.tsx",'id="consultation" serviceBooking ','id="consultation" serviceBooking={false} ',/one visible paid consultation selector/],
    ["wrong paid consultation target","app/[locale]/services/page.tsx",'id="consultation" serviceBooking','id="wrong-consultation" serviceBooking',/preserves its public anchor target/],
    ["wrong paid consultation locale","app/[locale]/services/page.tsx",'<PublicConsultationCta locale={locale as Locale}','<PublicConsultationCta locale="en"',/preserves the selected locale/,"ru"],
    ["paid consultation moved behind offers","app/[locale]/services/page.tsx",serviceConsultation+'\n        <ServicesStudioOffers locale={locale as Locale} />','<ServicesStudioOffers locale={locale as Locale} />\n        '+serviceConsultation,/locale-specific Services order/],
    ["Spanish paid consultation moved before testimonials","app/es/services/page.tsx",'<PersonalTestimonials locale="es" variant="services" />\n      <ServicesMethodVideos locale="es" />\n      '+serviceConsultation.replace('locale={locale as Locale}','locale="es"'),serviceConsultation.replace('locale={locale as Locale}','locale="es"')+'\n      <PersonalTestimonials locale="es" variant="services" />\n      <ServicesMethodVideos locale="es" />',/locale-specific Services order/,"es"],
    ["hidden actual booking branch","components/public-consultation-cta.tsx",'return <ConsultationCartEntry locale={locale} id={id} />;','return <div style={{display:"none"}}><ConsultationCartEntry locale={locale} id={id} /></div>;',/one visible paid consultation selector/],
  ]) await t.test("rejects " + name, async () => {
    const original = currentHomeSource(path);
    assert.ok(original.includes(before), "Exact mutation target exists: " + name);
    await assert.rejects(assertCurrentHomeDiscovery({locale,overrides:{[path]:original.replace(before,after)}}),
      error => error?.code === "ERR_ASSERTION" && reason.test(error.message), "Mutation fails its intended semantic assertion: " + name);
  });
});

test("new DAO free page is independent of two existing personal service landings and has a genuine multilingual enquiry", () => {
  const dao = read("app/[locale]/services/dao-health-profile/page.tsx");
  const shared = read("components/free-entry-landing.tsx");
  assert.match(dao, /generateMetadata/);
  assert.match(dao, /generateStaticParams/);
  assert.match(dao, /kind="dao"/);
  assert.match(dao, /isPublicLocale/);
  for (const lang of ["en", "ru", "es"]) assert.ok(dao.includes("/" + lang + "/services/dao-health-profile"));
  assert.match(shared, /"request-free-wu-xing"/);
  for (const locale of ["en", "ru", "es"]) assertCurrentFreeEntry({locale});
  for (const [slug, kind] of [["alchemy-of-soul", "alchemy"], ["hypnotherapy-course", "hypnotherapy"]]) {
    const route = read("app/[locale]/services/" + slug + "/page.tsx");
    assert.match(route, /generateMetadata/);
    assert.match(route, /generateStaticParams/);
    for(const lang of ["en", "ru"]) assert.ok(route.includes("/" + lang + "/services/" + slug));
    if (kind === "alchemy") {
      assert.match(route, /<AlchemySoulLanding locale=/);
      assert.match(route, /data-alchemy-extended-guide/);
    } else {
      assert.match(route, /<CoreServiceDetail locale=/);
    }
  }
  const detail = read("components/core-service-detail.tsx");
  assert.match(detail, /reliable evidence/);
  assert.match(read("components/core-service-detail.module.css"), /@media\(max-width:760px\)/);
});

test("free diagnostic reuses private intake, drawing instructions and illustrative scenes", () => {
  const intake = read("components/free-drawing-intake.tsx");
  const landing = read("components/free-entry-landing.tsx");
  const offer = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(intake, /\/coaching\/intake/);
  assert.match(intake, /ME, MY GOAL and MY PROBLEM/);
  assert.match(intake, /Saving does not send it to a coach/);
  assert.match(intake, /Do not send private answers/);
  assert.match(offer, /kind="situation"/);
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\}/);
  assert.match(landing, /"\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /"\/images\/holistic-house\/report-lighthouse-coast\.webp"/);
  assert.doesNotMatch(intake, /navigator\.clipboard|ContactChannelChooser|localStorage|sessionStorage|sendBeacon|fetch\(/);
});

function assertBusinessPriceScope(source) {
  const blocks = [...source.matchAll(/\{\s*id: "business",[\s\S]*?\n    \},/g)].map(match => match[0]);
  assert.equal(blocks.length, 3, "Exactly one Business offer per locale");
  const benefits = ["Free written review · €50 express · €100 strategy session", "Бесплатный разбор · экспресс €50 · стратегия €100", "Revisión gratuita · sesión exprés €50 · estrategia €100"];
  blocks.forEach((block, index) => {
    assert.ok(block.includes('benefit: "' + benefits[index] + '"'));
    assert.match(block, /route: "business-consulting"/);
    assert.match(block, /image: images\.business/);
  });
  assert.doesNotMatch(source.replace(/\{\s*id: "business",[\s\S]*?\n    \},/g, ""), /€50|€100/, "Existing non-Business card copy remains unchanged by Business prices");
}

test("Business card price scope rejects missing prices, wrong destination and price leakage", () => {
  const source = read("data/core-service-offers.ts");
  assertBusinessPriceScope(source);
  for (const [before, after] of [["€50 express", "express"], ['route: "business-consulting"', 'route: "wrong"'], ['id: "situation"', 'id: "situation", injectedPrice: "€50"']]) {
    const mutation = source.replace(before, after);
    assert.notEqual(mutation, source);
    assert.throws(() => assertBusinessPriceScope(mutation));
  }
});

for(const [name,before,after,reason] of [
  ['wrong locale','          locale={locale}\n          id={captureId}','          locale="en"\n          id={captureId}',/selected locale/],
  ['wrong service','serviceTitle={serviceTitles[kind]}','serviceTitle="Another service"',/truthful service identity/],
  ['missing limitations','disclaimer={common.limitations}','disclaimer={undefined}',/actual limitations/],
  ['wrong capture target','id={captureId}','id="other-target"',/service-specific target/],
  ['compulsory long form','<details className={styles.fullQuestionnaire} data-optional-written-review>','<details open className={styles.fullQuestionnaire} data-optional-written-review>',/initially closed/],
]) test('free service composition rejects '+name,()=>{
  const original=read('components/free-entry-landing.tsx');
  assert.ok(original.includes(before),'Mutation target must exist');
  assert.throws(()=>assertCurrentFreeEntry({locale:'ru',source:original.replace(before,after)}),reason);
});
