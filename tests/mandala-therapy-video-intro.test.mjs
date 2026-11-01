import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the published Video Therapy RU master is an opt-in player inside the ONE studio stage", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  assert.match(studio,/const introVideoId = locale==="es" \? null : "P9Wvo3gEY6U";/);
  assert.match(studio,/src={`https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{introVideoId\}\?autoplay=1&playsinline=1&rel=0`}/);
  assert.match(studio,/data-video-therapy-intro="ready"/);
  assert.match(studio,/data-video-therapy-intro="playing"/);
  assert.match(studio,/data-intro-spoken-locale="ru"/);
  assert.match(studio,/setIntroPlaying\(true\)/);
  assert.match(studio,/setIntroPlaying\(false\)/);
  assert.match(studio,/locale==="ru"\?"О видеотерапии · 52 сек"/);
  assert.match(studio,/"About video therapy · Russian audio"/,
    "English page must not misrepresent Russian narration as an English render");
  const stage=studio.indexOf('data-video-live-stage');
  const hero=studio.indexOf('id="video-hero"',stage);
  const promo=studio.indexOf('data-video-therapy-intro="playing"',hero);
  const original=studio.indexOf('data-video-preview-toggle',hero);
  const nav=studio.indexOf('data-video-quick-controls',hero);
  assert.ok(stage>=0&&hero>stage&&promo>hero&&original>promo&&nav>original,
    "published opt-in video overlays original hero without duplicating the studio");
  assert.match(studio,/<canvas key={aspect} ref={canvasRef}/);
  assert.match(studio,/MediaRecorder/);
  assert.match(studio,/className={videoStyles\.therapyIntroOverlay}/);
  assert.match(css,/\.studio \.therapyIntroOverlay\{position:absolute;inset:0;z-index:7/);
  assert.match(css,/\.studio \.therapyIntroLaunch:focus-visible/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.match(route,/<MandalaMeditationClient locale={locale}/,
    "both RU and EN resolve to the same locale-aware original editor");
});

test("promotional video iframe is created only after an explicit user click",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  assert.match(source,/introPlaying \? \(\s*<div className={videoStyles\.therapyIntroOverlay}/);
  assert.match(source,/onClick=\{\(\)=>\{\s*premiumVideoRef\.current\?\.pause\(\);\s*setPreviewPlaying\(false\);\s*setIntroPlaying\(true\);/);
  assert.match(source,/!introPlaying && <button className={videoStyles\.heroPlay}/);
  assert.match(source,/className={videoStyles\.therapyIntroClose}[\s\S]*?onClick=\{\(\)=>setIntroPlaying\(false\)\}/);
  assert.match(source,/referrerPolicy="strict-origin-when-cross-origin"/);
});
