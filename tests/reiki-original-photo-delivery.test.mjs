import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("Reiki original photos use verified same-origin static assets, not optimizer or browser hotlinks", () => {
  const helper = read("lib/academy/reiki-photo.ts");
  const config = read("next.config.ts");
  assert.ok(helper.includes("reiki-photo-assets.json"));
  assert.ok(helper.includes("new URL(src)"));
  assert.ok(helper.includes("decodeURIComponent(source.pathname)"));
  assert.ok(!helper.includes("/_next/image"));
  assert.ok(helper.includes("return src;"));
  assert.ok(!config.includes("images: { unoptimized: true"));
});

test("Tantra Reiki retains the three festival, nine stage, hero and source gallery originals", () => {
  const archive = JSON.parse(read("data/academy/tantra-reiki-full.generated.json"));
  const story = read("components/tantra-reiki-story.tsx");
  const journey = read("components/tantra-reiki-journey.tsx");
  const page = read("components/academy-record-page.tsx");
  assert.equal(archive.images.ru.length, 23);
  assert.ok(story.includes("eventPhotos.map"));
  assert.ok(story.includes("src={reikiPhotoUrl(photo.src, 640)}"));
  assert.ok(journey.includes("src={reikiPhotoUrl(photo.src, 1200)}"));
  assert.ok(page.includes("reikiPhotoUrl(tantraReikiFullArchive.images.ru[12], 1200)"));
  assert.ok(page.includes("reikiPhotoUrl(src, 640)"));
  assert.ok(page.includes("href={src}")); // Original clickable archive URLs preserved.
  const nums = journey.split("src: tantraReikiArchive.images.ru[").slice(1)
    .map((part) => Number(part.split("]")[0]));
  assert.equal(nums.length, 9);
  assert.equal(new Set(nums).size, 9);
  for (const index of [0, 10, 11, 12, ...nums]) {
    assert.ok(archive.images.ru[index].startsWith("https://www.psitrends.com/images/"));
  }
});

test("Yggdrasil keeps the existing five real Basic Course level photos throughout the site", () => {
  const landing = read("components/yggdrasil-program-landing.tsx");
  const curriculum = read("components/yggdrasil-curriculum.tsx");
  const archive = read("components/yggdrasil-source-archive.tsx");
  const map = read("data/academy/yggdrasil-program-map.ts");
  assert.ok(landing.includes("const basicLevelPhotos: Record<number, string>"));
  assert.ok(curriculum.includes("const basicLevelPhotos: Record<number, string>"));
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
  assert.ok(landing.includes("reikiPhotoUrl(url, 1200)"));
  assert.ok(curriculum.includes("reikiPhotoUrl(visualPhoto, 1200)"));
  assert.ok(archive.includes("reikiPhotoUrl(displayUrl, 640)"));
  assert.ok(archive.includes("href={src}"));
  assert.ok(map.includes('localUrl: "/academy/reiki-yggdrasil/source/basic-program.jpg"'));
});
