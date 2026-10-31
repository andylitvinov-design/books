import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");

test("affirmation attachment acceptance opens the advanced disclosure and checks both visible exact filenames",()=>{
  const start=source.indexOf('const expectedFileName="holistic-house-affirmations-"+locale+"-maya.wav"');
  const open=source.indexOf('await advanced.locator(":scope > summary").click()',start);
  const selectedVisible=source.indexOf('await selectedFile.waitFor({state:"visible"})',open);
  const attachedVisible=source.indexOf('await attachedFile.waitFor({state:"visible"})',selectedVisible);
  const selectedName=source.indexOf('assert.equal(await selectedFile.innerText(),expectedFileName)',attachedVisible);
  const attachedName=source.indexOf('assert.equal(await attachedFile.innerText(),expectedFileName)',selectedName);
  const close=source.indexOf('await advanced.locator(":scope > summary").click()',attachedName);
  const hidden=source.indexOf('await selectedFile.waitFor({state:"hidden"})',close);
  assert.ok(start>=0&&open>start&&selectedVisible>open&&attachedVisible>selectedVisible&&
    selectedName>attachedVisible&&attachedName>selectedName&&close>attachedName&&hidden>close,
    "inspect actual visible selected/attached filenames through the user disclosure, then return to compact editor");
  assert.doesNotMatch(source,/\.textContent\(/,"hidden DOM text is not visible UI evidence");
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

