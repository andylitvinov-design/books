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
  assert.match(player, /<img className="site-video-poster" src=\{approvedPoster\}/);
  assert.match(player, /<img className="site-video-poster site-video-fallback-poster" src=\{fallbackPoster\}/);
  assert.doesNotMatch(player, /from "next\/image"/);
  assert.match(read("app/site-videos.css"), /\.site-video-play \.site-video-poster \{[\s\S]*?position: absolute;/);
  assert.match(services, /unoptimized=\{\(isHome \? homepageMedia\[offer\.id\] : offer\.image\)\.endsWith\("\.webp"\) \|\| \(isHome \? homepageMedia\[offer\.id\] : offer\.image\) === "\/academy\/reiki-yggdrasil\/source\/eastern-tradition\.png"\}/);
  assert.match(player, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  // The verified portrait uses its static component; approved YouTube stills load natively, not through /_next/image.
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
  assert.match(source, /<img key=\{poster\} className="site-video-poster"/);
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


test("public home video metadata streams separately from the personalized CSP-bearing shell", () => {
  const route = read("app/page.tsx");
  const shell = read("components/holistic-house-home.tsx");
  const layout = read("app/layout.tsx");
  assert.match(route, /<Suspense fallback=\{null\}>/);
  assert.match(route, /async function HomeIntroVideo/);
  assert.ok(route.indexOf("const locale = await homeLocale(searchParams)") < route.indexOf("<HolisticHouseHome"));
  assert.doesNotMatch(route, /Promise\.all\(\[homeLocale\(searchParams\), getPublishedSiteVideos\(\)\]\)/);
  assert.match(shell, /\{introVideoContent\}/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.doesNotMatch(route, /force-static|revalidate = 60|s-maxage/);
});

test("all public homepage languages expose real paid booking before secondary free actions", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  const spanishServices = read("app/es/services/page.tsx");
  const style = read("app/holistic-house-home.css");
  assert.ok(enRu.indexOf('service-home-button--consultation') < enRu.indexOf('service-home-button--primary'));
  assert.ok(spanish.indexOf('service-home-button--consultation') < spanish.indexOf('service-home-button--primary'));
  assert.match(spanish, /Reservar consulta/);
  assert.match(spanishServices, /id="consultation" serviceBooking/);
  assert.match(style, /service-home-button--consultation \{ min-height: 48px/);
});
