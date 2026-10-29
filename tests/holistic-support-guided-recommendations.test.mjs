import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { getTopicJourney } from "../lib/assessments/topic-journeys.js";
import { interpretSupportUtterance } from "../lib/holistic-support/guide-dialogue.mjs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const parent=read("components/holistic-support-mobile.tsx");
const guide=read("components/holistic-support-inline-guide.tsx");
const css=read("components/holistic-support-inline-guide.module.css");
const page=read("app/[locale]/holistic-support/mobile/page.tsx");
const source=read("lib/assessments/support-guide-tests.js");

test("original four-scale three-column dashboard and lower player stay intact",()=>{
  for(const value of ["className={styles.topGrid}","className={styles.assessment}",
    "className={styles.profile}","className={styles.tools}","data-support-recommendations",
    "data-support-mobile-bottom-nav","support-meditation-player","support-healing-panel"]) assert.ok(parent.includes(value),value);
  assert.match(parent, /const checkinOrder: CheckinArea\[\] = \["energy", "money", "relationships", "meaning"\]/);
  assert.match(parent, /guideOpen && !goalFilterOpen \? <HolisticSupportInlineGuide/);
  assert.match(parent, /onClick=\{onRecommendations\}/);
  assert.doesNotMatch(parent,/data-support-journey-step="[1-5]"/);
});

test("intro greets visitor without pretending private tests are readable",()=>{
  assert.match(guide,/journey\.hi/);
  assert.match(guide,/Рада тебя видеть/);
  assert.match(guide,/if \(goal\)/);
  assert.ok(guide.indexOf("if (goal)")<guide.indexOf("if (editedCheckins.length)"));
  assert.match(guide,/Math\.min\(\.\.\.editedCheckins\.map\(id => scores\[id\]\)\)/);
  assert.match(guide,/if \(low\.length !== 1\)/);
  assert.match(guide,/phase: "topic" as Phase, message: t\.noData/);
  assert.match(guide,/noPersonalData/);
  assert.match(parent,/setEditedCheckins\(previous => previous\.includes\(id\)/);
  assert.match(parent,/onCheckinChange\(id, Number\(event\.target\.value\)\)/);
});

test("left avatar stays fixed and WhatsApp-like dialogue history scrolls inside the card",()=>{
  assert.match(guide,/data-support-guide-fixed-portrait/);
  assert.match(guide,/support-reference-avatar\.webp/);
  assert.match(guide,/className=\{styles\.thread\} ref=\{threadRef\}/);
  assert.match(guide,/node\.scrollTop=node\.scrollHeight/);
  assert.match(guide,/role="log" aria-label=\{t\.title\} aria-live="polite"/);
  assert.match(guide,/setMessages\(prev=>\[\.\.\.prev,\.\.\.pair\]\.slice\(-42\)\)/);
  assert.match(css,/\.dialogue \{ display: grid; grid-template-columns: 100px minmax\(0,1fr\)/);
  assert.match(css,/overflow-y: auto; overflow-x: hidden/);
  assert.match(css,/@media \(max-width: 340px\)/);
  assert.match(css,/prefers-reduced-motion: reduce/);
});

test("V2 conversational order is optional test, practice, feedback, then My Path",()=>{
  for(const phase of ["review","topic","test-invite","test-pick","test-return","practice-invite",
    "time","media-pick","media-return","exercise","feedback","path-confirm","recommendations","safety"])
    assert.ok(guide.includes('"'+phase+'"'),phase);
  assert.match(guide,/data-guide-open-test-choice/);
  assert.match(guide,/data-guide-skip-test/);
  assert.match(guide,/data-guide-test-options/);
  assert.match(guide,/data-guide-continue-after-test/);
  assert.match(guide,/data-guide-go-meditations/);
  assert.match(guide,/data-guide-short-practice/);
  assert.match(guide,/data-guide-media-options/);
  assert.match(guide,/data-guide-inline-practice/);
  assert.match(guide,/data-guide-self-report-watched/);
  assert.match(guide,/data-support-guide-show-recommendations/);
  assert.match(guide,/phase==="recommendations"/);
  assert.match(guide,/data-support-guide-recommendation/);
  assert.match(guide,/data-support-guide-program/);
  assert.match(guide,/data-support-guide-recommendations/);
  assert.ok(guide.indexOf('phase==="path-confirm"')<guide.indexOf('phase==="recommendations"'),
    "final path requires explicit confirmation");
});

test("test suggestions come from genuine published rights-cleared short items",()=>{
  assert.match(page,/buildSupportGuideTestShortlists\(\{ locale \}\)/);
  assert.match(parent,/guideTests=\{guideTests\}/);
  for(const term of [
    "buildExplorerEntries", "rankPublicTestMatches", "item?.selectable === true",
    "item?.startable === true", "item?.guestEligible === true", "item?.free === true",
    "item?.rightsStatus === 'cleared'", "item?.explicitOptIn !== true",
    "item.durationMinutes <= 3", "const candidates = topical",
  ]) assert.ok(source.includes(term),term);
  assert.match(source,/slice\(0,2\)/);
  assert.match(source,/\/client\?startTests=/);
  assert.match(guide,/data-guide-test-card=\{item\.key\}/);
  assert.match(guide,/href=\{item\.href\} target="_blank" rel="noopener noreferrer"/);
  assert.match(guide,/journey\.testOpened/);
  assert.match(guide,/journey\.waitingHint/);
  assert.doesNotMatch(guide,/testCompleted\s*=\s*true|saveTestResult\(|onTestCompleted\(\)/);
});

test("published videos only, playback requires a separate explicit Play, no invented runtime",()=>{
  assert.match(guide,/videoThemes\[topic\]\.some\(tag=>v\.topics\.includes\(tag\)\)/);
  assert.match(guide,/\.slice\(0,3\)/);
  assert.match(guide,/encodeURIComponent\(item\.id\)/);
  assert.match(guide,/data-guide-media-card=\{item\.id\}/);
  assert.match(guide,/data-guide-watch-video=\{item\.id\}/);
  assert.match(guide,/onVideo\(id\)/);
  assert.match(parent,/setSelectedId\(id\); setPlaying\(false\)/);
  assert.match(guide,/journey\.timeNote/);
  assert.match(guide,/journey\.noAutoplay/);
  assert.match(guide,/journey\.mediaWait/);
});

test("free text, topic changes and unknown questions never force an AI call or a booking",()=>{
  assert.match(guide,/interpretSupportUtterance\(text,locale\)/);
  assert.match(guide,/intent\.kind==="switch-topic"/);
  assert.match(guide,/intent\.kind==="safety"/);
  assert.match(guide,/data-support-guide-compose/);
  assert.match(guide,/maxLength=\{240\}/);
  assert.match(guide,/setPhase\(next\)/);
  assert.match(guide,/onChoice\(kind==="healing"\?"healing":"consultation"\)/);
  assert.match(guide,/journey\.noPersonalData/);
  assert.equal(interpretSupportUtterance("Другая тема","ru").kind,"switch-topic");
  assert.equal(interpretSupportUtterance("Хочу Рейки","ru").format,"healing");
  assert.doesNotMatch(guide,/fetch\(|autoplay=1|localStorage|sessionStorage|sendBeacon|\/api\/payments\/charge/);
});

test("real optional next-step routes use established test explorer, academy and studio",()=>{
  for(const id of ["energy","business","relationships","effectiveness"])assert.ok(getTopicJourney(id));
  assert.match(guide,/client\/tests\?journey=/);
  assert.match(guide,/\/explore\/business/);
  assert.match(guide,/\/academy/);
  assert.match(guide,/\/holistic-support\/mandala/);
  assert.match(guide,/t\.formatLabels\[x\.id\]/);
});

test("localized stage messages are available EN/RU/ES; mobile buttons and accessibility remain",()=>{
  for(const locale of ["en","ru","es"]){
    assert.match(guide,new RegExp("^  "+locale+": \\{","m"));
  }
  for(const sentence of ["Hi! So good to see you","Привет! Рада тебя видеть","¡Hola! Me alegra verte"])
    assert.ok(guide.includes(sentence),sentence);
  assert.match(guide,/journey\.questionWhy/);
  assert.match(guide,/journey\.missingTests/);
  assert.match(guide,/journey\.finalAsk/);
  assert.match(guide,/role="log"/);
  assert.match(css,/min-height: 44px/);
  assert.match(css,/:focus-visible/);
});

test("all touched TSX modules parse",()=>{
  for(const [path,text] of [
    ["components/holistic-support-inline-guide.tsx",guide],
    ["components/holistic-support-mobile.tsx",parent],
    ["app/[locale]/holistic-support/mobile/page.tsx",page]
  ]){
    const out=ts.transpileModule(text,{fileName:path,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    const errors=(out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")),[],path);
  }
});
