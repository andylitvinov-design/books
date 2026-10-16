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

test("homepage prioritizes free written review and tests while preserving accessible paid booking", () => {
  const home = read("components/holistic-house-home.tsx");
  const wrapper = read("components/homepage-contact-cta.tsx");
  const freeCapture = read("components/homepage-free-capture.tsx");
  assert.match(home, /heroBook: "Personal sessions · from €50"/);
  assert.match(home, /heroBook: "Личная сессия · от €50"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services#consultation\x60\}/);
  assert.match(home, /className="service-home-paid-link"/);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(freeCapture, /data-home-free-capture="true"/);
  assert.match(freeCapture, /selected === "situation" \? \x60\/\$\{locale\}\/services\/free-situation-review\x60/);
  assert.match(freeCapture, /selected === "wu" \? \x60\/\$\{locale\}\/services\/dao-health-profile\x60/);
  assert.match(freeCapture, /\x60\/\$\{locale\}\/client#cabinet-tests\x60/);
  assert.match(freeCapture, /href=\{href\}/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services\/free-situation-review\x60\}/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/);
  assert.match(home, /className="service-home-offer-note"/);
  assert.match(home, /звонок не входит\. Личные сессии оплачиваются отдельно/);
  assert.match(home, /not a live call\. One-to-one sessions are separate/);
  const landing = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(landing, /<section className=\{styles\.paid\} id="personal-consultation"/);
  assert.doesNotMatch(home, /<FreeInsightsPaths/);
  const firstScreen = home.indexOf('className="service-home-hero"');
  const free = home.indexOf('className="service-home-button service-home-button--primary"');
  const tests = home.indexOf('className="service-home-button service-home-button--secondary"');
  const book = home.indexOf('className="service-home-paid-link"');
  const belowFold = home.indexOf("<ServicesSolutions");
  assert.ok(firstScreen < free && free < tests && tests < book && book < belowFold, "Free routes must precede the optional paid booking");
  assert.ok(belowFold < home.indexOf("<HomepageContactCta locale={locale} />"), "Visible photo cards must precede bottom free capture");
});

test("bypass transformations only for owned WebP images and the exact approved local artwork", () => {
  const player = read("components/site-video-player.tsx");
  const services = read("components/services-solutions.tsx");
  assert.match(player, /unoptimized=\{approvedPoster\.endsWith\("\.webp"\)\}/);
  assert.match(player, /unoptimized=\{fallbackPoster\.endsWith\("\.webp"\)\}/);
  assert.match(services, /unoptimized=\{\(isHome \? homepageMedia\[offer\.id\] : offer\.image\)\.endsWith\("\.webp"\) \|\| \(isHome \? homepageMedia\[offer\.id\] : offer\.image\) === "\/academy\/reiki-yggdrasil\/source\/eastern-tradition\.png"\}/);
  assert.match(player, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  // Verified portrait and YouTube stills bypass unneeded runtime transforms.
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
  assert.match(config, /\/images\/holistic-house\/portrait-static\/\:path\*/);
  assert.match(config, /public, max-age=31536000, immutable/);
  const privateMiddleware = read("middleware.ts");
  assert.match(privateMiddleware, /private, no-store, max-age=0, must-revalidate/);
});
