import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("all public and locale routes share the same transient branded loading fallback", async () => {
  const [root, locale, scene] = await Promise.all([
    source("app/loading.tsx"),
    source("app/[locale]/loading.tsx"),
    source("components/holistic-house-loading-scene.tsx"),
  ]);
  for (const loading of [root, locale]) {
    assert.match(loading, /HolisticHouseLoadingScene/);
    assert.doesNotMatch(loading, /use client|fetch\(|setTimeout|setInterval|redirect\(/);
  }
  assert.match(scene, /Holistic <span>House<\/span>/);
  assert.match(scene, /role="status"/);
  assert.doesNotMatch(scene, /use client|window\.|document\.|useEffect/);
});

test("loading scene uses an existing small first-party photo and reduced-motion fallback", async () => {
  const css = await source("components/holistic-house-loading-scene.module.css");
  const photo = new URL("../public/images/holistic-house/reiki-approved-sunrise-v3.webp", import.meta.url);
  assert.match(css, /reiki-approved-sunrise-v3\.webp/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /https?:\/\/|@import|backdrop-filter/);
  assert.ok((await stat(photo)).size <= 100_000, "loading image must remain under 100 KB");
});
