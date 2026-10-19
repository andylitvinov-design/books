import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (...segments) => readFileSync(path.join(process.cwd(), ...segments), "utf8");

test("home and services render the same first-party testimonial component", () => {
  const home = read("components", "holistic-house-home.tsx");
  const services = read("app", "[locale]", "services", "page.tsx");
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  assert.match(services, /<PersonalTestimonials locale=\{locale as Locale\} variant="services"/);
  assert.ok(home.indexOf("PersonalTestimonials locale") < home.indexOf('className="service-home-about"'));
  assert.ok(services.indexOf('<PublicConsultationCta locale=') > services.indexOf('<ServicesSolutions'));
  assert.ok(services.indexOf("PersonalTestimonials locale") > services.indexOf('<PublicConsultationCta locale='));
  assert.ok(services.indexOf("PersonalTestimonials locale") < services.indexOf('<ServicesTestsIntro'));
  const methodDisclosure = services.indexOf('id="method-videos"');
  assert.ok(methodDisclosure > 0);
  assert.ok(services.indexOf('<PageVideo slot="consultation"') > methodDisclosure);
  assert.ok(services.indexOf('<PageVideo slot="consultation"') < services.indexOf('</details>', methodDisclosure));
  assert.match(services, /id="method-videos"/);
});

test("homepage previews four sourced videos and preserves all 12 originals behind the disclosure", () => {
  const component = read("components", "personal-testimonials.tsx");
  const ru = component.match(/  ru: \[([\s\S]*?)\],\n  en: \[/)?.[1] ?? "";
  const en = component.match(/  en: \[([\s\S]*?)\],\n  es: \[/)?.[1] ?? "";
  const ruIds = [...ru.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  const enIds = [...en.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  assert.equal(ruIds.length, 6);
  assert.equal(enIds.length, 6);
  assert.equal(new Set(ruIds).size, 6);
  assert.equal(new Set(enIds).size, 6);
  // PR637 had reduced the homepage to two; the first four now stay visible.
  assert.deepEqual(ruIds, ["m9RfDgK76PU", "MIVLm1GUTtM", "ttQxUHopaUM", "VABgpmn4ZYA", "muOnIHllI7E", "5oj0BIbLT4w"]);
  assert.deepEqual(enIds, ["Dk0LBmOivQo", "aUJde6A-9p0", "fE6sD1zr1Js", "itjo2_z2NGk", "4NrryHcEF1A", "hYwRNMxIMjc"]);
  const expression=component.match(/const videos = (.*);/)[1];
  const choose=new Function("isHome","testimonialVideos","locale","return "+expression);
  const sources={ru:ruIds.map(id=>({id})),en:enIds.map(id=>({id}))};
  for(const locale of ["ru","en"]){
    const home=choose(true,sources,locale),services=choose(false,sources,locale);
    assert.equal(home.length,4);
    assert.equal(new Set(home.map(item=>item.id)).size,4);
    assert.deepEqual(home,sources[locale].slice(0,4));
    const hidden = [...sources[locale].slice(4), ...sources[locale === "ru" ? "en" : "ru"]];
    assert.equal(hidden.length,8);
    assert.equal(new Set([...home,...hidden].map(item=>item.id)).size,12);
    assert.equal(services.length,3);
    assert.deepEqual(services,sources[locale].slice(0,3));
  }
  assert.match(component, /const remainingHomeVideos = isHome \? testimonialVideos\[locale\]\.slice\(4\) : \[\]/);
  assert.match(component, /const otherLanguageVideos = isHome \? testimonialVideos\[locale === "ru" \? "en" : "ru"\] : \[\]/);
  assert.match(component, /<details className=\{styles\.moreVideoDisclosure\} data-home-testimonial-disclosure>/);
  assert.match(component, /renderVideoCards\(remainingHomeVideos\)/);
  assert.match(component, /renderVideoCards\(otherLanguageVideos, true\)/);
  assert.match(component, /remainingHomeVideos\.length \+ otherLanguageVideos\.length/);
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
  assert.match(css, /\.moreVideoDisclosure > summary/);
  assert.match(css, /\.moreVideoDisclosure\[open\] > summary/);
  assert.match(css, /\.moreVideoDisclosure > summary:focus-visible/);
  assert.match(component, /moreToggle: "Смотреть больше отзывов"/);
  assert.match(component, /moreToggle: "Watch more testimonials"/);
  assert.match(component, /moreToggle: "Ver más testimonios"/);
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
