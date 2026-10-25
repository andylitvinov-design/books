import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

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


// WCAG 2.2 1.4.3: these 11–13px labels are normal text even at weight 750.
// Check the entire declared gradient conservatively, not an assumed glyph position.
// This source contract is not a replacement for native-browser geometry/contrast checks.
const rgb = hex => {
  assert.match(hex, /^#[0-9a-f]{6}$/i, "CTA gradient uses opaque sRGB colors");
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
};
const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const luminance = channels => channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const toLms = channels => multiply([
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
], channels.map(linear)).map(Math.cbrt);
const fromLms = channels => multiply([
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.7076147010],
], channels.map(value => value ** 3));
function whiteGradientContrast(start, end) {
  const a = rgb(start), b = rgb(end), lmsA = toLms(a), lmsB = toLms(b);
  // Include exact endpoints and 1,001 samples in both legacy sRGB and Oklab.
  // Linear interpolation in LMS cube roots is equivalent to Oklab interpolation.
  let maximumLuminance = Math.max(luminance(a.map(linear)), luminance(b.map(linear)));
  for (let step = 1; step < 1000; step++) {
    const t = step / 1000;
    const srgb = a.map((value, index) => value + (b[index] - value) * t).map(linear);
    const oklab = fromLms(lmsA.map((value, index) => value + (lmsB[index] - value) * t));
    assert.ok(oklab.every(value => value >= 0 && value <= 1), "CTA gradient stays within sRGB gamut");
    maximumLuminance = Math.max(maximumLuminance, luminance(srgb), luminance(oklab));
  }
  return 1.05 / (maximumLuminance + 0.05);
}
function assertReadableHomeOfferCta(css) {
  const ast = postcss.parse(css);
  const rules = selector => ast.nodes.filter(node => node.type === "rule" && node.selector === selector);
  const unique = selector => {
    const found = rules(selector);
    assert.equal(found.length, 1, "Exactly one base rule for " + selector);
    return found[0];
  };
  const primary = unique(".offerPrimary"), hover = unique(".offerPrimary:hover");
  const value = (rule, prop) => {
    const found = rule.nodes.filter(node => node.type === "decl" && node.prop === prop);
    assert.equal(found.length, 1, rule.selector + " must declare one " + prop);
    assert.equal(Boolean(found[0].important), false, "No important CTA override");
    return found[0].value;
  };
  assert.equal(value(primary, "color").toLowerCase(), "#fff", "Keep explicit opaque white CTA labels");
  for (const rule of [primary, hover]) {
    const match = value(rule, "background").match(/^linear-gradient\(108deg, (#[\da-f]{6}) 0%, (#[\da-f]{6}) 100%\)$/i);
    assert.ok(match, "Keep the current two-stop CTA gradient, without overlays or transparent stops");
    const ratio = whiteGradientContrast(match[1], match[2]);
    assert.ok(ratio >= 4.5, rule.selector + " white text contrast " + ratio + ":1 must be at least 4.5:1 without rounding");
  }
  // Do not let a later state/media/descendant override evade the checked colors.
  ast.walkRules(rule => {
    if (!rule.selector.includes(".offerPrimary")) return;
    for (const declaration of rule.nodes.filter(node => node.type === "decl")) {
      if (["background", "background-image", "background-color", "color", "opacity", "filter", "mix-blend-mode"].includes(declaration.prop)) {
        assert.ok((rule === primary && ["background", "color"].includes(declaration.prop)) ||
          (rule === hover && declaration.prop === "background"), "Unexpected CTA contrast override");
      }
    }
  });
  const common = unique(".offerPrimary, .offerSecondary");
  assert.equal(value(common, "font"), "750 13px/1.25 Arial, Helvetica, sans-serif");
  assert.equal(value(common, "min-height"), "44px", "Keep the 44px action target");
  const focus = unique(".root :is(a, button, summary):focus-visible");
  assert.equal(value(focus, "outline"), "3px solid #a37d58", "Keep the visible keyboard focus ring");
  assert.equal(value(focus, "outline-offset"), "3px");
}

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
