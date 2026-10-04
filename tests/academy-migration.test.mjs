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

test("migration mapping keeps redirects disabled and separates Library and Services", async () => {
  const urlMap = await readJson("data/academy/url-map.generated.json");
  assert.ok(urlMap.some((row) => row.classification === "LIBRARY_MATERIAL"));
  assert.ok(urlMap.some((row) => row.classification === "SERVICES_MATERIAL"));
  assert.ok(urlMap.some((row) => row.classification === "REDIRECT_ONLY"));
  assert.ok(urlMap.every((row) => row.redirectNow === false));
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
