import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("public video CSP allows only reviewed origins and scopes native media to Tantra", async () => {
  const middleware = await source("middleware.ts");
  assert.match(middleware, /const publicDocument = !privateDocument && !pathname\.startsWith\('\/api\/'\)/);
  assert.match(middleware, /frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/app\.heygen\.com/);
  assert.match(middleware, /"media-src 'self'"/);
  assert.match(middleware, /tantraReikiPage \? "media-src 'self' https:\/\/psitrends\.com" : "media-src 'self'"/);
  assert.match(middleware, /privateDocument \? 'private'/);
  assert.doesNotMatch(middleware, /frame-src \*/);
  assert.doesNotMatch(middleware, /media-src \*/);
});

test("About's Psychic Alchemy renderer uses the reviewed HeyGen embed", async () => {
  const aboutVideo = await source("components/psychic-alchemy-intro-video.tsx");
  assert.match(aboutVideo, /https:\/\/app\.heygen\.com\/embeds\/\$\{VIDEO_ID\}/);
  assert.match(aboutVideo, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(aboutVideo, /aria-label=\{`Open video: \$\{video\.title\}`\}/);
  assert.match(aboutVideo, /const \[interactive, setInteractive\] = useState\(false\)/);
  assert.match(aboutVideo, /useEffect\(\(\) => \{ setInteractive\(true\); \}, \[\]\)/);
  assert.match(aboutVideo, /disabled=\{!interactive\} aria-busy=\{!interactive\}/);
  assert.match(aboutVideo, /interactive \? "Watch introduction" : "Loading player…"/);
});

test("CSP class boundary reloads only cross-policy client navigation", async () => {
  const [middleware, layout, boundary] = await Promise.all([
    source("middleware.ts"), source("app/layout.tsx"), source("components/csp-navigation-boundary.tsx"),
  ]);
  assert.match(middleware, /requestHeaders\.set\('x-csp-class', cspClass\)/);
  assert.match(layout, /<body className="font-sans" data-csp-class=\{cspClass\}>/);
  assert.match(layout, /<CspNavigationBoundary \/>/);
  assert.match(boundary, /window\.location\.assign\(url\.href\)/);
  assert.match(boundary, /window\.location\.replace\(window\.location\.href\)/);
  assert.match(boundary, /addEventListener\("click", onClick, true\)/);
  assert.match(boundary, /removeEventListener\("click", onClick, true\)/);
  assert.match(boundary, /addEventListener\("popstate", onPopState, true\)/);
  assert.match(boundary, /removeEventListener\("popstate", onPopState, true\)/);
  assert.match(boundary, /addEventListener\("pageshow", onPopState, true\)/);
  assert.match(boundary, /removeEventListener\("pageshow", onPopState, true\)/);
  assert.match(boundary, /cspClassForPath\(window\.location\.pathname\)/);
  assert.match(boundary, /persisted && interruptedRouterNavigation\.current/);
  assert.match(boundary, /event\?\.stopImmediatePropagation\(\)/);
  assert.match(boundary, /tantra-media/);
  assert.match(boundary, /private/);
});

test("library video cards use existing public destinations", async () => {
  const library = await source("components/library-hub.tsx");
  assert.match(library, /href: "\/en\/homeopathy"/);
  assert.match(library, /href: "\/\?lang=ru"/);
  assert.match(library, /href: "\/ru\/homeopathy"/);
  assert.doesNotMatch(library, /href: "\/ru\/"/);
});

test("private Yggdrasil recording stays listed without a playable provider id", async () => {
  const [curriculum, courses, player] = await Promise.all([
    source("data/academy/yggdrasil-curriculum.json"), source("components/academy-video-courses.tsx"), source("components/academy-video-library-client.tsx"),
  ]);
  assert.doesNotMatch(curriculum, /FxOE-cEAnP4/);
  assert.match(curriculum, /"availability": "unavailable"/);
  assert.match(courses, /video\.availability === "unavailable"/);
  assert.match(player, /lesson\.unavailable/);
  assert.match(player, /not publicly playable/);
});



test("client CSP classification exactly follows middleware including encoded and root paths", async () => {
  const [middleware, boundary] = await Promise.all([source("middleware.ts"), source("components/csp-navigation-boundary.tsx")]);
  const serverPrivate = middleware.slice(middleware.indexOf("function privatePath("), middleware.indexOf("export function middleware"));
  const clientPrivate = boundary.slice(boundary.indexOf("function privatePath("), boundary.indexOf("function cspClassForPath("));
  assert.equal(clientPrivate.trim(), serverPrivate.trim(), "Private-path rules must stay identical; never widen private CSP");
  const classifySource = boundary.slice(boundary.indexOf("function privatePath("), boundary.indexOf("/**")).replaceAll(": string", "");
  const classify = new Function(classifySource + "; return cspClassForPath;")();
  const isPrivate = new Function(serverPrivate.replaceAll(": string", "") + "; return privatePath;")();
  const paths = ["/", "/en/about", "/ru/services", "/es/about", "/admin", "/admin/videos", "/admin/videos/", "/document-preview", "/document-preview/example", "/api", "/api/", "/api/client", "/api/client-example", "/api/admin", "/api/admin/example", "/api/prescriptions", "/api/prescriptions/example", "/api/prescription-access", "/api/app", "/api/app/me"];
  for (const locale of ["en", "ru", "es"]) {
    for (const section of ["app", "client", "report", "prescriptions", "academy/reiki/tantra-reiki"]) {
      for (const suffix of ["", "/", "/example"]) paths.push(`/${locale}/${section}${suffix}`);
    }
  }
  for (const path of [...paths, ...paths.map(path => path.replaceAll("/", "%2F")), ...paths.map(path => path.replaceAll("/", "//")), "/en/%63lient/example", "/%65n/client/example", "/en/client/%invalid"]) {
    const expected = path === "/admin/videos" ? "video-manager" : isPrivate(path) ? "private"
      : /^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(path) ? "tantra-media"
        : path.startsWith("/api/") ? "restricted" : "public-video";
    assert.equal(classify(path), expected, path);
  }
});


test("Yggdrasil copy distinguishes public sources from the unavailable recording", async () => {
  const curriculum = JSON.parse(await source("data/academy/yggdrasil-curriculum.json"));
  const recordings = curriculum.levels.flatMap(level => level.steps.flatMap(step => step.video?.videos ?? []));
  assert.equal(recordings.length, 79);
  assert.equal(recordings.filter(video => video.youtubeId).length, 78);
  assert.equal(recordings.filter(video => video.availability === "unavailable").length, 1);
  const copy = await source("components/yggdrasil-curriculum.tsx");
  assert.match(copy, /78 public video sources and one unavailable recording/);
  assert.match(copy, /78 публичных источников и одна недоступная запись/);
  assert.match(copy, /78 fuentes de video públicas y una grabación no disponible/);
  assert.doesNotMatch(copy, /79 verified public video lectures|79 проверенных публичных видеолекций|79 videoclases públicas verificadas/);
});

test('parser-time history guard pins the destination before hydration and can hand off', async () => {
  const { runInNewContext } = await import('node:vm');
  const { CSP_PREHYDRATION_SCRIPT } = await import('../lib/csp-prehydration.js');
  const listeners = new Map();
  const replacements = [];
  const window = {
    location: { href: 'https://example.test/en/about', replace: value => replacements.push(value) },
    addEventListener: (type, handler, capture) => listeners.set(type, { handler, capture }),
    removeEventListener: (type, handler, capture) => { assert.equal(listeners.get(type).handler, handler); assert.equal(capture, true); listeners.delete(type); },
  };
  runInNewContext(CSP_PREHYDRATION_SCRIPT, { window });
  assert.equal(listeners.get('popstate').capture, true);
  let stopped = false;
  listeners.get('popstate').handler({ stopImmediatePropagation() { stopped = true; } });
  window.location.href = 'https://example.test/en/academy/reiki/tantra-reiki';
  assert.equal(stopped, true);
  assert.equal(window.__cspPreHydration.destination, 'https://example.test/en/about');
  assert.deepEqual(replacements, ['https://example.test/en/about']);
  window.__cspPreHydration.dispose();
  assert.equal(listeners.has('popstate'), false);
  assert.equal(window.__hhOptionalReadsDeparting, true);
  listeners.get('pageshow').handler();
  assert.equal(window.__hhOptionalReadsDeparting, false);
  listeners.get('pagehide').handler();
  assert.equal(window.__hhOptionalReadsDeparting, true);
  const { readFileSync } = await import('node:fs');
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /nonce=\{nonce\}[^>]*dangerouslySetInnerHTML=\{\{ __html: CSP_PREHYDRATION_SCRIPT \}\}/);
});

test("Tantra videos use canonical originals and posters match first-party hashes", async () => {
  const archive = JSON.parse(await source("data/academy/tantra-reiki-full.generated.json"));
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await source("data/academy/tantra-native-assets.json"));
  assert.equal(manifest.assets.length, 2);
  assert.deepEqual(archive.html5Videos.ru, [
    { src: "https://psitrends.com/images/video_2024-01-16_11-06-01.mp4", poster: "/images/tantra-reiki/participant-1-poster.png", type: "video/mp4" },
    { src: "https://psitrends.com/images/video.mp4", poster: "/images/tantra-reiki/participant-2-poster.png", type: "video/mp4" },
  ]);
  assert.equal(new Set(manifest.assets.map(asset => asset.path)).size, 2);
  for (const asset of manifest.assets) {
    assert.ok(asset.path.startsWith('/images/tantra-reiki/'));
    const bytes = await readFile(new URL('../public' + asset.path, import.meta.url));
    assert.equal(bytes.length, asset.bytes, asset.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.path);
  }
  const middleware = await source("middleware.ts");
  assert.match(middleware, /tantraReikiPage \? "media-src 'self' https:\/\/psitrends\.com" : "media-src 'self'"/);
});

test("Full Tantra learner reports appear ahead of the clearly labeled original Russian videos", async () => {
  const component = await source("components/tantra-reiki-testimonials.tsx");
  const cards = await source("components/tantra-learner-review-cards.tsx");
  const curriculum = await source("data/academy/energywork-ai-curriculum.ts");
  assert.match(component, /<TantraLearnerReviewCards locale=\{locale\} headingId="tantra-testimonials-heading" \/>/);
  assert.match(cards, /tantraVoices\.map\(\(review, index\) =>/);
  assert.match(curriculum, /export const tantraVoices: EnergyworkTestimonial\[\] = \[/);
  for (const name of ['margaret', 'olga', 'litten', 'tantra-level-1']) {
    assert.ok(curriculum.includes('id: "' + name + '"'));
  }
  assert.match(component, /initiallyOpen=\{locale !== "en"\}/);
  const disclosure = await source("components/tantra-video-testimonials.tsx");
  assert.match(disclosure, /id="tantra-russian-video-testimonials"/);
  assert.match(component, /summary=\{v\.title\}/);
  assert.match(component, /Alena · Tantra Reiki testimonial · Russian audio/);
  assert.match(component, /locale === "en" \? " · Russian audio" : ""/);
  assert.ok(component.indexOf("<TantraLearnerReviewCards") < component.indexOf("<TantraVideoTestimonials"));
});



test('parser-time optional reads stop on the real NavigationDestination API shape', async () => {
  const { runInNewContext } = await import('node:vm');
  const { CSP_PREHYDRATION_SCRIPT } = await import('../lib/csp-prehydration.js');
  const navigation = new Map(), events = new Map();
  const window = {
    navigation: { addEventListener: (name, fn) => navigation.set(name, fn) },
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener() {},
    location: { href: 'https://example.test/en/client/tests', replace() {} },
  };
  runInNewContext(CSP_PREHYDRATION_SCRIPT, { window });
  navigation.get('navigate')({ destination: { sameDocument: true } });
  assert.equal(window.__hhOptionalReadsDeparting, false);
  navigation.get('navigate')({ destination: { sameDocument: false } });
  assert.equal(window.__hhOptionalReadsDeparting, true);
  // A later router replace cannot erase an already departing document.
  navigation.get('navigate')({ destination: { sameDocument: true } });
  assert.equal(window.__hhOptionalReadsDeparting, true);
  events.get('pageshow')();
  assert.equal(window.__hhOptionalReadsDeparting, false);
});
