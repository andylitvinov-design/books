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
      assert.match(photo.src, /^\/library\/temple-channels\/[a-z0-9-]+\.jpg$/);
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
  assert.equal(findTempleAttunements({ traditionId: "greek", channelId: "zeus" }).length, 0);
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
