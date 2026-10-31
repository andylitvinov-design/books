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

test("RU archive reuses photo-left course cards and preserved native destinations without enrollments", async () => {
  const [hub, discovery, css, cards, photoCss, route] = await Promise.all([
    read("components/academy-hub.tsx"),
    read("components/academy-discovery.tsx"),
    read("components/academy-discovery.module.css"),
    read("components/academy-course-card-list.tsx"),
    read("components/academy-course-card-list.module.css"),
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
  ]);
  assert.match(hub, /record\.sourceProvider === "psimaster"/);
  assert.match(hub, /record\.sourceLocale === "ru"/);
  assert.match(hub, /psimasterVideoIds\.has\(record\.logicalId\)/);
  assert.match(hub, /href: "\/" \+ locale \+ "\/academy\/" \+ record\.routeKey/g);
  assert.match(hub, /legacyCourses=\{legacyCourses\} legacyVideos=\{legacyVideos\}/);

  assert.match(discovery, /<AcademyCourseCardList locale={locale} items={visibleLegacyCourses}/);
  assert.match(discovery, /<AcademyCourseCardList locale={locale} items={matchedLegacyVideos}/);
  assert.match(cards, /data-psimaster-course={item.archiveKind === "course" \? item.id : undefined}/);
  assert.match(cards, /data-psimaster-video={item.archiveKind === "video" \? item.id : undefined}/);
  assert.match(cards, /<Image[\s\S]+src={cardArtworkUrl\(item.image\)}/);
  assert.match(photoCss, /grid-template-columns: minmax\(98px, 30%\) minmax\(0, 1fr\)/);
  assert.match(hub, /image: recordImage\(record, index\)/);
  assert.match(hub, /image: recordImage\(record\)/);
  assert.match(hub, /archiveKind: "course"/);
  assert.match(hub, /archiveKind: "video"/);
  assert.match(hub, /Актуальный набор и наличие видеоуроков не подтверждены/);
  assert.doesNotMatch(discovery, /legacyLink/);
  assert.doesNotMatch(css, /\.legacyGrid\s*\{/);
  assert.match(discovery, /matchedLegacyCourses = useMemo/);
  assert.match(discovery, /matchedLegacyVideos = useMemo/);
  assert.match(discovery, /isSearching \|\| showAllLegacy/);
  assert.match(discovery, /aria-expanded=\{showAllLegacy\}/);
  assert.match(discovery, /href="#academy-psimaster-courses"/);
  assert.match(css, /@media \(max-width: 700px\) \{\s*\.journeyHero \{[\s\S]*?\.quickPaths \{ grid-template-columns: minmax\(0,1fr\); gap: 7px; \}\s*\.pathCard \{ display: grid; grid-template-columns: 82px minmax\(0,1fr\) 19px; align-items: center; gap: 10px; min-height: 98px/);
  assert.match(route, /const record = findAcademyRecord\(key, locale\)/);
  assert.match(route, /return <AcademyRecordPage locale=\{locale\} record=\{record\}/);
  assert.doesNotMatch(discovery, /psimaster\.net/);
});

test("EN and ES public catalogues never market the Russian-only PsiMaster courses or Russian voiceovers", async () => {
  const [hub, discovery, catalog, videos, sitemap] = await Promise.all([
    read("components/academy-hub.tsx"),
    read("components/academy-discovery.tsx"),
    read("data/academy/catalog.ts"),
    read("components/academy-video-courses.tsx"),
    read("app/sitemap.ts"),
  ]);
  assert.match(catalog, /locale !== "ru" && record.sourceLocale === "ru"/);
  assert.match(hub, /const legacyCourses: AcademyArchiveButton\[\] = locale === "ru"/);
  assert.match(hub, /const legacyVideos: AcademyArchiveButton\[\] = locale === "ru"/);
  assert.match(hub, /locale === "ru" \|\| item.id !== "academy-featured-egypt-priesthood"/);
  assert.match(videos, /if \(locale === "ru"\) groups.push\(\{ language: "ru"/);
  assert.match(videos, /language: "en"/);
  assert.match(discovery, /matchedLegacyCourses.length > 0 \|\| matchedLegacyVideos.length > 0/);
  assert.match(discovery, /\{legacyCourses\.length \|\| legacyVideos\.length \? \(\s*<a className=\{styles\.archiveLink\} href="#academy-psimaster-courses">[\s\S]*?<\/a>\s*\) : null\}/);
  assert.match(sitemap, /preferredAcademyRecords\(locale\)/);
  assert.match(sitemap, /locale === "ru" \|\| suffix !== "\/egyptian-priesthood"/);
  // Keep all original route data for RU and old bookmarks; no destructive deletion.
  const all = await readJson("data/academy/psimaster-sources.generated.json");
  assert.equal(all.length, 22);
  assert.ok(all.every((entry) => entry.sourceLocale === "ru"));
});

test("a PsiMaster taxonomy entry without trustworthy source body stays out of public course buttons", async () => {
  const [inventory, published] = await Promise.all([
    readJson("data/academy/psimaster-inventory.generated.json"),
    readJson("data/academy/psimaster-sources.generated.json"),
  ]);
  const missing = inventory.records.filter((item) => item.classification === "AcademyMissingBody");
  assert.equal(missing.length, 1);
  assert.equal(missing[0].sourceTaxonomyId, "12434");
  assert.ok(!published.some((item) => item.sourceTaxonomyId === missing[0].sourceTaxonomyId));
});
