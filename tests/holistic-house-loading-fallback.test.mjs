import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("only public homepage routes show branded loading; private admin/auth routes never get global streaming boundaries", async () => {
  const [en, ru, es, scene] = await Promise.all([
    source("app/page.tsx"),
    source("app/[locale]/page.tsx"),
    source("app/es/page.tsx"),
    source("components/holistic-house-loading-scene.tsx"),
  ]);
  for (const page of [en, ru, es]) {
    assert.match(page, /Suspense fallback=\{<HolisticHouseLoadingScene \/>\}/);
    assert.match(page, /HolisticHouseLoadingScene/);
  }
  // Global loading.tsx can prematurely stream private redirects as HTTP 200.
  // It must not turn the authenticated practitioner bridge into a public shell.
  for (const file of ["app/loading.tsx", "app/[locale]/loading.tsx"]) {
    await assert.rejects(
      stat(new URL("../" + file, import.meta.url)),
      { code: "ENOENT" },
      file + " may not put private routes behind a public loading boundary",
    );
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

test("public Academy order CTA is server-visible while private/rewrite routes stay hydration-safe", async () => {
  const capture = await source("components/sitewide-lead-capture.tsx");
  const browser = await source("scripts/verify-academy-messenger-order.mjs");
  assert.match(capture, /stableAcademyPath/);
  assert.match(capture, /classifyPublicLead\(clientPath \?\? pathname\)/);
  assert.match(browser, /academy\/temple-studies/);
  assert.match(browser, /course order card arrives with the server document/);
  assert.doesNotMatch(browser, /academy\/mysteries/);
});
