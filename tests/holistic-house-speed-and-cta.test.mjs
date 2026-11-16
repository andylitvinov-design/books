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

test("Dialog-first Home contract: homepage keeps one free-first journey and the original consented final enquiry",()=>{
  const home=read("components/holistic-house-home.tsx");
  const es=read("app/es/page.tsx");
  const hero=read("components/home-dialog-first.tsx");
  assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
  assert.match(es,/<HolisticHouseHome locale="es"\/>/);
  assert.doesNotMatch(home,/<ProfileHubTabs|<HomeSectionCarousel|<HomeMoreDisclosure|<HomeFeaturedWorkspace|<PersonalTestimonials|<HomePresentationVideoSection/);
  assert.match(hero,/data-hh-home-composer/);
  assert.match(hero,/data-hh-home-business-switch/);
});

test("Home scene is compressed local WebP; video transform protections remain",()=>{
    const scenic=read("components/home-dialog-first.module.css");
    const video=read("components/site-video-player.tsx");
    const home=read("components/holistic-house-home.tsx");
    assert.match(scenic,/reiki-approved-sunrise-v3\.webp/);
    assert.match(video,/youtube-nocookie\.com\/embed/);
    assert.doesNotMatch(home,/<StaticPortrait|<SiteVideoPlayer/);
  });

test("known first-party testimonial stills avoid speculative YouTube thumbnail transformations", () => {
  const source = read("components/site-video-player.tsx");
  const testimonials = read("components/personal-testimonials.tsx");
  assert.match(source, /poster && \(!fallbackPoster \|\| localPosterFailed\)/);
  // Both hosted YouTube and iPhone-safe HeyGen introductions must prefer a first-party poster.
  assert.match(source, /fallbackPoster && !approvedPoster && !localPosterFailed/);
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


test("Dialog-first Home contract: visible H1, privacy, and free/paid distinction agree in EN/RU/ES",()=>{
  const home=read("components/holistic-house-home.tsx");
  const es=read("app/es/page.tsx");
  const hero=read("components/home-dialog-first.tsx");
  assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
  assert.match(es,/<HolisticHouseHome locale="es"\/>/);
  assert.doesNotMatch(home,/<ProfileHubTabs|<HomeSectionCarousel|<HomeMoreDisclosure|<HomeFeaturedWorkspace|<PersonalTestimonials|<HomePresentationVideoSection/);
  assert.match(hero,/data-hh-home-composer/);
  assert.match(hero,/data-hh-home-business-switch/);
});

