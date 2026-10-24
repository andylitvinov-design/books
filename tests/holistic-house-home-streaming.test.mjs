import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN and RU heroes stream public video without awaiting Redis", () => {
  const en = read("app/page.tsx"), ru = read("app/[locale]/page.tsx");
  const section = read("components/home-intro-video-section.tsx");
  const home = read("components/holistic-house-home.tsx");
  for (const page of [en, ru]) {
    assert.match(page, /<Suspense fallback=\{null\}>/);
    assert.match(page, /<HomeIntroVideoSection locale=/);
    assert.doesNotMatch(page, /await getPublishedSiteVideos\(\)/);
  }
  assert.match(home, /introVideoContent\?: ReactNode/);
  assert.match(home, /\{introVideoContent\}/);
  assert.doesNotMatch(home, /<SiteVideoPlayer/);
  assert.match(section, /await getPublishedSiteVideo\(videoKey\("home-intro", locale\)\)/);
  assert.doesNotMatch(section, /getPublishedSiteVideos\(\)/);
  assert.match(section, /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.match(section, /data-video-slot="home-intro"/);
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
