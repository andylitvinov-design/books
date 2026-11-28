import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCoachCourseLaunch,coachCourseLaunchHref,normalizeLaunchCoach,courseLaunchNeighbor,courseLaunchPresentation} from '../lib/coach-course-launch.mjs'
import {projectCourseSession,resolveSavedCoachSession} from '../lib/coach-course-session-progress.mjs'
import {courseCoachChoice,verifyCourseCoachChoice} from '../lib/app/coach-course-choice.mjs'
import {isUnifiedMobileDockAppPath,unifiedMobileDockActive} from '../lib/unified-mobile-dock.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('one localized template for all four courses; only existing free course is launchable',()=>{
 for(const lang of ['en','ru','es'])for(const [program,count] of [['clarity',3],['business',8],['love',8],['health',8]]){
  const data=getCoachCourseLaunch(lang,program)
  assert.equal(data.course.count,count);assert.equal(data.course.rows.length,count)
  assert.equal(data.course.available,program==='clarity')
  assert.ok(data.copy.meet&&data.copy.details&&data.intro)
  assert.deepEqual(JSON.parse(JSON.stringify(data)),data)
  const path=coachCourseLaunchHref(lang,program)
  assert.equal(path,'/'+lang+'/my-coach/programs/'+program)
  assert.equal(isUnifiedMobileDockAppPath(path),true);assert.equal(unifiedMobileDockActive(path),'coach')
  assert.equal(coachCourseLaunchHref(lang,program,'genie'),path+'?coach=genie')
 }
 assert.equal(getCoachCourseLaunch('en','unknown'),null)
 assert.equal(coachCourseLaunchHref('en','https://outside.example'),null)
 assert.equal(normalizeLaunchCoach(['genie']), 'mira')
 assert.equal(normalizeLaunchCoach('genie'),'genie')
})
test('selection is short-lived, account-scoped if known, and cannot grant access or reset progress',()=>{
 const owner='12345678-1234-4234-8234-123456789012',other='12345678-1234-4234-8234-123456789013',now=10000
 const v=courseCoachChoice('clarity','merlin',owner,now)
 assert.equal(verifyCourseCoachChoice(v,'clarity',owner,now+1),'merlin')
 assert.equal(verifyCourseCoachChoice(v,'clarity',other,now+1),null)
 assert.equal(verifyCourseCoachChoice(v,'clarity',owner,now+900000),null)
 assert.equal(verifyCourseCoachChoice(v,'goal',owner,now+1),null)
 assert.equal(courseCoachChoice('business','mira',owner,now),null)
 assert.equal(courseCoachChoice('clarity','invalid',owner,now),null)
 assert.equal(verifyCourseCoachChoice(courseCoachChoice('clarity','genie',null,now),'clarity',owner,now+1),'genie')
 assert.equal(verifyCourseCoachChoice({...v,expires:Infinity},'clarity',owner,now+1),null)
})
test('course entry, selector, details below rail and private Daybook handoff are wired',()=>{
 const landing=read('components/my-coach-catalog.jsx')
 const comparison=read('components/my-coach-program-comparison.jsx')
 const page=read('app/[locale]/my-coach/programs/[program]/page.jsx')
 const view=read('components/my-coach-course-launch.jsx')
 const start=read('components/app/clarity-program.jsx')
 const dashboard=read('components/app/coaching-course-dashboard.jsx')
 assert.ok(landing.includes("'/my-coach/programs'"))
 assert.match(landing,/data-my-coach-program-details/)
 assert.doesNotMatch(landing,/data-my-coach-free-course/)
 assert.match(comparison,/coachCourseLaunchHref\(lang,p\.id\)/)
 assert.match(page,/normalizeLaunchCoach\(query\?\.coach\)/)
 assert.match(view,/data-my-coach-hero=\{selected\.id\}/)
 assert.match(view,/data-course-coach-choice=\{id\}/)
 assert.match(view,/course\.available&&course\.id==='clarity'/)
 assert.match(view,/<Link href=\{coachSessionHref\(lang,selected\.id\)\+'&greetingProgram='\+encodeURIComponent\(course\.id\)\}/)
 assert.match(view,/data-course-greeting-start data-course-selected-coach=\{selected\.id\}/)
 assert.doesNotMatch(view,/<ClarityStartLink/)
 const greeting=read('components/my-coach-greeting-gate.jsx')
 assert.match(greeting,/query\?\.get\('greetingProgram'\)/)
 assert.match(greeting,/<ClarityStartLink locale=\{lang\} coachId=\{personaId\}/)
 assert.ok(view.indexOf('id="course-coach-rail"')<view.indexOf('data-course-session-details'))
 assert.match(start,/stageCoachCourseChoice\(program,coachId,boot\.account\.id\)/)
 assert.match(start,/continuation:programContinuation\(program\)/)
 assert.match(dashboard,/consumeCoachCourseChoice\(program,accountId\)/)
 assert.match(dashboard,/sessionAvailable=program==='goal'/)
 assert.doesNotMatch(view,/startSession\(|live-token|paymentUrl|checkout/)
})

test('session indicator follows only the trusted cumulative logical clock and never the selected coach',()=>{
 const row=(day,elapsedMs,status)=>({day,elapsedMs,remainingMs:1200000-elapsedMs,status})
 const clock=(currentDay,days)=>({currentDay,complete:currentDay===null,days})
 const blank=day=>row(day,0,'not_started')
 assert.deepEqual(projectCourseSession(null),{session:1,percent:0,complete:false})
 assert.equal(projectCourseSession(undefined),null)
 assert.deepEqual(projectCourseSession(clock(1,[row(1,816000,'paused'),blank(2),blank(3)])),{session:1,percent:68,complete:false})
 assert.deepEqual(projectCourseSession(clock(2,[row(1,1200000,'time_limit'),row(2,360000,'active'),blank(3)])),{session:2,percent:30,complete:false})
 assert.deepEqual(projectCourseSession(clock(null,[1,2,3].map(d=>row(d,1200000,'time_limit')))),{session:3,percent:100,complete:true})
 assert.equal(projectCourseSession(clock(1,[row(1,1199999,'active'),blank(2),blank(3)])).percent,99)
 assert.equal(projectCourseSession(clock(1,[blank(1),row(2,360000,'active'),blank(3)])),null)
 assert.equal(projectCourseSession(clock(2,[blank(1),blank(2),blank(3)])),null)
 assert.equal(projectCourseSession(clock(1,[blank(1),blank(2),{...blank(3),remainingMs:1}])),null)
})
test('compact course hero and accessible full coach directory do not start or reset sessions',()=>{
 const view=read('components/my-coach-course-launch.jsx'),directory=read('components/my-coach-course-directory.jsx')
 const css=read('components/my-coach-course-launch.module.css'),route=read('app/api/coaching/intro/[locale]/[coach]/route.js')
 assert.ok(view.indexOf('data-course-all-coaches')<view.indexOf('data-my-coach-hero'))
 assert.match(view,/<SessionProgressRing progress=\{progress\} lang=\{lang\}/)
 assert.match(view,/appFetch\('clarity-course\/clock',undefined,'GET',\{accountId:boot.account.id/)
 assert.doesNotMatch(view,/data-course-rail-expanded|setInterval|localStorage/)
 assert.match(css,/\.sessionRing\{position:absolute;[^}]*top:12px;right:12px;width:64px/)
 assert.match(directory,/d\.showModal\(\)/)
 assert.match(directory,/PUBLIC_COACH_RAIL_IDS\.map\(getCoachPersona\)/)
 assert.match(directory,/p\.related\.includes\(topic\)/)
 assert.match(directory,/onChoose\(p\.id\)/)
 assert.match(directory,/new Audio\(path\+'&archive=1'\)/)
 assert.ok(route.indexOf('if(archiveOnly)throw new AppError')<route.indexOf('const voiceName='))
 assert.doesNotMatch(directory,/getUserMedia|startSession\(|sessionStorage|localStorage/)
})

test('archive-only query accepts only exact version and archive flag',()=>{
 const route=read('app/api/coaching/intro/[locale]/[coach]/route.js')
 const pattern=route.split("if(archiveOnly){if(!/")[1].split("/.test(url.search)")[0]
 const re=new RegExp(pattern)
 for(const v of [2,3,4,5,6,7])assert.equal(re.test('?v='+v+'&archive=1'),true)
 for(const bad of ['v=4&archive=1','?v=1&archive=1','?archive=1&v=4','?v=4&archive=2','?v=4&archive=1&archive=1','?v=4'])assert.equal(re.test(bad),false)
})

test('My Daybook is a plain localized peer navigation link to the protected free course, not a start action',()=>{
 const view=read('components/my-coach-course-launch.jsx'),css=read('components/my-coach-course-launch.module.css')
 const labels={en:'My Daybook',ru:'Мой дневник',es:'Mi diario'}
 for(const [lang,label] of Object.entries(labels))assert.equal(getCoachCourseLaunch(lang,'clarity').copy.daybook,label)
 const nav=view.split('data-course-nav>')[1].split('</div>')[0]
 assert.match(nav,/course\.available&&course\.id==='clarity'&&<Link href=\{programDaybookPath\(lang,course\.id\)\}/)
 assert.match(nav,/className=\{styles\.back\} data-course-daybook prefetch=\{false\}>\{copy\.daybook\}<ArrowRight size=\{19\}/)
 assert.equal((nav.match(/className=\{styles\.back\}/g)||[]).length,2)
 assert.doesNotMatch(nav,/ClarityStartLink|onClick|<button/)
 assert.ok(view.indexOf('data-course-nav')<view.indexOf('className={styles.intro}'))
 assert.match(css,/\.courseNav\{display:flex;align-items:center;justify-content:space-between;/)
})

test('greeting course metadata is real and course selection wraps without changing coach',()=>{
 for(const lang of ['en','ru','es']){
  const p=courseLaunchPresentation(lang,getCoachCourseLaunch(lang,'clarity').course)
  assert.equal(p.bonus,'+ Bonus: 18 Practices in Daybook.')
  assert.match(p.duration,/3.*20/)
  assert.equal(courseLaunchPresentation(lang,getCoachCourseLaunch(lang,'business').course).bonus,null)
 }
 assert.equal(courseLaunchPresentation('ru',getCoachCourseLaunch('ru','clarity').course).title,'Ясность в своих желаниях')
 assert.equal(courseLaunchNeighbor('clarity',-1),'health')
 assert.equal(courseLaunchNeighbor('clarity',1),'business')
 assert.equal(courseLaunchNeighbor('health',1),'clarity')
})

test('old personal review ribbon is excluded from program launch and greeting routes in all locales',()=>{
 const source=read('components/sitewide-antistress-banner.tsx')
 const policy=source.split('const isDistractionSensitivePage = (pathname: string) =>')[1].split('export function SitewideAntistressBanner')[0]
 const rules=[...policy.matchAll(/(\/\^.*?\/)\.test\(pathname\)/g)].map(m=>new RegExp(m[1].slice(1,-1)))
 for(const lang of ['en','ru','es']){
  for(const suffix of ['my-coach/programs','my-coach/programs/clarity','my-coach/programs/business','my-coach/programs/love','my-coach/programs/health','coaching/sessions']){
   assert.ok(rules.some(rule=>rule.test('/'+lang+'/'+suffix)),lang+'/'+suffix)
  }
 }
})

test('saved session entry never restarts on unknown, partial or ambiguous history',()=>{
 const item={id:'saved',courseSessionId:'intro',personaId:'genie',durationSeconds:420}
 const input={accountSaving:true,ready:true,topic:'intro',personaId:'genie',items:[item]}
 assert.deepEqual(resolveSavedCoachSession(input),{kind:'resume',item})
 assert.equal(resolveSavedCoachSession({...input,personaId:'mira'}).kind,'choose')
 assert.equal(resolveSavedCoachSession({...input,cursor:{next:'x'}}).kind,'choose')
 assert.equal(resolveSavedCoachSession({...input,items:[item,{...item,id:'other'}]}).kind,'choose')
 for(const patch of [{ready:false},{busy:true},{error:true}])assert.equal(resolveSavedCoachSession({...input,...patch}).kind,'lookup')
 assert.equal(resolveSavedCoachSession({...input,items:[]}).kind,'new')
 assert.equal(resolveSavedCoachSession({...input,accountSaving:false,ready:false}).kind,'new')
 const gate=read('components/my-coach-greeting-gate.jsx')
 assert.doesNotMatch(gate,/window\.confirm/)
 assert.match(gate,/onResumeSession\(entry.item\)/)
 assert.ok(gate.indexOf("if(entry.kind!=='new')")<gate.indexOf('onStart?.(id,options)'))
})
