import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");

test("voice browser opens the real Montage music controls before using them",()=>{
  assert.match(source,/data-video-quick-control="editor"/);
  assert.match(source,/montageSettings\.waitFor\(\{state:"visible"[\s\S]*?montageSettings\.locator\(":scope > summary"\)\.click\(\)[\s\S]*?musicTab\.click\(\)/);
});

test("voice browser selects the visible montage workspace before recording",()=>{
  assert.match(source,/phase\(engine,"offline-remix-ready"\)[\s\S]*?data-video-quick-control="editor"[\s\S]*?expect\(generate\)\.toBeVisible/);
});

test("affirmation attachment acceptance verifies the visible live movie soundtrack",()=>{
  const phrase=source.indexOf('[data-video-quick-control="phrases"]');
  const generate=source.indexOf('await page.locator("[data-video-generate-affirmation-audio]").click()',phrase);
  const expected=source.indexOf('const expectedFileName="holistic-house-affirmations-"+locale+"-leon.wav"',generate);
  const visible=source.indexOf('await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName)',expected);
  const remix=source.indexOf('phase(engine,"offline-remix-ready")',visible);
  const render=source.indexOf('[data-video-quick-control="video"]',remix);
  assert.ok(phrase>=0&&generate>phrase&&expected>generate&&visible>expected&&remix>visible&&render>remix,
    "inspect the visible attached audio in the canonical video stage, then record the remixed movie");
  assert.match(source,/await expect\(speech\)\.toBeVisible\(\)[\s\S]*?await speech\.textContent\(\)/,"transcript must be visible before reading its text");
  assert.match(source,/await expect\(page\.locator\("\[data-video-live-audio\]"\)\)\.toContainText\(expectedFileName\)/,"soundtrack evidence must remain visible");
});

test("voice release encodes audible video in both Chromium and WebKit, never preview-only",()=>{
  assert.match(source,/if\(engine==="chromium"\|\|engine==="webkit"\)/);
  assert.match(source,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
  assert.match(source,/tracks\.includes\("audio"\)/);
  assert.match(source,/pcm\.stdout\.some\(value=>value!==0\)/);
});

test("disclosure acceptance retains provider privacy, real exported audio and stale narration gates",()=>{
  for(const assertion of [
    'assert.equal(affirmationRequests.length,1)',
    'assert.equal(affirmationRequests[0].text,transcript)',
    'assert.equal(affirmationRequests[0].consent,true)',
    'tracks.includes("video")',
    'tracks.includes("audio")',
    'pcm.stdout.some(value=>value!==0)',
    '[data-video-narration-stale]',
    'await expect(page.locator("[data-video-quick-generate]")).toBeDisabled()',
    'await expect(page.locator("[data-video-live-audio]")).toHaveCount(0)',
    'await expect(page.locator("[data-video-affimations-audio-ready]")).toHaveCount(0)',
  ])assert.ok(source.includes(assertion),assertion);
  const editor=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(editor,/onInvalidate=\{\(\)=>setAttachedAudio\(current=>\s*current\?\.kind==="file"&&current\.narration\?null:current\)\}/);
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

test("approved Phrases geometry and own voice require real mobile/browser export evidence",()=>{
  for(const width of ["320","390","430"])assert.ok(
    source.includes("for(const width of [320,390,430])")&&source.includes("phrases-geometry-"),
    "real same-row/16:9/overflow checks must run for "+width);
  assert.match(source,/data-video-affirmation-gender="own"/);
  assert.match(source,/data-video-own-voice-record/);
  assert.match(source,/data-video-own-voice-track/);
  assert.match(source,/data-video-own-voice-attach/);
  assert.match(source,/new AudioContext\(\)/);
  assert.match(source,/real MediaRecorder wrote a playable local file/);
  assert.match(source,/own-voice-encoded-video-passed/);
  assert.match(source,/recorded voice is audible, not silent/);
  assert.match(source,/local voice cannot leak to a TTS provider/);
  assert.match(source,/data-video-affirmation-voice-advanced/);
  assert.match(source,/data-video-affirmation-transcript-review/);
  assert.match(source,/phrases-geometry/);
});

test("voice acceptance verifies one workspace click after delayed hydration",()=>{
  assert.match(source,/async function verifyWorkspaceHydration\(browser,locale\)/);
  assert.match(source,/await hold/);
  assert.match(source,/expect\.poll\(\(\)=>held/);
  assert.match(source,/tabs\.nth\(i\)\)\.toBeDisabled/);
  assert.match(source,/data-video-studio-hydrated","true"/);
  assert.match(source,/await phrases\.click\(\)/);
  assert.match(source,/toHaveAttribute\("aria-pressed","true"\)/);
  assert.match(source,/await verifyWorkspaceHydration\(browser,locale\)/);
});

test("consent click diagnostics retain one genuine click and never capture contact values",()=>{
  const practices=readFileSync(new URL("../scripts/verify-practices-mobile-browser.mjs",import.meta.url),"utf8");
  const block=practices.slice(practices.indexOf('const consentLabel=form.locator'),practices.indexOf('assert.equal(await consentBox.isChecked()'));
  const [normal,shifted]=block.split('if(locale==="ru"&&width===320)');
  assert.ok(shifted,"independent viewport-shift case must exist");
  assert.equal((normal.match(/await consentLabel\.click\(\)/g)||[]).length,1);
  assert.equal((shifted.match(/await consentLabel\.click\(\)/g)||[]).length,1);
  assert.equal((shifted.match(/await consentLabel\.tap\(\)/g)||[]).length,1);
  assert.match(shifted,/consentBox\.press\("Space"\)/);
  assert.match(shifted,/scroll\.before-scroll\.after>=50/);
  assert.match(block,/toBeChecked\(\{timeout:12000\}\)/);
  assert.match(block,/toBeEnabled\(\{timeout:12000\}\)/);
  assert.match(block,/trusted:event\.isTrusted/);
  assert.match(block,/elementFromPoint/);
  assert.doesNotMatch(block,/\.check\(|force:\s*true|\.value\b/);
});
