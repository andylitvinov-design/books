import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("short-lived public video snapshot cache never includes drafts or request-specific HTML", () => {
  const publicSource = read("lib/site-videos/public.ts");
  const actions = read("app/admin/videos/actions.js");
  const middleware = read("middleware.ts");
  const layout = read("app/layout.tsx");
  assert.match(publicSource, /unstable_cache/);
  assert.match(publicSource, /revalidate: 60/);
  assert.match(publicSource, /tags: \['holistic-house-published-site-videos'\]/);
  assert.match(publicSource, /toPublishedSiteVideo\(record\)/);
  assert.match(publicSource, /noStore\(\)/);
  assert.match(publicSource, /if \(!getSiteVideoStore\(\)\)/);
  assert.match(publicSource, /return approvedBuiltInVideos\(\)/);
  assert.match(publicSource, /readStoredPublishedVideos\(\)/);
  assert.ok(publicSource.indexOf("if (!getSiteVideoStore())") < publicSource.indexOf("return await readStoredPublishedVideos()"), "storage-off must bypass the cross-request cache");
  assert.match(actions, /revalidateTag\('holistic-house-published-site-videos'\)/);
  assert.match(actions, /await store\.save\(record, input\.expectedRevision\)/);
  assert.ok(actions.indexOf("await store.save") < actions.indexOf("revalidateTag("));
  assert.match(middleware, /Cache-Control', 'private, no-store/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.doesNotMatch(publicSource, /force-static|s-maxage|public, max-age/);
});

test("homepage keeps genuine paid consultation navigation while free services live only in its bottom capture", () => {
  const home = read("components/holistic-house-home.tsx");
  const wrapper = read("components/homepage-contact-cta.tsx");
  const freeCapture = read("components/homepage-free-capture.tsx");
  assert.match(home, /heroBook: "Book a consultation"/);
  assert.match(home, /heroBook: "Записаться на консультацию"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services#consultation\x60\}/);
  assert.match(home, /className="service-home-button service-home-button--consultation"/);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(freeCapture, /data-home-free-capture="true"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services\/free-situation-review\x60\}/);
  assert.match(home, /href="#core-services"/);
  assert.doesNotMatch(home, /<FreeInsightsPaths/);
  const firstScreen = home.indexOf('className="service-home-hero"');
  const book = home.indexOf('className="service-home-button service-home-button--consultation"');
  const belowFold = home.indexOf("<ServicesSolutions");
  assert.ok(firstScreen < book && book < belowFold, "Paid CTA must stay inside the hero");
});

test("bypass transformations only for owned WebP images and the exact approved local artwork", () => {
  const player = read("components/site-video-player.tsx");
  const services = read("components/services-solutions.tsx");
  assert.match(player, /unoptimized=\{approvedPoster\.endsWith\("\.webp"\)\}/);
  assert.match(player, /unoptimized=\{fallbackPoster\.endsWith\("\.webp"\)\}/);
  assert.match(services, /unoptimized=\{\(isHome \? homepageMedia\[offer\.id\] : offer\.image\)\.endsWith\("\.webp"\) \|\| \(isHome \? homepageMedia\[offer\.id\] : offer\.image\) === "\/academy\/reiki-yggdrasil\/source\/eastern-tradition\.png"\}/);
  assert.match(player, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  // The verified portrait uses its static component; third-party YouTube stills keep optimization.
  assert.match(read("components/holistic-house-home.tsx"), /<StaticPortrait\b/);
  assert.match(read("components/holistic-house-home.tsx"), /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(player, /src=\{\x60https:\/\/i\.ytimg\.com\/vi\//);
});


test("known first-party testimonial stills avoid speculative YouTube thumbnail transformations", () => {
  const source = read("components/site-video-player.tsx");
  const testimonials = read("components/personal-testimonials.tsx");
  assert.match(source, /poster && \(!fallbackPoster \|\| localPosterFailed\)/);
  assert.match(source, /!isHeygen && fallbackPoster && !localPosterFailed/);
  assert.match(source, /onError=\{\(\) => setLocalPosterFailed\(true\)\}/);
  assert.match(testimonials, /locallyArchivedVideoPosterIds/);
  assert.match(testimonials, /testimonial-posters\/\$\{item\.id\}\.webp/);
  assert.match(source, /https:\/\/www\.youtube-nocookie\.com\/embed/);
});

test("only immutable-by-name public poster folders have a bounded CDN policy", () => {
  const config = read("next.config.ts");
  assert.match(config, /\/images\/holistic-house\/video-posters\/\:path\*/);
  assert.match(config, /\/images\/holistic-house\/testimonial-posters\/\:path\*/);
  assert.match(config, /public, max-age=3600, s-maxage=86400/);
  assert.doesNotMatch(config, /source: "\/(?:api|admin|client|app)\//);
  const privateMiddleware = read("middleware.ts");
  assert.match(privateMiddleware, /private, no-store, max-age=0, must-revalidate/);
});

test("header offers localized direct paid consultation CTA, including compact mobile entry", () => {
  const nav = read("components/site-navigation.tsx");
  const css = read("app/holistic-house-home.css");
  assert.match(nav, /site-consultation-entry/);
  assert.match(nav, /Book a consultation/);
  assert.match(nav, /Записаться на консультацию/);
  assert.match(nav, /services#consultation/);
  assert.match(css, /site-consultation-entry/);
  assert.match(css, /order: -1/);
});

test("video player restores a first-click gesture across a locale RSC remount", () => {
  const player = read("components/site-video-player.tsx");
  assert.match(player, /recentUserPlayIntent = new Map/);
  assert.match(player, /USER_PLAY_INTENT_WINDOW_MS = 10_000/);
  assert.match(player, /onPointerDown=\{rememberPlayIntent\}/);
  assert.match(player, /Date\.now\(\) - time < USER_PLAY_INTENT_WINDOW_MS/);
  assert.doesNotMatch(player, /sessionStorage|localStorage/);
  assert.match(player, /unoptimized=\{true\}/);
  assert.match(player, /portrait-static\/andy-828-3dcbabded1e9\.webp/);
  const cfg = read("next.config.ts");
  assert.match(cfg, /portrait-static\/\:path\*/);
  assert.doesNotMatch(cfg, /images: \{ unoptimized: true/);
});
