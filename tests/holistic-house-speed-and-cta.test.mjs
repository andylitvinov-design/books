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
  const primary = css.match(/\.offerPrimary \{([^}]+)\}/)?.[1] ?? '';
  assert.match(primary, /background: linear-gradient\(108deg, #07899c 0%, #305a93 100%\)/);
  assert.match(primary, /color: #fff/);
  assert.doesNotMatch(home, /force-static|s-maxage/);
  assert.match(es, /<PublicConsultationCta locale="es" \/>/);
});
