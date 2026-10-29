import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { getTopicJourney } from "../lib/assessments/topic-journeys.js";
import { interpretSupportUtterance, parseSupportMinutes, chooseSupportFormat }
  from "../lib/holistic-support/guide-dialogue.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const parent = read("components/holistic-support-mobile.tsx");
const guide = read("components/holistic-support-inline-guide.tsx");
const css = read("components/holistic-support-inline-guide.module.css");
const mainCss = read("components/holistic-support-mobile.module.css");

test("guide is optional, within existing three-column layout rather than duplicate app", () => {
  for (const text of ["className={styles.topGrid}", "className={styles.assessment}",
    "className={styles.profile}", "className={styles.tools}",
    "data-support-recommendations", "data-support-mobile-bottom-nav"]) assert.ok(parent.includes(text), text);
  assert.match(parent, /guideOpen && !goalFilterOpen \? <HolisticSupportInlineGuide/);
  assert.match(parent, /onClick=\{onRecommendations\}/);
  assert.match(parent, /setGuideOpen\(true\)/);
  assert.match(parent, /onClose=\{\(\) => setGuideOpen\(false\)\}/);
  assert.doesNotMatch(parent, /data-support-journey-step="[1-5]"/);
});

test("starting context honors the goal filter then only four real user-edited domain ratings", () => {
  assert.ok(guide.indexOf("if (goal)") < guide.indexOf("if (editedCheckins.length)"));
  assert.match(guide, /summarizeGoalSelection\(locale, goal\)/);
  assert.match(guide, /Math\.min\(\.\.\.editedCheckins\.map\(id => scores\[id\]\)\)/);
  assert.match(guide, /if \(low\.length !== 1\)/);
  assert.match(guide, /phase: "topic" as Phase, message: t\.noData/);
  assert.match(parent, /setEditedCheckins\(previous => previous\.includes\(id\)/);
  assert.match(parent, /checkinOrder\.map\(id =>/);
  assert.match(parent, /onCheckinChange\(id, Number\(event\.target\.value\)\)/);
  assert.match(guide, /type CheckinArea = Exclude<Focus, "goals"> \| "meaning"/);
  assert.match(guide, /meaning: "Смыслы"/);
  assert.match(parent, /setGuideVersion\(previous => previous \+ 1\); setGuideOpen\(true\)/);
  assert.ok(guide.includes("По заполненному фильтру целей"));
});

test("same portrait on left, persistent scrolling WhatsApp-like messages on right, not new page", () => {
  assert.match(guide, /data-support-guide-fixed-portrait/);
  assert.match(guide, /support-reference-avatar\.webp/);
  assert.match(guide, /className=\{styles\.thread\} ref=\{threadRef\}/);
  assert.match(guide, /role="log" aria-label=\{t\.title\} aria-live="polite"/);
  assert.match(guide, /el\.scrollTop = el\.scrollHeight/);
  assert.match(guide, /\{ role: "user", text: answer \}, \{ role: "guide", text: reply \}/);
  assert.match(css, /\.dialogue \{ display: grid; grid-template-columns: 100px minmax\(0,1fr\)/);
  assert.match(css, /\.thread \{ display: flex; flex-direction: column/);
  assert.match(css, /overflow-y: auto; overflow-x: hidden/);
  assert.match(css, /\.bubbleUser \{ animation: guide-message-in/);
  assert.match(css, /\.bubbleGuide \{ animation: guide-message-in/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("assistant adapts questions to answers; at any step user can type, ask or change topic", () => {
  for (const phase of ['"review"','"topic"','"need"','"detail"','"time"','"format"','"confirm"','"recommendations"','"safety"'])
    assert.ok(guide.includes(phase), phase);
  for (const key of ["energy", "money", "love", "meaning"])
    assert.match(guide, new RegExp('"' + key + '"'));
  for (const format of ["meditation","tests","courses","consultation","healing","mandala"])
    assert.match(guide, new RegExp('"' + format + '"'));
  assert.match(guide, /talk\.detailOptions\[topic\]\.map/);
  assert.match(guide, /t\.needs\[topic\]\.map/);
  assert.match(guide, /talk\.detailAck/);
  assert.match(guide, /interpretSupportUtterance\(value, locale\)/);
  assert.match(guide, /maxLength=\{240\}/);
  assert.match(guide, /onSubmit=\{event => \{ event\.preventDefault\(\); submitText\(draft\); \}\}/);
  assert.match(guide, /onClick=\{changeTopic\}/);
  assert.match(guide, /phase !== "safety"/);
  assert.equal(interpretSupportUtterance("Почему именно эта тема?", "ru").question, "why");
  assert.equal(interpretSupportUtterance("Хочу поговорить про отношения", "ru").topic, "love");
  assert.equal(parseSupportMinutes("15 минут"), 15);
  assert.equal(chooseSupportFormat({available:["tests","meditation"],minutes:5,need:"Больше энергии"}), "meditation");
});

test("empty goal filter formats show a visible explanation before any suggestion", () => {
  assert.match(guide, /goalSelection\?\.recommendationFormats\?\.length === 0/);
  assert.match(guide, /message: result\.message \+ " " \+ conversation\[locale\]\.emptyFormat/);
  assert.match(guide, /available\.length \? available\.map/);
  assert.match(guide, /talk\.emptyFormat/);
});

test("recommendation cards become visible ONLY after explicit final user confirmation", () => {
  assert.match(guide, /phase === "confirm" \? \(/);
  assert.match(guide, /data-support-guide-show-recommendations/);
  assert.match(guide, /function showRecommendations\(\)/);
  assert.match(guide, /"recommendations"\)/);
  assert.match(guide, /phase === "recommendations" \? \(/);
  assert.match(guide, /data-support-guide-recommendations ref=\{resultsRef\}/);
  assert.match(guide, /data-support-guide-recommendation/);
  assert.match(guide, /data-support-guide-alternative=\{item\.id\}/);
  assert.match(guide, /data-support-guide-program/);
  assert.match(guide, /window\.requestAnimationFrame/);
  assert.match(guide, /resultsRef\.current\?\.scrollIntoView/);
  assert.match(css, /\.recommendations \{ display: grid/);
  assert.match(guide, /t\.planContinueText/);
  assert.doesNotMatch(parent, /data-support-journey-step/);
});

test("recommendations use published video IDs and existing verified routes; no autoplay/booking", () => {
  assert.match(guide, /videos\.find\(item => \/\^\[A-Za-z0-9_-\]\{11\}/);
  assert.match(guide, /encodeURIComponent\(selectedVideo\.id\)/);
  assert.match(guide, /onVideo\(selectedVideo\.id\)/);
  assert.match(guide, /\/client\/tests\?journey=/);
  for (const id of ["energy", "business", "relationships", "effectiveness"]) assert.ok(getTopicJourney(id));
  for (const dest of ["/explore/business", "/academy", "/holistic-support/mandala"]) assert.ok(guide.includes(dest));
  assert.match(guide, /onChoice\(kind === "healing" \? "healing" : "consultation"\)/);
  assert.match(parent, /setSelectedId\(id\); setPlaying\(false\)/);
  assert.doesNotMatch(guide, /autoplay=1|fetch\(|localStorage|sessionStorage|sendBeacon\(|\/api\/create-booking/);
});

test("privacy, non-clinical explanations and EN/RU/ES support are explicit", () => {
  for (const l of ["en", "ru", "es"]) assert.match(guide, new RegExp("^  "+l+": \\{", "m"));
  for (const phrase of ["not a diagnosis", "не диагноз", "no es un diagnóstico"]) assert.ok(guide.includes(phrase));
  assert.match(guide, /t\.private/);
  assert.match(guide, /talk\.identityAnswer/);
  assert.match(guide, /talk\.safetyAnswer/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 44px/);
});

test("both TSX components parse without syntax diagnostics", () => {
  for (const [fileName, source] of [["holistic-support-mobile.tsx", parent], ["holistic-support-inline-guide.tsx", guide]]) {
    const result=ts.transpileModule(source,{fileName,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    const errors=(result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")),[],fileName);
  }
});

test("current four-domain mobile header remains wide, compact and touch-safe", () => {
  assert.ok(parent.includes('const checkinOrder: CheckinArea[] = ["energy", "money", "relationships", "meaning"]'));
  assert.match(parent, /checkinOrder\.map\(id =>/);
  assert.doesNotMatch(parent, /energy: 5, money: 5, relationships: 5, goals: 5, meaning: 5/);
  assert.ok(mainCss.indexOf("The real iPhone three-column row") >
    mainCss.indexOf("Restore the original broad"), "latest compact override wins");
  assert.match(mainCss, /\.page \.tools \.toolGrid \{ grid-template-rows: repeat\(2, minmax\(0, 68px\)\); \}/);
  assert.match(mainCss, /\.page \.tools \.toolButton:last-child \{[\s\S]*?min-height: 68px;/);
  for (const selector of [
    "minmax(0,1.19fr) minmax(0,.83fr) minmax(0,1.20fr)",
    "minmax(0,1.20fr) minmax(0,.82fr) minmax(0,1.12fr)",
    "grid-template-rows: 14px 18px; min-height: 33px",
    "grid-template-rows: 12px 17px; min-height: 30px",
    ".page .assessment > .goalFilterTrigger { min-height: 40px; margin-top: 4px; }",
  ]) assert.ok(mainCss.includes(selector), selector);
});
