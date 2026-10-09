import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner-supplied original Reiki Yggdrasil meditation has exact verified YouTube source", async () => {
  const [registry, landing, featured, player] = await Promise.all([
    readFile("data/academy/english-guided-meditations.ts", "utf8"),
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-meditation-feature.tsx", "utf8"),
    readFile("components/academy-video-player.tsx", "utf8"),
  ]);
  assert.match(registry, /key: "reiki-yggdrasil"[\s\S]*?youtubeId: "80xZ7jN6o2Y"/);
  assert.match(registry, /Meditation - Reiki Yggdrasil Class/);
  assert.match(featured, /<AcademyVideoPlayer youtubeId=\{recording.youtubeId\}/);
  assert.match(featured, /www\.youtube\.com\/watch\?v=/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /useState\(false\)/);
  assert.ok(landing.indexOf("<YggdrasilMeditationFeature") < landing.indexOf("<YggdrasilTestimonials"));
  assert.doesNotMatch(featured, /wN_SNwZ1Epo|qM_nFUkYJ1k/);
});

test("all previously verified video testimonials remain visible and are grouped honestly", async () => {
  const [component, sources] = await Promise.all([
    readFile("components/yggdrasil-testimonials.tsx", "utf8"),
    readFile("data/academy/yggdrasil-testimonials.ts", "utf8"),
  ]);
  assert.match(component, /yggdrasilVideoTestimonials.map/);
  assert.match(component, /Eight-part student video diary/);
  assert.match(component, /index === 2/);
  assert.doesNotMatch(component, /<details/);
  for (const id of ["wN_SNwZ1Epo", "3Apc8P1Yudc", "XvMdX5czoOc", "hjmVJrgEsZ8", "u275Zz78vhs", "3msoUyWr6bY", "0G_xvbuClII", "Hk9XpeUI0BQ", "Nx8DwWk27VY", "p29qu8-dtZk"]) {
    assert.ok(sources.includes(id), "Missing original video " + id);
  }
});

test("photo-led five Basic Course steps display every original attunement name", async () => {
  const [overview, course, translations] = await Promise.all([
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("data/academy/yggdrasil-curriculum.json", "utf8"),
    readFile("data/academy/yggdrasil-en-settings-l1.json", "utf8"),
  ]);
  const steps = JSON.parse(course).levels[0].steps;
  const translated = JSON.parse(translations);
  assert.equal(steps.length, 5);
  assert.equal(steps.reduce((n, step) => n + step.settings.length, 0), 23);
  assert.ok(steps.every(step => step.settings.every(setting => Boolean(translated[setting.id]?.title))));
  assert.match(overview, /step.settings.map\(\(setting, index\)/);
  assert.match(overview, /basicAttunementName\(locale, step, setting, index\)/);
  assert.match(overview, /basicSpanishAttunements/);
});
