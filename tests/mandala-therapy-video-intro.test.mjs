import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("verified RU presentation is the first Goal 16:9 player state, never a second player",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  const stage=studio.indexOf('data-video-live-stage');
  const hero=studio.indexOf('id="video-hero"',stage);
  const rail=studio.indexOf('data-video-intro-my-rail',hero);
  const content=studio.slice(hero,rail);
  assert.ok(stage>0&&hero>stage&&rail>hero);
  assert.match(content,/showIntroHero \? <div className=\{videoStyles\.therapyHero\} data-video-therapy-info/);
  assert.match(content,/data-video-therapy-intro="ready"/);
  assert.match(content,/data-video-therapy-intro="playing"/);
  assert.match(content,/data-video-therapy-intro-close/);
  assert.match(content,/data-mandala-cinematic-canvas/);
  assert.match(content,/data-video-preview-toggle/);
  assert.match(studio,/const introVideoId = \(locale==="ru"\|\|locale==="en"\) \? "P9Wvo3gEY6U" : null;/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
  assert.equal((studio.match(/data-video-therapy-info/g)||[]).length,1);
  assert.doesNotMatch(studio,/therapyIntroStandalone|therapyIntroOverlay/);
  assert.match(css,/\.studio \.therapyHero\{/);
  assert.match(css,/\.studio \.therapyHeroFrame\{/);
  assert.match(route,/<MandalaMeditationClient locale=\{locale\}/);
});

test("verified RU presentation is opt-in on RU and EN; EN discloses spoken language",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  assert.match(source,/introPlaying \? \(\s*<div className={videoStyles\.therapyHeroPlayback}/);
  assert.match(source,/data-video-therapy-intro-close/);
  assert.match(source,/setIntroDismissed\(true\)/);
  assert.match(source,/Russian audio · 00:52/);
  assert.match(source,/src=\{"https:\/\/www.youtube-nocookie.com\/embed\/"\+introVideoId/);
  assert.match(source,/onClick=\{\(\)=>activateQuickWorkspace\(item\.id\)\}/);
  assert.match(source,/referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(source,/rel="noopener noreferrer"/);
  assert.match(css,/video-studio-presentation-ru\.jpg/);
  assert.match(source,/const showIntroHero =/);
  assert.doesNotMatch(source,/therapyIntroStandalone|therapyIntroOverlay/);
});
