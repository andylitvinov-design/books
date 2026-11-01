import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("RU and EN YouTube destinations are different, no Russian audio on EN",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  assert.match(studio,/const introVideoId = locale==="ru" \? "P9Wvo3gEY6U" : null;/);
  assert.doesNotMatch(studio,/locale==="es" \? null : "P9Wvo3gEY6U"/);
  assert.doesNotMatch(studio,/Russian audio/i);
  assert.match(studio,/href="https:\/\/www\.youtube\.com\/@aatapro\/videos"/);
  assert.match(studio,/href={\x60https:\/\/www\.youtube\.com\/watch\?v=\$\{introVideoId\}\x60}/);
  assert.match(studio,/data-video-therapy-youtube="ru"/);
  assert.match(studio,/data-video-therapy-youtube="en"/);
  assert.match(studio,/data-video-therapy-intro="english-channel"/);
  assert.match(studio,/Video therapy film not yet linked/,
    "do not claim an EN Video Therapy film without its own verified YouTube ID");
  assert.match(studio,/data-intro-spoken-locale="ru"/);
  assert.match(studio,/src={\x60https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{introVideoId\}\?autoplay=1&playsinline=1&rel=0\x60}/);
  assert.match(studio,/<span>О видеотерапии · 52 сек<\/span>/);
  assert.match(studio,/data-video-therapy-intro="ready"/);
  assert.match(studio,/data-video-therapy-intro="playing"/);
  const stage=studio.indexOf('data-video-live-stage');
  const hero=studio.indexOf('id="video-hero"',stage);
  const original=studio.indexOf('data-video-preview-toggle',hero);
  const nav=studio.indexOf('data-video-quick-controls',hero);
  const dock=studio.indexOf('data-video-therapy-info',nav);
  const promo=studio.indexOf('data-video-therapy-intro="playing"',dock);
  assert.ok(stage>=0&&hero>stage&&original>hero&&nav>original&&dock>nav&&promo>dock,
    "published intro is confined to the Practices panel after the Canvas hero");
  assert.doesNotMatch(studio.slice(hero,nav),/data-video-therapy-intro/,
    "no external YouTube chrome can obscure the creative editor");
  assert.match(studio,/<canvas key={aspect} ref={canvasRef}/);
  assert.match(studio,/MediaRecorder/);
  assert.match(studio,/className={videoStyles\.therapyIntroOverlay}/);
  assert.match(css,/\.studio \.therapyIntroStandalone \.therapyIntroOverlay\{/);
  assert.match(css,/position:relative;inset:auto/);
  assert.match(css,/\.studio \.therapyIntroDirect:focus-visible/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.match(route,/<MandalaMeditationClient locale={locale}/);
});

test("remote iframe is mounted only on the RU visitor's deliberate click",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  assert.match(source,/introPlaying \? \(\s*<div className={videoStyles\.therapyIntroOverlay}/);
  assert.match(source,/onClick=\{\(\)=>\{\s*premiumVideoRef\.current\?\.pause\(\);\s*setPreviewPlaying\(false\);\s*setIntroPlaying\(true\);/);
  assert.match(source,/<button className={videoStyles\.heroPlay}/);
  assert.match(source,/if\(item\.id!=="practices"\)setIntroPlaying\(false\)/);
  assert.match(source,/className={videoStyles\.therapyIntroClose}[\s\S]*?onClick=\{\(\)=>setIntroPlaying\(false\)\}/);
  assert.match(source,/referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(source,/rel="noopener noreferrer"/);
});
