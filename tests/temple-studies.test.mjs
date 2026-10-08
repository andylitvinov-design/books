import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Academy still presents three coherent programs and separates the archive", () => {
  const hub = read("components/academy-hub.tsx");
  for (const id of ["academy-featured-yggdrasil", "academy-featured-tantra-reiki", "academy-featured-temple-studies"]) {
    assert.match(hub, new RegExp(id));
  }
  assert.match(hub, /academy-archive-nav/);
});

test("Temple Studies is exactly one progressive seven-stage curriculum", () => {
  const source = read("data/academy/temple-studies-curriculum.ts");
  const stageIds = [...source.matchAll(/^    id: "([^"]+)",$/gm)].map((match) => match[1]);
  assert.deepEqual(stageIds, ["foundations", "greek", "egypt", "traditions", "symbols", "initiation", "application"]);
  assert.equal(new Set(stageIds).size, 7);
  for (const lang of ["en", "ru", "es"]) {
    const count = [...source.matchAll(new RegExp("^      " + lang + ": \\{", "gm"))].length;
    assert.equal(count, 7, "seven full " + lang + " modules required");
  }
  assert.match(source, /question → symbolism|запрос → символ/);
  assert.match(source, /validateTempleCurriculum/);
});

test("Each original course is owned by just one stage (no duplicate program content)", () => {
  const source = read("data/academy/temple-studies-curriculum.ts");
  const assignments = [...source.matchAll(/sourceIds: \[([^\]]*)\]/g)];
  assert.equal(assignments.length, 7);
  const owner = new Map();
  for (const [index, match] of assignments.entries()) {
    const references = JSON.parse("[" + match[1] + "]");
    for (const id of references) {
      assert.ok(!owner.has(id), id + " assigned to both stages " + owner.get(id) + " and " + index);
      owner.set(id, index);
    }
  }
  assert.ok(owner.size >= 25, "the original course archive should remain meaningfully connected");
  const allOriginal = JSON.parse(read("data/academy/sources.generated.json"))
    .concat(JSON.parse(read("data/academy/psimaster-sources.generated.json")));
  const available = new Set(allOriginal.map((record) => record.logicalId));
  for (const id of owner.keys()) assert.ok(available.has(id), "source not in preservation catalog: " + id);
});

test("Temple page reuses the exact Yggdrasil sidebar and includes detailed reading sections", () => {
  const page = read("components/temple-studies.tsx");
  const sidebar = read("components/reiki-course-side-nav.tsx");
  const css = read("app/temple-studies.css");
  assert.match(page, /<TempleStudiesSideNavigation/);
  assert.match(sidebar, /export function TempleStudiesSideNavigation/);
  assert.match(sidebar, /<CourseSideNavigation/);
  assert.match(sidebar, /observeSections/);
  assert.match(sidebar, /sectionId: "temple-" \+ stage\.id/);
  assert.match(page, /className="temple-course-layout"/);
  assert.match(page, /className="temple-stage-flow"/);
  assert.match(page, /className="temple-lessons"/);
  assert.match(page, /className="temple-practice"/);
  assert.match(page, /className="temple-next-stage"/);
  assert.match(page, /academyPublicBlocks\(record, locale\)/);
  assert.match(page, /findAcademyRecord\(id, locale\)/);
  assert.match(page, /<details className="temple-sources">/);
  assert.match(css, /grid-template-columns: minmax\(242px, 270px\) minmax\(0, 1fr\)/);
  assert.match(css, /position: sticky/);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /overflow-x: auto/);
});

test("Old Academy directories and historical sections stay reachable", () => {
  const route = read("app/[locale]/academy/[[...slug]]/page.tsx");
  const page = read("components/temple-studies.tsx");
  assert.match(route, /key === "temple-studies"/);
  assert.match(route, /<TempleStudies locale=\{locale\}/);
  assert.match(route, /templeLegacyAnchors\[slug\[0\]\]/);
  assert.match(route, /temple-studies#temple-/);
  assert.match(route, /<AcademyRecordPage locale=\{locale\} record=\{record\}/);
  for (const anchor of ["mysteries", "traditions", "symbols", "practice", "path"]) {
    assert.ok(page.includes('"' + anchor + '"'), 'legacy anchor alias ' + anchor + ' is still supported');
  }
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /temple-studies/);
});


test("All 41 unique recovered PsiMaster videos appear in their matching Russian Temple stage", () => {
  const media = JSON.parse(read("data/academy/psimaster-media.generated.json"));
  const assignments = read("data/academy/temple-studies-videos.ts");
  const page = read("components/temple-studies.tsx");
  const css = read("app/temple-studies.css");
  const collections = [...assignments.matchAll(/key: "(videos\/[^"]+)", stage: "([^"]+)"/g)]
    .map(([, key, stage]) => ({ key, stage }));
  assert.equal(media.length, 45, "preserved source archive remains complete");
  assert.equal(new Set(media.map((video) => video.videoId)).size, 41);
  assert.equal(collections.length, 7);
  assert.deepEqual(new Set(collections.map((record) => record.stage)),
    new Set(["greek", "egypt", "traditions", "symbols", "initiation"]));
  const assigned = new Set(collections.map((record) => record.key));
  assert.deepEqual(assigned, new Set(media.map((video) => video.logicalId)));
  const seen = new Set();
  const stageTotals = {};
  for (const { key, stage } of collections) {
    for (const video of media.filter((item) => item.logicalId === key).sort((a, b) => a.order - b.order)) {
      assert.match(video.videoId, /^[A-Za-z0-9_-]{11}$/);
      assert.ok(video.mediaUrl.includes("/embed/" + video.videoId));
      if (seen.has(video.videoId)) continue;
      seen.add(video.videoId);
      stageTotals[stage] = (stageTotals[stage] ?? 0) + 1;
    }
  }
  assert.deepEqual(stageTotals, { greek: 12, egypt: 7, traditions: 6, symbols: 14, initiation: 2 });
  assert.equal(seen.size, 41, "no same video repeated between collections");
  assert.match(page, /locale === "ru" \? templeVideoCollections/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{video\.id\}/);
  assert.match(page, /className="temple-video-series"/);
  assert.match(page, /collection\.sourceUrl/);
  assert.match(css, /\.temple-video-grid/);
  assert.match(css, /@media \(max-width: 700px\)/);
});
