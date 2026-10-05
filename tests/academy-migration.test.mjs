import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("Academy migration produces a substantial bilingual source-backed corpus", async () => {
  const records = await readJson("data/academy/sources.generated.json");
  assert.equal(records.length, 42);
  assert.ok(records.some((record) => record.sourceLocale === "en"));
  assert.ok(records.some((record) => record.sourceLocale === "ru"));
  for (const record of records) {
    assert.match(record.sourceUrl, /^https:\/\/psitrends\.com\//);
    assert.ok(record.routeKey);
    assert.ok(record.logicalId);
    assert.ok(["ACADEMY_HISTORICAL","ACADEMY_VIDEO"].includes(record.classification));
    assert.match(record.contentHash, /^fnv32:[a-f0-9]{8}$/);
    assert.equal(record.hashAlgorithm, "fnv1a32");
  }
});

test("known training families map into stable native Academy route keys", async () => {
  const records = await readJson("data/academy/sources.generated.json");
  const keys = new Set(records.map((record) => record.routeKey));
  for (const key of ["reiki/yggdrasil","reiki/tantra-reiki","reiki/master-shamanic-healing","path/magister-archetypal-therapies","mysteries/initiations","mysteries/archetypes-of-love","mysteries/archetypes-of-gods","runes/runes-business","elements/elemental-magic","symbolic/artifacts-talismans","videos/sun-meditations","videos/greek-mysteries-dionysus","videos/maya-archetypes","history"]) assert.ok(keys.has(key), "missing Academy route key " + key);
});

test("Yggdrasil preserves the source module hierarchy", async () => {
  const records = await readJson("data/academy/sources.generated.json");
  const yggdrasil = records.find((record) => record.routeKey === "reiki/yggdrasil" && record.sourceLocale === "en");
  assert.ok(yggdrasil);
  const text = yggdrasil.content.map((block) => block.text).join("\n");
  assert.match(text, /Module 1: Basic Program of Reiki Yggdrasil/i);
  assert.match(text, /Advanced Shamanic Therapy/i);
  assert.match(text, /Temple Studies/i);
  assert.match(text, /Advanced Runes Magic|Scandinavian Runes/i);
  assert.match(text, /Western European Magic/i);
  assert.match(text, /Taoism/i);
});

test("migration mapping keeps redirects disabled, deduplicated, and separates Library and Services", async () => {
  const [urlMap, preservation] = await Promise.all([
    readJson("data/academy/url-map.generated.json"),
    readJson("data/academy/preservation.generated.json"),
  ]);
  const backupRows = urlMap.filter((row) => String(row.classification || "").startsWith("BACKUP_"));
  assert.equal(backupRows.length, preservation.length);
  assert.equal(new Set(backupRows.map((row) => row.sourceUrl + "|" + row.classification)).size, backupRows.length);
  assert.ok(urlMap.some((row) => row.classification === "LIBRARY_MATERIAL"));
  assert.ok(urlMap.some((row) => row.classification === "SERVICES_MATERIAL"));
  assert.ok(urlMap.some((row) => row.classification === "REDIRECT_ONLY"));
  assert.ok(urlMap.every((row) => row.redirectNow === false));
});

test("backup-only educational sources are fully classified and reconciled without new Academy routes", async () => {
  const [records, preservation, summary, needsReview, sourceManifest] = await Promise.all([
    readJson("data/academy/sources.generated.json"),
    readJson("data/academy/preservation.generated.json"),
    readJson("data/academy/preservation-summary.generated.json"),
    readJson("data/academy/needs-review.generated.json"),
    readFile("docs/academy-source-manifest.csv", "utf8"),
  ]);
  const classes = new Set(["Academy", "Library", "Services", "Archive", "Duplicate", "Private Preserve", "System Ignore", "Needs Review"]);
  assert.ok(preservation.length >= 80);
  assert.equal(summary.backupEvidenceRecordCount, preservation.length);
  assert.equal(summary.backupSourceIdCount, summary.classifiedSourceIdCount);
  assert.equal(summary.unclassifiedSourceIdCount, 0);
  assert.equal(summary.classificationCounts["Needs Review"], 0);
  assert.equal(needsReview.length, 0);
  assert.equal(summary.privateDataRead, false);
  assert.ok(summary.backupSourceIdCount >= 100);
  assert.match(summary.sourceEvidence.inventorySha256, /^[a-f0-9]{64}$/);
  assert.match(summary.sourceEvidence.urlMapSha256, /^[a-f0-9]{64}$/);
  assert.match(summary.sourceEvidence.backupManifestSha256, /^[a-f0-9]{64}$/);
  for (const source of preservation) {
    assert.ok(classes.has(source.preservationClassification));
    assert.ok(source.sourceIds.length);
    assert.match(source.sourceContentHash, /^[a-f0-9]{64}$/);
  }
  for (const source of preservation.filter((row) => row.preservationClassification === "Academy")) {
    assert.ok(records.some((record) => record.logicalId === source.logicalId));
    assert.ok(source.canonicalAcademyUrl);
  }
  assert.deepEqual(needsReview.map((row) => row.provenanceKey).sort(), preservation.filter((row) => row.preservationClassification === "Needs Review").map((row) => row.provenanceKey).sort());
  assert.match(sourceManifest, /preservationClassification/);
  assert.ok(records.some((record) => record.backupProvenance?.length));
});

test("native Academy routes replace the old external navigation destination", async () => {
  const [navigation, localeSource, page, sitemap] = await Promise.all([
    readFile("lib/site-navigation-model.js", "utf8"),
    readFile("lib/public-locales.ts", "utf8"),
    readFile("app/[locale]/academy/[[...slug]]/page.tsx", "utf8"),
    readFile("app/sitemap.ts", "utf8"),
  ]);
  assert.doesNotMatch(navigation, /psitrends\.com\/academy/);
  assert.match(navigation, /academy/);
  assert.match(localeSource, /academy/);
  assert.match(page, /AcademyHub/);
  assert.match(page, /AcademyRecordPage/);
  assert.match(sitemap, /academyRecordPaths/);
});

test("Academy mobile UI reuses compact Library rows and poster-first video", async () => {
  const [academyCss, iaCss, video] = await Promise.all([
    readFile("app/academy.css", "utf8"),
    readFile("app/ia-v2.css", "utf8"),
    readFile("components/academy-video-player.tsx", "utf8"),
  ]);
  assert.match(iaCss, /\.library-index-card \{ min-height: 74px; grid-template-columns: 76px/);
  assert.match(academyCss, /academy-index-card/);
  assert.match(academyCss, /@media \(max-width: 600px\)/);
  assert.match(video, /useState\(false\)/);
  assert.match(video, /youtube-nocookie\.com\/embed/);
});


test("Academy program titles are localized without rewriting source records", async () => {
  const [catalog, hub, recordPage, routePage] = await Promise.all([
    readFile("data/academy/catalog.ts", "utf8"),
    readFile("components/academy-hub.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("app/[locale]/academy/[[...slug]]/page.tsx", "utf8"),
  ]);
  assert.match(catalog, /academyProgramTitles/);
  assert.match(catalog, /"reiki\/free-energy-healing".*Введение в энергетическую практику/);
  assert.match(catalog, /"videos\/greek-mysteries-dionysus".*Misterios griegos — Dioniso/);
  assert.match(catalog, /academyDisplayTitle/);
  assert.match(hub, /academyDisplayTitle\(record, locale\)/);
  assert.match(recordPage, /academyDisplayTitle\(record, locale\)/);
  assert.match(recordPage, /academyPublicBlocks\(record\)/);
  assert.match(catalog, /free online course\|limited time\|register/);
  assert.match(routePage, /academyDisplayTitle\(record, locale\)/);
  assert.match(recordPage, /makeFacultiesRecord\(record: AcademySourceRecord, locale: PublicLocale\)/);
});


test("Tantra Reiki has curated bilingual source-backed course content instead of an empty shell", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /"reiki\/tantra-reiki"/);
  assert.match(catalog, /Nine levels of study/);
  assert.match(catalog, /Девять ступеней/);
  assert.match(catalog, /Level 9 — Fullness of Unity/);
  assert.match(catalog, /9 ступень — Полнота Единства/);
  assert.match(catalog, /academySourceBlocks\(record\)/);
});


test("sparse Academy records use curated recovery and never outrank a substantive sibling", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  for (const id of [
    "mysteries/initiations",
    "mysteries/hypno-love",
    "mysteries/egyptian-hypno-course",
    "mysteries/guidance-of-gods",
    "mysteries/archetypes-of-love",
    "runes/runes-business",
    "elements/water",
    "symbolic/artifacts-talismans",
  ]) assert.match(catalog, new RegExp('"'+id.replaceAll("/", "\\/")+'"'));
  assert.match(catalog, /academyRecordHasBody/);
  assert.match(catalog, /compareAcademyRecords/);
  assert.match(catalog, /Number\(!academyRecordHasBody\(a\)\)/);
});


test("fallback-only Academy pages have curated EN/RU public bodies", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /"mysteries\/archetypes-of-gods"/);
  assert.match(catalog, /Great Mysteries — Archetypes of the Gods/);
  assert.match(catalog, /Большие мистерии — Архетипы Богов/);
  assert.match(catalog, /"elements\/elemental-magic"/);
  assert.match(catalog, /Elemental Magic — course overview/);
  assert.match(catalog, /Магия Стихий — обзор курса/);
  assert.match(catalog, /"history": \{/);
  assert.match(catalog, /Academy history — archive overview/);
  assert.match(catalog, /История Академии — архивный обзор/);
  assert.match(catalog, /Old prices, diagnostic promises/);
  assert.match(catalog, /Старые акции, цены/);
});
