import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ui=read("components/mandala-loved-voices.tsx");
const api=read("app/api/holistic-support/loved-voices/route.js");
const page=read("app/[locale]/holistic-support/loved-voices/page.tsx");
const mandala=read("app/[locale]/holistic-support/mandala/page.tsx");

test("guest pilot has one real first-party form, no sign-in or external website upload",()=>{
  for(const s of ['data-loved-voice-mvp','data-loved-voice-generate','type="file"',
    'LOVED_VOICE_CONSENT_PHRASES','fetch("/api/holistic-support/loved-voices"',
    'new AudioContext()','decodeAudioData','new FormData()','URL.createObjectURL(audio)',
    'href={url}','audio controls','locale={locale}']){
    assert.ok((ui+page).includes(s),s);
  }
  assert.match(ui,/window\.location\.origin\+window\.location\.pathname/);
  assert.match(ui,/#t="\+encodeURIComponent/);
  assert.match(ui,/navigator\.share\(\{files:/);
  assert.doesNotMatch(ui,/aistudio\.google\.com|elevenlabs\.io|window\.open|supabase\.auth\.signIn/);
});
test("server requires source and separate owner's recorded consent, no storage or paid calls",()=>{
  for(const s of ['requireSameOrigin(request,config)','await consumeRate(config',
    'form.get("adult")','form.get("permission")','source.arrayBuffer()',
    'consent.arrayBuffer()','inspectLovedVoiceWav(sample,"source")',
    'inspectLovedVoiceWav(spokenConsent,"consent")','generateLovedVoice(',
    'PRIVATE_HEADERS','"X-HH-Synthetic-Audio":"true"']){
    assert.ok(api.includes(s),s);
  }
  assert.doesNotMatch(api,/storage\.from|INSERT INTO|upsert|paidBackup|HEYGEN|OpenRouter/i);
  assert.ok(api.indexOf('await consumeRate(config')<api.indexOf('generateLovedVoice('));
});
test("one Mandala editor remains canonical; pilot links back into Sound",()=>{
  assert.match(page,/MandalaLovedVoices/);
  assert.match(ui,/\/holistic-support\/mandala#video-audio/);
  assert.match(mandala,/data-loved-voices-entry/);
  assert.doesNotMatch(page,/MandalaFreeVideoStudio|MediaRecorder/);
});
test("locales and exact consent translation do not silently promise real provider",()=>{
  for(const s of ['ru:{','en:{','es:{','Google Gemini','Google','Google']){
    assert.ok(ui.includes(s),s);
  }
  assert.match(ui,/if\(busy\|\|!available\|\|!source/);
  assert.match(ui,/!available\|\|loading\|\|busy\|\|!approved/);
  assert.match(page,/robots:\{index:false/);
});
