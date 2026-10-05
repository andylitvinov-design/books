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


test("cross-locale Academy fallbacks are curated before publication", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  for (const id of ["mysteries/archetypes-of-gods","elements/elemental-magic","history"]) {
    assert.match(catalog, new RegExp('"'+id.replaceAll("/", "\\/")+'"'));
  }
  assert.match(catalog, /Great Mysteries — Archetypes of the Gods/);
  assert.match(catalog, /Большие мистерии — Архетипы Богов/);
  assert.match(catalog, /Elemental Magic — course structure/);
  assert.match(catalog, /Магия Стихий — структура курса/);
  assert.match(catalog, /Academy of Temple Arts — historical structure/);
  assert.match(catalog, /Академия Храмовых Искусств — историческая структура/);
});


test("Academy media falls back across locale variants when the local source has no video", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /const exact = mediaRecords\.filter/);
  assert.match(catalog, /exact\.some\(\(item\) => youtubeIdFromUrl\(item\.mediaUrl\)\)/);
  assert.match(catalog, /mediaRecords\.filter\(\(item\) => item\.logicalId === record\.logicalId\)/);
});


test("remaining lost Academy text is recovered from live PsiTrends sources", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /Magister of Shamanic Therapies — program map/);
  assert.match(catalog, /Eight study areas/);
  assert.match(catalog, /Видео-курс «Подкачки» — сохранившаяся структура/);
  assert.match(catalog, /Солнечные медитации/);
  assert.match(catalog, /London Festival of Holistic Temple Arts — historical archive/);
  assert.match(catalog, /Constellations of Love — historical program/);
  assert.match(catalog, /Festival details — historical program notes/);
  assert.match(catalog, /Исторические отзывы студентов/);
  assert.match(catalog, /\^loading\\\.\\\.\\\.\$/i);
});


test("full Academy preservation audit restores unique backup-only course details", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /Recovered five-initiation introductory path/);
  assert.match(catalog, /Shamanic Flight/);
  assert.match(catalog, /Recovered program lines from the live source/);
  assert.match(catalog, /Slavic \/ Northern Shamanism Level 4 — Civilization Healing, Myth and Legends/);
  assert.match(catalog, /Recovered Level 1 summary/);
  assert.match(catalog, /Recovered introduction to the Reiki Yggdrasil framework/);
  assert.match(catalog, /3\.1 — Egregors and symbolic communities/);
  assert.match(catalog, /3\.5 — Tantra Reiki \/ Beauty of Love/);
  assert.match(catalog, /КА — «витальной силой»/);
  assert.match(catalog, /ХУ — образом «тела духа»/);
  assert.match(catalog, /Talisman, amulet and artifact — distinction in the backup archive/);
  assert.match(catalog, /Recovered historical event themes/);
  assert.match(catalog, /academySupplementalPublicBlocks/);
});

test("backup-only Academy records remain fully reconciled after preservation recovery", async () => {
  const [preservation, summary] = await Promise.all([
    readJson("data/academy/preservation.generated.json"),
    readJson("data/academy/preservation-summary.generated.json"),
  ]);
  const academy = preservation.filter((row) => row.preservationClassification === "Academy");
  assert.equal(academy.length, 26);
  assert.equal(summary.backupSourceIdCount, 117);
  assert.equal(summary.unclassifiedSourceIdCount, 0);
  assert.equal(summary.classificationCounts["Needs Review"], 0);
});


test("PsiMaster Academy corpus is integrated without duplicating canonical Yggdrasil", async () => {
  const psimaster = await readJson("data/academy/psimaster-sources.generated.json");
  assert.equal(psimaster.length, 22);
  for (const logicalId of [
    "mysteries/egypt/high-wisdom",
    "mysteries/greece-rome/beauty-and-power",
    "symbolic/scandinavian-mysteries",
    "mysteries/slavic/fairy-tales-mysteries",
    "mysteries/maya-aztec/feathered-serpent",
    "symbolic/tarot/major-arcana-mysteries",
    "mysteries/zoroastrism/eastern-magic",
    "applied/business/demiurges-of-creation",
    "applied/archetypal-therapy/big-figures",
    "reiki/kundalini-reiki",
  ]) assert.ok(psimaster.some((row) => row.logicalId === logicalId), logicalId);
  assert.ok(!psimaster.some((row) => row.logicalId === "reiki/yggdrasil"), "PsiMaster must not replace canonical Yggdrasil");
  assert.ok(psimaster.every((row) => row.sourceProvider === "psimaster"));
});

test("PsiMaster content is source-backed curated and strips stale high-risk promotion", async () => {
  const psimaster = await readJson("data/academy/psimaster-sources.generated.json");
  const body = psimaster.flatMap((row) => row.content).map((block) => block.text).join("\n");
  assert.doesNotMatch(body, /t\.me\/andyhypnos|viber:|стоимость:\s*\d|получите.*в подарок/i);
  assert.match(body, /образы «прошлых жизней».*субъективный образный материал/i);
  assert.match(body, /медицинский массаж/i);
  assert.match(body, /ДНК-.*не публикуются как факты/i);
});

test("PsiMaster legacy video manifest restores public YouTube media", async () => {
  const media = await readJson("data/academy/psimaster-media.generated.json");
  const planetary = media.filter((row) => row.logicalId === "videos/planetary-power");
  assert.equal(media.length, 45);
  assert.equal(planetary.length, 11);
  assert.ok(media.some((row) => row.videoId === "9w6AmFXaL2U"));
  for (const id of ["2GMLhPrEJ3s","8XN-EFpSt8M","h8r_fIVWM0U","owG8gBIQ2hU","3Lc38_-SqD0","ziXmEWe3Dh0","ocks6JP2lD8","-volI7wYbl0","R1krHd3JRXc","uN5BFjdKVvY","6wNdBVoYt50"]) {
    assert.ok(media.some((row) => row.mediaUrl.endsWith("/" + id)), id);
  }
  assert.ok(media.every((row) => row.status === "verified_legacy_public_embed"));
});

test("Academy catalog and page merge PsiMaster sources/media and keep full lesson sequences", async () => {
  const [catalog, page] = await Promise.all([
    readFile("data/academy/catalog.ts", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  assert.match(catalog, /psimasterSources/);
  assert.match(catalog, /psimasterMedia/);
  assert.match(catalog, /sourceProvider\?:/);
  assert.match(page, /slice\(0, 48\)/);
  assert.match(page, /video\.lessonTitle/);
});


test("PsiMaster taxonomy inventory reconciles all discovered public term IDs", async () => {
  const inventory = await readJson("data/academy/psimaster-inventory.generated.json");
  assert.equal(inventory.discoveredPublicTermCount, 147);
  assert.equal(inventory.records.length, 147);
  assert.equal(inventory.classificationCounts.Academy, 22);
  assert.equal(inventory.classificationCounts.AcademyVideo, 7);
  assert.equal(inventory.classificationCounts.AcademyMissingBody, 1);
  assert.ok(inventory.records.every((row) => row.classification && row.action));
  const missing = inventory.records.find((row) => row.sourceTaxonomyId === "12434");
  assert.equal(missing.classification, "AcademyMissingBody");
});

test("all six PsiMaster legacy video-course families are restored", async () => {
  const media = await readJson("data/academy/psimaster-media.generated.json");
  const expected = {
    "videos/planetary-power": 11,
    "videos/greek-mysteries-demeter": 5,
    "videos/strength-protection": 7,
    "videos/maya-archetypes": 6,
    "videos/egypt-osiris": 7,
    "videos/greek-mysteries-dionysus": 7,
  };
  for (const [logicalId, count] of Object.entries(expected)) {
    assert.equal(media.filter((row) => row.logicalId === logicalId).length, count, logicalId);
  }
  assert.equal(media.filter((row) => row.logicalId === "videos/energy-pump-ups").length, 2);
  assert.equal(new Set(media.map((row) => row.videoId)).size, 41);
});


test("PsiMaster English and Russian course bodies stay structurally equivalent", async () => {
  const [sources, translations] = await Promise.all([
    readJson("data/academy/psimaster-sources.generated.json"),
    readJson("data/academy/psimaster-translations.generated.json"),
  ]);
  assert.equal(sources.length, 22);
  assert.equal(Object.keys(translations).length, 22);
  for (const source of sources) {
    const en = translations[source.logicalId]?.en;
    assert.ok(en, `missing EN translation: ${source.logicalId}`);
    assert.equal(en.length, source.content.length, `block count: ${source.logicalId}`);
    assert.deepEqual(en.map((block) => block.type), source.content.map((block) => block.type), `block structure: ${source.logicalId}`);
    assert.doesNotMatch(en.map((block) => block.text).join("\n"), /[А-Яа-яЁё]/, `Cyrillic leaked into EN: ${source.logicalId}`);
  }
});

test("PsiMaster bilingual renderer selects localized body text by locale", async () => {
  const [catalog, page] = await Promise.all([
    readFile("data/academy/catalog.ts", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  assert.match(catalog, /psimasterTranslations/);
  assert.match(catalog, /record\.sourceProvider === "psimaster" && locale === "en"/);
  assert.match(catalog, /Translated from the original Russian PsiMaster source/);
  assert.match(page, /academyPublicBlocks\(record, locale\)/);
  assert.match(page, /academyPublicOmittedCount\(record, locale\)/);
});

test("PsiMaster legacy video titles have English and Russian parity", async () => {
  const media = await readJson("data/academy/psimaster-media.generated.json");
  assert.equal(media.length, 45);
  assert.ok(media.every((row) => row.lessonTitle && row.lessonTitleEn));
  assert.doesNotMatch(media.map((row) => row.lessonTitleEn).join("\n"), /[А-Яа-яЁё]/);
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  assert.match(page, /locale === "ru" \? item\.lessonTitle : \(item\.lessonTitleEn \?\? item\.lessonTitle\)/);
});


test("every single-language PsiTrends route has an opposite-language presentation", async () => {
  const [sources, translations] = await Promise.all([
    readJson("data/academy/sources.generated.json"),
    readJson("data/academy/legacy-translations.generated.json"),
  ]);
  const byId = new Map();
  for (const row of sources) {
    const set = byId.get(row.logicalId) ?? new Set();
    set.add(row.sourceLocale);
    byId.set(row.logicalId, set);
  }
  const singleLanguage = [...byId.entries()].filter(([, locales]) => locales.size === 1);
  assert.equal(singleLanguage.length, 26);
  assert.equal(Object.keys(translations).length, 26);
  for (const [logicalId, locales] of singleLanguage) {
    const sourceLocale = [...locales][0];
    const targetLocale = sourceLocale === "en" ? "ru" : "en";
    const blocks = translations[logicalId]?.[targetLocale];
    assert.ok(blocks?.length, `missing ${targetLocale} translation: ${logicalId}`);
    if (targetLocale === "en") {
      assert.doesNotMatch(blocks.map((block) => block.text).join("\n"), /[А-Яа-яЁё]/, `Cyrillic leaked into EN: ${logicalId}`);
    }
  }
});

test("legacy Academy translations remain free of stale sales/contact copy", async () => {
  const translations = await readJson("data/academy/legacy-translations.generated.json");
  const body = Object.values(translations)
    .flatMap((locales) => Object.values(locales))
    .flat()
    .map((block) => block.text)
    .join("\n");
  assert.doesNotMatch(body, /t\.me\/|viber|whatsapp|\$\d|\b\d+\s*(?:usd|eur|уе)\b/i);
});

test("Academy renderer uses localized translations before source-language fallback", async () => {
  const catalog = await readFile("data/academy/catalog.ts", "utf8");
  assert.match(catalog, /legacyTranslations/);
  assert.match(catalog, /academyLocalizedTranslation/);
  assert.match(catalog, /record\.sourceProvider !== "psimaster" && record\.sourceLocale !== locale/);
  assert.match(catalog, /legacyTranslationRecords\[record\.logicalId\]\?\.\[locale\]/);
  assert.match(catalog, /Переведено с оригинального англоязычного источника PsiTrends/);
  assert.match(catalog, /Translated from the original Russian PsiTrends source/);
});
