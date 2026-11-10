import assert from "node:assert/strict";
import test from "node:test";

import { books } from "../data/library.js";
import { templeAttunements, templeTraditions, findTempleAttunements, getTempleChannel } from "../data/temple-attunements.mjs";

const byId = (id) => templeAttunements.find(item => item.id === id);

test("Maya, Egyptian and Greek descriptions remain separate published manuals", () => {
  for (const [series, id] of [["maya","maya-egregor-gods"],["egypt","egypt-osiris-temple-magic"],["greek","greek-metaphysics-planning"]]) {
    assert.ok(books.some(book => book.id === id && book.mediaSeries === series), id);
  }
  assert.ok(templeTraditions.some(item => item.id === "maya"));
  assert.ok(templeTraditions.some(item => item.id === "egyptian"));
  assert.ok(templeTraditions.some(item => item.id === "greek"));
});

test("restored attunements are independent, original-text, provenanced cards", () => {
  const expected = ["maya-k-uh-awakening","maya-vision-serpent","maya-chulel-life",
    "maya-ik-wind-horizons","maya-ik-wind-change","maya-ixmucane-mother",
    "maya-kaah-rooting","egypt-maat-20230227","egypt-maat-heart-one",
    "egypt-maat-heart-two","egypt-ba-flight-ancestors"];
  assert.equal(new Set(templeAttunements.map(item => item.id)).size, templeAttunements.length);
  for (const id of expected) {
    const item = byId(id);
    assert.ok(item?.textRu?.length > 20, id);
    assert.ok(item.source?.id && item.source.title, id);
    assert.equal(item.place.verification, "author-described");
    assert.ok(getTempleChannel(item.traditionId, item.channelId), id);
    assert.equal(findTempleAttunements({ traditionId: item.traditionId, query: item.id }).length, 1, id);
    assert.deepEqual(item.photos, []);
  }
  assert.equal(byId("maya-kaah-rooting").format, "practice");
  assert.match(byId("egypt-maat-20230227").textRu, /Маат творит гармонии потоки/);
});

test("tradition+deity filter returns multiple original verses without mixing traditions", () => {
  const ik = findTempleAttunements({ traditionId: "maya", channelId: "ik" });
  assert.deepEqual(ik.map(item => item.id), ["maya-ik-wind-horizons", "maya-ik-wind-change"]);
  const maat = findTempleAttunements({ traditionId: "egyptian", channelId: "maat" });
  assert.equal(maat.length, 3);
  assert.ok(maat.every(item => item.traditionId === "egyptian"));
  assert.ok(findTempleAttunements({traditionId:"greek", query:"Зевса"}).length > 0);
  assert.equal(findTempleAttunements({traditionId:"maya", query:"Маат"}).length, 0);
  assert.ok(findTempleAttunements({traditionId:"maya", query:"Шмукане"}).some(item => item.id==="maya-ixmucane-mother"));
  assert.ok(findTempleAttunements({traditionId:"egyptian", query:"Полет Ба"}).some(item => item.id==="egypt-ba-flight-ancestors"));
});

test("library exposes manuals and the separate searchable cards entry", async () => {
  const { readFileSync } = await import("node:fs");
  const catalog = readFileSync(new URL("../components/book-catalog.tsx", import.meta.url), "utf8");
  const hub = readFileSync(new URL("../components/library-hub.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/[locale]/temple-channels/page.tsx", import.meta.url), "utf8");
  assert.match(catalog, /temple-channels\?tradition=/);
  assert.match(hub, /id: "library-temple-attunements"/);
  assert.match(page, /name="tradition"/);
  assert.match(page, /name="channel"/);
  assert.match(page, /name="q"/);
  assert.match(page, /archivePageHref\(language, entry\.traditionId, entry\.channelId, entry\.id, 1\)/);
});

test("all temple books link to independent cards, and cards link back to a descriptive manual", async () => {
  const { readFileSync } = await import("node:fs");
  const reader = readFileSync(new URL("../app/[locale]/books/[bookId]/page.tsx", import.meta.url), "utf8");
  const cards = readFileSync(new URL("../app/[locale]/temple-channels/page.tsx", import.meta.url), "utf8");
  const archiveStyle = readFileSync(new URL("../app/[locale]/temple-channels/temple-channels.module.css", import.meta.url), "utf8");
  const readerStyle = readFileSync(new URL("../app/reader-responsive.css", import.meta.url), "utf8");
  for (const [series, tradition, manualId] of [
    ["maya","maya","maya-egregor-gods"],
    ["egypt","egyptian","egypt-osiris-temple-magic"],
    ["greek","greek","greek-metaphysics-planning"],
    ["roman","roman","roman-imperial-temples"],
  ]) {
    assert.ok(reader.includes(`book.mediaSeries === "${series}" ? "${tradition}"`) || reader.includes(`book.mediaSeries === "${series}" : "${tradition}"`));
    assert.ok(cards.includes(`${tradition}: "${manualId}"`));
  }
  assert.ok(reader.includes("reader-temple-switch__link"));
  assert.ok(reader.includes("temple-channels?tradition="));
  assert.ok(cards.includes("guideBookId ? "));
  assert.ok(cards.includes("styles.librarySwitchLink"));
  assert.match(cards, /open=\{query === entry\.id\}/);
  assert.match(archiveStyle, /min-height: 44px/);
  assert.match(readerStyle, /reader-temple-switch__link:focus-visible/);
  for (const locale of ["ru","en","es"]) {
    assert.ok(reader.includes('locale === "' + locale + '"') || locale === "en");
    assert.ok(cards.includes(locale + ": {"));
  }
});
