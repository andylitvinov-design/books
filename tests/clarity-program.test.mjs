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
 assert.match(source,/practiceCounts=\{counts\}/)
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
 const ui=read('components/app/clarity-program.jsx');assert.match(ui,/CoachingCourseDashboard/);assert.match(ui,/tags:entry\?\.tags\|\|\(homework\?clarityHomeworkTags\(homework.reportId,homework.row.id\):\[clarityDayTag\(day\)\]/)
 assert.match(ui,/if\(!draft.current\)/);assert.match(ui,/hasMore\?/);assert.match(ui,/await saver.current.save/)
 const pub=read('lib/public-coaching-programs.mjs');assert.match(pub,/id==='clarity'\?CLARITY_SYLLABUS\[locale\]/)
})

test('Clarity adopts the Reiki golden one-screen shell with independent accessible day panels',()=>{
 const ui=read('components/app/clarity-program.jsx'),style=read('components/app/clarity-program.module.css'),journal=read('components/app/daybook-journal.jsx')
 assert.match(ui,/data-clarity-design="golden-one-screen-v3"/)
 assert.match(ui,/data-clarity-sheet/)
 assert.match(ui,/selected=\{day\} onSelect=\{chooseDay\}/)
 assert.match(ui,/hidden=\{day!==number\}/)
 assert.match(ui,/data-clarity-practice/)
 assert.match(ui,/data-clarity-reflection/)
 assert.match(read('components/app/coaching-course-dashboard.jsx'),/hh:open-ihelp/)
 assert.match(ui,/\{children\}/)
 assert.match(style,/\.coursePage\[data-clarity-golden\]\{position:fixed;inset:0/)
 assert.match(style,/height:100dvh/)
 assert.match(style,/\.sheet\{flex:1 1 0;min-height:0;min-width:0;overflow-y:auto/)
 assert.match(style,/\.dayCard\[hidden\]\{display:none!important\}/)
 assert.match(journal,/clarityStyles\.coursePage/)
 assert.match(journal,/<\/details><\/ClarityDaybook>/)
})

test('shared coaching dashboard uses real practice progress, portrait and distinct session materials',()=>{
 const ui=read('components/app/coaching-course-dashboard.jsx'),css=read('components/app/coaching-course-dashboard.module.css'),goal=read('components/app/daybook-stages.jsx')
 assert.match(ui,/PUBLIC_COACH_PERSONAS/)
 assert.match(ui,/data-coaching-task="homework"/)
 assert.match(ui,/data-coaching-task="practice"/)
 assert.match(ui,/data-coaching-material="results"/)
 assert.match(ui,/data-coaching-material="protocol"/)
 assert.match(ui,/data-coaching-session-start=\{selected\}/)
 assert.match(ui,/practiceOnlyReflection\?t.reflection:t.done/)
 assert.match(ui,/goalCourse=/)
 assert.match(css,/height:100dvh/)
 assert.match(css,/min-height:74px/)
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(goal,/program="goal"/)
 assert.match(goal,/sessionCounts/)
 assert.match(goal,/guideRecords\(entries,goalId,'review',1,'summary'\)/)
 assert.match(read('app/[locale]/coaching/sessions/page.jsx'),/group.id==='goal'/)
})

test('session one workbook opens a dedicated golden flow without changing the other sessions',()=>{
 const ui=read('components/app/clarity-program.jsx'),flow=read('components/app/clarity-practice.jsx'),dashboard=read('components/app/coaching-course-dashboard.jsx'),style=read('components/app/clarity-practice.module.css')
 assert.match(ui,/practiceFlow=\{onClose=><DaybookGames day=\{day\}/)
 assert.match(dashboard,/panel==='practice'&&practiceFlow/)
 assert.match(flow,/await saver.current.save\(pending.current\)/)
 assert.match(flow,/clarityPracticeTag\(step\)/)
 assert.match(flow,/allowDictation=\{false\}/)
 assert.match(flow,/if\(hasMore\)/)
 assert.match(flow,/notes.length>1/)
 assert.match(flow,/onSessionLost\(\)/)
 assert.doesNotMatch(flow,/localStorage|sessionStorage/)
 assert.match(style,/overflow-y:auto/)
 assert.match(style,/repeat\(7,minmax\(0,1fr\)\)/)
})

test('coach selection is a scoped device preference and unavailable Clarity does not launch a different session',()=>{
 const ui=read('components/app/coaching-course-dashboard.jsx')
 assert.match(ui,/hh-daybook-coach-v1:/)
 assert.match(ui,/choice.key===storageKey/)
 assert.match(ui,/PUBLIC_COACH_PERSONAS.some/)
 assert.match(ui,/sessionAvailable=program==='goal'/)
 assert.match(ui,/sessionAvailable&&coach\?dashboardSessionHref/)
 assert.match(ui,/disabled=\{locked\|\|!sessionAvailable\}/)
 assert.match(ui,/window.localStorage.setItem\(storageKey,id\)/)
})

import {daybookGames,gameTag,gameNotes,gameProgress,validGameAnswer,gameResult} from '../lib/app/daybook-games.mjs'
test('three days, nine tap-first games, localized steps and explicit review',()=>{for(const locale of ['ru','en','es'])for(const day of [1,2,3]){const games=daybookGames(locale,day);assert.equal(games.length,3);for(const g of games){assert.equal(g.steps.length,4);assert.ok(g.steps.every(s=>s.prompt&&['scale','pick','multi'].includes(s.kind)));assert.throws(()=>gameResult(g,{}));const answers=g.steps.map(s=>s.kind==='multi'?[0]:0);assert.ok(gameResult(g,answers).includes(g.title));assert.ok(g.steps.every(s=>!validGameAnswer(s,undefined)))}}assert.throws(()=>gameTag(4,1));assert.equal(gameProgress([],1).done,0);const n={id:'1',revision:1,kind:'note',goalId:null,text:'result',tags:[gameTag(1,1)]};assert.equal(gameProgress([n],1).done,1);assert.equal(gameProgress([n,n],1).done,0);assert.equal(gameNotes([n],2,1).length,0);assert.equal(gameProgress([{...n,revision:0}],1).done,0);assert.equal(gameProgress([{...n,tags:['clarity-practice-v1-step-1']}],1).done,0)})
