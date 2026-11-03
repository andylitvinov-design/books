import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../data/ideas-aphorisms.json" with { type: "json" };
import { pickIdeasPreviewAphorisms, rotateIdeasPreviewAphorisms } from "../lib/ideas-preview-rotation.mjs";

test("each Ideas opening draws three different sourced texts in all locales", () => {
  const byId = new Map(catalog.items.map(item => [item.id, item]));
  for (const locale of ["en", "ru", "es"]) {
    const first = pickIdeasPreviewAphorisms(locale, [], () => 0);
    const another = pickIdeasPreviewAphorisms(locale, [], () => 0.999999);
    assert.equal(first.length, 3);
    assert.equal(new Set(first.map(item => item.id)).size, 3);
    assert.notDeepEqual(first.map(item => item.id), another.map(item => item.id));
    for (const item of [...first, ...another]) {
      assert.equal(item.text, byId.get(item.id)["text_" + locale]);
      if (item.kind !== "editorial") assert.ok(item.source?.url.startsWith("https://"));
      if (item.kind === "proverb") assert.ok(item.original?.text);
    }
  }
});

test("new page visit excludes the last three quote IDs without saving the user question", () => {
  const records = new Map();
  const store = {
    getItem(key) { return records.get(key) ?? null; },
    setItem(key, value) { records.set(key, value); },
  };
  const first = rotateIdeasPreviewAphorisms("en", store);
  const second = rotateIdeasPreviewAphorisms("en", store);
  const third = rotateIdeasPreviewAphorisms("ru", store);
  assert.equal(new Set(first.map(item => item.id)).size, 3);
  assert.ok(second.every(item => !first.some(prior => prior.id === item.id)));
  assert.ok(third.every(item => !second.some(prior => prior.id === item.id)));
  assert.equal(records.size, 1, "only last public catalog IDs may be stored");
  const saved = JSON.parse([...records.values()][0]);
  assert.deepEqual(saved, third.map(item => item.id));
  assert.ok(saved.every(id => catalog.items.some(item => item.id === id)));
  const component = readFileSync(new URL("../components/ideas-discovery.tsx", import.meta.url), "utf8");
  assert.match(component, /rotateIdeasPreviewAphorisms\(locale\)/);
  assert.match(component, /<AphorismTiles items=\{previewAphorisms\}/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|sendBeacon|fetch\(/);
});

test("private browsing or corrupt storage does not prevent three aphorisms", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.equal(rotateIdeasPreviewAphorisms("es", blocked).length, 3);
  const corrupted = { getItem() { return "not JSON"; }, setItem() {} };
  assert.equal(rotateIdeasPreviewAphorisms("ru", corrupted).length, 3);
});
