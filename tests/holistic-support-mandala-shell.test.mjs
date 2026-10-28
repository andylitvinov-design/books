import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("video mandala and mobile Support use a single four-tab app shell", () => {
  const route = read("app/[locale]/holistic-support/mandala/page.tsx");
  const mobile = read("components/holistic-support-mobile.tsx");
  const nav = read("components/holistic-support-mobile-nav.tsx");
  const css = read("components/mandala-meditation.module.css");
  const siteDock = read("components/mobile-bottom-navigation.tsx");
  const banner = read("components/sitewide-antistress-banner.tsx");
  const studio = read("components/mandala-meditation-client.tsx");
  const videoStudio = read("components/mandala-free-video-studio.tsx");
  const videoCss = read("components/mandala-video-mobile.module.css");

  assert.match(route, /<HolisticSupportMobileNav locale=\{locale\} page="mandala"/);
  assert.match(mobile, /<HolisticSupportMobileNav locale=\{locale\} page="mobile"/);
  assert.match(mobile, /<a href=\{"\/" \+ locale \+ "\/holistic-support\/mandala"\}/);
  assert.match(nav, /data-support-mobile-bottom-nav/);
  assert.match(nav, /page: "mobile" \| "mandala"/);
  for (const label of ["Мои практики", "Мой прогресс", "Настройки", "My practices", "Mis prácticas"])
    assert.ok(nav.includes(label), label);
  assert.match(nav, /onClick=\{\(\) => updateOpen\(!settingsOpen\)\}/);
  assert.match(nav, /aria-expanded=\{settingsOpen\}/);
  assert.match(nav, /href=\{progressHref\}/);
  assert.ok(siteDock.includes("holistic-support\\/mandala"), "hide the global seven-tab dock on mandala");
  assert.ok(banner.includes("holistic-support\\/mandala"), "hide the marketing banner on mandala");
  assert.match(route, /desktopSiteHeader/);
  assert.match(css, /\.desktopSiteHeader\{display:none\}/);
  assert.match(css, /\.mobileAppNav\{display:block\}/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.equal((studio.match(/<MandalaFreeVideoStudio /g) || []).length, 1, "reuse one video engine");
  assert.ok(videoStudio.includes("support-reference-avatar.webp"), "shared reference portrait");
  assert.ok(videoCss.includes(".supportTop{grid-template-columns:minmax(0,1.14fr)"), "compact same three-column layout");
});

test("every locale keeps an equivalent canonical editor; browser test covers real mobile shortcut", () => {
  const route = read("app/[locale]/holistic-support/mandala/page.tsx");
  const nav = read("components/holistic-support-mobile-nav.tsx");
  const e2e = read("scripts/verify-holistic-mandala-browser.mjs");
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(route.includes('"/' + locale + '/holistic-support/mandala"'), locale);
    assert.ok(nav.includes(locale + ":"), locale);
  }
  assert.match(e2e, /\[data-support-video-mandala\]/);
  assert.match(e2e, /\.mobile-bottom-navigation/);
  assert.match(e2e, /\[data-sitewide-antistress-banner\]/);
  assert.match(e2e, /\[data-video-mandala-hero\]/);
});
