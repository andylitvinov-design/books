import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeCourseDraft, assertPublishableCourse } from "../lib/practitioners/course-contracts.js";

const file = (path) => readFile(path, "utf8");
const json = async (path) => JSON.parse(await file(path));
const idFromMedia = (item) => item.mediaUrl?.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/)?.[1] ?? null;

test("every video-labelled Academy route has source-backed lessons or an explicit withholding decision", async () => {
  const [sources, psiSources, media, psiMedia, withheld, catalog, sitemap] = await Promise.all([
    json("data/academy/sources.generated.json"), json("data/academy/psimaster-sources.generated.json"),
    json("data/academy/media.generated.json"), json("data/academy/psimaster-media.generated.json"),
    json("data/academy/withheld-video-courses.json"), file("data/academy/catalog.ts"), file("app/sitemap.ts"),
  ]);
  const ids = new Set([...sources, ...psiSources].filter((s) => s.direction === "videos").map((s) => s.logicalId));
  const backed = new Set([...media, ...psiMedia].filter((m) => idFromMedia(m)).map((m) => m.logicalId));
  assert.equal(ids.size, 8, "A new family requires video release review");
  assert.equal(withheld.length, new Set(withheld).size);
  for (const id of ids) assert.equal(backed.has(id), !withheld.includes(id), "Source-backed requirement: " + id);
  for (const id of withheld) assert.ok(ids.has(id), "Stale withheld course: " + id);
  assert.ok(withheld.includes("videos/sun-meditations"));
  assert.equal([...ids].filter((id) => backed.has(id)).length, 7);
  assert.match(catalog, /videoRecords\(locale: PublicLocale\)[^\n]*\.filter\(academyHasSourceBackedVideo\)/);
  assert.match(catalog, /record\.direction === "videos" && !academyHasSourceBackedVideo\(record\) \? undefined/);
  assert.match(sitemap, /record\.direction !== "videos" \|\| academyHasSourceBackedVideo\(record\)/);
});

test("Egyptian days immediately show the original source video on their introduction screen", async () => {
  const [curriculum, learner, css, manifest] = await Promise.all([
    file("data/academy/egyptian-priesthood-curriculum.ts"), file("components/egyptian-priesthood-learner.tsx"),
    file("components/egyptian-priesthood-course.module.css"), json("data/academy/psimaster-media.generated.json"),
  ]);
  assert.equal(manifest.filter((m) => m.logicalId === "videos/egypt-osiris" && idFromMedia(m)).length, 7);
  assert.match(curriculum, /videoId: video\.id, videoTitle: video\.title, image \},/);
  assert.match(learner, /slide\.kind === "video" \|\| slide\.kind === "intro"/);
  assert.match(learner, /<AcademyVideoPlayer key=\{slide\.videoId\}/);
  assert.match(css, /\.screen\[data-egypt-slide-kind="intro"\] \.visual\{display:none;\}/);
});

test("practitioner courses require a video while allowing complete drafts with other media", async () => {
  const base = { title: "Public course", locale: "en", description: "Test", slides: [
    { id: randomUUID(), kind: "text", title: "Introduction", body: "One idea" },
  ] };
  assert.throws(() => assertPublishableCourse(normalizeCourseDraft(base)), { code: "COURSE_VIDEO_REQUIRED" });
  const audio = { ...base, slides: [{ id: randomUUID(), kind: "audio", assetId: randomUUID(), title: "Audio", body: "Practice" }] };
  assert.throws(() => assertPublishableCourse(normalizeCourseDraft(audio)), { code: "COURSE_VIDEO_REQUIRED" });
  const embed = { ...base, slides: [...base.slides,
    { id: randomUUID(), kind: "embed", title: "Film", videoUrl: "https://youtu.be/J_15bfhzOuU" },
  ] };
  assert.ok(assertPublishableCourse(normalizeCourseDraft(embed)));
  const uploaded = { ...base, slides: [...base.slides,
    { id: randomUUID(), kind: "video", title: "Film", assetId: randomUUID() },
  ] };
  assert.ok(assertPublishableCourse(normalizeCourseDraft(uploaded)));
  const builder = await file("components/app/practitioner-course-builder.jsx");
  assert.match(builder, /const hasVideo=draft\?\.slides\?\.some/);
  assert.match(builder, /!hasVideo\?t\.missingVideo/);
  assert.match(builder, /missingVideo:'Добавьте минимум один видеоурок/);
});
