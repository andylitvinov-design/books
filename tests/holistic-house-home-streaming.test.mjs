import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES homepage omits the unapproved HeyGen introduction without touching the video library", () => {
  const en = read("app/page.tsx"), ru = read("app/[locale]/page.tsx");
  const es = read("app/es/page.tsx");
  const home = read("components/holistic-house-home.tsx");
  for (const page of [en, ru, es]) {
    assert.doesNotMatch(page, /HomeIntroVideoSection|introVideoContent|service-home-video|getPublishedSiteVideo/);
    assert.match(page, /<HolisticHouseHome|<PersonalTestimonials/);
  }
  assert.doesNotMatch(home, /introVideoContent|HomeIntroVideoSection|SiteVideoPlayer/);
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  // Archive / owner video manager entries remain available, but may not
  // make an unapproved AI introduction reappear on the homepage.
  const archived = read("components/home-intro-video-section.tsx");
  assert.match(archived, /getPublishedSiteVideo\(videoKey\("home-intro", locale\)\)/);
  assert.match(read("lib/site-videos/defaults.js"), /existingHomeIntroVideoEn/);
  assert.match(read("lib/site-videos/defaults.js"), /existingHomeIntroVideoRu/);
});

test("EN/RU/ES first screen presents seven visible steps and genuine free/paid routes", () => {
  const en = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const stage = read("components/home-featured-workspace.tsx");
  const seo = read("lib/home-seo.ts");
  for (const page of [en,es]) {
    assert.ok(page.indexOf("<HomeSectionCarousel") < page.indexOf("<HomeFeaturedWorkspace"));
    assert.ok(page.indexOf("<HomeMoreDisclosure") < page.indexOf("<HomeFeaturedWorkspace"));
    assert.doesNotMatch(page, /<HomeFreeDiagnosisBanner|service-home-hero/);
  }
  for (const name of ["Free courses","Бесплатные курсы","Cursos gratuitos",
    "Заказать бесплатный письменный разбор","Start free coaching","Request a session · from €50"]) {
    assert.ok(stage.includes(name), "Missing offer: " + name);
  }
  for (const route of ["/services/free-situation-review","/client/tests","/services#consultation"])
    assert.ok(stage.includes(route), "Missing conversion route "+route);
  assert.match(stage, /<h1 id="hh-home-features-title">/);
  assert.match(seo, /Personal Sessions in Toronto & Online/);
  assert.match(read("app/es/services/page.tsx"), /<PublicConsultationCta locale="es" id="consultation"/);
});

test("canonical TTFB measurement and nonce safety remain intact", () => {
  const meter = read("scripts/measure-hh-public-ttfb.mjs");
  assert.match(meter, /for \(const suffix of \['\/', '\/ru', '\/es'\]\)/);
  assert.doesNotMatch(meter, /for \(const suffix of \['\/\?lang=en', '\/\?lang=ru'\]\)/);
  assert.match(meter, /response\.status !== 200/);
  assert.match(read("middleware.ts"), /private, no-store, max-age=0, must-revalidate/);
  assert.match(read("app/layout.tsx"), /nonce=\{nonce\}/);
  assert.doesNotMatch(read("lib/site-videos/public.ts"), /force-static/);
});
