import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const dialogue = readFileSync(new URL("../components/home-dialogue-entry.tsx", import.meta.url), "utf8");

test("approved homepage first-screen artwork exists at its cacheable public paths", () => {
  for (const path of [
    "public/images/holistic-house/my-coach-motion/max-living.webp",
    "public/images/holistic-house/ideas-pine-reference.webp",
    ...["stress", "love", "growth", "energy"].map(name => `public/images/video-goal-art/${name}.webp`),
  ]) assert.ok(existsSync(new URL("../" + path, import.meta.url)), `Missing homepage image: ${path}`);
});

test("homepage first-screen photography is CDN/browser cached without HTML or private routes", () => {
  for (const source of [
    "/images/holistic-house/my-coach-motion/:path*",
    "/images/holistic-house/ideas-pine-reference.webp",
    "/images/video-goal-art/:path*",
    "/images/holistic-house/andy-about.png",
  ]) assert.ok(config.includes(source), "Expected homepage image cache rule: " + source);
  assert.match(config, /\.\.\.homepagePublicImageSources\.map/);
  assert.match(config, /max-age=3600, s-maxage=86400, stale-while-revalidate=120/);
  assert.doesNotMatch(config.slice(config.indexOf("homepagePublicImageSources"), config.indexOf("] as const;", config.indexOf("homepagePublicImageSources"))), /\/api\/|\/app\/|\/client\//);
});

test("the first screen has a native localized booking link before the program choices", () => {
  assert.ok(dialogue.includes('<a className={styles.sessionLink} href={`/${locale}/services?consultation=1#consultation`} data-home-request-session>'));
  for (const label of ["Request a session · from €50", "Запросить сессию · от €50", "Solicitar sesión · desde 50 €"]) assert.ok(dialogue.includes(label));
  assert.ok(dialogue.indexOf("data-home-request-session") < dialogue.indexOf("data-home-focus-grid"));
});
test("booking URL opens the paid consultation in the initial document; legacy hashes still resolve", () => {
  const catalog = readFileSync(new URL("../components/services-unified-catalog.tsx", import.meta.url), "utf8");
  assert.ok(catalog.includes('initialConsultationOpen ? ["consultation"] : []'));
  assert.ok(catalog.includes('Object.hasOwn(panelFromHash, hash)'));
  assert.ok(catalog.includes('booking.querySelector("h2") ?? booking'));
  assert.ok(catalog.includes('panel?.getAttribute("data-expanded") === "true"'));
  assert.ok(catalog.includes('window.cancelAnimationFrame(frame)'));
  assert.ok(catalog.includes('(id === "consultation" || id === "directory") && !expanded ? null : children'));
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.ok(page.includes('initialConsultationOpen={query?.consultation === "1"}'));
    assert.ok(page.includes('id="consultation" serviceBooking'));
  }
});


test("Services uses the existing compact approved lighthouse image without a runtime transform", () => {
  const asset = "/images/holistic-house/report-lighthouse-coast.avif";
  const original = "/images/holistic-house/report-lighthouse-coast.webp";
  const size = statSync(new URL("../public" + asset, import.meta.url)).size;
  assert.ok(size > 0 && size <= 12000, "Approved AVIF thumbnail must remain below 12 KB");
  assert.ok(existsSync(new URL("../public" + original, import.meta.url)), "Do not delete the full-size source");
  const catalog = readFileSync(new URL("../components/services-unified-catalog.tsx", import.meta.url), "utf8");
  const consultation = readFileSync(new URL("../components/services-personal-consultation-mobile.tsx", import.meta.url), "utf8");
  assert.ok(catalog.includes('browse: "' + asset + '"'));
  assert.ok(catalog.slice(catalog.indexOf("const directPanelImages"), catalog.indexOf("type PriceKind")).includes(asset));
  assert.ok(catalog.includes("unoptimized={directPanelImages.has(panelMedia[id])}"));
  assert.ok(consultation.includes('src="' + asset + '" alt="" fill unoptimized'));
  assert.ok(!catalog.includes(original) && !consultation.includes(original));
});
