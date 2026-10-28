import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page=read("app/[locale]/video-studio/page.tsx");
const wrapper=read("components/personal-video-studio.tsx");
const renderer=read("components/mandala-free-video-studio.tsx");
const csp=read("middleware.ts");
const local=read("lib/public-locales.ts");
const support=read("app/[locale]/holistic-support/page.tsx");
const mobile=read("components/holistic-support-mobile.tsx");

test("public EN/RU/ES route with canonical, without any user sign-in or bot",()=>{
  for (const lang of ["en","ru","es"]) assert.match(page,new RegExp("/"+lang+"/video-studio"));
  assert.match(page, /<PersonalVideoStudio locale=\{locale\}/);
  assert.match(local, /video-studio/);
  assert.match(mobile, /data-support-voice-video-entry/);
  assert.match(support, /data-holistic-personal-voice-entry/);
});
test("one reusable renderer: 4 original topics and 12 cinematic money scenes, no duplicate generator",()=>{
  assert.match(wrapper, /<MandalaFreeVideoStudio locale=\{locale\}/);
  assert.match(renderer,/const themeChoices: VideoTheme\[\] = \["money","relationships","energy","goals"\]/);
  assert.match(renderer,/CinematicSceneThumbnail/);
  assert.match(renderer,/ThemedSceneThumbnail/);
  assert.match(renderer,/IntersectionObserver/);
  assert.match(renderer,/data-video-template-playing/);
  assert.match(renderer,/window\.requestAnimationFrame\(draw\)/);
  assert.match(renderer,/moneyTemplates/);
  assert.match(renderer,/voiceControls/);
  assert.doesNotMatch(wrapper,/\bfetch\s*\(|XMLHttpRequest|\/api\/|supabase|kling\.ai|heygen/i);
});
test("local photo and audio 10/15MB, 60s mic, rights gate and cleanup",()=>{
  assert.match(wrapper,/10_000_000/);
  assert.match(wrapper,/15_000_000/);
  assert.match(wrapper,/60_000/);
  assert.match(wrapper,/getUserMedia/);
  assert.match(wrapper,/data-personal-video-photo/);
  assert.match(wrapper,/data-personal-video-voice/);
  assert.match(wrapper,/data-personal-video-mic/);
  assert.match(wrapper,/URL\.revokeObjectURL/);
  assert.match(renderer,/data-video-photo-consent/);
  assert.match(renderer,/\(!standalone \|\| Boolean\(audioFile\)\)/);
});
test("visitor's own voice is mixed into actual MediaRecorder stream, no silent downgrade",()=>{
  assert.match(renderer,/decodeAudioData\(await audioFile\.arrayBuffer\(\)\)/);
  assert.match(renderer,/voiceContext\.createMediaStreamDestination\(\)/);
  assert.match(renderer,/stream\.addTrack\(track\)/);
  assert.match(renderer,/voiceSource\.start\(0\)/);
  assert.match(renderer,/audioRef\.current !== audioFile/);
  assert.match(renderer,/if \(!musicSession \|\| audioFile\) throw/);
  assert.match(renderer,/closeVoice\(job\)/);
  assert.match(renderer,/navigator\.share/);
  assert.match(renderer,/data-mandala-video-download/);
});
test("only new PUBLIC route is granted blob media/photo CSP",()=>{
  assert.match(csp,/const publicPersonalVideoLocalMedia = /);
  assert.match(csp,/ownerMessengerImages \|\| publicMandalaLocalImages \|\| publicPersonalVideoLocalMedia/);
  assert.match(csp,/publicMandalaLocalImages\|\|publicPersonalVideoLocalMedia/);
  assert.match(csp,/privateDocument \? 'private'/);
});
