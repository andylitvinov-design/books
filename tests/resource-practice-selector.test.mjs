import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectResourcePractice, RESOURCE_PRACTICE_KINDS, RESOURCE_PRACTICE_VERSION } from "../lib/mandala/resource-practice-selector.mjs";

const locales = ["ru", "en", "es"];
const themes = ["energy", "money", "relationships", "goals", "life", "health"];

test("the complete RU/EN/ES resource catalog produces 3 usable steps per kind/theme", () => {
  assert.deepEqual(RESOURCE_PRACTICE_KINDS, ["ritual", "exercise", "practice"]);
  for (const locale of locales) for (const theme of themes) for (const kind of RESOURCE_PRACTICE_KINDS) {
    const result = selectResourcePractice({ locale, theme, kind });
    assert.equal(result.status, "ready", [locale,theme,kind].join("/"));
    assert.equal(result.locale, locale);
    assert.equal(result.kind, kind);
    assert.equal(result.theme, theme);
    assert.equal(result.steps.length, 3);
    assert.equal(result.durationMinutes, 3);
    assert.equal(result.clinicalClearance, false);
    assert.equal(result.source, RESOURCE_PRACTICE_VERSION);
    assert.ok(result.title.length > 8);
    assert.ok(result.topic.length > 5);
    assert.ok(result.transfer.length > 15);
    result.steps.forEach(step => assert.ok(step.length >= 20, [locale,kind,step].join("/")));
  }
});

test("each kind has a second authored variant and cycles deterministically", () => {
  for (const locale of locales) for (const kind of RESOURCE_PRACTICE_KINDS) {
    const base = { locale, kind, theme: "goals" };
    const original = selectResourcePractice({ ...base, revision: 0 });
    const alternative = selectResourcePractice({ ...base, revision: 1 });
    const repeat = selectResourcePractice({ ...base, revision: 2 });
    assert.notEqual(original.id, alternative.id);
    assert.notDeepEqual(original.steps, alternative.steps);
    assert.deepEqual(repeat, original);
  }
});

test("explicit client focus themes outrank the optional Video Studio default", () => {
  const chosen = selectResourcePractice({
    locale: "ru", theme: "money",
    focus: { goals: ["relationships"], goal: "Хочу больше близости" }, kind: "ritual",
  });
  assert.equal(chosen.theme, "relationships");
  assert.match(chosen.topic, /Близость/);
  const invalidFirst = selectResourcePractice({
    theme: "money", focus: { goals: ["bogus", "health"] },
  });
  assert.equal(invalidFirst.theme, "health");
});

test("private free text does not appear in the output or get stored", () => {
  const secret = "My private identifying detail 998-ABC";
  const result = selectResourcePractice({
    locale: "en", theme: "goals",
    focus: { difficulty: secret, goal: "I want to take a small step", details: [secret] },
  });
  assert.equal(result.status, "ready");
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(!JSON.stringify(result).includes("998-ABC"));
});

test("urgent cues block any suggestion, not a false clinical all-clear", () => {
  for (const [locale, phrase] of [
    ["ru", "хочу умереть"],
    ["en", "I want to kill myself"],
    ["es", "quiero morir"],
  ]) {
    const result = selectResourcePractice({ locale, focus: { difficulty: phrase } });
    assert.equal(result.status, "blocked", locale);
    assert.ok(result.message.length > 30);
    assert.ok(!JSON.stringify(result).includes(phrase));
  }
});

test("untrusted locale, theme, kind and revision fall back to reviewed content", () => {
  const result = selectResourcePractice({
    locale: "zz", theme: "unlisted", kind: "untrusted", revision: -1,
    focus: { goals: [null, "bogus"] },
  });
  assert.equal(result.locale, "en");
  assert.equal(result.theme, "energy");
  assert.equal(result.kind, "ritual");
  assert.equal(result.status, "ready");
});

test("the single approved four-step workspace uses goal-aware practices",async()=>{
  const code=await readFile(new URL("../components/mandala-guided-course.tsx",import.meta.url),"utf8");
  const studio=await readFile(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  for(const anchor of ["data-guided-focus-state","data-guided-generate-meditation","data-guided-practice-step",
    "data-guided-programme-step","data-guided-create-plan"])assert.ok(code.includes(anchor));
  assert.match(code,/selectResourcePractice\(/);
  assert.match(code,/practiceKind==="daily"\?"practice":practiceKind/);
  assert.match(code,/practiceResult\.steps\.map/);
  assert.match(code,/practiceResult\.transfer/);
  assert.doesNotMatch(code,/practiceSets|practiceTitles/);
  assert.match(code,/!firstScript\|\|!focusReady/);
  assert.match(code,/currentMeditation\?<div className=\{css\.flowResult\}/);
  assert.match(code,/currentProgramme\?<div className=\{css\.programme\}/);
  assert.match(code,/onOmitMeditation\?\.\(\)/);
  assert.match(code,/setApprovedSignature\(""\)/);
  assert.match(code,/setProgrammeSignature\(""\)/);
  assert.match(code,/needsVector/);assert.match(code,/needsState/);
  assert.match(code,/safetyBlocked/);
  assert.match(studio,/<MandalaGuidedCourse /);
  assert.match(studio,/onAddMeditation=\{script=>/);
});
test("one existing film and cloud-voice handoff remain",async()=>{
  const studio=await readFile(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(studio,/setCourseMeditationDraft\(script\)/);
  assert.match(studio,/setCourseMeditationDraft\(""\)/);
  assert.match(studio,/data-video-therapy-meditation-audio/);
  assert.match(studio,/onApplyFreeVideo=\{session=>/);
});

test("current practice page is exercised in real mobile Chromium/WebKit, not only static source assertions",async()=>{
  const voice=await readFile(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const script=await readFile(new URL("../scripts/verify-mandala-practices-browser.mjs",import.meta.url),"utf8");
  const legacy=await readFile(new URL("../scripts/verify-holistic-mandala-browser.mjs",import.meta.url),"utf8");
  assert.match(voice,/await verifyGuidedPractices\(\{browser,base:BASE,engine\}\)/);
  for(const marker of ["data-video-studio-hydrated","data-guided-focus-state","data-guided-add-meditation",
    "data-guided-skip-meditation","data-guided-practice-step","data-guided-eight-sessions",
    "data-video-key-difficulty","data-video-key-goal","data-meditation-script","pageErrors"]){
    assert.ok(script.includes(marker),"real page acceptance covers "+marker);
  }
  assert.match(legacy,/the vector cannot generate content before both fields are filled/);
  const {spawnSync}=await import("node:child_process");
  for(const filename of ["verify-mandala-practices-browser.mjs","verify-affirmation-voice-browser.mjs",
    "verify-holistic-mandala-browser.mjs"]){
    const child=spawnSync(process.execPath,["--check",new URL("../scripts/"+filename,import.meta.url).pathname],
      {encoding:"utf8",timeout:12000});
    assert.equal(child.status,0,filename+" syntax failed: "+(child.stderr||child.error?.message||""));
  }
});

test("WebKit focus transitions never wipe newly generated scripts via a delayed effect",async()=>{
  const code=await readFile(new URL("../components/mandala-guided-course.tsx",import.meta.url),"utf8");
  const browser=await readFile(new URL("../scripts/verify-mandala-practices-browser.mjs",import.meta.url),"utf8");
  const passive=code.slice(code.indexOf("const previousSignatureRef="),code.indexOf("const selectState="));
  assert.ok(passive.includes('previousSignatureRef.current=journeySignature'),
    "focus transitions must still invalidate old external narration");
  assert.doesNotMatch(passive,/setApprovedSignature|setProgrammeSignature|setMeditationOpen\(false\)/,
    "a delayed passive effect must never dismiss a newly generated meditation");
  assert.match(code,/setApprovedSignature\(journeySignature\)/);
  assert.match(code,/setProgrammeSignature\(journeySignature\)/);
  assert.match(code,/includedSignatureRef\.current=journeySignature/);
  assert.match(code,/includedSignatureRef\.current!==journeySignature/);
  assert.match(browser,/vector generated result missing/);
});
