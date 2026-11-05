import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const catalog = JSON.parse(readFileSync(join(root, "data/academy/temple-channel-attunements.json"), "utf8"));
const languages = ["ru", "en", "es"];
const assertLocale = (field) => {
  assert.ok(field && typeof field === "object");
  for (const language of languages) assert.ok(typeof field[language] === "string" && field[language].trim().length >= 2);
};

test("Temple channel catalog has distinct traditions, channels and author-original cards", () => {
  assert.equal(catalog.schemaVersion, 1);
  assert.ok(catalog.traditions.length >= 6);
  assert.ok(catalog.attunements.length >= 16);
  assert.equal(new Set(catalog.attunements.map((r) => r.id)).size, catalog.attunements.length);
  assert.equal(new Set(catalog.channels.map((c) => c.tradition + "/" + c.id)).size, catalog.channels.length);
  for (const item of catalog.traditions) assertLocale(item.name);
  for (const item of catalog.channels) {
    assert.ok(catalog.traditions.some((t) => t.id === item.tradition));
    assertLocale(item.name);
    assert.ok(Array.isArray(item.aliases));
  }
});

test("Every published card is a separate, traceable original text with real locations and photos", () => {
  const originals = new Set();
  for (const card of catalog.attunements) {
    assert.ok(catalog.channels.some((c) => c.id === card.channel && c.tradition === card.tradition), card.id);
    assertLocale(card.title);
    assertLocale(card.place.city);
    assertLocale(card.place.country);
    if (card.place.site) assertLocale(card.place.site);
    assert.ok(["temple", "museum", "archaeological_site", "city"].includes(card.place.type), card.id);
    assert.equal(card.originalLanguage, "ru");
    assert.ok(card.text.length >= 45, card.id);
    assert.ok(!originals.has(card.text), "Duplicate original text: " + card.id);
    originals.add(card.text);
    assert.equal(card.source.kind, "telegram_export");
    assert.match(card.source.archiveId, /^[a-zA-Z0-9_-]{20,}$/);
    assert.ok(Number.isInteger(card.source.messageId) && card.source.messageId > 0);
    assert.match(card.source.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(card.photos) && card.photos.length >= 1, card.id);
    if (card.editorialNote) assertLocale(card.editorialNote);
    for (const photo of card.photos) {
      assert.match(photo.src, /^\/images\/temple-channels\/[a-z0-9-]+\.jpg$/);
      assert.match(photo.sourceFile, /^photo_\d+@[^/]+\.jpg$/);
      assert.ok(Number.isInteger(photo.sourceMessageId) && photo.sourceMessageId > 0);
      const filePath = join(root, "public", photo.src.slice(1));
      assert.ok(existsSync(filePath), "Missing actual author source photo: " + filePath);
      const data = readFileSync(filePath);
      assert.deepEqual(Array.from(data.subarray(0, 3)), [255, 216, 255], "Not a JPEG: " + filePath);
      assert.ok(statSync(filePath).size > 5000, "Empty image: " + filePath);
    }
  }
});

test("Zeus has multiple genuinely distinct temple settings and all planned traditions remain safe to expand", () => {
  const zeus = catalog.attunements.filter((item) => item.tradition === "greek" && item.channel === "zeus");
  assert.equal(zeus.length, 5);
  assert.equal(new Set(zeus.map((item) => item.id)).size, 5);
  assert.ok(zeus.some((item) => item.place.city.ru === "Анталия"));
  assert.ok(zeus.some((item) => item.place.city.ru === "Немея"));
  assert.ok(zeus.some((item) => item.place.city.ru === "Афины"));
  assert.ok(zeus.some((item) => item.place.city.ru === "Каунос"));
  assert.ok(zeus.some((item) => item.place.city.ru === "Пергамон"));
  assert.ok(catalog.traditions.some((item) => item.id === "egyptian"));
  assert.ok(catalog.channels.some((item) => item.tradition === "egyptian" && item.id === "isis"));
  assert.equal(catalog.attunements.filter((item) => item.tradition === "egyptian").length, 0, "Do not fabricate Egyptian author-original poems");
});
