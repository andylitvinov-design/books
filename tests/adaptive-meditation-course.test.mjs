import test from "node:test";
import assert from "node:assert/strict";
import {buildAdaptiveMeditationOutline,chooseMeditationCourseTheme} from "../lib/mandala/adaptive-meditation-course.mjs";

test("eight topic names track the visitor's selected goal in all three locales",()=>{
  for(const locale of ["ru","en","es"]){
    const money=buildAdaptiveMeditationOutline({locale,request:locale==="ru"?"хочу ясности в работе":locale==="en"?"clarity in my work":"claridad en mi trabajo"});
    const relationships=buildAdaptiveMeditationOutline({locale,request:locale==="ru"?"хочу спокойнее общаться с родителями":locale==="en"?"family communication":"comunicación con mi familia"});
    assert.equal(money.focusTheme,"money");
    assert.equal(relationships.focusTheme,"relationships");
    assert.equal(money.days.length,8);
    assert.deepEqual(money.days.map(x=>x.number),[1,2,3,4,5,6,7,8]);
    assert.equal(new Set(money.days.map(x=>x.title)).size,8);
    assert.notDeepEqual(money.days.map(x=>x.title),relationships.days.map(x=>x.title));
    assert.ok(money.days.every(x=>x.title&&x.motif));
    assert.equal(money.days[0].ready,"day1-script-available");
    assert.ok(money.days.slice(1).every(x=>x.ready==="topic-preview"));
    assert.equal(money.remainingScriptsPublished,false);
    assert.equal(money.remainingAudioGenerated,false);
  }
});

test("a deliberately selected topic takes precedence over keyword matching",()=>{
  assert.equal(chooseMeditationCourseTheme({request:"money and salary",theme:"relationships",explicitTheme:true}),"relationships");
  assert.equal(chooseMeditationCourseTheme({request:"хочу наладить общение",theme:"energy"}),"relationships");
  assert.equal(chooseMeditationCourseTheme({request:"",theme:"goals"}),"goals");
  assert.equal(chooseMeditationCourseTheme({request:"",theme:"nonsense"}),"energy");
});

test("personal raw request never becomes a day title or publishes seven drafts",()=>{
  const secret="PRIVATE_USER_WISH_12345";
  const plan=buildAdaptiveMeditationOutline({locale:"ru",request:secret});
  assert.equal(plan.days.length,8);
  assert.ok(plan.days.every(d=>!JSON.stringify(d).includes(secret)));
  assert.equal(Object.hasOwn(plan.days[1],"script"),false);
});
