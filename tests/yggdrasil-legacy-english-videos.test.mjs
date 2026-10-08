import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("historical Reiki Yggdrasil reviews are not called lessons or meditations", async () => {
  const source = await readFile("data/academy/yggdrasil-legacy-english-videos.ts", "utf8");
  for (const id of [
    "XvMdX5czoOc", "hjmVJrgEsZ8", "u275Zz78vhs", "wN_SNwZ1Epo",
    "3Apc8P1Yudc", "3msoUyWr6bY", "0G_xvbuClII",
    "Hk9XpeUI0BQ", "p29qu8-dtZk", "Nx8DwWk27VY",
  ]) {
    assert.ok(source.includes(id), "Preserve provenance for " + id);
  }
  assert.match(source, /yggdrasilEnglishOverviewVideos: YggdrasilLegacyVideo\[\] = \[\]/);
  assert.match(source, /yggdrasilEnglishStepVideos: Record<string, YggdrasilLegacyVideo\[\]> = \{\}/);
  assert.match(source, /classification: "testimonial"/);
  assert.doesNotMatch(source, /title: "What really is Reiki Yggdrasil"/);
  assert.doesNotMatch(source, /title: "About the Healing attunement"/);
});

test("new English practice listing has three distinct source-gated entries", async () => {
  const data = await readFile("data/academy/english-guided-meditations.ts", "utf8");
  const ids = ["flight-to-sun", "tantra-reiki", "reiki-yggdrasil"];
  for (const id of ids) assert.match(data, new RegExp('key: "' + id + '"'));
  assert.equal((data.match(/youtubeId: null,/g) ?? []).length, 3, "No invented YouTube IDs");
  assert.ok(data.includes("/en/academy/reiki/tantra-reiki"));
  assert.ok(data.includes("/en/academy/reiki/yggdrasil"));
  assert.ok(!data.includes("qM_nFUkYJ1k"), "Never substitute the Tantra Reiki testimonial");
});

test("English-only Academy paths use poster-first playback only after confirmation", async () => {
  const [page, hub, recording] = await Promise.all([
    readFile("components/english-guided-meditations.tsx", "utf8"),
    readFile("components/academy-hub.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  assert.match(page, /item\.youtubeId \? \(/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{item\.youtubeId\}/);
  assert.match(page, /<Image src=\{item\.image\}/);
  assert.match(hub, /locale === "en" && view === "videos" \? <EnglishGuidedMeditations \/>/);
  assert.match(recording, /locale === "en" \? <EnglishGuidedMeditations focus="tantra-reiki"/);
  assert.match(recording, /qM_nFUkYJ1k/);
  assert.match(recording, /participant testimonial/);
});

test("legacy English review videos are not injected into specific Yggdrasil teaching steps", async () => {
  const [curriculum, guide, hub, module] = await Promise.all([
    readFile("components/yggdrasil-curriculum.tsx", "utf8"),
    readFile("components/yggdrasil-english-video-guide.tsx", "utf8"),
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-module-landing.tsx", "utf8"),
  ]);
  assert.match(curriculum, /yggdrasilEnglishStepVideos\[step\.id\] \?\? \[\]/);
  assert.match(guide, /locale === "en"/);
  assert.match(guide, /<EnglishGuidedMeditations focus="reiki-yggdrasil"/);
  assert.match(hub, /<YggdrasilTestimonials/);
  assert.match(hub, /<YggdrasilEnglishVideoGuide/);
  assert.match(module, /<YggdrasilEnglishVideoGuide/);
  assert.doesNotMatch(guide, /General introduction/);
});
