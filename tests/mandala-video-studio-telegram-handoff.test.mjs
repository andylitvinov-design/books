import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route=readFileSync(new URL("../app/[locale]/video-studio/page.tsx",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const publicPage=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");

test("Telegram video-studio URL is guest-safe and reuses the single EN/RU/ES public editor",()=>{
  assert.match(route,/isPublicLocale\(locale\)/);
  assert.match(route,/notFound\(\)/);
  assert.match(route,/redirect\(`\/\$\{locale\}\/holistic-support\/mandala`\)/);
  assert.doesNotMatch(route,/fetch\(|localStorage|supabase|service_role|sendMessage/i);
  assert.match(publicPage,/MandalaMeditationClient/);
});
test("canonical editor already supports a real private original voice/photo video and native sharing",()=>{
  assert.match(studio,/mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(studio,/new MediaRecorder\(/);
  assert.match(studio,/startUploadedAudio\(/);
  assert.match(studio,/navigator\.share\(\{files:/);
  assert.match(studio,/audioRights/);
  assert.match(studio,/photo/);
});
