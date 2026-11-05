import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("verified RU film replaces demo poster inside the ONE real studio hero, never as a second player",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  assert.match(studio,/const introVideoId = locale==="ru" \? "P9Wvo3gEY6U" : null;/);
  assert.match(studio,/const showIntroHero=activeWorkspace==="video"&&!videoScenarioOpen&&!introDismissed/);
  const stage=studio.indexOf('data-video-live-stage');
  const hero=studio.indexOf('id="video-hero"',stage);
  const info=studio.indexOf("data-video-therapy-info",hero);
  const heroEnd=studio.indexOf('<aside className={videoStyles.heroRail}',hero);
  assert.ok(stage>=0&&hero>stage&&info>hero&&heroEnd>info);
  assert.doesNotMatch(studio,/therapyIntroStandalone/);
  assert.equal((studio.match(/data-video-therapy-info/g)||[]).length,1);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
  assert.match(css,/\.studio \.therapyHero\{/);
  assert.match(css,/\.studio \.therapyHeroFrame\{/);
  assert.match(css,/aspect-ratio:16\/9!important/);
  assert.match(route,/<MandalaMeditationClient locale={locale}/);
});
test("RU explicit Play loads no-cookie iframe in the hero; back returns the Canvas editor",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.match(studio,/data-video-therapy-intro="ready"/);
  assert.match(studio,/data-video-therapy-intro="playing"/);
  assert.match(studio,/data-video-therapy-intro-close onClick=\{\(\)=>\{setIntroPlaying\(false\);setIntroDismissed\(true\);\}\}/);
  assert.match(studio,/src={`https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{introVideoId\}\?autoplay=1&playsinline=1&rel=0`}/);
  assert.match(studio,/referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(studio,/data-video-therapy-youtube="ru"/);
  assert.match(studio,/setIntroDismissed\(true\)/);
  assert.match(studio,/data-video-preview-toggle/);
  assert.match(studio,/MediaRecorder/);
});
test("EN never plays RU soundtrack or unverified English source; locale reset and channel handoff work",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.match(studio,/data-video-therapy-intro="english-channel"/);
  assert.match(studio,/English film not yet linked/);
  assert.match(studio,/href="https:\/\/www\.youtube\.com\/@aatapro\/videos"/);
  assert.match(studio,/data-video-therapy-youtube="en"/);
  assert.match(studio,/data-video-therapy-editor/);
  assert.match(studio,/useEffect\(\(\)=>\{setIntroPlaying\(false\);setIntroDismissed\(false\);\},\[locale\]\)/);
  assert.doesNotMatch(studio,/locale==="es" \? null : "P9Wvo3gEY6U"/);
  assert.doesNotMatch(studio,/Russian audio/i);
});