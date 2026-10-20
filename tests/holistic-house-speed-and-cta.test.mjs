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
  assert.match(publicSource, /store\.list\(\{ timeoutMs: 1200 \}\)/);
  assert.match(publicSource, /serving an empty 60s snapshot/);
  const storeSource = read('lib/site-videos/store.js');
  assert.match(storeSource, /async list\(options = \{\}\)/);
  assert.match(storeSource, /requestedTimeoutMs/);
  assert.ok(publicSource.indexOf("if (!getSiteVideoStore())") < publicSource.indexOf("return await readStoredPublishedVideos()"), "storage-off must bypass the cross-request cache");
  assert.match(actions, /revalidateTag\('holistic-house-published-site-videos'\)/);
  assert.match(actions, /await store\.save\(record, input\.expectedRevision\)/);
  assert.ok(actions.indexOf("await store.save") < actions.indexOf("revalidateTag("));
  assert.match(middleware, /Cache-Control', 'private, no-store/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.doesNotMatch(publicSource, /force-static|s-maxage|public, max-age/);
});

test("homepage prioritizes personal enquiry while retaining accessible free review and tests", () => {
  const home = read("components/holistic-house-home.tsx");
  const wrapper = read("components/homepage-contact-cta.tsx");
  const freeCapture = read("components/homepage-free-capture.tsx");
  assert.match(home, /heroBook: "Request a consultation · from €50"/);
  assert.match(home, /heroBook: "Запросить консультацию · от €50"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services#consultation\x60\}/);
  assert.match(home, /className="service-home-button service-home-button--primary"/);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(freeCapture, /data-home-free-capture="true"/);
  for (const target of ['/client/tests','/services/free-situation-review','/academy/principles-of-energywork/learn']) assert.ok(freeCapture.includes(target));
  assert.match(freeCapture, /href=\{href\}/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services\/free-situation-review\x60\}/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/);
  assert.match(home, /className="service-home-offer-note"/);
  assert.match(home, /звонок не входит\. Личные сессии оплачиваются отдельно/);
  assert.match(home, /not a live call\. One-to-one sessions are separate/);
  const landing = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(landing, /<section className=\{styles\.finalCapture\} id="personal-consultation"/);
  assert.ok(landing.indexOf('id="personal-consultation"') > landing.indexOf('className={styles.alchemy}'),
    "Optional paid format choice is deferred until after the free review's benefits and optional deeper-work link");
  assert.doesNotMatch(home, /<FreeInsightsPaths/);
  const firstScreen = home.indexOf('className="service-home-hero"');
  const book = home.indexOf('"data-hero-cta": "paid-sessions"');
  const free = home.indexOf('"data-hero-cta": "free-written-review"');
  const tests = home.indexOf('"data-hero-cta": "free-tests"');
  const belowFold = home.indexOf("<ServicesSolutions");
  assert.ok(firstScreen < book && book < free && free < tests && tests < belowFold, "Personal enquiry is primary and free options remain accessible");
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


test("hero H1 matches personal-session metadata, and optional free CTA stays clear across EN/RU/ES", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const seo = read("lib/home-seo.ts");
  const css = read("app/holistic-house-home.css");
  assert.match(seo, /Personal Sessions in Toronto & Online/);
  assert.match(enRu, /heroTitle: "Stuck in relationships, work or an important decision\?"/);
  assert.match(enRu, /heroTitle: "Сложности в отношениях, работе или важном решении\?"/);
  assert.match(enRu, /heroBook: "Request a consultation · from €50"/);
  assert.match(enRu, /heroBook: "Запросить консультацию · от €50"/);
  assert.match(es, /¿Dudas en tus relaciones, tu trabajo o una decisión importante\?/);
  assert.match(es, /Solicitar una consulta · desde €50/);
  assert.match(es, /href="\/es\/services#consultation"/);
  assert.match(css, /\.house-home--services \.service-home-paid-link \{/);
  assert.match(css, /background: #0a7180/);
  assert.match(css, /\.house-home--services \.service-home-paid-link:focus-visible/);
  assert.doesNotMatch(enRu, /force-static|s-maxage/);
});
