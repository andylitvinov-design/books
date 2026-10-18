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
  assert.match(section, /await getPublishedSiteVideos\(\)/);
  assert.match(section, /videoKey\("home-intro", locale\)/);
  assert.match(section, /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.match(section, /data-video-slot="home-intro"/);
});

test("EN/RU/ES first screen clearly distinguishes free written review, tests and paid booking", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx"), esServices = read("app/es/services/page.tsx");
  const seo = read("lib/home-seo.ts"), css = read("app/holistic-house-home.css");
  assert.match(home, /heroTitle: "Stuck in relationships, work or an important decision\?"/);
  assert.match(home, /heroTitle: "Сложности в отношениях, работе или важном решении\?"/);
  assert.match(es, /¿Dudas en tus relaciones, tu trabajo o una decisión importante\?/);
  assert.match(seo, /Personal Sessions in Toronto & Online/);
  assert.match(seo, /openGraph:/);
  assert.match(seo, /twitter:/);
  for (const page of [home, es]) {
    assert.match(page, /data-hero-cta": "free-written-review"|data-hero-cta="free-written-review"/);
    assert.match(page, /data-hero-cta": "free-tests"|data-hero-cta="free-tests"/);
    assert.match(page, /data-hero-cta": "paid-sessions"|data-hero-cta="paid-sessions"/);
    assert.ok(page.indexOf('service-home-button--primary') < page.indexOf('service-home-button--secondary'));
    assert.doesNotMatch(page, /HomeFreePaths/);
  }
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services#consultation\x60\}/);
  assert.match(es, /href="\/es\/services#consultation"/);
  assert.match(esServices, /<PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(css, /\.house-home--services \.service-home-button--primary \{/);
  assert.match(css, /\.house-home--services \.service-home-button--secondary \{ display: inline-flex; \}/);
});

test("canonical TTFB measurement and nonce safety remain intact", () => {
  const meter = read("scripts/measure-hh-public-ttfb.mjs");
  assert.match(meter, /for \(const suffix of \['\/', '\/ru'\]\)/);
  assert.doesNotMatch(meter, /for \(const suffix of \['\/\?lang=en', '\/\?lang=ru'\]\)/);
  assert.match(meter, /response\.status !== 200/);
  assert.match(read("middleware.ts"), /private, no-store, max-age=0, must-revalidate/);
  assert.match(read("app/layout.tsx"), /nonce=\{nonce\}/);
  assert.doesNotMatch(read("lib/site-videos/public.ts"), /force-static/);
});
