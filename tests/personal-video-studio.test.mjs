import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/[locale]/video-studio/page.tsx");
const editor = read("components/personal-video-studio.tsx");
const render = read("components/mandala-free-video-studio.tsx");
const csp = read("middleware.ts");
const navigation = read("components/holistic-support-mobile.tsx");
const locales = read("lib/public-locales.ts");

test("one public self-service route with canonical EN/RU/ES, no bot or auth", () => {
  for (const lang of ["en", "ru", "es"]) assert.match(page, new RegExp('"/' + lang + '/video-studio"'));
  assert.match(page, /<PersonalVideoStudio locale={locale}/);
  assert.doesNotMatch(editor, /fetch\s*\(|XMLHttpRequest|/api/|supabase|telegramBotToken/i);
  assert.match(locales, /video-studio/);
});

test("local photo, user voice or microphone, bounded input and explicit permission", () => {
  assert.match(editor, /data-personal-video-photo/);
  assert.match(editor, /data-personal-video-voice/);
  assert.match(editor, /data-personal-video-mic/);
  assert.match(editor, /createImageBitmap\(file\)/);
  assert.match(editor, /getUserMedia\(/);
  assert.match(editor, /10_000_000/);
  assert.match(editor, /15_000_000/);
  assert.match(editor, /60_000/);
  assert.match(render, /photoConsent/);
  assert.match(render, /audioMissing/);
  assert.match(render, /\(!standalone \|\| Boolean\(audioFile\)\)/);
  assert.match(render, /audioRef\.current !== audioFile/);
});

test("existing renderer composes voice into the SAME video recording", () => {
  assert.match(render, /audioContext\.decodeAudioData/);
  assert.match(render, /createMediaStreamDestination/);
  assert.match(render, /stream\.addTrack\(track\)/);
  assert.match(render, /audioSource\.start\(0\)/);
  assert.match(render, /releaseAudio\(job\)/);
  assert.match(render, /Math\.ceil\(decoded\.duration\)/);
  assert.match(render, /type\.includes\("mp4"\) \? "mp4" : "webm"/);
  assert.match(render, /navigator\.share\(/);
});

test("blob audio/photo/video policies limited to public studio and old mandala", () => {
  assert.match(csp, /publicPersonalVideoLocalMedia = \//);
  assert.match(csp, /publicMandalaLocalImages \|\| publicPersonalVideoLocalMedia/);
  assert.match(csp, /publicMandalaLocalImages\|\|publicPersonalVideoLocalMedia/);
  assert.match(navigation, /data-support-free-personal-video/);
  assert.match(navigation, /\+ "\/video-studio"/);
});
