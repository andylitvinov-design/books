import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("Reiki original photos are delivered via same-origin image optimization, not a browser hotlink", () => {
  const helper = read("lib/academy/reiki-photo.ts");
  const config = read("next.config.ts");
  assert.match(helper, /https:\\/\\/psitrends\\.com/);
  assert.match(helper, /new URL\\(src\\)/);
  assert.match(helper, /encodeURIComponent\\(canonical\\)/);
  assert.match(helper, /\\/_next\\/image\\?url=/);
  assert.match(helper, /return src;/); // Do not rewrite already-local artwork.
  assert.match(config, /hostname: "psitrends\\.com", pathname: "\\/images\\/\\*\\*"/);
  assert.match(config, /hostname: "www\\.psitrends\\.com", pathname: "\\/images\\/\\*\\*"/);
  assert.match(config, /hostname: "i\\.ytimg\\.com"/); // Preserve existing videos.
});

test("Tantra Reiki continues showing the exact authentic festival, 9 level and hero photographs", () => {
  const archive = JSON.parse(read("data/academy/tantra-reiki-full.generated.json"));
  const story = read("components/tantra-reiki-story.tsx");
  const journey = read("components/tantra-reiki-journey.tsx");
  const page = read("components/academy-record-page.tsx");
  assert.equal(archive.images.ru.length, 23);
  assert.match(story, /eventPhotos\\.map/);
  assert.match(story, /src=\\{reikiPhotoUrl\\(photo\\.src, 640\\)\\}/);
  assert.match(journey, /src=\\{reikiPhotoUrl\\(photo\\.src, 1200\\)\\}/);
  assert.match(page, /reikiPhotoUrl\\(tantraReikiFullArchive\\.images\\.ru\\[12\\], 1200\\)/);
  assert.match(page, /reikiPhotoUrl\\(src, 640\\)/);
  assert.match(page, /href=\\{src\\}/); // Preserve originals as provenance links.
  const nums = [...journey.matchAll(/src: tantraReikiArchive\\.images\\.ru\\[(\\d+)\\]/g)]
    .map((hit) => Number(hit[1]));
  assert.equal(nums.length, 9);
  assert.equal(new Set(nums).size, 9);
  for (const index of [0, 10, 11, 12, ...nums]) {
    assert.match(archive.images.ru[index], /^https:\\/\\/www\\.psitrends\\.com\\/images\\//);
  }
});

test("Yggdrasil landing and detailed Basic Course use exactly the existing five real level photos", () => {
  const landing = read("components/yggdrasil-program-landing.tsx");
  const curriculum = read("components/yggdrasil-curriculum.tsx");
  const archive = read("components/yggdrasil-source-archive.tsx");
  const map = read("data/academy/yggdrasil-program-map.ts");
  assert.match(landing, /const basicLevelPhotos: Record<number, string>/);
  assert.match(curriculum, /const basicLevelPhotos: Record<number, string>/);
  for (const filename of [
    "Screenshot_25.png",
    "photo_2023-07-10_08-26-39.jpg",
    "Screenshot_31.png",
    "tulumhypnotherapy.jpg",
    "world_magic_traditions_overview.jpg",
  ]) {
    assert.ok(landing.includes(filename), filename);
    assert.ok(curriculum.includes(filename), filename);
  }
  assert.match(landing, /reikiPhotoUrl\\(url, 1200\\)/);
  assert.match(curriculum, /reikiPhotoUrl\\(visualPhoto, 1200\\)/);
  assert.match(archive, /reikiPhotoUrl\\(displayUrl, 640\\)/);
  assert.match(archive, /href=\\{src\\}/);
  assert.match(map, /localUrl: "\\/academy\\/reiki-yggdrasil\\/source\\/basic-program\\.jpg"/);
});
