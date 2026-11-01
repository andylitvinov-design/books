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

