import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all approved service videos reuse exactly reviewed EN/RU sources, never generated or Drive links", () => {
  const registry = read("data/service-video-library.ts");
  for (const id of ["s30Y42IwPcg", "Cz6SxXJNZbw", "ILyRWyHtJoE", "Q9NvYECKWuc",
    "8c1634ce904434a91931429b6a7eefe1", "7c6b243f048b9c0581ae29619a4a89fc"]) {
    assert.ok(registry.includes(id), "missing original approved media " + id);
  }
  assert.match(registry, /siteVideoWatchUrl/);
  assert.match(registry, /locale === "es" \? "en" : locale/);
  assert.match(registry, /general: true/);
  assert.doesNotMatch(registry, /drive\.google\.com|private|clientId|api[_-]?key|autoplay/);
  for (const poster of ["services-en-v2.webp", "services-ru-v1.webp", "constellations-en-v1.webp",
    "hypnotherapy-en-v1.webp", "homeopathy-en-v2.webp", "homeopathy-ru-v1.webp"]) {
    const path = "public/images/holistic-house/video-posters/" + poster;
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), path);
    const magic = readFileSync(new URL("../" + path, import.meta.url)).subarray(0, 12);
    assert.equal(magic.toString("ascii", 0, 4), "RIFF");
    assert.equal(magic.toString("ascii", 8, 12), "WEBP");
  }
});

test("the shared Services video gallery stays expanded after testimonials and before cart booking", () => {
  const extras = read("components/services-studio-extras.tsx");
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    const intro = page.indexOf("<ServicesIntroMedia");
    const testimonials = page.indexOf("<PersonalTestimonials");
    const methods = page.indexOf("<ServicesMethodVideos");
    const booking = page.indexOf("<PublicConsultationCta");
    assert.ok(intro >= 0 && testimonials > intro && methods > testimonials && booking > methods,
      path + ": introduction, testimonials, expanded methods and cart booking retain their current composition");
  }
  assert.match(extras, /<details[^>]*id="method-videos"[^>]*\bopen>/);
  assert.match(extras, /<PageVideo slot="services-intro" locale=\{locale\} \/>/);
  assert.match(extras, /<PageVideo slot="method-hypnotherapy" locale=\{locale\} \/>/);
  assert.match(extras, /<PageVideo slot="method-constellations" locale=\{locale\} \/>/);
  assert.match(extras, /<ServiceVideoShowcase locale="es" topic="hypnotherapy" id="es-service-video-hypnotherapy"/);
  assert.match(extras, /<ServiceVideoShowcase locale="es" topic="constellations" id="es-service-video-constellations"/);
  assert.doesNotMatch(extras, /<iframe/);
  const browser = read("scripts/verify-site-video-browser.mjs");
  assert.match(browser, /getAttribute\('open'\) === null/);
});

test("Services cards keep exact method media accessible on-page with transcript if the HeyGen player fails", () => {
  const cards = read("components/services-solutions.tsx");
  const css = read("components/services-solutions.module.css");
  assert.match(cards, /getServiceVideoWatchUrl\(offer\.id, locale\)/);
  assert.match(cards, /data-service-card-video=\{offer\.id\}/);
  assert.match(cards, /locale === "ru" \? getServiceVideoWatchUrl\(offer\.id, locale\) :/);
  assert.match(cards, /\$\{offer\.href\}#service-video/);
  assert.match(cards, /Video & transcript/);
  assert.match(cards, /target=\{locale === "ru" \? "_blank" : undefined\}/);
  assert.match(cards, /isHome \? homepageMedia\[offer\.id\] : offer\.image/);
  assert.match(css, /\.cardVideo/);
  assert.match(css, /\.card\{position:relative/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.doesNotMatch(cards, /<iframe/);
});

test("video-bearing service details retain accurate EN/RU/ES media and disclosure", () => {
  const showcase = read("components/service-video-showcase.tsx");
  const css = read("components/service-video-showcase.module.css");
  const core = read("components/core-service-detail.tsx");
  const personal = read("components/personal-service-landing.tsx");
  const free = read("app/[locale]/services/free-situation-review/page.tsx");
  const freeLanding = read("components/free-entry-landing.tsx");
  assert.match(core, /<ServiceVideoShowcase topic=\{kind === "dao" \? "overview" : kind\} locale=\{locale\} id="service-video"/);
  assert.match(personal, /<ServiceVideoShowcase/);
  assert.match(personal, /service === "psychohomeopathy" \? "homeopathy"/);
  assert.match(personal, /service === "imagery-therapy" \? "hypnotherapy"/);
  assert.match(free, /<FreeEntryLanding locale=\{locale\} kind="situation"/);
  // Only the written review includes a general introduction. Dao is a compact
  // resource-request landing and does not regain the removed unrelated video.
  assert.match(freeLanding, /\{kind === "situation" \? <div[^>]*><ServiceVideoShowcase topic="overview" locale=\{locale\} id="service-video" \/><\/div> : null\}/);
  assert.match(showcase, /<SiteVideoPlayer video=\{video\.video\} locale=\{locale\}/);
  assert.match(showcase, /textLanguage=\{video\.video\.language\}/);
  assert.match(showcase, /data-video-kind=\{video\.general \? "general" : "method"\}/);
  assert.match(showcase, /"Vídeo · audio en inglés"/);
  assert.match(showcase, /Отдельного русскоязычного ролика/);
  assert.match(showcase, /не заменяющей медицинскую помощь/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
});

test("six identity-verified public intro videos use YouTube on Play while retaining original HeyGen source", () => {
  const player = read("components/site-video-player.tsx");
  const minimal = read("components/site-video-minimal.module.css");
  for (const id of ["Y4K4piEwwA8", "s30Y42IwPcg", "ILyRWyHtJoE", "AE8Pelpo424", "Cz6SxXJNZbw", "Q9NvYECKWuc"]) {
    assert.ok(player.includes(id), "published mirror not accessible: " + id);
  }
  assert.match(player, /existingYouTubeMirrors/);
  assert.ok(player.includes("{mirrorLink && <div className={styles.quickWatch}>{mirrorLink}</div>}"));
  assert.match(player, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /https:\/\/app\.heygen\.com\/embeds\//);
  assert.match(player, /data-video-playback=\{playbackYouTubeId \? "youtube" : "heygen"\}/);
  assert.match(player, /!playbackYouTubeId && showRecovery/);
  assert.match(player, /data-video-recovery="heygen"/);
  assert.match(player, /transcriptRef\.current\.open = true/);
  assert.match(minimal, /\.quickWatch/);
  assert.match(minimal, /\.recovery/);
});

test("method showcases expose direct original HeyGen fallback and release tests handle open galleries", () => {
  const showcase = read("components/service-video-showcase.tsx");
  const css = read("components/service-video-showcase.module.css");
  const verifier = read("scripts/verify-page-video-release.mjs");
  assert.ok(showcase.includes("siteVideoWatchUrl(video.video)"));
  assert.ok(showcase.includes("className={styles.original}"));
  assert.ok(showcase.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(css.includes(".original:focus-visible"));
  assert.ok(verifier.includes("disclosure.getAttribute('open') === null"));
});

