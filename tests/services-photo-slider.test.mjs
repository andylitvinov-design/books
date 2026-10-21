import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Services has one photo carousel with real local assets and usable navigation", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const styles = read("components/services-conversion-hero.module.css");
  assert.match(hero, /data-services-showcase-hero/);
  assert.match(hero, /aria-roledescription="carousel"/);
  assert.match(hero, /aria-current=\{position === index/);
  assert.match(hero, /onClick=\{\(\) => navigate\(-1\)\}/);
  assert.match(hero, /onClick=\{\(\) => navigate\(1\)\}/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /document.visibilityState === "visible"/);
  assert.match(hero, /onFocusCapture/);
  assert.match(hero, /onTouchStart/);
  assert.match(hero, /data-services-slide-action/);
  for (const path of [
    "images/holistic-house/hero-olive-incense.webp",
    "images/holistic-house/video-posters/constellations-en-v1.webp",
    "images/holistic-house/andy-about.png",
    "images/holistic-house/reiki-approved-sunrise-v3.webp",
    "academy/reiki-yggdrasil/source/eastern-tradition.png",
  ]) assert.ok(existsSync(join(process.cwd(), "public", path)), "Missing slider media: " + path);
  assert.match(hero, /<StaticPortrait/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:365px\)/);
  assert.match(styles, /min-height:44px/);
  assert.match(styles, /:focus-visible/);
});

test("Online/Toronto and service topic filters genuinely control canonical offer cards", () => {
  const state = read("components/services-explorer-state.tsx");
  const offers = read("components/services-studio-offers.tsx");
  const offerStyles = read("components/services-studio-offers.module.css");
  const hero = read("components/services-conversion-hero.tsx");
  for (const topic of ["all", "personal", "relationships", "business", "reiki", "free"]) {
    assert.ok(state.includes('"' + topic + '"'), "Missing category " + topic);
    assert.ok(hero.includes("data-services-kind={kind}"), "Topic buttons missing");
  }
  for (const id of ["tests", "situation", "dao", "alchemy", "hypnotherapy", "constellations", "business", "remote-energy-support"])
    assert.match(state, new RegExp('"?' + id + '"?: \\{ modes:'));
  for (const id of ["tests", "situation", "dao", "remote-energy-support"])
    assert.match(state, new RegExp('"?'+id+'"?: \\{ modes: \\[\\\"online\\\"\\]'));
  assert.match(state, /alchemy: \{ modes: \["online", "toronto"\]/);
  assert.match(hero, /data-services-mode="online"/);
  assert.match(hero, /data-services-mode="toronto"/);
  assert.match(hero, /aria-pressed=\{mode === "toronto"\}/);
  assert.match(hero, /matchingServicesCount\(mode, topic\)/);
  assert.match(hero, /data-services-empty/);
  assert.match(offers, /serviceIsVisible\(id, mode, topic\)/);
  assert.match(offers, /hidden=\{!visible\(offer.id\)\}/);
  assert.match(offers, /hidden=\{!freeAvailable\}/);
  assert.match(offers, /hidden=\{!paidAvailable\}/);
  assert.match(offerStyles, /\.card\[hidden\]\{display:none!important\}/);
  assert.match(offers, /data-services-studio-action/);
  assert.match(offers, /ContactChannelChooser/);
  assert.doesNotMatch(state + hero, /fetch\(|sendBeacon\(|localStorage|sessionStorage|\bgtag\(/);
});

test("Same EN/RU/ES slider and filter are wired once before existing offers", () => {
  const state = read("components/services-explorer-state.tsx");
  const hero = read("components/services-conversion-hero.tsx");
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    assert.match(page, /<ServicesExplorerProvider>/);
    assert.ok(page.indexOf("<ServicesExplorerProvider>") < page.indexOf("<ServicesConversionHero"));
    assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<ServicesStudioOffers"));
    assert.ok(page.indexOf("<ServicesStudioOffers") < page.indexOf("</ServicesExplorerProvider>"));
    assert.ok(page.indexOf("</ServicesExplorerProvider>") < page.indexOf("<ServicesIntroMedia"));
    assert.doesNotMatch(page, /<ServicesSmartDiscovery/);
  }
  for (const language of ["en:", "ru:", "es:"]) assert.ok(hero.includes(language));
  for (const topic of ["personal", "relationships", "business", "reiki", "free"])
    assert.ok(hero.includes(topic + ': { eyebrow:'), "Missing localized slide " + topic);
  assert.match(state, /useState<ServiceMode>\("online"\)/);
  assert.match(state, /useState<ServiceTopic>\("all"\)/);
  assert.match(hero, /href="#free-insights" data-service-hero-cta="free"/);
  assert.match(hero, /href="#consultation" data-service-hero-cta="paid"/);
});
