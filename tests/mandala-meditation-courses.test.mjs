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
  const entry=studio.indexOf('activeWorkspace==="courses" ? <section');
  const panel=studio.indexOf("data-video-meditation-course-panel className");
  const hypno=studio.indexOf("data-video-hypnocorrection-panel");
  assert.ok(before>0&&entry>before&&panel>entry&&hypno>0,
    "the course composer belongs to the existing six-tab Video Studio");
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.match(studio,/<MandalaPersonalMeditation coursePreview/);
  assert.match(studio,/studioMode==="therapy" && activeWorkspace!=="courses"/,
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
  assert.match(enquiry,/sourcePath:"\/"\+locale\+"\/services\/imagery-therapy"/);
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
