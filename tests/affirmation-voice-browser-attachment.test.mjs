import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");

test("affirmation attachment acceptance opens the advanced disclosure and checks both visible exact filenames",()=>{
  const start=source.indexOf('const expectedFileName="holistic-house-affirmations-"+locale+"-maya.wav"');
  const open=source.indexOf('await advanced.locator(":scope > summary").click()');
  const generate=source.indexOf('await page.locator("[data-video-generate-affirmation-audio]").click()',open);
  const selectedVisible=source.indexOf('await selectedFile.waitFor({state:"visible"})',start);
  const attachedVisible=source.indexOf('await attachedFile.waitFor({state:"visible"})',selectedVisible);
  const selectedName=source.indexOf('assert.equal(await selectedFile.innerText(),expectedFileName)',attachedVisible);
  const attachedName=source.indexOf('assert.equal(await attachedFile.innerText(),expectedFileName)',selectedName);
  const close=source.indexOf('await advanced.locator(":scope > summary").click()',attachedName);
  const hidden=source.indexOf('await selectedFile.waitFor({state:"hidden"})',close);
  assert.ok(open>=0&&generate>open&&start>generate&&selectedVisible>start&&attachedVisible>selectedVisible&&
    selectedName>attachedVisible&&attachedName>selectedName&&close>attachedName&&hidden>close,
    "inspect actual visible selected/attached filenames through the user disclosure, then return to compact editor");
  assert.doesNotMatch(source,/\.textContent\(/,"hidden DOM text is not visible UI evidence");
});

test("voice release encodes audible video in both Chromium and WebKit, never preview-only",()=>{
  assert.match(source,/if\(engine==="chromium"\|\|engine==="webkit"\)/);
  assert.match(source,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
  assert.match(source,/tracks\.includes\("audio"\)/);
  assert.match(source,/pcm\.stdout\.some\(value=>value!==0\)/);
});

test("disclosure acceptance retains provider privacy, real exported audio and stale narration gates",()=>{
  for(const assertion of [
    'assert.equal(payloads.length,1)',
    'assert.equal(payloads[0].text,transcript)',
    'assert.equal(payloads[0].consent,true)',
    'tracks.includes("video")',
    'tracks.includes("audio")',
    'pcm.stdout.some(value=>value!==0)',
    '[data-video-narration-stale]',
    'assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),true)',
  ])assert.ok(source.includes(assertion),assertion);
});

test("cross-platform voice export acceptance is real Chromium/Linux plus WebKit/macOS",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.match(source,/HH_VOICE_E2E_ENGINE/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE=chromium node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(workflow,/voice-webkit-macos:/);
  assert.match(workflow,/runs-on: macos-15/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE: webkit/);
  assert.match(workflow,/node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.doesNotMatch(workflow,/voice-webkit-macos:[\s\S]*continue-on-error:\s*true/);
});

test("stalled WebKit recorder diagnostics cannot conceal a real export failure",()=>{
  assert.match(source,/phase\(engine,"waiting-for-export"\)/);
  assert.match(source,/phase\(engine,"download-control-timed-out"\)/);
  assert.match(source,/withDeadline\(page\.evaluate\(/);
  assert.match(source,/4000,engine\+" media-state evaluation"/);
  assert.match(source,/withDeadline\(context\.close\(\),10000/);
  assert.match(source,/withDeadline\(browser\.close\(\),10000/);
  assert.match(source,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
  assert.match(source,/tracks\.includes\("audio"\)/);
  assert.match(source,/pcm\.stdout\.some\(value=>value!==0\)/);
});

test("WebKit macOS media acceptance is headed, real encoded audio and never a mock download",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.ok(workflow.includes("HH_VOICE_E2E_HEADED: '1'"));
  assert.ok(workflow.includes("HH_VOICE_E2E_ENGINE: webkit"));
  assert.ok(source.includes('const headedWebKit=requestedEngine==="webkit" && process.env.HH_VOICE_E2E_HEADED==="1"'));
  assert.ok(source.includes('browserType.launch({headless:!(engine==="webkit" && headedWebKit)})'));
  assert.ok(source.includes('assert.equal(process.platform,"darwin"'));
  assert.ok(source.includes('await output.waitFor({state:"visible",timeout:45000})'));
  for(const requirement of ['tracks.includes("video")','tracks.includes("audio")','pcm.stdout.some(value=>value!==0)']) assert.ok(source.includes(requirement));
});
