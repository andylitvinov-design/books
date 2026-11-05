import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { templeAttunements, templeTraditions, getTempleChannel, findTempleAttunements } from "../data/temple-attunements.mjs";

test("temple hierarchy keeps traditions, unique deity channels and separate source-backed verses", () => {
  assert.ok(templeTraditions.length >= 5);
  assert.equal(new Set(templeTraditions.map((t) => t.id)).size, templeTraditions.length);
  assert.equal(new Set(templeAttunements.map((t) => t.id)).size, templeAttunements.length);
  assert.ok(templeAttunements.length >= 15);
  for (const t of templeTraditions) {
    assert.deepEqual(Object.keys(t.name).sort(), ["en", "es", "ru"]);
    assert.equal(new Set(t.channels.map((c) => c.id)).size, t.channels.length);
  }
  for (const item of templeAttunements) {
    assert.ok(getTempleChannel(item.traditionId, item.channelId), item.id);
    assert.equal(item.language, "ru");
    assert.equal(item.source.type, "author-archive");
    assert.ok(item.textRu.length >= 45);
    assert.equal(item.place.verification, "author-described");
    assert.ok(item.source.title.length > 5);
    assert.doesNotMatch(JSON.stringify(item), /https?:\/\/(?:docs|drive)\.google\.com/);
    for (const photo of item.photos) {
      assert.match(photo.src, /^\/library\/temple-channels\/(?:expanded\/)?[a-z0-9-]+\.(?:jpg|png)$/);
      assert.ok(existsSync(join(process.cwd(), "public", photo.src)), "missing original photograph " + photo.src);
    }
  }
});

test("Greek Asclepius supports multiple independent archived cards from distinct places", () => {
  const results = findTempleAttunements({ traditionId: "greek", channelId: "asclepius" });
  assert.equal(results.length, 7);
  assert.ok(results.some((r) => r.place.city.ru.includes("София")));
  assert.ok(results.some((r) => r.place.city.ru.includes("Измир")));
  assert.ok(results.some((r) => r.place.city.ru.includes("Приена")));
  assert.ok(results.every((r) => r.textRu && r.source.id === "antiquity-module-1-2"));
});

test("search respects both tradition and channel, aliases and place names", () => {
  assert.ok(findTempleAttunements({ query: "канал Асклепия" }).length >= 7);
  assert.ok(findTempleAttunements({ traditionId: "greek", query: "Созополь" }).some((r) => r.channelId === "dionysus"));
  assert.ok(findTempleAttunements({ traditionId: "egyptian", channelId: "serapis" }).length === 1);
  assert.equal(findTempleAttunements({ traditionId: "egyptian", channelId: "asclepius" }).length, 0);
  assert.equal(findTempleAttunements({ traditionId: "greek", channelId: "zeus" }).length, 1);
  assert.ok(getTempleChannel("greek", "zeus"), "Zeus exists as a channel without an invented poem");
  assert.ok(findTempleAttunements({ traditionId: "greek", channelId: "dionysus" }).length >= 5);
});

test("route exists in RU/EN/ES and is linked from existing Temple Studies", () => {
  const route = readFileSync(join(process.cwd(), "app/[locale]/temple-channels/page.tsx"), "utf8");
  const temple = readFileSync(join(process.cwd(), "components/temple-studies.tsx"), "utf8");
  assert.match(route, /generateStaticParams/);
  assert.match(route, /"ru"/);
  assert.match(route, /"en"/);
  assert.match(route, /"es"/);
  assert.match(route, /method="get"/);
  assert.match(route, /<Image src=\{entry\.photos\[0\]\.src\}/);
  assert.match(temple, /temple-channels/);
});

test("the second manuscript contributes 39 independent attunements with original-language provenance", async () => {
  const { expandedTempleAttunements } = await import("../data/temple-attunements-expansion.mjs");
  assert.equal(expandedTempleAttunements.length, 39);
  assert.equal(templeAttunements.length, 54);
  assert.equal(expandedTempleAttunements.filter((entry) => entry.photos.length > 0).length, 25);
  assert.equal(expandedTempleAttunements.filter((entry) => entry.photos.length === 0).length, 14);
  assert.ok(templeTraditions.reduce((sum, t) => sum + t.channels.length, 0) >= 40);
  const originalIds = new Set(templeAttunements.map((entry) => entry.id));
  assert.equal(originalIds.size, 54);
  for (const entry of expandedTempleAttunements) {
    assert.equal(entry.source.id, "antiquity-chapter-3");
    assert.ok(entry.textRu.length >= 48);
    assert.ok(getTempleChannel(entry.traditionId, entry.channelId));
    assert.equal(entry.place.verification, "author-described");
    for (const photo of entry.photos) {
      assert.match(photo.src, /^\/library\/temple-channels\/expanded\/[a-z0-9-]+\.(?:jpg|png)$/);
      const bytes = readFileSync(join(process.cwd(), "public", photo.src));
      assert.ok(bytes.length > 8_000, "photo must be a real manuscript image");
      assert.ok(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
        bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    }
  }
});

test("source-preserving central catalogue reuses 16 published Telegram records, without duplicating texts", () => {
  const archive = JSON.parse(readFileSync(join(process.cwd(), "data/academy/temple-channel-attunements.json"), "utf8"));
  assert.equal(archive.attunements.length, 16);
  const all = [...templeAttunements, ...archive.attunements.map((item) => ({
    ...item, traditionId: item.tradition, channelId: item.channel, textRu: item.text,
  }))];
  assert.equal(all.length, 70);
  const uniqueIds = new Set(all.map((item) => item.id));
  assert.equal(uniqueIds.size, 70);
  const normalized = (text) => text.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/gi, "");
  assert.equal(new Set(all.map((entry) => normalized(entry.textRu))).size, 70);
  for (const item of archive.attunements) {
    assert.ok(getTempleChannel(item.tradition, item.channel));
    assert.ok(item.photos.length >= 1);
    for (const photo of item.photos) {
      assert.ok(existsSync(join(process.cwd(), "public", photo.src)));
    }
  }
});

test("public archive has no huge unpaginated first render and preserves original photo galleries", () => {
  const route = readFileSync(join(process.cwd(), "app/[locale]/temple-channels/page.tsx"), "utf8");
  assert.match(route, /PAGE_SIZE = 12/);
  assert.match(route, /shown\.map\(\(entry\)/);
  assert.match(route, /telegramArchive\.attunements/);
  assert.match(route, /archivePageHref/);
  assert.match(route, /entry\.photos\.slice\(1\)/);
  assert.match(route, /unoptimized/);
});
