import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityDaybookPath,clarityOnboardingPath,savedClarityReflection,CLARITY_SYLLABUS,CLARITY_FREE_REFLECTION_TAG,CLARITY_TASKS,CLARITY_DAY_COUNT,clarityDayTag,clarityDayNotes,clarityRecordedDays,clarityLegacyNotes} from '../lib/app/clarity-program.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('fixed route keeps locale and never accepts an arbitrary OAuth return',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(clarityDaybookPath(locale),'/'+locale+'/app/daybook?program=clarity')
  assert.match(clarityOnboardingPath(locale),new RegExp('clarityLocale='+locale+'$'))
  assert.equal(CLARITY_SYLLABUS[locale].length,3)
  assert.equal(CLARITY_TASKS[locale].length,3)
  assert.ok(CLARITY_TASKS[locale].every(tasks=>tasks.length===3))
 }
 assert.equal(clarityDaybookPath('//attacker.example'),'/en/app/daybook?program=clarity')
 assert.equal(clarityOnboardingPath('es'),'/en/app/portrait?afterSignIn=clarity&clarityLocale=es')
})
test('free progress is only a saved journal reflection; it does not grant paid access',()=>{
 const entry={kind:'note',goalId:null,revision:1,text:'reflection',tags:[CLARITY_FREE_REFLECTION_TAG]}
 assert.equal(savedClarityReflection([]),null)
 assert.equal(savedClarityReflection([{...entry,revision:0}]),null)
 assert.equal(savedClarityReflection([{...entry,text:' '}]),null)
 assert.equal(savedClarityReflection([entry]),entry)
 const source=read('components/app/clarity-program.jsx')
 assert.match(source,/max=\{CLARITY_DAY_COUNT\}/)
 assert.match(source,/clarityDayNotes\(entries,number\)/)
 assert.match(source,/notes\.length>1/)
 assert.doesNotMatch(source,/LockKeyhole|Payment for this session is not configured yet/)
 assert.match(source,/createJournalSaver/)
 assert.doesNotMatch(source,/localStorage|sessionStorage/)
})
test('explicit Google continuation survives onboarding and never changes goal daybook default',()=>{
 const auth=read('app/api/app/[...path]/route.js')
 const work=read('components/app/app-workspace.jsx')
 const view=read('components/app/daybook-journal.jsx')
 assert.match(auth,/continueTo === 'clarity-daybook'/)
 assert.match(auth,/clarityOnboardingPath\(locale\)/)
 assert.match(work,/afterSignIn'\)==='clarity'/)
 assert.match(work,/data-clarity-details/)
 assert.match(view,/if\(clarityMode\)return/)
 assert.match(view,/data-daybook-view=\{tab\}/)
})


test('Hero and guidance CTA share the same authenticated or Google entry',()=>{
 const source=read('components/app/clarity-program.jsx')
 assert.equal((source.match(/continueTo:programContinuation\(program\)/g)||[]).length,1)
 assert.equal((source.match(/=useProgramStart\(locale,'clarity'\)/g)||[]).length,2)
 assert.match(source,/boot\.account\.onboardingState==='active'\?programDaybookPath\(lang,program\):programOnboardingPath\(lang,program\)/)
 assert.match(source,/data-clarity-start data-clarity-personal/)
 assert.match(source,/href=\{clarityDaybookPath\(lang\)\}/)
 assert.match(source,/event\.preventDefault\(\)[\s\S]*?if\(!busy\)void begin\(\)/)
})

test('three independent notes, legacy isolation, duplicate protection and no fake completion',()=>{
 const e=(day,extra={})=>({id:'id-'+day,kind:'note',goalId:null,revision:1,text:'saved',tags:[clarityDayTag(day)],...extra})
 assert.equal(CLARITY_DAY_COUNT,3)
 assert.throws(()=>clarityDayTag(4));assert.throws(()=>clarityDayTag('1'))
 const legacy=e(1,{tags:[CLARITY_FREE_REFLECTION_TAG]})
 const entries=[legacy,e(1),e(2,{revision:0}),e(3),e(1,{id:'duplicate'}),e(2,{goalId:'foreign'})]
 assert.deepEqual(clarityRecordedDays(entries),[1,3]);assert.equal(clarityDayNotes(entries,1).length,2)
 assert.deepEqual(clarityLegacyNotes(entries),[legacy]);assert.deepEqual(clarityRecordedDays([legacy]),[])
 const ui=read('components/app/clarity-program.jsx');assert.match(ui,/clarityCoachHref\(root\+'\/my-coach',day\)/);assert.match(ui,/tags:entry\?\.tags\|\|\[clarityDayTag\(day\)\]/)
 assert.match(ui,/if\(!draft.current\)/);assert.match(ui,/hasMore\?/);assert.match(ui,/await saver.current.save/)
 const pub=read('lib/public-coaching-programs.mjs');assert.match(pub,/id==='clarity'\?CLARITY_SYLLABUS\[locale\]/)
})

test('Clarity adopts the Reiki golden one-screen shell with independent accessible day panels',()=>{
 const ui=read('components/app/clarity-program.jsx'),style=read('components/app/clarity-program.module.css'),journal=read('components/app/daybook-journal.jsx')
 assert.match(ui,/data-clarity-design="golden-one-screen-v3"/)
 assert.match(ui,/data-clarity-sheet/)
 assert.match(ui,/aria-controls=\{'clarity-day-'\+\(i\+1\)\}/)
 assert.match(ui,/hidden=\{day!==number\}/)
 assert.match(ui,/data-clarity-practice/)
 assert.match(ui,/data-clarity-reflection/)
 assert.match(ui,/hh:open-ihelp/)
 assert.match(ui,/\{children\}/)
 assert.match(style,/\.coursePage\[data-clarity-golden\]\{position:fixed;inset:0/)
 assert.match(style,/height:100dvh/)
 assert.match(style,/\.sheet\{flex:1 1 0;min-height:0;min-width:0;overflow-y:auto/)
 assert.match(style,/\.dayCard\[hidden\]\{display:none!important\}/)
 assert.match(journal,/clarityStyles\.coursePage/)
 assert.match(journal,/<\/details><\/ClarityDaybook>/)
})
