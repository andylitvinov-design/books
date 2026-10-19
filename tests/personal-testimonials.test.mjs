import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (...segments) => readFileSync(path.join(process.cwd(), ...segments), "utf8");

test("home and services share verified testimonials; Services presents four before the optional remainder", () => {
  const home = read("components", "holistic-house-home.tsx");
  const services = read("app", "[locale]", "services", "page.tsx");
  const extra = read("components", "services-studio-extras.tsx");
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  assert.match(services, /<PersonalTestimonials locale=\{locale as Locale\} variant="services"/);
  assert.ok(home.indexOf("PersonalTestimonials locale") < home.indexOf('className="service-home-about"'));
  assert.ok(services.indexOf("PersonalTestimonials locale") > services.indexOf('<ServicesIntroMedia'));
  assert.ok(services.indexOf("PersonalTestimonials locale") < services.indexOf('<PublicConsultationCta locale='));
  assert.ok(services.indexOf('<ServicesStudioOffers') < services.indexOf("PersonalTestimonials locale"));
  assert.match(extra, /<PageVideo slot="consultation" locale=\{locale\} \/>/);
  assert.match(extra, /id="method-videos"/);
});

test("published compact home shows two sourced videos while preserving all six originals per language", () => {
  const component = read("components", "personal-testimonials.tsx");
  const ru = component.match(/  ru: \[([\s\S]*?)\],\n  en: \[/)?.[1] ?? "";
  const en = component.match(/  en: \[([\s\S]*?)\],\n  es: \[/)?.[1] ?? "";
  const ruIds = [...ru.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  const enIds = [...en.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  assert.equal(ruIds.length, 6);
  assert.equal(enIds.length, 6);
  assert.equal(new Set(ruIds).size, 6);
  assert.equal(new Set(enIds).size, 6);
  // PR637 changed the published home from six visible videos to two; keep every source.
  assert.deepEqual(ruIds, ["m9RfDgK76PU", "MIVLm1GUTtM", "ttQxUHopaUM", "VABgpmn4ZYA", "muOnIHllI7E", "5oj0BIbLT4w"]);
  assert.deepEqual(enIds, ["Dk0LBmOivQo", "aUJde6A-9p0", "fE6sD1zr1Js", "itjo2_z2NGk", "4NrryHcEF1A", "hYwRNMxIMjc"]);
  const expression=component.match(/const videos = (.*);/)[1];
  const choose=new Function("isHome","testimonialVideos","locale","return "+expression);
  const sources={ru:ruIds.map(id=>({id})),en:enIds.map(id=>({id}))};
  for(const locale of ["ru","en"]){
    const home=choose(true,sources,locale),services=choose(false,sources,locale);
    assert.equal(home.length,2);
    assert.equal(new Set(home.map(item=>item.id)).size,2);
    assert.deepEqual(home,sources[locale].slice(0,2));
    assert.equal(services.length,4);
    assert.deepEqual(services,sources[locale].slice(0,4));
  }
  assert.match(component,/storyQuote/);
  assert.match(component,/current\.storyQuote/);
  assert.match(component, /video=\{\{ youtubeId: item\.id, language: item\.language, title: item\.title \}\}/);
});

test("the personal story is permissioned, anonymized, attributed, and translated transparently", () => {
  const component = read("components", "personal-testimonials.tsx");
  assert.match(component, /shared with permission/);
  assert.match(component, /опубликовано с разрешения автора/);
  assert.match(component, /translated from Russian/);
  assert.match(component, /не гарантируется/);
  assert.match(component, /not typical or guaranteed outcomes/);
  assert.match(component, /В сеансе с тобой вылезла тема/);
  assert.match(component, /Today my husband bought exactly that kind of studio/);
  assert.doesNotMatch(component, /44 кв|паркинг|кирпич|parking|square meters|квадрата/i);
  assert.doesNotMatch(component, /"user_email"|client_id|clientId|auth_token/);
});

test("videos use existing lazy click-to-play player and mobile layout; links are real routes", () => {
  const component = read("components", "personal-testimonials.tsx");
  const css = read("components", "personal-testimonials.module.css");
  assert.match(component, /SiteVideoPlayer/);
  assert.match(component, /\/about#testimonials-title/);
  assert.ok(component.includes("/services/free-situation-review"));
  assert.match(component, /aria-labelledby=\{titleId\}/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
});

test("video browser verification selects the managed intro even when testimonials add other play buttons", () => {
  const verifier = read("scripts", "verify-site-video-browser.mjs");
  assert.match(verifier, /\[data-video-slot="home-intro"\] \.site-video-play/);
  assert.match(verifier, /\[data-video-slot="home-intro"\] \.site-video-player/);
  assert.doesNotMatch(verifier, /page\.locator\('\.site-video-play'\)\.click\(\)/);
});


test("mobile video testimonials keep real YouTube thumbnail images with a same-origin and direct fallback", () => {
  const player = read("components", "site-video-player.tsx");
  assert.match(player, /compact \? "hq" : "maxres"/);
  assert.match(player, /<Image key=\{poster\}[^>]*\bunoptimized\b/);
  assert.match(player, /current === "hq" \? "direct"/);
  assert.match(player, /i\.ytimg\.com\/vi\/\$\{video\.youtubeId\}/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{video\.youtubeId\}/);
});

test("the real practitioner photo stays full-width on mobile", () => {
  const home = read("components", "holistic-house-home.tsx");
  const css = read("app", "holistic-house-home.css");
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(home, /className="service-home-about__image"/);
  assert.match(home, /width=\{900\}/);
  assert.match(home, /height=\{720\}/);
  assert.match(css, /\.house-home--services \.service-home-about__image/);
  assert.match(css, /aspect-ratio:16\/9/);
});

test("the testimonial gallery uses real ID-matched archived frames instead of decorative SVGs", () => {
  const component = read("components", "personal-testimonials.tsx");
  const player = read("components", "site-video-player.tsx");
  const en = ["Dk0LBmOivQo", "aUJde6A-9p0", "fE6sD1zr1Js", "itjo2_z2NGk", "4NrryHcEF1A", "hYwRNMxIMjc"];
  const ru = ["MIVLm1GUTtM", "ttQxUHopaUM", "VABgpmn4ZYA", "muOnIHllI7E"];
  for (const id of [...en, ...ru]) {
    assert.ok(component.includes(`"${id}"`), `Video ${id} lost its source entry`);
    const file = path.join(process.cwd(), "public/images/holistic-house/testimonial-posters", `${id}.webp`);
    assert.ok(existsSync(file), `Actual archived video still missing for ${id}`);
    const header = readFileSync(file).subarray(0, 12);
    assert.equal(header.toString("ascii", 0, 4), "RIFF");
    assert.equal(header.toString("ascii", 8, 12), "WEBP");
  }
  assert.match(component, /locallyArchivedVideoPosterIds\.has\(item\.id\)/);
  assert.match(component, /testimonial-posters\/\$\{item\.id\}\.webp/);
  assert.doesNotMatch(component, /fallbackPoster=\{index % 2 === 0/);
  assert.doesNotMatch(component, /homepage-constellations\.svg|homepage-guided-imagery\.svg/);
  assert.match(component, /data-testimonial-video-id=\{item\.id\}/);
  assert.match(player, /fallbackPoster\?: string/);
  assert.match(player, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{video\.youtubeId\}/);
  assert.match(player, /href=\{watchUrl\}/);
  // Two older RU About clips remain in the catalog without a wrong-person thumbnail.
  for (const id of ["m9RfDgK76PU", "5oj0BIbLT4w"]) {
    assert.ok(component.includes(`id: "${id}"`));
    assert.ok(!existsSync(path.join(process.cwd(), "public/images/holistic-house/testimonial-posters", `${id}.webp`)));
  }
});
