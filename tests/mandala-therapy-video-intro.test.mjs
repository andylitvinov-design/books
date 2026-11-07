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
  assert.match(studio,/const introVideoId = locale==="ru" \? "P9Wvo3gEY6U" : null;/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
  assert.equal((studio.match(/data-video-therapy-info/g)||[]).length,1);
  assert.doesNotMatch(studio,/therapyIntroStandalone|therapyIntroOverlay/);
  assert.match(css,/\.studio \.therapyHero\{/);
  assert.match(css,/\.studio \.therapyHeroFrame\{/);
  assert.match(route,/<MandalaMeditationClient locale=\{locale\}/);
});

test("iframe requires RU visitor click; Intro/My rail restores unchanged Canvas/MediaRecorder",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const initial=studio.indexOf('data-video-therapy-intro="ready"');
  const mounted=studio.indexOf('<iframe className={videoStyles.therapyHeroFrame}');
  assert.ok(initial>mounted&&mounted>0);
  assert.match(studio,/introPlaying \? \(\s*<div className=\{videoStyles\.therapyHeroPlayback\}/);
  assert.ok(studio.includes('src={"https://www.youtube-nocookie.com/embed/"+introVideoId'));
  assert.match(studio,/referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(studio,/data-video-therapy-youtube="ru"/);
  assert.match(studio,/data-video-intro-info/);
  assert.match(studio,/data-video-my-film/);
  assert.match(studio,/setIntroPlaying\(false\);setIntroDismissed\(true\)/);
  assert.match(studio,/MediaRecorder/);
  assert.match(studio,/setPreviewPlaying\(false\);setIntroPlaying\(true\)/);
});
test("EN uses only its own channel, ES the native editor, and locale switch resets",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.match(studio,/data-video-therapy-intro="english-channel"/);
  assert.match(studio,/English film not yet linked/);
  assert.match(studio,/href="https:\/\/www\.youtube\.com\/@aatapro\/videos"/);
  assert.match(studio,/data-video-therapy-youtube="en"/);
  assert.match(studio,/data-video-therapy-editor/);
  assert.match(studio,/useEffect\(\(\)=>\{setIntroPlaying\(false\);setIntroDismissed\(false\);\},\[locale\]\)/);
  assert.ok(studio.includes('(Boolean(introVideoId)||locale==="en")'));
  assert.doesNotMatch(studio,/locale==="es" \? null : "P9Wvo3gEY6U"/);
});
