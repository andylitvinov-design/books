import { homeFixture, assertDeferredHome, elements, links, nodes, textOf } from './helpers/home-source-render-fixture.mjs';
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all homepage locales preserve personal-session priority and distinct free choices", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const source of [enRu, es]) {
    assert.match(source, /service-home-button--primary/);
    assert.match(source, /service-home-button--secondary/);
    assert.match(source, /free-written-review/);
    assert.match(source, /free-tests/);
    assert.match(source, /paid-sessions/);
    assert.ok(source.indexOf("service-home-button--primary") < source.indexOf("service-home-button--secondary"));
    assert.doesNotMatch(source, /HomeFreePaths/);
  }
  assert.match(enRu, /Stuck in relationships, work or an important decision\?/);
  assert.match(enRu, /Сложности в отношениях, работе или важном решении\?/);
  assert.match(es, /¿Dudas en tus relaciones, tu trabajo o una decisión importante\?/);
});

test("photo-led service cards replace the duplicated free text cards on all homepage locales", async () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const cards = read("components/services-solutions.tsx");
  const offers = read("data/core-service-offers.ts");
  const navigation = read("components/site-navigation.tsx");
  for (const source of [home, es]) {
    assert.doesNotMatch(source, /HomeFreePaths|FreeInsightsPaths/);
    assert.match(source, /service-home-hero/);
  }
  const more = read("components/home-more-disclosure.tsx");
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/);
  assert.match(more, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(cards, /id=\{isHome \? "free-start" : undefined\}/);
  assert.match(cards, /homepageMedia\[offer\.id\]/);
  assert.match(cards, /data-core-service-id=\{offer\.id\}/);
  for (const slug of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"]) {
    assert.ok(offers.includes(slug), slug);
  }
  const serviceCardsAt = more.indexOf('<ServicesSolutions locale={locale} variant="home" />');
  assert.ok(serviceCardsAt >= 0, "Expanded photo services remain in the deferred catalog");
  assert.ok(home.indexOf('<HomepageTopicJourneys locale={locale} />') < home.indexOf('<HomeMoreDisclosure locale={locale}>'),
    "Three needs-first photo directions appear outside the deferred catalogue");
  assert.ok(es.indexOf('<HomepageTopicJourneys locale="es" />') < es.indexOf('<HomeMoreDisclosure locale="es">'),
    "Spanish homepage mirrors the same three direction cards");
  assert.doesNotMatch(more, /<HomepageTopicJourneys locale=/);
  assert.doesNotMatch(home, /HomeFreeTestsBanner/);
  assert.match(es, /className="service-home-actions" id="free-start"/);
  assert.ok(es.indexOf('className="service-home-services"') < es.indexOf('</HomeMoreDisclosure>'));
  assert.match(more, /<HomeExploreSections locale="es" \/>/);
  assert.match(navigation, /services\/free-situation-review/);
  for (const locale of ["en", "ru", "es"]) {
    await assertDeferredHome(homeFixture({ locale }), locale);
    const nav = await homeFixture({ locale }).renderNavigation();
    const entry = links(nav).find(node => node.props.className === "site-nav-free-entry");
    assert.equal(entry?.props.href, `/${locale}/services/free-situation-review`);
    assert.ok(textOf(entry).length > 4);
  }
  assert.match(home, /not a live call/);
  assert.match(es, /no una llamada/);
});

test("main menu prioritizes Energy Love Business and retains full legacy catalogues", async () => {
  const nav = read("components/site-navigation.tsx");
  assert.match(nav, /site-nav-free-entry/);
  assert.match(nav, /getCompactNavigation\(activeLocale\)/);
  assert.match(nav, /\['energy', 'love', 'business'\]/);
  assert.match(nav, /id: 'services'/);
  assert.match(nav, /site-nav-about-entry/);
  assert.match(nav, /site-main-menu-more/);
  assert.match(nav, /mainMenuItems\.map/);
  for (const locale of ["en", "ru", "es"]) {
    const rendered = await homeFixture({ locale }).renderNavigation();
    const menu = elements(rendered, "details").find(node => node.props.className === "site-main-menu");
    assert.ok(menu);
    assert.ok(textOf(elements(menu, "summary")[0]).includes({ en: "Menu", ru: "Меню", es: "Menú" }[locale]));
    for (const id of ["energy", "love", "business"]) {
      const entry = links(rendered).find(node => node.props["data-nav-item"] === id);
      assert.equal(entry?.props.href, `/${locale}/explore/${id}`);
      assert.ok(nodes(rendered).indexOf(entry) < nodes(rendered).indexOf(menu), id + " is a primary entry");
    }
    const compact = elements(menu, "div").find(node => node.props.className === "site-main-menu-grid");
    assert.deepEqual(links(compact).map(node => node.props["data-nav-item"]), ["home", "energy", "love", "business", "tests", "books"]);
    for (const [id, route] of Object.entries({ energy: "explore/energy", love: "explore/love", business: "explore/business", tests: "client/tests", books: "books", services: "services", library: "library", events: "events", courses: "academy" })) {
      const entry = links(menu).find(node => node.props["data-nav-item"] === id);
      assert.equal(entry?.props.href, `/${locale}/${route}`, id);
      assert.ok(textOf(entry).length > 0, id);
    }
    // Owner-merged #1628 consolidates Academy into one public Courses entry.
    const courseEntries = links(menu).filter(node => node.props["data-nav-item"] === "courses");
    assert.equal(courseEntries.length, 1);
    assert.equal(textOf(courseEntries[0]), { en: "Courses", ru: "Курсы", es: "Cursos" }[locale]);
    assert.equal(links(menu).filter(node => node.props.href === `/${locale}/academy`).length, 1);
    assert.equal(links(menu).filter(node => node.props["data-nav-item"] === "academy").length, 0);
    assert.ok(links(menu).some(node => node.props["data-nav-item"] === "home" && node.props.href === (locale === "en" ? "/" : `/${locale}`)));
  }
});

test("primary home CTA has stronger contrast and mobile introduction stays readable", () => {
  const css = read("app/holistic-house-home.css");
  assert.match(css, /\.service-home-button--primary \{ background: #742c42/);
  assert.match(css, /\.service-home-intro \{ max-width: 76%; font-size: 16px/);
});
