import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const read = async (path) => readFile(path, "utf8");

test("every curated Russian PsiMaster course is routed to one native Holistic House Academy page", async () => {
  const [programs, legacy] = await Promise.all([
    readJson("data/academy/psimaster-sources.generated.json"),
    readJson("data/academy/sources.generated.json"),
  ]);
  assert.equal(programs.length, 22);
  assert.equal(new Set(programs.map((record) => record.routeKey)).size, programs.length);
  assert.equal(new Set(programs.map((record) => record.logicalId)).size, programs.length);
  for (const course of programs) {
    assert.equal(course.sourceProvider, "psimaster");
    assert.equal(course.sourceLocale, "ru");
    assert.ok(course.routeKey && !course.routeKey.startsWith("/") && !course.routeKey.includes("?"));
    assert.match(course.sourceUrl, /^https:\/\/psimaster\.net\/service\?/);
    assert.ok(course.content?.length >= 2, "Missing public source-backed content: " + course.logicalId);
    assert.ok(!legacy.some((record) => record.routeKey === course.routeKey), "Duplicate Academy source route: " + course.routeKey);
  }
});

test("all recovered PsiMaster video families have existing Russian-language Academy pages", async () => {
  const [videos, records] = await Promise.all([
    readJson("data/academy/psimaster-media.generated.json"),
    readJson("data/academy/sources.generated.json"),
  ]);
  const videoIds = [...new Set(videos.map((item) => item.logicalId))];
  assert.equal(videoIds.length, 7);
  assert.equal(videos.length, 45);
  for (const id of videoIds) {
    assert.ok(records.some((record) => record.logicalId === id && record.direction === "videos" && record.sourceLocale === "ru"),
      "Missing RU Academy video landing page: " + id);
  }
});

test("Academy home exposes searchable compact native links and the expanded list without treating archives as enrollments", async () => {
  const [hub, discovery, css, route] = await Promise.all([
    read("components/academy-hub.tsx"),
    read("components/academy-discovery.tsx"),
    read("components/academy-discovery.module.css"),
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
  ]);
  assert.match(hub, /record\.sourceProvider === "psimaster"/);
  assert.match(hub, /record\.sourceLocale === "ru"/);
  assert.match(hub, /psimasterVideoIds\.has\(record\.logicalId\)/);
  assert.match(hub, /href: "\/" \+ locale \+ "\/academy\/" \+ record\.routeKey/g);
  assert.match(hub, /legacyCourses=\{legacyCourses\} legacyVideos=\{legacyVideos\}/);
  assert.match(discovery, /data-psimaster-course=\{item\.id\}/);
  assert.match(discovery, /data-psimaster-video=\{item\.id\}/);
  assert.match(discovery, /matchedLegacyCourses = useMemo/);
  assert.match(discovery, /matchedLegacyVideos = useMemo/);
  assert.match(discovery, /isSearching \|\| showAllLegacy/);
  assert.match(discovery, /aria-expanded=\{showAllLegacy\}/);
  assert.match(discovery, /href="#academy-psimaster-courses"/);
  assert.match(css, /\.legacyGrid\s*\{/);
  assert.match(css, /@media \(max-width: 620px\)\s*\{\s*\.quickPaths\s*\{ grid-template-columns: repeat\(2/);
  assert.match(route, /const record = findAcademyRecord\(key, locale\)/);
  assert.match(route, /return <AcademyRecordPage locale=\{locale\} record=\{record\}/);
  assert.doesNotMatch(discovery, /psimaster\.net/);
});

test("a PsiMaster taxonomy entry without trustworthy source body stays out of public course buttons", async () => {
  const [inventory, published] = await Promise.all([
    readJson("data/academy/psimaster-inventory.generated.json"),
    readJson("data/academy/psimaster-sources.generated.json"),
  ]);
  const missing = inventory.records.filter((item) => item.classification === "AcademyMissingBody");
  assert.equal(missing.length, 1);
  assert.ok(!published.some((item) => item.sourceTaxonomyId === String(missing[0].taxonomyId ?? missing[0].id)));
});
