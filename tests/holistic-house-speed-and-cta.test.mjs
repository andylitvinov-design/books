import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertReadableHomeOfferCta } from "./helpers/home-cta-contrast.mjs";

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
  assert.match(publicSource, /if \(!getPublicSiteVideoStore\(\)\)/);
  assert.match(publicSource, /return approvedBuiltInVideos\(\)/);
  assert.match(publicSource, /readStoredPublishedVideos\(\)/);
  assert.match(publicSource, /store\.list\(\{ timeoutMs: 1200 \}\)/);
  assert.match(publicSource, /serving an empty 60s snapshot/);
  const storeSource = read('lib/site-videos/store.js');
  assert.match(storeSource, /async list\(options = \{\}\)/);
  assert.match(storeSource, /requestedTimeoutMs/);
  assert.ok(publicSource.indexOf("if (!getPublicSiteVideoStore())") < publicSource.indexOf("return await readStoredPublishedVideos()"), "storage-off must bypass the cross-request cache");
  assert.match(actions, /revalidateTag\('holistic-house-published-site-videos'\)/);
  assert.match(actions, /await store\.save\(record, input\.expectedRevision\)/);
  assert.ok(actions.indexOf("await store.save") < actions.indexOf("revalidateTag("));
  assert.match(middleware, /Cache-Control', 'private, no-store/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.doesNotMatch(publicSource, /force-static|s-maxage|public, max-age/);
});

test("homepage keeps one free-first journey and the original consented final enquiry", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  const stage = read("components/home-featured-workspace.tsx");
  const wrapper = read("components/homepage-contact-cta.tsx");
  const freeCapture = read("components/homepage-free-capture.tsx");
  assert.match(home, /<HomeFeaturedWorkspace locale=\{locale\} \/>/);
  assert.match(spanish, /<HomeFeaturedWorkspace locale="es" \/>/);
  assert.match(stage, /data-home-offer-primary=\{offer\.id\}/);
  for (const route of ["/client/tests","/services/free-situation-review","/academy/principles-of-energywork/learn",
    "/services#consultation","/coaching"])
    assert.ok(stage.includes(route), "Missing action route: "+route);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(freeCapture, /data-home-free-capture="true"/);
  assert.match(read("components/free-entry-landing.tsx"), /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.ok(home.indexOf("<HomeFeaturedWorkspace") < home.indexOf("<HomepageContactCta"));
  assert.ok(spanish.indexOf("<HomeFeaturedWorkspace") < spanish.indexOf("<PublicConsultationCta"));
  assert.doesNotMatch(home, /<HomeFreeDiagnosisBanner|service-home-hero/);
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

test('private Cabinet loads heavyweight tab modules on demand', () => {
  const workspace = read('components/app/app-workspace.jsx');
  for (const file of ['profile-domains', 'account-test-battery', 'my-course', 'practice-workspace', 'psi-monitoring']) {
    assert.ok(workspace.includes(`dynamic(() => import('@/components/app/${file}')`), `${file} must be split from the initial Cabinet chunk`);
    assert.ok(!workspace.includes(`from '@/components/app/${file}'`), `${file} must not be eagerly imported`);
  }
  const route = read('app/[locale]/app/[[...path]]/page.jsx');
  assert.match(route, /force-dynamic/);
  assert.match(route, /revalidate = 0/);
});


test("visible H1, privacy, and free/paid distinction agree in EN/RU/ES", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const stage = read("components/home-featured-workspace.tsx");
  const css = read("components/home-featured-workspace.module.css");
  assert.match(stage, /<h1 id="hh-home-features-title">/);
  assert.match(stage, /<h2 id=\{"hh-home-" \+ id \+ "-title"\}>/);
  for (const heading of ["Explore your path at Holistic House","Ваш путь в Holistic House","Tu camino en Holistic House"])
    assert.ok(stage.includes(heading));
  assert.match(stage, /Request a session · from €50/);
  assert.match(stage, /Заказать бесплатный письменный разбор/);
  assert.match(stage, /This is a request for a written response, not a call/);
  assertReadableHomeOfferCta(css);
  assert.doesNotMatch(home, /force-static|s-maxage/);
  assert.match(es, /<PublicConsultationCta locale="es" \/>/);
});



test("home offer contrast contract rejects unreadable colors and lost action affordances", () => {
  const current = read("components/home-featured-workspace.module.css");
  // Explicitly synthetic readable specimen; it does not edit the runtime stylesheet.
  const readable = current.replace(/linear-gradient\(108deg, #[\da-f]{6} 0%, #305a93 100%\)/i,
    "linear-gradient(108deg, #078293 0%, #305a93 100%)");
  assertReadableHomeOfferCta(readable);
  for (const [before, after, message] of [
    ["#078293 0%", "#07899c 0%", /white text contrast/],
    ["#078293 0%", "#078394 0%", /white text contrast/],
    ["#305a93 100%", "#ffffff 100%", /white text contrast/],
    ["#097285 0%", "#aaaaaa 0%", /white text contrast/],
    ["background: linear-gradient(108deg, #078293 0%, #305a93 100%); color: #fff;",
      "background: linear-gradient(108deg, #078293 0%, #305a93 100%); color: #ddd;", /opaque white/],
    ["gap: 7px;\n  min-height: 44px; padding: 9px 13px", "gap: 7px;\n  min-height: 24px; padding: 9px 13px", /44px action target/],
    ["outline: 3px solid #a37d58", "outline: none", /keyboard focus ring/],
  ]) {
    assert.ok(readable.includes(before), "Mutation targets actual CSS");
    assert.throws(() => assertReadableHomeOfferCta(readable.replace(before, after)),
      error => error.code === "ERR_ASSERTION" && message.test(error.message));
  }
  assert.throws(() => assertReadableHomeOfferCta(readable + "\n@media (max-width: 640px) { .offerPrimary { color: #aaa; } }"),
    /Unexpected CTA contrast override/);
});

test("public TTFB contract dependencies are installed before every mandatory targeted suite", () => {
  const workflow = read(".github/workflows/hh-public-performance-audit.yml");
  const install = "run: npm ci --include=dev --ignore-scripts --no-audit --no-fund";
  assert.equal(workflow.split(install).length, 2, "Install locked declared development dependencies exactly once");
  assert.ok(workflow.indexOf(install) < workflow.indexOf("run: node --test "), "Install must precede contract execution");
  const command = workflow.match(/run: node --test ([^\n]+)/)?.[1].trim().split(/\s+/);
  assert.deepEqual(command, [
    "tests/holistic-house-image-quota.test.mjs", "tests/hh-public-html-metrics.test.mjs",
    "tests/holistic-house-speed-and-cta.test.mjs", "tests/holistic-house-home-streaming.test.mjs",
    "tests/home-carousel-first-screen-cta.test.mjs", "tests/home-rsc-on-demand.test.mjs",
    "tests/public-consultation-cta-design.test.mjs", "tests/consultation-capture-choice.test.mjs",
    "tests/personal-testimonials.test.mjs",
  ], "Do not remove or suppress targeted safety, routing, booking or testimonial contracts");
  assert.doesNotMatch(workflow, /continue-on-error|--omit=dev|--production|if: false/);
});
