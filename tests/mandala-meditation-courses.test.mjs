import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {buildPersonalImageryCourse} from "../lib/mandala/personal-guided-course.mjs";
import {buildPersonalMeditationScript,isMeditationSafetyResponse} from "../lib/mandala/personal-meditation-script.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("meditation-course workspace opens the existing working composer within the six video tabs",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const composer=read("components/mandala-personal-meditation.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const before=studio.indexOf("data-video-quick-controls");
  const entry=studio.indexOf('activeWorkspace==="practices" ? <section');
  const panel=studio.indexOf("data-video-meditation-course-panel className");
  const hypno=studio.indexOf("data-video-effects-panel");
  assert.ok(before>0&&entry>before&&panel>entry&&hypno>0,
    "the course composer belongs to the existing six-tab Video Studio");
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.match(studio,/<MandalaPersonalMeditation coursePreview/);
  assert.match(studio,/studioMode==="therapy" && activeWorkspace!=="practices"/,
    "do not mount two visible personal meditation editors");
  assert.match(composer,/buildPersonalMeditationScript\(\{/);
  assert.match(composer,/data-meditation-course-request/);
  assert.match(composer,/maxLength=\{160\}/);
  assert.match(composer,/\{script\?\(coursePreview\?course.regenerate:t.regenerate\):t.generate\}/);
  assert.match(css,/\.workspaceCourses\{/);
});

test("one generated meditation unlocks exactly eight topic previews and an honest service inquiry",()=>{
  const src=read("components/mandala-personal-meditation.tsx");
  const css=read("components/mandala-personal-meditation.module.css");
  assert.match(src,/buildAdaptiveMeditationOutline\(\{/);
  assert.match(src,/variantIndex:nextVariant/);
  assert.match(src,/setCourseDays\(plan.days.map/);
  assert.match(src,/coursePreview&&!safetyResponse/);
  assert.match(src,/coursePreview&&script&&!stale&&courseDays.length===8/);
  assert.match(src,/data-meditation-eight-day-plan/);
  assert.match(src,/courseDays\.map\(\(day,index\)/);
  assert.match(src,/data-meditation-course-day=\{day.number\}/);
  assert.match(src,/data-meditation-eight-day-offer/);
  assert.match(src,/<MeditationCourseEnquiry key=\{signature\} locale=\{locale\} focus=\{courseFocus\|\|actualTheme\}/);
  const enquiry=read("components/meditation-course-enquiry.tsx");
  assert.match(enquiry,/data-meditation-course-order/);
  assert.match(enquiry,/data-meditation-course-submit/);
  assert.match(enquiry,/contactConsent:true/);
  assert.match(enquiry,/sourcePath:courseKind==="video-series"\?"\/"\+locale\+"\/holistic-support\/mandala":"\/"\+locale\+"\/services\/imagery-therapy"/);
  assert.doesNotMatch(enquiry,/wish|clientPhrase|testScores|profileData/,
    "the first-party enquiry must not transmit raw meditation or test content");
  assert.match(src,/не проводят? оплату|не проводит оплату/);
  assert.match(css,/\.courseDays\{/);
  assert.match(css,/\.courseOffer\{/);
  assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|checkout\(|spendXP\(/,
    "this preview must not contact AI, store private text or charge visitors");
  for(const locale of ["ru","en","es"]){
    const example=locale==="ru"?"бережная внутренняя опора":locale==="en"?"gentle self support":"apoyo interior suave";
    const script=buildPersonalMeditationScript({locale,theme:"energy",wish:example,
      focus:{difficulty:"",goal:example,goals:["energy"],details:[]},
      technique:"grounding",length:5});
    assert.equal(isMeditationSafetyResponse(script,locale),false);
    assert.ok(script.length>500,"a real local meditation is composed");
    assert.ok(script.includes(example),"first-day script reflects the visitor's chosen goal");
    const plan=buildPersonalImageryCourse({locale,theme:"energy",
      goals:["energy"],keyGoal:example});
    assert.equal(plan.sessionCount,8);
    assert.equal(plan.sessions.length,8);
    assert.deepEqual(plan.sessions.map(s=>s.number),[1,2,3,4,5,6,7,8]);
    assert.equal(new Set(plan.sessions.map(s=>s.title)).size,8);
    assert.ok(plan.sessions.every(s=>s.title&&s.motif));
  }
});

test("crisis text returns support only and must never expose the course offer",()=>{
  const script=buildPersonalMeditationScript({locale:"ru",theme:"energy",wish:"хочу умереть"});
  assert.equal(isMeditationSafetyResponse(script,"ru"),true);
  assert.match(script,/экстренную помощь/);
  const ui=read("components/mandala-personal-meditation.tsx");
  assert.match(ui,/if\(coursePreview&&!safetyResponse&&plan\)/);
  assert.match(ui,/else if\(coursePreview\)\{\s*setCourseDays\(\[\]\)/);
});

test("WebKit duplicate blur must not erase an already approved local meditation",()=>{
  const studio=read("components/mandala-guided-course.tsx");
  const contextStart=studio.indexOf('data-video-key-difficulty value={keyDifficulty}');
  assert.ok(contextStart>0,"original controlled guided-course focus is retained");
  const context=studio.slice(contextStart,contextStart+800);
  assert.match(context,/const next=event\.currentTarget\.value;/);
  // React may deliver stale blur callbacks after the approved script is saved.
  // Compare against the most recent ref, not a captured render closure.
  assert.match(studio,/const committedDifficultyRef=useRef\(keyDifficulty\);/);
  assert.doesNotMatch(studio,/committedDifficultyRef\.current=keyDifficulty;/,
    "unrelated React renders cannot rewind the last handled WebKit input");
  assert.ok(studio.includes('committedDifficultyRef.current="";setKeyDifficulty("");resetGeneratedMeditation();'),
    "explicit mode reset must keep its ref and controlled input in sync");
  assert.match(studio,/data-guided-meditation-click-count=\{meditationActionCount\}/,
    "real Safari Generate taps are observable without collecting private text");
  assert.match(context,/if\(next===committedDifficultyRef\.current\)return;/,
    "duplicate WebKit input events cannot revoke a just-generated script");
  assert.match(context,/committedDifficultyRef\.current=next;/,
    "a new typed value becomes the latest committed input before invalidation");
  assert.match(context,/setKeyDifficulty\(next\);/,
    "real text edits must update the controlled input");
  assert.doesNotMatch(context,/setKeyDifficulty\(next\);\s*resetGeneratedMeditation\(\)/,
    "a late Safari textarea event cannot undo a newer Generate click");
  assert.match(studio,/const currentMeditation=meditationOpen&&approvedSignature===journeySignature&&focusReady;/,
    "old generated narration remains hidden after a real focus edit");
  assert.match(studio,/includedSignatureRef\.current!==journeySignature[\s\S]*?onOmitMeditation\?\.\(\)/,
    "an edited focus still revokes previously attached audio");
  assert.match(studio,/data-guided-signature-match=\{approvedSignature===journeySignature\?"true":"false"\}/,
    "the exact signature remains observable for real WebKit failure diagnostics");
});

test("reselecting the same guided focus is idempotent, but new input invalidates the old approval",()=>{
  const source=read("components/mandala-guided-course.tsx");
  const state=source.slice(source.indexOf("const selectState="),source.indexOf("const selectVector="));
  const vector=source.slice(source.indexOf("const selectVector="),source.indexOf("useEffect(()=>()=>{profileRequestRef"));
  assert.match(state,/if\(focusMode==="state"&&selectedState===id&&goals\.length===1&&goals\[0\]===goalTheme/);
  assert.match(vector,/if\(focusMode==="vector"&&selectedState==="vector-"\+id&&goals\.length===1&&goals\[0\]===goalTheme/);
  assert.match(state,/setSelectedState\(id\);setGoals\(\[goalTheme\]\);setKeyGoal/);
  assert.match(vector,/setSelectedState\("vector-"\+id\);setGoals\(\[goalTheme\]\);setKeyGoal/);
  assert.match(state,/resetGeneratedMeditation\(\)/);
  assert.match(vector,/resetGeneratedMeditation\(\)/);
  assert.match(source,/data-guided-focus-reset-count=\{focusResetCountRef\.current\}/);
});

test("WebKit guided-course diagnostics never read Node closures inside browser evaluate",()=>{
 const browser=read("scripts/verify-mandala-practices-browser.mjs");
 const begin=browser.indexOf("const state=await course.evaluate(el=>({");
 const end=browser.indexOf("}));",begin);
 assert.ok(begin>=0&&end>begin,"real guided-course WebKit state inspection remains");
 assert.doesNotMatch(browser.slice(begin,end),/\bpageErrors\b/,
   "Playwright page.evaluate must not reference Node-only pageErrors");
 assert.match(browser,/data-guided-meditation-click-count/,
   "Safari failure logs distinguish missing taps from post-tap invalidation");
 assert.match(browser,/JSON\.stringify\(\{\.\.\.state,pageErrors:pageErrors\.slice\(-5\)\}\)/,
   "diagnostics include guest console errors outside the browser context");
});

test("iPhone guided-course create-plan handler has a one-tap state receipt without animated-scroll race",()=>{
 const guided=read("components/mandala-guided-course.tsx");
 const browser=read("scripts/verify-mandala-practices-browser.mjs");
 assert.match(guided,/data-guided-plan-open=\{planOpen\?"true":"false"\}/);
 assert.match(guided,/data-guided-plan-click-count=\{planActionCount\}/);
 assert.match(guided,/data-guided-plan-signature-match=\{programmeSignature===journeySignature\?"true":"false"\}/);
 assert.match(guided,/setPlanActionCount\(count=>count\+1\);\s*setProgrammeSignature\(journeySignature\);/);
 assert.match(guided,/scrollIntoView\(\{behavior:"instant",block:"start"\}\)/,
   "personal editor focus must not leave a smooth-scroll animation over the next user click");
 assert.doesNotMatch(guided.slice(guided.indexOf("function openPersonalMeditation()"),
   guided.indexOf("function createProgramme()")),/requestAnimationFrame/,
   "no deferred scrolling may race the real create-programme tap");
 assert.match(browser,/planClickCount:root\?\.getAttribute\("data-guided-plan-click-count"\)/);
 assert.match(browser,/planSignatureMatch:root\?\.getAttribute\("data-guided-plan-signature-match"\)/);
});

test("Safari first-click eight-session programme uses one committed approval, not two racing state values",()=>{
  const guided=read("components/mandala-guided-course.tsx");
  assert.match(guided,/const planOpen=programmeSignature\.length>0/);
  assert.doesNotMatch(guided,/\bsetPlanOpen\b|\[planOpen,setPlanOpen\]/);
  assert.match(guided,/setProgrammeSignature\(journeySignature\)/);
  assert.match(guided,/const currentProgramme=planOpen&&programmeSignature===journeySignature&&focusReady;/);
  assert.match(guided,/setApprovedSignature\(""\);setProgrammeSignature\(""\);/,
    "real goal changes must still invalidate the approved course");
});
