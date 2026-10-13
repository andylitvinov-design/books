// Browser UI acceptance with clearly labelled synthetic course DTOs. PostgreSQL
// storage and the released interpretation loader have separate acceptance gates.
import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {assertIsolated} from '../tests/helpers/app-db-setup.mjs'
import {courseOutline21,lessonFor21,COURSE_CONTENT_21_VERSION} from '../lib/inner-growth/lesson-library-21.js'
import {createCourseJourney,checkInBeforeLesson,dailyLesson,finishCourseDay} from '../lib/inner-growth/course-progression-21.js'
import {courseCompletion21,saveCourseContinuation} from '../lib/inner-growth/course-completion-21.js'
import {COURSE_GOAL_STATEMENTS_V1} from '../data/inner-growth/course-goal-statements-v1.js'
import {createCourseGoalObservationSnapshot,recordCourseGoalObservations,buildCourseGoalWeeklyReports} from '../lib/inner-growth/course-goal-observations.js'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium,browser=await engine.launch()
// page.route cannot intercept service-worker-owned fetches. Only this mocked-DTO
// UI context blocks workers; production SW and full database journeys are unchanged.
// https://playwright.dev/docs/api/class-page#page-route
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage()
const output='artifacts/app-r1/course-21-'+engine.name(),checks=[],pageErrors=[],posts=[],requests=[],effectRequests=[]
await mkdir(output,{recursive:true})
const course={id:'synthetic-21-course',sourceCourseId:'synthetic-r3-course',revision:1,status:'active',durationDays:21,contentVersion:COURSE_CONTENT_21_VERSION,timeZone:'UTC'}
const rows=['mood','tension','clarity','recovery','connection','energy','load','functioning'].map((key,index)=>({
 id:'synthetic-form/'+key,r3ScaleKey:'hh-weekly-pulse::weekly.'+key,definitionKey:'hh-weekly-pulse',dimensionKey:'weekly.'+key,
 label:'Synthetic scale '+key,resultId:'synthetic-result',instrumentLocale:'en',measurementAt:'2026-10-10T12:00:00.000Z',
 value:index,min:0,max:10,unit:'points',rawPosition:index/10,supportPosition:index/10,reason:'more-reported-resource',
 meaning:'Synthetic prepared DB meaning for '+key,source:{title:'Synthetic source',url:'https://example.invalid/public-source'},
 interpretationStatus:'available',canChoosePractice:true,eligibleForPriority:true,
}))
const profile={status:'ready-to-review',rows,priorityScaleIds:rows.slice(0,7).map(r=>r.id),minimumChoices:3,maximumChoices:5}
const proposal={available:true,status:'ready-to-review',profile,source:{courseRevision:3,selectedForms:[]},consentVersion:'synthetic-consent-v1',activationToken:'synthetic-preview-token'}
let terminalJourney=null
let locale='en',fixture={available:true,enrollmentReady:true,course:null},conflict=false
let fixtureMode='v1',personalConflict=false,verificationStatus='running'
const fixtureErrors=[]
const syntheticJourney=createCourseJourney({id:'synthetic-outline',choices:{confirmed:true,durationDays:21,topics:[{scaleId:rows[0].id,track:'inner_support'}]},consent:true,timeZone:'UTC',contentVersion:COURSE_CONTENT_21_VERSION,now:'2026-10-12T12:00:00Z'})
const r3={course:{id:'synthetic-r3-course',stage:3,revision:3,testKeys:['hh-weekly-pulse'],scaleKeys:[],focusTags:[],goals:[]},assessments:{selectedTests:[],pendingSelected:[]}}
// Deliberately synthetic eight-row v2 contract fixture, not the two real pilot
// questionnaires, all 15 pilot scales, released mappings, or a 388-test inventory.
// Six eligible goals plus aggregate/unsupported rows exercise honest visibility.
const PERSONAL_MODE='exact-reviewed-scale-objective-practice'
const personalTopics=['energy_agency','inner_support','connection_boundaries','calm_regulation','emotional_flexibility','attention_clarity']
const personalLabel=(index,lang='en')=>lang==='ru'?'Синтетическая цель '+(index+1):'Synthetic personal goal '+(index+1)
function personalProfile(lang='en'){
 const rows=Array.from({length:8},(_,index)=>({
  id:'synthetic-personal-scale/'+index,r3ScaleKey:'synthetic-personal-form-'+(index<4?'a':'b')+'::dimension-'+index,
  definitionKey:'synthetic-personal-form-'+(index<4?'a':'b'),definitionVersion:'synthetic-v2',dimensionKey:'dimension-'+index,
  testTitle:lang==='ru'?'Синтетическая анкета для проверки интерфейса':'Synthetic UI-only questionnaire',label:personalLabel(index,lang),
  resultId:'synthetic-personal-result-'+index,instrumentLocale:index%2?'ru':'en',measurementAt:'2026-10-01T12:00:00.000Z',
  value:index+1,min:0,max:20,unit:'points',rawPosition:0.9,supportPosition:0.9,track:personalTopics[index%6],
  meaning:lang==='ru'?'Синтетическое подготовленное объяснение '+(index+1):'Synthetic prepared explanation '+(index+1),
  source:{title:'Synthetic interpretation source',url:'https://example.invalid/synthetic-interpretation'},
  interpretationStatus:'available',canChoosePractice:index<6,
  practiceReason:index===6?'aggregate-profile-only-not-a-separate-goal':index===7?'mapping-unavailable':null,
  mappingRationale:{en:'Synthetic exact educational link '+(index+1),ru:'Синтетическая точная учебная связь '+(index+1)},
  mappingLimitations:{en:'Synthetic limited facet only '+(index+1),ru:'Синтетический ограниченный аспект '+(index+1)},
  mappingSourceMetadata:{title:'Synthetic reviewed-mapping DTO only',url:'https://example.invalid/synthetic-mapping/'+index},
  familyReuse:index===0?{sourcePilotIdentity:{definitionKey:'synthetic-authoring-context',definitionVersion:'synthetic-v1',dimensionKey:'synthetic.energy'},limitedFacet:{en:'One synthetic manageable action',ru:'Одно синтетическое посильное действие'}}:null,
 }))
 return {version:'hh-personal-course-profile-v2',status:'ready-to-review',rows,minimumChoices:3,maximumChoices:5,
  priorityScaleIds:rows.slice(0,6).map(row=>row.id),priorityBasis:'confirmed-focus-then-distinct-topics-not-severity'}
}
const personalRows=personalProfile().rows
const personalAccents={1:{primaryTopicId:personalTopics[1],secondaryTopicId:null},2:{primaryTopicId:personalTopics[2],secondaryTopicId:personalTopics[0]},3:{primaryTopicId:personalTopics[0],secondaryTopicId:personalTopics[2]}}
function personalProposal(lang){return {available:true,personalization:PERSONAL_MODE,profile:personalProfile(lang),source:{courseRevision:8,selectedForms:[]},activationToken:'synthetic-personal-preview-token',consentVersion:'synthetic-personal-consent-v2'}}
function personalLesson(plan,day,choice='keep',targetScaleId=null){
 const lang=plan.contentLocale,review=day%7===0,minutes=choice==='short'?2:plan.loadMinutes
 const targets=plan.selectedScaleIds.map(id=>personalRows.find(row=>row.id===id))
 const row=targets.find(row=>row.id===targetScaleId)||targets[0]
 return {id:['synthetic-personal-lesson',plan.revision,day,lang,choice,targetScaleId||'planned'].join(':'),day,
  title:lang==='ru'?'Синтетический '+(review?'обзор всех целей':'навык дня'):'Synthetic '+(review?'whole-goal review':'daily skill'),
  contentLocale:lang,domain:review?null:row.track,variant:choice==='alternative'?'grounding':minutes===2?'quick':'standard',
  preparedVariant:choice==='alternative'?'grounding':minutes===2?'quick':'standard',durationSeconds:minutes*60,
  curriculum:{objectiveId:'synthetic-objective/'+day,skill:lang==='ru'?'Замечать доступный выбор':'Notice an available choice',objective:lang==='ru'?'Выбрать одно посильное действие':'Choose one manageable action',learningOutcome:lang==='ru'?'Назвать один следующий шаг':'Name one next step'},
  sections:[{kind:'learn',title:lang==='ru'?'Учебный пример':'Learning example',text:lang==='ru'?'СИНТЕТИЧЕСКИЙ ТЕКСТ УРОКА RU. Только проверка интерфейса.':'SYNTHETIC PREPARED EN LESSON. UI fixture only.'}],
  aphorism:lang==='ru'?'Маленького шага достаточно.':'A small step is enough.',ritual:lang==='ru'?'Назовите один шаг.':'Name one step.',reflection:lang==='ru'?'Что вы заметили?':'What did you notice?',
  source:{title:'Synthetic prepared source',url:'https://example.invalid/synthetic-lesson'},frameReviewSource:'Synthetic frame source',
  mappingRationale:row.mappingRationale,mappingLimitations:row.mappingLimitations,
  ...(review?{review:true,reviewScaleIds:[...plan.selectedScaleIds],reviewGoals:targets.map(row=>({scaleId:row.id,identity:{dimensionKey:row.dimensionKey},mappingRationale:row.mappingRationale,mappingLimitations:row.mappingLimitations}))}:{}),
 }
}
function personalDaily({day=3,contentLocale='en',loadMinutes=5,selectedScaleIds=personalRows.slice(0,3).map(row=>row.id),revision=8,planRevision=2,weeklyAccents=personalAccents,alternativeAvailable=false}={}){
 const plan={revision:planRevision,contentLocale,loadMinutes,weeklyAccents:structuredClone(weeklyAccents),selectedScaleIds:[...selectedScaleIds],topicOrder:[...new Set(selectedScaleIds.map(id=>personalRows.find(row=>row.id===id).track))],coverage:{}}
 return {available:true,course:{id:'synthetic-personal-course',revision,status:'active',durationDays:21,timeZone:'UTC',personalization:PERSONAL_MODE,selectedR3ScaleKeys:selectedScaleIds.map(id=>personalRows.find(row=>row.id===id).r3ScaleKey)},
  personalPlan:plan,profile:personalProfile(),today:{day,week:Math.ceil(day/7),status:'ready',completedDays:day-1-(day>2?1:0),skippedDays:day>2?1:0,localDate:'2026-10-12',relatedScaleIds:day%7===0?[...selectedScaleIds]:[selectedScaleIds[0]],
   lesson:personalLesson(plan,day),selectedChoice:'keep',targetScaleId:null,planRevision,contentLocale,alternativeAvailable,availableChoices:['keep','short',...(alternativeAvailable?['alternative']:[]),'rest']},
  history:Array.from({length:day-1},(_,index)=>({day:index+1,status:index===1?'skipped':'completed',localDate:new Date(Date.UTC(2026,9,12-(day-1)+index)).toISOString().slice(0,10),lesson:index===1?null:personalLesson(plan,index+1),feedback:index===0?{comment:'SYNTHETIC V2 SAVED NOTE',reflectionAnswer:'SYNTHETIC V2 SAVED REFLECTION'}:{}})),
  preferences:{length:'standard',alternativeRequested:false,stopOffer:false},outline:{mode:'personal-exact',weeks:[]}}
}
function revisedPersonalView(current,body){
 const next=personalDaily({day:current.today.day,contentLocale:body.contentLocale,loadMinutes:body.loadMinutes,weeklyAccents:body.weeklyAccents,
  selectedScaleIds:body.selectedR3ScaleKeys.map(key=>personalRows.find(row=>row.r3ScaleKey===key).id),revision:current.course.revision+1,planRevision:current.personalPlan.revision+1,alternativeAvailable:current.today.alternativeAvailable})
 return {...next,history:structuredClone(current.history),today:{...next.today,completedDays:current.today.completedDays,skippedDays:current.today.skippedDays,checkin:current.today.checkin}}
}
function personalRead(current,url){
 const value={...current,profile:personalProfile(url.searchParams.get('locale'))}
 if(!current.course)return value
 const choice=url.searchParams.get('choice'),targetScaleId=url.searchParams.get('targetScaleId'),reviewDay=url.searchParams.get('reviewDay')
 if(choice){
  if(!current.today.availableChoices?.includes(choice)||(targetScaleId&&!current.personalPlan.selectedScaleIds.includes(targetScaleId))||(current.today.day%7===0&&targetScaleId))return {error:'INVALID_DAY_CHOICE'}
  value.today={...current.today,selectedChoice:choice,targetScaleId:targetScaleId||null,status:choice==='rest'?'rest-chosen':'ready',
   relatedScaleIds:current.today.day%7===0?[...current.personalPlan.selectedScaleIds]:[targetScaleId||current.personalPlan.selectedScaleIds[0]],lesson:choice==='rest'?null:personalLesson(current.personalPlan,current.today.day,choice,targetScaleId)}
 }
 if(reviewDay){const lesson=current.history.find(entry=>entry.day===Number(reviewDay))?.lesson;value.reviewLesson={status:lesson?'ready':'material-unavailable',lesson:lesson||null}}
 return value
}
// Helper-produced observation DTOs below use synthetic responses only. They do
// not make the separate eight-row practice fixture a real interpretation fixture.
function goalMaterial(day,lang='en'){
 const identities=COURSE_GOAL_STATEMENTS_V1.slice(0,3).map(family=>family.identities.find(identity=>identity.instrumentLocale===lang))
 const goals=identities.map(identity=>({scaleId:identity.definitionId+'/'+identity.dimensionKey,identity}))
 const review=day%7===0,goal=goals[day%3]
 const slot={status:'ready',day,planRevision:2,kind:review?'review':'practice',selectedScaleId:review?null:goal.scaleId,
  practice:{contentLocale:lang},provenanceBinding:review?{contentLocale:lang,coversAllSelectedGoals:true,goals}:{contentLocale:lang,identity:goal.identity},...(review?{reviewScaleIds:goals.map(goal=>goal.scaleId)}:{})}
 return {slot,snapshot:createCourseGoalObservationSnapshot({day,slot})}
}
function goalReportFixture(lang='en'){
 const sessions={}
 for(let day=1;day<=21;day++){
  const {slot,snapshot}=goalMaterial(day,lang),at=new Date(Date.UTC(2026,9,day,12)).toISOString(),localDate=at.slice(0,10)
  const choices=snapshot.rows.map(row=>({goalId:row.goalId,statementId:row.statementId,statementKey:row.statementKey,seriesId:row.seriesId,rating:day===2?'skip':day%5+1}))
  sessions[day]={day,status:'completed',at,localDate,slot,planRevision:2,goalObservations:recordCourseGoalObservations({snapshot,choices,observedAt:at,localDate})}
 }
 return {sessions,reports:buildCourseGoalWeeklyReports({sessions,resolvedThroughDay:21})}
}
async function fulfillCourse(route,value,responseMode,status=200){
 const request=route.request(),url=new URL(request.url()),body=request.method()==='POST'?request.postDataJSON():null
 requests.push({path:url.pathname,method:request.method(),query:url.searchParams.toString(),locale:url.searchParams.get('locale'),fixtureMode,responseMode,fulfilledStatus:status,
  action:body?.action,expectedRevision:body?.expectedRevision,expectedPlanRevision:body?.expectedPlanRevision,choice:url.searchParams.get('choice'),targetScaleId:url.searchParams.get('targetScaleId'),reviewDay:url.searchParams.get('reviewDay'),
  responseStage:value.course?.stage,responseAvailable:value.available,responseEnrollmentReady:value.enrollmentReady,responseStatus:value.status,profileCount:value.profile?.rows.length,
  responseCourseRevision:value.course?.revision,responsePlanRevision:value.personalPlan?.revision,responseChoice:value.today?.selectedChoice,responseLessonId:value.today?.lesson?.id,responseError:value.error})
 await route.fulfill({status,contentType:'application/json',headers:{'Cache-Control':'private, no-store','X-HH-Synthetic-Fixture':fixtureMode+':'+responseMode},body:JSON.stringify(value)})
}
async function respondPersonal(route,url,body){
 if(url.pathname==='/api/app/course')return fulfillCourse(route,r3,'v2-r3-stage3')
 if(url.pathname==='/api/app/course-21/preview')return fulfillCourse(route,personalProposal(url.searchParams.get('locale')),'v2-preview')
 if(body){
  posts.push(body)
  if(body.action!=='activate'&&(body.expectedRevision!==fixture.course.revision||(['revise-plan','finish-day'].includes(body.action)&&body.expectedPlanRevision!==fixture.personalPlan.revision))){
   fixtureErrors.push('Unexpected stale CAS for synthetic v2 '+body.action)
   return fulfillCourse(route,{error:'STALE_PLAN_REVISION'},'v2-unexpected-stale-cas',409)
  }
  if(personalConflict&&body.action==='revise-plan'){
   personalConflict=false
   fixture=revisedPersonalView(fixture,{...fixture.personalPlan,selectedR3ScaleKeys:fixture.course.selectedR3ScaleKeys})
   return fulfillCourse(route,{error:'STALE_PLAN_REVISION'},'v2-revise-plan-conflict',409)
  }
  if(body.action==='activate'){
   fixture=personalDaily({day:1,contentLocale:url.searchParams.get('locale'),loadMinutes:body.loadMinutes,weeklyAccents:body.weeklyAccents,selectedScaleIds:body.selectedR3ScaleKeys.map(key=>personalRows.find(row=>row.r3ScaleKey===key).id)})
   fixture.today={...fixture.today,status:'check-in-required',lesson:null}
  }else if(body.action==='check-in'){
   fixture={...fixture,course:{...fixture.course,revision:fixture.course.revision+1},today:{...fixture.today,status:'ready',checkin:{...body,day:fixture.today.day,skipped:body.skip},lesson:personalLesson(fixture.personalPlan,fixture.today.day)}}
  }else if(body.action==='revise-plan')fixture=revisedPersonalView(fixture,body)
  else if(body.action==='finish-day'){
   const completed=body.status==='completed',entry={day:body.day,status:body.status,localDate:'2026-10-12',feedback:body.feedback,
    lesson:completed?personalLesson(fixture.personalPlan,body.day,body.choice,body.targetScaleId):null,
    ...(completed&&fixture.today.goalObservationSnapshot?{goalObservations:recordCourseGoalObservations({snapshot:fixture.today.goalObservationSnapshot,choices:body.goalObservations,observedAt:'2026-10-12T12:00:00Z',localDate:'2026-10-12'})}:{})}
   fixture={...fixture,course:{...fixture.course,revision:fixture.course.revision+1},history:[...fixture.history,entry],today:{...fixture.today,day:body.day+1,status:'next-local-day',lesson:null,completedDays:fixture.today.completedDays+(completed?1:0),skippedDays:fixture.today.skippedDays+(completed?0:1)}}
  }else{
   fixtureErrors.push('Unexpected synthetic v2 action '+body.action)
   return fulfillCourse(route,{error:'INVALID_ACTION'},'v2-unexpected-action',422)
  }
  return fulfillCourse(route,personalRead(fixture,url),'v2-command-'+body.action)
 }
 const value=personalRead(fixture,url),responseMode=url.searchParams.has('choice')?'v2-day-choice-'+url.searchParams.get('choice'):url.searchParams.has('reviewDay')?'v2-review-day':'v2-snapshot'
 if(value.error)fixtureErrors.push('Unexpected synthetic v2 choice rejection '+url.search)
 return fulfillCourse(route,value,responseMode,value.error?422:200)
}
page.on('request',request=>{const url=new URL(request.url());if(!['GET','HEAD'].includes(request.method())||url.origin!==origin||url.pathname.startsWith('/api/'))effectRequests.push({method:request.method(),url:request.url()})})
page.on('pageerror',e=>pageErrors.push(e.message))
await page.route('**/api/app/course**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname
 if(!['/api/app/course','/api/app/course-21','/api/app/course-21/preview'].includes(path)){await route.continue();return}
 const body=route.request().method()==='POST'?route.request().postDataJSON():null
 if(fixtureMode==='v2'){await respondPersonal(route,url,body);return}
 if(body){posts.push(body);if(conflict){conflict=false;await fulfillCourse(route,{error:'REVISION_CONFLICT'},'v1-command-conflict',409);return}
  if(body.action==='preferences')fixture={...fixture,preferences:{length:body.length,alternativeRequested:body.alternativeRequested,stopOffer:body.stopOffer},today:{...fixture.today,lesson:lessonFor21('inner_support',fixture.today.day,locale,body.alternativeRequested?'grounding':body.length)}}
  if(body.action==='check-in')fixture={...fixture,today:{...fixture.today,status:'ready',checkin:{...body,day:fixture.today.day,skipped:body.skip},localDate:'2026-10-12',lesson:lessonFor21('inner_support',fixture.today.day,locale,body.energy==='low'||body.feelingChange==='worse'||body.availableTime==='quick'?'quick':'standard')}}
  if(body.action==='pause')fixture={...fixture,course:{...fixture.course,status:'paused'},today:{...fixture.today,status:'paused',lesson:null}}
  if(body.action==='finish-day'&&body.day===21)fixture=completedView(locale)
  if(body.action==='continuation'){terminalJourney=saveCourseContinuation(terminalJourney,{...body,now:'2026-11-03T12:00:00Z',expectedRevision:terminalJourney.revision,locale,lessonFor:lessonFor21});fixture={...fixture,course:{...fixture.course,revision:terminalJourney.revision},completion:courseCompletion21(terminalJourney,{locale,lessonFor:lessonFor21})}}
  if(body.action==='activate')fixture={available:true,course,today:{status:'check-in-required',day:1,week:1,completedDays:0,skippedDays:0},history:[],profile}
 }
 const value=path==='/api/app/course'?r3:path.endsWith('/preview')?proposal:{...fixture,outline:fixture.outline||courseOutline21(locale)}
 await fulfillCourse(route,value,path==='/api/app/course'?'v1-r3-stage3':path.endsWith('/preview')?'v1-preview':body?'v1-command-'+body.action:'v1-snapshot')
})
const passed=label=>{checks.push(label);console.log('PASS '+label)}
async function show(lang,view){locale=lang;fixture=view;await page.goto(origin+'/'+lang+'/app/course');await expect(page.locator('[data-my-course]')).toBeVisible({timeout:30000});await page.waitForLoadState('networkidle')}
function daily(lang,day=15){return {available:true,course,profile,today:{status:'ready',day,week:Math.ceil(day/7),completedDays:day-1,skippedDays:0,lesson:lessonFor21('inner_support',day,lang)},history:[{day:1,status:'completed',localDate:'2026-10-12',feedbackApplied:false,feedback:{helpfulness:'helpful',difficulty:'manageable',comfort:'comfortable',comment:'SYNTHETIC SAVED NOTE',reflectionAnswer:'SYNTHETIC SAVED REFLECTION'}}],outline:courseOutline21(lang,syntheticJourney),preferences:{length:'standard',alternativeRequested:false,stopOffer:false}}}
function completedView(lang,skip=false){
 let state=structuredClone(syntheticJourney)
 for(let day=1;day<=21;day++){const now=new Date(Date.parse('2026-10-12T12:00:00Z')+(day-1)*86400000).toISOString();state=checkInBeforeLesson(state,{day,now,expectedRevision:state.revision,skip,wellbeing:day===1?0:6,energy:'usual'});const card=dailyLesson(state,{now,locale:lang,lessonFor:lessonFor21});state=finishCourseDay(state,{day,now,expectedRevision:state.revision,lessonFor:lessonFor21,locale:lang,lessonId:skip?null:card.lesson.id,status:skip?'skipped':'completed',feedback:skip?{}:{helpfulness:day===1?'helpful':'neutral'}})}
 terminalJourney=state
 return {available:true,course:{...course,status:'finished',revision:state.revision},profile,today:{status:'finished',day:null,completedDays:skip?0:21,skippedDays:skip?21:0},history:Object.values(state.sessions),outline:courseOutline21(lang,state),completion:courseCompletion21(state,{locale:lang,lessonFor:lessonFor21}),reassessment:{forms:[{definitionId:'synthetic-form',definitionKey:'hh-weekly-pulse',definitionVersion:'v1',instrumentLocale:'en',title:'Synthetic original questionnaire',repeatAvailable:true,status:'not-repeated',initialMeasurementAt:'2026-10-10T12:00:00Z',initialResultId:'synthetic-result',scales:[]}]}}
}
// All v2 cases below still navigate the app's real course route. Only course
// DTO fetches are fulfilled, after the original v1/auth/retest journey completes.
const personalText={
 en:{entry:'Review the 21-day programme',start:'Review and start 21 learning days',consent:'I choose these practice scales',dialog:'Start this 21-learning-day course?',edit:'Edit unresolved learning days',load:'Total time per learning day',reviseConsent:'I confirm these goals, weekly accents, time and language for unresolved learning days only.',revision:'Confirm future plan changes',primary:'Primary topic · Week ',secondary:'Secondary topic · Week ',initial:'Initial profile'},
 ru:{entry:'Посмотреть 21-дневную программу',start:'Проверить и начать 21 учебный день',consent:'Я выбираю эти шкалы',dialog:'Начать курс на 21 учебный день?',edit:'Изменить незавершённые учебные дни',load:'Общее время на учебный день',reviseConsent:'Подтверждаю эти цели, акценты недель, время и язык только для незавершённых учебных дней.',revision:'Подтвердить изменения будущих дней',primary:'Основная тема · Неделя ',secondary:'Дополнительная тема · Неделя ',initial:'Исходный профиль'},
}
async function showPersonal(lang,view){
 fixtureMode='v2'
 const start=requests.length
 await show(lang,view)
 if(!view.course)await page.getByRole('button',{name:personalText[lang].entry,exact:true}).click()
 const component=page.locator('[data-course-daily-21]')
 await expect(component).toBeVisible();await expect(component).toHaveAttribute('aria-busy','false')
 const reads=requests.slice(start)
 assert.ok(reads.some(r=>r.path==='/api/app/course'&&r.method==='GET'&&r.responseMode==='v2-r3-stage3'&&r.responseStage===3),'v2 must retain the actual R3 app entry request')
 assert.ok(reads.some(r=>r.path==='/api/app/course-21'&&r.method==='GET'&&r.responseMode==='v2-snapshot'&&r.fulfilledStatus===200),'v2 snapshot request must be intercepted exactly')
 if(!view.course)assert.ok(reads.some(r=>r.path==='/api/app/course-21/preview'&&r.method==='GET'&&r.responseMode==='v2-preview'&&r.profileCount===8),'v2 preview must have its own eight-row response marker')
 return component
}
function assertPersonalQuery(start,expected,responseMode){
 const matching=requests.slice(start).filter(r=>r.fixtureMode==='v2'&&r.responseMode===responseMode)
 assert.equal(matching.length,1,'Exactly one '+responseMode+' read must occur')
 const request=matching[0]
 assert.equal(request.path,'/api/app/course-21');assert.equal(request.method,'GET');assert.equal(request.fulfilledStatus,200)
 assert.deepEqual([...new URLSearchParams(request.query)].sort(),Object.entries(expected).sort(),'Exact personal course GET query, without hidden mutation fields')
 return request
}
async function personalLayout(component,lang,width,stage){
 // Names, native keyboard operation, and linked descriptions are covered here;
 // this is deliberately not described as a comprehensive WCAG audit.
 for(const control of await component.locator('input:visible,select:visible,textarea:visible,button:visible,summary:visible,progress:visible').all())await expect(control).toHaveAccessibleName(/\S/)
 const missingDescriptions=await component.locator('[aria-describedby]:visible').evaluateAll(elements=>elements.flatMap(element=>(element.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&!document.getElementById(id))))
 assert.deepEqual(missingDescriptions,[],'Visible descriptions must reference existing elements')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,stage+' must not overflow the viewport')
 for(const dialog of await component.getByRole('dialog').all())assert.equal(await dialog.evaluate(element=>element.scrollWidth>element.clientWidth+1),false,'Open consent dialog must not overflow internally')
 await page.screenshot({path:output+'/personal-v2-'+lang+'-'+width+'-'+stage+'.png',fullPage:true})
}
async function verifyPersonalUI(){
 const component=page.locator('[data-course-daily-21]'),t=personalText.en
 const enroll={available:true,enrollmentReady:true,course:null}
 await page.setViewportSize({width:390,height:844});await showPersonal('en',enroll)
 const profile=component.locator('[data-course-21-profile]')
 await expect(profile.locator('[data-course-scale]')).toHaveCount(8)
 await expect(profile.locator('meter')).toHaveCount(0)
 await expect(profile).toContainText('confirmed focus');await expect(profile).not.toContainText('Ordered by position')
 await expect(profile).toContainText('Synthetic limited facet only 1');await expect(profile).toContainText('synthetic-authoring-context')
 await expect(profile).toContainText('does not establish that an exercise treats a condition')
 await expect(profile.locator('[data-course-scale="dimension-6"]')).toContainText('not a separate practice goal')
 await expect(profile.locator('[data-course-scale="dimension-7"]')).toContainText('exact reviewed scale-to-objective practice mapping is not available')
 for(const index of [6,7])await expect(profile.getByRole('checkbox',{name:personalLabel(index),exact:true})).toBeDisabled()
 for(const row of personalRows){const card=profile.locator('[data-course-scale="'+row.dimensionKey+'"]');await expect(card.locator('time')).toHaveAttribute('datetime',row.measurementAt);await expect(card).toContainText('Questionnaire language: '+row.instrumentLocale.toUpperCase())}
 const startButton=profile.getByRole('button',{name:t.start,exact:true})
 await expect(startButton).toBeDisabled()
 for(const index of [0,1])await profile.getByRole('checkbox',{name:personalLabel(index),exact:true}).check()
 await expect(startButton).toBeDisabled()
 await profile.getByRole('checkbox',{name:personalLabel(2),exact:true}).check();await expect(startButton).toBeEnabled()
 for(const index of [3,4])await profile.getByRole('checkbox',{name:personalLabel(index),exact:true}).check()
 await expect(profile.getByRole('checkbox',{name:personalLabel(5),exact:true})).toBeDisabled()
 for(const index of [3,4])await profile.getByRole('checkbox',{name:personalLabel(index),exact:true}).uncheck()
 const load=profile.getByRole('combobox',{name:t.load,exact:true})
 assert.deepEqual(await load.locator('option').evaluateAll(options=>options.map(option=>option.value)),['2','5'])
 await expect(load).toHaveValue('5');await load.selectOption('2')
 for(const week of [1,2,3]){
  await profile.getByRole('combobox',{name:t.primary+week,exact:true}).selectOption(personalAccents[week].primaryTopicId)
  await profile.getByRole('combobox',{name:t.secondary+week,exact:true}).selectOption(personalAccents[week].secondaryTopicId||'')
 }
 const beforeConsent=posts.length
 await startButton.focus();await page.keyboard.press('Enter')
 const consentDialog=component.getByRole('dialog',{name:t.dialog,exact:true}),consent=consentDialog.getByRole('checkbox',{name:t.consent,exact:false})
 await expect(consentDialog).toBeVisible();await expect(consent).not.toBeChecked();await expect(consentDialog.getByRole('button',{name:'Agree and start',exact:true})).toBeDisabled()
 await consent.focus();await page.keyboard.press('Space');await expect(consent).toBeChecked();await page.keyboard.press('Escape')
 await expect(consentDialog).toBeHidden();assert.equal(posts.length,beforeConsent)
 await startButton.click();await expect(consent).not.toBeChecked();await consent.check();await consentDialog.getByRole('button',{name:'Agree and start',exact:true}).click()
 await expect(component.getByText('Before today’s lesson',{exact:true})).toBeVisible();await expect(component).toHaveAttribute('aria-busy','false')
 const activated=posts.at(-1)
 assert.equal(posts.length,beforeConsent+1);assert.equal(activated.action,'activate');assert.equal(activated.expectedSourceRevision,8)
 assert.equal(activated.activationToken,'synthetic-personal-preview-token');assert.equal(activated.consentVersion,'synthetic-personal-consent-v2');assert.equal(activated.consent,true)
 assert.deepEqual(activated.selectedR3ScaleKeys,personalRows.slice(0,3).map(row=>row.r3ScaleKey));assert.equal(activated.loadMinutes,2);assert.deepEqual(activated.weeklyAccents,personalAccents)
 assert.ok(requests.some(r=>r.responseMode==='v2-command-activate'&&r.method==='POST'&&r.fulfilledStatus===200))
 await component.getByRole('button',{name:'Skip check-in and continue',exact:true}).click();await expect(component.locator('article[data-content-language="en"]')).toContainText('2 min, approximately')
 passed('v2 synthetic8: six eligible goals, aggregate/unsupported visible; 3–5 bounds, 2/5-minute choices, three weekly accents, new unchecked consent and exact activation')

 await showPersonal('en',personalDaily())
 await component.getByLabel('My note',{exact:false}).fill('SYNTHETIC V2 UNSENT NOTE')
 await component.getByLabel('My reflection',{exact:false}).fill('SYNTHETIC V2 UNSENT REFLECTION')
 const unchangedPreview=JSON.stringify(fixture),beforeOptions=posts.length
 await expect(component.getByRole('button',{name:'View prepared alternative',exact:true})).toHaveCount(0)
 const noteHelper=component.locator('[data-course-note-adjustment]')
 await expect(noteHelper).toBeVisible()
 const beforeLocalSuggestion=requests.length,beforeSuggestionEffects=effectRequests.length
 await component.getByRole('button',{name:'Suggest an adjustment from this note',exact:true}).click()
 await expect(noteHelper).toContainText('No complete supported practice preference matched')
 await expect(noteHelper.getByRole('button',{name:'Confirm this practice adjustment',exact:true})).toHaveCount(0)
 assert.equal(requests.length,beforeLocalSuggestion);assert.equal(posts.length,beforeOptions);assert.equal(effectRequests.length,beforeSuggestionEffects)
 await component.getByLabel('My note',{exact:false}).fill('This exercise takes too long.')
 await component.getByRole('button',{name:'Suggest an adjustment from this note',exact:true}).click()
 await expect(noteHelper).toContainText('Use the prepared short practice')
 await expect(noteHelper.getByRole('button',{name:'Confirm this practice adjustment',exact:true})).toBeVisible()
 await noteHelper.getByRole('button',{name:'Keep my current preferences',exact:true}).click()
 await expect(noteHelper.getByRole('button',{name:'Confirm this practice adjustment',exact:true})).toHaveCount(0)
 await expect(component.getByLabel('My note',{exact:false})).toHaveValue('This exercise takes too long.')
 await expect(component.getByLabel('My reflection',{exact:false})).toHaveValue('SYNTHETIC V2 UNSENT REFLECTION')
 assert.equal(JSON.stringify(fixture),unchangedPreview)
 assert.equal(requests.length,beforeLocalSuggestion);assert.equal(posts.length,beforeOptions);assert.equal(effectRequests.length,beforeSuggestionEffects)
 passed('v2 local note helper abstains or previews a prepared option without API/provider effects; cancel preserves draft and saved state')
 await component.getByLabel('My note',{exact:false}).fill('SYNTHETIC V2 UNSENT NOTE')
 await expect(component.getByRole('button',{name:'View a grounding alternative',exact:true})).toHaveCount(0)
 const target=component.getByRole('combobox',{name:'Goal for this practice',exact:true})
 assert.deepEqual(await target.locator('option').evaluateAll(options=>options.map(option=>option.value)),['',...fixture.personalPlan.selectedScaleIds])
 let start=requests.length
 await target.selectOption(personalRows[2].id);await expect(component).toHaveAttribute('aria-busy','false')
 assertPersonalQuery(start,{locale:'en',choice:'keep',targetScaleId:personalRows[2].id,alternative:'true'},'v2-day-choice-keep')
 start=requests.length
 await component.getByRole('button',{name:'View short practice',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 const shortRead=assertPersonalQuery(start,{locale:'en',choice:'short',targetScaleId:personalRows[2].id,alternative:'true'},'v2-day-choice-short')
 await expect(component.locator('article[data-content-language="en"]')).toContainText('2 min, approximately')
 assert.equal(posts.length,beforeOptions);assert.equal(JSON.stringify(fixture),unchangedPreview,'GET previews must not mutate the synthetic saved snapshot')
 await expect(component.getByLabel('My note',{exact:false})).toHaveValue('SYNTHETIC V2 UNSENT NOTE')
 await expect(component.getByLabel('My reflection',{exact:false})).toHaveValue('SYNTHETIC V2 UNSENT REFLECTION')
 await expect(component.getByLabel('Save this reflection and note privately in my account',{exact:true})).not.toBeChecked()
 await component.getByRole('button',{name:'Save completed learning day',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 const finish=posts.at(-1)
 assert.equal(finish.action,'finish-day');assert.equal(finish.expectedRevision,8);assert.equal(finish.expectedPlanRevision,2);assert.equal(finish.choice,'short');assert.equal(finish.targetScaleId,personalRows[2].id)
 assert.equal(finish.lessonId,shortRead.responseLessonId);assert.equal(finish.savePrivateText,false);assert.equal('comment' in finish.feedback,false);assert.equal('reflectionAnswer' in finish.feedback,false)
 passed('v2 selected-goal and short choices use exact GET only; finish binds displayed lesson, target, choice and both revisions without private drafts')

 await showPersonal('en',personalDaily({alternativeAvailable:true}))
 start=requests.length;const beforeAlternative=posts.length,alternativeSnapshot=JSON.stringify(fixture)
 await component.getByRole('button',{name:'View prepared alternative',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 const alternativeRead=assertPersonalQuery(start,{locale:'en',choice:'alternative',alternative:'true'},'v2-day-choice-alternative')
 assert.equal(posts.length,beforeAlternative);assert.equal(JSON.stringify(fixture),alternativeSnapshot)
 await component.getByRole('button',{name:'Save completed learning day',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 assert.equal(posts.at(-1).choice,'alternative');assert.equal(posts.at(-1).confirmAlternative,true);assert.equal(posts.at(-1).lessonId,alternativeRead.responseLessonId)
 const unavailable=personalDaily();unavailable.today={...unavailable.today,status:'material-unavailable',lesson:null,availableChoices:['rest'],alternativeAvailable:false}
 await showPersonal('en',unavailable)
 for(const name of ['View planned-length practice','View short practice','View prepared alternative'])await expect(component.getByRole('button',{name,exact:true})).toHaveCount(0)
 const beforeRest=posts.length,restSnapshot=JSON.stringify(fixture);start=requests.length
 await component.getByRole('button',{name:'Rest without saving progress',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 assertPersonalQuery(start,{locale:'en',choice:'rest'},'v2-day-choice-rest');assert.equal(posts.length,beforeRest);assert.equal(JSON.stringify(fixture),restSnapshot)
 await component.getByRole('button',{name:'Skip this learning day',exact:true}).click();assert.equal(posts.length,beforeRest)
 await component.getByRole('button',{name:'Skip this learning day',exact:true}).click();await expect(component).toHaveAttribute('aria-busy','false')
 const skipped=posts.at(-1);assert.equal(skipped.status,'skipped');assert.equal(skipped.expectedRevision,8);assert.equal(skipped.expectedPlanRevision,2);assert.deepEqual(skipped.feedback,{});assert.equal(skipped.savePrivateText,false)
 passed('v2 offers only advertised prepared options; rest is GET-only and explicit skip alone resolves the day')

 await showPersonal('en',personalDaily())
 await component.getByLabel('My note',{exact:false}).fill('SYNTHETIC V2 KEEP AFTER CONFLICT')
 await component.getByLabel('My reflection',{exact:false}).fill('SYNTHETIC V2 REFLECTION AFTER CONFLICT')
 const originalHistory=structuredClone(fixture.history),originalMeasurements=fixture.profile.rows.map(row=>[row.id,row.measurementAt,row.resultId,row.instrumentLocale])
 await component.getByRole('button',{name:t.edit,exact:true}).click()
 const editor=component.locator('[data-personal-plan-editor]'),revisionConsent=editor.getByRole('checkbox',{name:t.reviseConsent,exact:true}),saveRevision=editor.getByRole('button',{name:t.revision,exact:true})
 await expect(editor).toContainText('including today if unfinished');await expect(editor).toContainText('Completed and skipped days, saved notes, original result dates and previous lesson text stay unchanged')
 await expect(revisionConsent).not.toBeChecked();await expect(saveRevision).toBeDisabled()
 await editor.getByRole('combobox',{name:t.load,exact:true}).selectOption('2')
 await editor.getByRole('checkbox',{name:personalLabel(3),exact:true}).check();await revisionConsent.check()
 await editor.getByRole('combobox',{name:t.secondary+'2',exact:true}).selectOption('');await expect(revisionConsent).not.toBeChecked();await expect(saveRevision).toBeDisabled()
 await revisionConsent.check();personalConflict=true;start=requests.length
 await saveRevision.click();await expect(component.getByRole('alert')).toContainText('kept your unsent choices and notes');await expect(component).toHaveAttribute('aria-busy','false')
 assert.ok(requests.slice(start).some(r=>r.responseMode==='v2-revise-plan-conflict'&&r.fulfilledStatus===409&&r.action==='revise-plan'&&r.expectedRevision===8&&r.expectedPlanRevision===2))
 assert.ok(requests.slice(start).some(r=>r.responseMode==='v2-snapshot'&&r.method==='GET'&&r.responseCourseRevision===9&&r.responsePlanRevision===3))
 await expect(revisionConsent).not.toBeChecked();await expect(saveRevision).toBeDisabled();await expect(editor.getByRole('checkbox',{name:personalLabel(3),exact:true})).toBeChecked();await expect(editor.getByRole('combobox',{name:t.load,exact:true})).toHaveValue('2')
 for(const [label,value] of [['My note','SYNTHETIC V2 KEEP AFTER CONFLICT'],['My reflection','SYNTHETIC V2 REFLECTION AFTER CONFLICT']])await expect(component.getByLabel(label,{exact:false})).toHaveValue(value)
 const conflictBody=posts.at(-1)
 await revisionConsent.check();await saveRevision.click();await expect(editor).toHaveCount(0);await expect(component).toHaveAttribute('aria-busy','false')
 const revision=posts.at(-1)
 assert.deepEqual(Object.keys(revision).sort(),['action','consent','contentLocale','expectedPlanRevision','expectedRevision','loadMinutes','operationId','selectedR3ScaleKeys','weeklyAccents'].sort())
 assert.equal(revision.action,'revise-plan');assert.equal(revision.expectedRevision,9);assert.equal(revision.expectedPlanRevision,3);assert.equal(revision.consent,true);assert.equal(revision.contentLocale,'en');assert.equal(revision.loadMinutes,2)
 assert.equal(revision.selectedR3ScaleKeys.length,4);assert.equal(revision.weeklyAccents[2].secondaryTopicId,null);assert.notEqual(revision.operationId,conflictBody.operationId)
 assert.deepEqual(fixture.history,originalHistory);assert.deepEqual(fixture.profile.rows.map(row=>[row.id,row.measurementAt,row.resultId,row.instrumentLocale]),originalMeasurements)
 await expect(component.getByLabel('My note',{exact:false})).toHaveValue('SYNTHETIC V2 KEEP AFTER CONFLICT')
 await expect(component.getByLabel('My reflection',{exact:false})).toHaveValue('SYNTHETIC V2 REFLECTION AFTER CONFLICT')
 passed('v2 future-only revision resets consent after edits/409, retains selected goals and both drafts, and retries with refreshed progress+plan CAS; saved history remains unchanged in the fixture')

 await component.getByRole('button',{name:t.edit,exact:true}).click();await revisionConsent.check()
 await editor.getByRole('combobox',{name:t.load,exact:true}).selectOption('5');await expect(revisionConsent).not.toBeChecked();await revisionConsent.check()
 const beforeLanguage=posts.length;start=requests.length
 await editor.getByRole('combobox',{name:'Language of future lesson text',exact:true}).selectOption('ru');await expect(editor.getByRole('checkbox',{name:personalLabel(0,'ru'),exact:true})).toBeVisible();await expect(component).toHaveAttribute('aria-busy','false')
 assertPersonalQuery(start,{locale:'ru'},'v2-snapshot');assert.equal(posts.length,beforeLanguage)
 await expect(revisionConsent).not.toBeChecked();await expect(saveRevision).toBeDisabled();await expect(component.locator('article[data-content-language="en"]')).toContainText('SYNTHETIC PREPARED EN LESSON')
 await revisionConsent.check();await saveRevision.click();await expect(editor).toHaveCount(0);await expect(component.locator('article[data-content-language="ru"]')).toContainText('СИНТЕТИЧЕСКИЙ ТЕКСТ УРОКА RU')
 await expect(component.locator('article[data-content-language="ru"]')).toHaveAttribute('lang','en')
 await expect(component.locator('article[data-content-language="ru"] h3')).toHaveAttribute('lang','ru')
 await expect(component.locator('article[data-content-language="ru"] section[lang="ru"]')).toContainText('СИНТЕТИЧЕСКИЙ ТЕКСТ УРОКА RU')
 const languageRevision=posts.at(-1);assert.equal(languageRevision.contentLocale,'ru');assert.equal(languageRevision.loadMinutes,5);assert.equal(languageRevision.expectedRevision,10);assert.equal(languageRevision.expectedPlanRevision,4);assert.deepEqual(fixture.history,originalHistory)
 start=requests.length;const beforeReview=posts.length
 await component.getByRole('button',{name:'Revisit day 1',exact:true}).click();await expect(component.locator('[data-course-21-review] article[data-content-language="en"]')).toContainText('SYNTHETIC PREPARED EN LESSON')
 assertPersonalQuery(start,{locale:'en',reviewDay:'1'},'v2-review-day');assert.equal(posts.length,beforeReview)
 const saved=component.locator('[data-course-saved-observations]').first();await saved.locator('summary').click();await expect(saved).toContainText('SYNTHETIC V2 SAVED NOTE')
 const beforePageLanguage=posts.length
 await showPersonal('ru',structuredClone(fixture));await expect(component.locator('article[data-content-language="ru"]')).toContainText('СИНТЕТИЧЕСКИЙ ТЕКСТ УРОКА RU');assert.equal(posts.length,beforePageLanguage)
 await showPersonal('ru',personalDaily({contentLocale:'en'}));await expect(component.locator('article[data-content-language="en"]')).toContainText('SYNTHETIC PREPARED EN LESSON');await expect(component.locator('[data-personal-plan]')).toContainText('Язык урока: EN');assert.equal(posts.length,beforePageLanguage)
 await expect(component.locator('article[data-content-language="en"]')).toHaveAttribute('lang','ru')
 await expect(component.locator('article[data-content-language="en"] h3')).toHaveAttribute('lang','en')
 await expect(component.locator('article[data-content-language="en"] section[lang="en"]')).toContainText('SYNTHETIC PREPARED EN LESSON')
 passed('v2 page language never translates pinned lessons; reviewed future-language changes require new consent and preserve original-language historical lesson text')

 await showPersonal('en',personalDaily());const beforeCancel=posts.length
 await component.getByRole('button',{name:t.edit,exact:true}).click()
 for(const index of [3,4])await editor.getByRole('checkbox',{name:personalLabel(index),exact:true}).check()
 await expect(editor.getByRole('checkbox',{name:personalLabel(5),exact:true})).toBeDisabled()
 for(const index of [0,1,2])await editor.getByRole('checkbox',{name:personalLabel(index),exact:true}).uncheck()
 await expect(revisionConsent).toBeDisabled();await expect(saveRevision).toBeDisabled()
 await editor.getByRole('checkbox',{name:personalLabel(0),exact:true}).check();await revisionConsent.check()
 await editor.getByRole('button',{name:'Close without saving changes',exact:true}).click();await expect(editor).toHaveCount(0)
 await component.getByRole('button',{name:t.edit,exact:true}).click();await expect(revisionConsent).not.toBeChecked();await expect(editor.getByRole('checkbox',{name:personalLabel(4),exact:true})).toBeChecked();assert.equal(posts.length,beforeCancel)
 passed('v2 plan editor keeps 3–5-goal limits; closing is read-only and reopening always requires fresh consent')

 const allGoals=personalRows.slice(0,5).map(row=>row.id)
 await showPersonal('en',personalDaily({day:14,selectedScaleIds:allGoals}))
 const goals=component.locator('[data-personal-review-goals]');await expect(goals).toHaveCount(1);await expect(goals.locator('li')).toHaveCount(5)
 for(let index=0;index<5;index++)await expect(goals).toContainText(personalLabel(index))
 await expect(component.getByRole('combobox',{name:'Goal for this practice',exact:true})).toHaveCount(0)
 await expect(component.locator('article[data-content-language="en"]')).not.toContainText('This week’s goal');await expect(component.locator('article[data-content-language="en"]')).not.toContainText('A brief reminder')
 const beforeWholeReview=posts.length;start=requests.length
 await component.getByRole('button',{name:'Revisit day 7',exact:true}).click();await expect(goals).toHaveCount(2)
 assertPersonalQuery(start,{locale:'en',reviewDay:'7'},'v2-review-day');assert.equal(posts.length,beforeWholeReview)
 for(const block of await goals.all()){await expect(block.locator('li')).toHaveCount(5);for(let index=0;index<5;index++)await expect(block).toContainText(personalLabel(index))}
 passed('v2 whole-goal days and historical reviews show every confirmed goal and mapping limits, with no invented single-topic goal')

 const ratedDaily=personalDaily(),goalSnapshot=goalMaterial(ratedDaily.today.day).snapshot
 ratedDaily.today.goalObservationSnapshot=goalSnapshot
 await showPersonal('en',ratedDaily)
 const observationFields=component.locator('[data-course-goal-observations]'),beforeRating=posts.length
 await expect(observationFields.locator('input:checked')).toHaveCount(0)
 await expect(observationFields).toContainText(goalSnapshot.rows[0].statementText)
 await observationFields.locator('input[value="4"]').check();assert.equal(posts.length,beforeRating)
 await component.getByRole('button',{name:'Save completed learning day',exact:true}).click()
 await expect(component).toHaveAttribute('aria-busy','false')
 const ratingPost=posts.at(-1);assert.equal(ratingPost.goalObservations.length,1);assert.equal(ratingPost.goalObservations[0].rating,4)
 assert.equal(ratingPost.goalObservations[0].statementKey,goalSnapshot.rows[0].statementKey)
 assert.deepEqual(Object.keys(ratingPost.goalObservations[0]).sort(),['goalId','rating','seriesId','statementId','statementKey'])
 await component.locator('[data-course-saved-observations]').last().locator('summary').click()
 await expect(component.locator('[data-course-saved-goal-observations]')).toContainText(goalSnapshot.rows[0].statementText)
 await expect(component.locator('[data-course-saved-goal-observations]')).toContainText('4 / 5')
 passed('goal ratings are initially empty, remain local until finish, submit only exact variant identity and rating, and preserve readable saved wording')
 const reportsFixture=goalReportFixture('en'),reportView=personalDaily({day:21})
 reportView.weeklyReports=reportsFixture.reports;reportView.today.goalObservationSnapshot=goalMaterial(21).snapshot
 await showPersonal('en',reportView)
 const weekly=component.locator('[data-course-goal-weekly-reports]')
 await expect(weekly.locator('[data-course-goal-weekly-report]')).toHaveCount(3)
 for(const checkpoint of [7,14,21]){const report=weekly.locator('[data-course-goal-weekly-report="'+checkpoint+'"]');await expect(report.locator('[data-course-goal-period="week"]')).toHaveCount(1);await expect(report.locator('[data-course-goal-period="course-to-date"]')).toHaveCount(1)}
 await expect(weekly).toContainText('equivalence as a measurement has not been established')
 await expect(weekly).toContainText('Latest minus first');await expect(weekly.locator('meter,progress')).toHaveCount(0)
 assert.ok(reportsFixture.reports[2].cumulativeSeries.some(series=>new Set(series.observations.map(point=>point.statementId)).size>1))
 passed('private checkpoints7/14/21 show separate weekly and course-to-date raw observations, rotating wording caveat and no recovery meter')

 const beforeLayout=posts.length
 for(const lang of ['en','ru'])for(const width of [320,390,1280]){
  const copy=personalText[lang]
  await page.setViewportSize({width,height:900});await showPersonal(lang,enroll)
  await expect(component.locator('[data-course-scale]')).toHaveCount(8)
  for(let index=0;index<3;index++)await component.getByRole('checkbox',{name:personalLabel(index,lang),exact:true}).check()
  await personalLayout(component,lang,width,'profile')
  const start=component.getByRole('button',{name:copy.start,exact:true});await start.focus();await page.keyboard.press('Enter')
  const dialog=component.getByRole('dialog',{name:copy.dialog,exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await personalLayout(component,lang,width,'consent');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(start).toBeFocused()
  await showPersonal(lang,personalDaily({contentLocale:'en'}));await expect(component.locator('article[data-content-language="en"]')).toContainText('SYNTHETIC PREPARED EN LESSON')
  await personalLayout(component,lang,width,'daily')
  const edit=component.getByRole('button',{name:copy.edit,exact:true});await edit.focus();await page.keyboard.press('Enter')
  const form=component.locator('[data-personal-plan-editor]');await expect(form.getByRole('checkbox',{name:personalLabel(3),exact:true})).toBeEnabled()
  const goal=form.getByRole('checkbox',{name:personalLabel(3),exact:true});await goal.focus();await page.keyboard.press('Space');await expect(goal).toBeChecked();await expect(goal).toBeFocused()
  await expect(form.getByRole('combobox',{name:copy.load,exact:true})).toHaveValue('5');await expect(form.getByRole('checkbox',{name:copy.reviseConsent,exact:true})).not.toBeChecked()
  await personalLayout(component,lang,width,'editor')
  await showPersonal(lang,personalDaily({day:7,selectedScaleIds:allGoals,contentLocale:'en'}))
  const review=component.locator('[data-personal-review-goals]');await expect(review.locator('li')).toHaveCount(5)
  for(let index=0;index<5;index++)await expect(review).toContainText(personalLabel(index,lang))
  await personalLayout(component,lang,width,'whole-goal-review')
  const observationDaily=personalDaily({contentLocale:lang});observationDaily.today.goalObservationSnapshot=goalMaterial(observationDaily.today.day,lang).snapshot;observationDaily.weeklyReports=goalReportFixture(lang).reports.slice(0,1)
  await showPersonal(lang,observationDaily)
  const ratings=component.locator('[data-course-goal-observations]');await expect(ratings.locator('input:checked')).toHaveCount(0)
  const rating=ratings.locator('input[value="2"]');await rating.focus();await page.keyboard.press('Space');await expect(rating).toBeChecked();await expect(rating).toBeFocused()
  await ratings.locator('input[value="skip"]').check();await expect(ratings.locator('input[value="skip"]')).toBeChecked()
  await personalLayout(component,lang,width,'goal-observations-weekly-report')
  passed('v2 '+lang+' '+width+'px: synthetic8 profile, consent, pinned lesson, keyboard editor and all-goal review have named controls and no horizontal overflow')
 }
 assert.equal(posts.length,beforeLayout,'Language, viewport, keyboard draft and review checks must not POST')
 assert.deepEqual(fixtureErrors,[])
}
try{
 await page.goto(origin+'/en/app');await page.getByRole('button',{name:'Continue with Google',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-my-tests-dashboard]')).first()).toBeVisible({timeout:60000})
 if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
  await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to private processing',{exact:false}).check();await page.getByRole('button',{name:'Create my private space',exact:true}).click()
 }
 await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({timeout:30000})
 await show('en',{available:true,enrollmentReady:true,course:null})
 assert.ok(requests.some(r=>r.path==='/api/app/course'&&r.method==='GET'&&r.fulfilledStatus===200&&r.responseStage===3),'R3 mock GET must be observed')
 assert.ok(requests.some(r=>r.path==='/api/app/course-21'&&r.method==='GET'&&r.fulfilledStatus===200&&r.responseAvailable===true&&r.responseEnrollmentReady===true),'21-day mock GET must be observed')
 await page.getByRole('button',{name:'Review the 21-day programme',exact:true}).click()
 const component=page.locator('[data-course-daily-21]');await expect(component.locator('[data-course-scale]')).toHaveCount(8)
 assert.ok(requests.some(r=>r.path==='/api/app/course-21/preview'&&r.method==='GET'&&r.fulfilledStatus===200&&r.responseAvailable===true&&r.responseStatus==='ready-to-review'&&r.profileCount===8),'Exact synthetic preview GET must be observed before scale interaction')
 for(const key of ['mood','tension','clarity'])await component.getByRole('checkbox',{name:'Synthetic scale '+key,exact:true}).check()
 await component.getByRole('button',{name:'Review and start 21 learning days',exact:true}).click()
 await expect(component.getByRole('dialog')).toBeVisible();await expect(component.getByRole('button',{name:'Agree and start',exact:true})).toBeDisabled()
 await page.keyboard.press('Escape');await expect(component.getByRole('dialog')).toBeHidden();assert.equal(posts.length,0)
 await component.getByRole('button',{name:'Back to my course',exact:true}).click()
 await page.getByRole('button',{name:'Review the 21-day programme',exact:true}).click()
 for(const key of ['mood','tension','clarity'])await expect(component.getByRole('checkbox',{name:'Synthetic scale '+key,exact:true})).toBeChecked()
 passed('all8 scales,3 choices, unchecked consent/Escape no POST, Back preserves choices')
 await component.getByRole('button',{name:'Review and start 21 learning days',exact:true}).click()
 await component.getByRole('checkbox',{name:'I choose these practice scales',exact:false}).check()
 await component.getByRole('button',{name:'Agree and start',exact:true}).click()
 await expect(component.getByText('Before today’s lesson',{exact:true})).toBeVisible()
 assert.equal(posts.at(-1).action,'activate');assert.equal(posts.at(-1).selectedR3ScaleKeys.length,3)
 passed('fresh consent submits exact preview token and editable scale selection')
 for(const lang of ['en','ru'])for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});await show(lang,daily(lang))
  const lesson=lessonFor21('inner_support',15,lang)
  await expect(component.getByRole('heading',{name:lesson.title,exact:true})).toBeVisible({timeout:30000})
  await expect(component).toContainText(lesson.curriculum.learningOutcome)
  const summary=component.locator('summary').filter({hasText:lang==='ru'?'Маршрут на 21 учебный день':'The 21-day learning route'})
  // Prefer exact visible text; this fallback also covers ordinary spacing edits.
  const outline=await summary.count()?summary:component.locator('summary').filter({hasText:'21'})
  await outline.focus();await page.keyboard.press('Enter');await expect(outline.locator('..')).toHaveJSProperty('open',true);await expect(outline).toBeFocused()
  await expect(outline.locator('..')).toContainText(lesson.title)
  await expect(outline.locator('..')).toContainText(lesson.curriculum.learningOutcome)
  await page.keyboard.press('Space');await expect(outline.locator('..')).toHaveJSProperty('open',false)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false)
  await page.screenshot({path:output+'/'+lang+'-'+width+'.png',fullPage:true})
  passed(lang+' '+width+'px: day15 specific outcome, keyboard outline, no horizontal overflow')
 }
 await show('en',daily('en',1))
 await component.getByLabel('My note',{exact:false}).fill('This exercise takes too long.')
 const priorPosts=posts.length
 await component.getByRole('button',{name:'Suggest an adjustment from this note',exact:true}).click()
 assert.equal(posts.length,priorPosts)
 await component.getByRole('button',{name:'Keep my current preferences',exact:true}).click()
 assert.equal(posts.length,priorPosts)
 await component.getByRole('button',{name:'Suggest an adjustment from this note',exact:true}).click()
 await component.getByRole('button',{name:'Confirm this practice adjustment',exact:true}).click()
 await expect.poll(()=>posts.length).toBe(priorPosts+1)
 assert.deepEqual(Object.keys(posts.at(-1)).sort(),['action','alternativeRequested','expectedRevision','length','operationId','stopOffer'])
 assert.equal(posts.at(-1).length,'quick')
 await expect(component.getByLabel('Save this reflection and note privately in my account',{exact:true})).not.toBeChecked()
 const savedNotes=component.locator('[data-course-saved-observations]');await savedNotes.locator('summary').click()
 await expect(savedNotes).toContainText('SYNTHETIC SAVED NOTE');await expect(savedNotes).toContainText('SYNTHETIC SAVED REFLECTION')
 passed('local phrase preview/cancel send nothing; confirmation sends prefs only; saved observations remain readable')
 await component.getByLabel('My note',{exact:false}).fill('SYNTHETIC UNSENT PRIVATE NOTE')
 await component.getByLabel('My reflection',{exact:false}).fill('SYNTHETIC UNSENT REFLECTION')
 conflict=true;await component.getByRole('button',{name:'Save completed learning day',exact:true}).click()
 await expect(component.getByRole('alert')).toContainText('kept your unsent choices and notes')
 await expect(component.getByLabel('My note',{exact:false})).toHaveValue('SYNTHETIC UNSENT PRIVATE NOTE')
 await expect(component.getByLabel('My reflection',{exact:false})).toHaveValue('SYNTHETIC UNSENT REFLECTION')
 const sent=posts.at(-1);assert.equal(sent.action,'finish-day');assert.equal(sent.savePrivateText,false)
 assert.equal('comment' in sent.feedback,false);assert.equal('reflectionAnswer' in sent.feedback,false)
 passed('409 retains both drafts; unchecked private text omitted from POST')
 await show('en',{...daily('en',1),today:{...daily('en',1).today,localDate:'2026-10-12',checkin:{wellbeing:2,energy:'low',feelingChange:'worse',availableTime:'quick',skipped:false}}})
 await component.getByRole('button',{name:'Change today’s check-in',exact:true}).click()
 // The select is implicitly labelled. Match its accessible name, not the
 // label's full textContent (which also contains every option's visible text).
 const energySelect=component.getByRole('combobox',{name:'Available energy',exact:true})
 await expect(energySelect).toHaveValue('low')
 assert.deepEqual(await energySelect.evaluate(select=>Array.from(select.labels||[],label=>label.querySelector('span')?.textContent)),['Available energy'])
 await component.getByLabel('How are you feeling right now?',{exact:false}).fill('5');await component.getByRole('button',{name:'Save check-in and continue',exact:true}).click();await expect.poll(()=>posts.at(-1)?.wellbeing).toBe(5);assert.equal(posts.at(-1).energy,'low');assert.equal(posts.at(-1).availableTime,'quick')
 await component.getByRole('button',{name:'Change today’s check-in',exact:true}).click();await component.getByRole('button',{name:'Pause course',exact:true}).click();await expect(component.getByRole('button',{name:'Save check-in and continue',exact:true})).toHaveCount(0)
 passed('saved check-in partial edit preserves gentle choices; pause removes active editing')
 await show('en',daily('en',21));await component.getByRole('button',{name:'Save completed learning day',exact:true}).click();await expect(component.locator('[data-course-completion-21]')).toBeVisible();passed('day21 finish opens factual completion instead of day22')
 for(const lang of ['en','ru'])for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await show(lang,completedView(lang));const summary=component.locator('[data-course-completion-21]');await expect(summary).toBeVisible();await expect(summary.getByRole('button',{name:lang==='ru'?'Сохранить мой план':'Save my plan',exact:true})).toBeDisabled();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);await page.screenshot({path:output+'/'+lang+'-finished-'+width+'.png',fullPage:true});passed(lang+' '+width+'px: finished summary/unchecked continuation without overflow')}
 await show('en',completedView('en'));const completion=component.locator('[data-course-completion-21]');await completion.getByRole('checkbox').first().check();await completion.getByRole('checkbox',{name:'I agree to privately save these practice choices and this pace in my account.',exact:true}).check();await completion.getByRole('button',{name:'Save my plan',exact:true}).click();await expect(completion.locator('[data-course-saved-plan]')).toContainText('At my own pace');assert.equal(posts.at(-1).action,'continuation');assert.equal(posts.at(-1).consent,true);assert.equal(posts.at(-1).practiceDays.length,1)
 await completion.getByRole('button',{name:'Review optional repeat: Synthetic original questionnaire',exact:true}).click();const beforeRepeat=posts.length;await completion.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(posts.length,beforeRepeat)
 passed('continuation needs explicit consent; optional retest cancel has no effect')
 await show('ru',completedView('ru',true));await expect(component.locator('[data-course-completion-21]')).toContainText('Необязательные наблюдения о самочувствии не сохранялись.');passed('all-skipped course has no invented completed practices or check-in scores')
 let repeatBody=null;await page.route('**/api/app/runs',async route=>{repeatBody=route.request().postDataJSON();requests.push({path:'/api/app/runs',method:route.request().method(),fixtureMode,responseMode:'v1-exact-form-run',fulfilledStatus:200});await route.fulfill({contentType:'application/json',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111'})})});await page.route('**/en/app/runs/11111111-1111-4111-8111-111111111111?mode=quick',async route=>{const url=new URL(route.request().url());requests.push({path:url.pathname,method:route.request().method(),query:url.searchParams.toString(),fixtureMode,responseMode:'v1-exact-form-navigation',fulfilledStatus:200});await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic exact-form navigation</title><p>Synthetic questionnaire route</p>'})})
 await show('en',completedView('en'));await completion.getByRole('button',{name:'Review optional repeat: Synthetic original questionnaire',exact:true}).click();assert.equal(repeatBody,null);await completion.getByRole('button',{name:'Start this exact form',exact:true}).click();await expect(page).toHaveURL(/\/en\/app\/runs\/11111111-1111-4111-8111-111111111111\?mode=quick$/);assert.equal(repeatBody.definitionKey,'hh-weekly-pulse');assert.equal(repeatBody.definitionVersion,'v1');assert.equal(repeatBody.instrumentLocale,'en');passed('explicit optional repeat hands off exact original form and does not overwrite course')
 await verifyPersonalUI()
 assert.deepEqual(pageErrors,[])
 verificationStatus='passed'
}catch(error){
 verificationStatus='failed'
 await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})
 await writeFile(output+'/failure-dom.html',await page.content()).catch(()=>{})
 console.log('COURSE21_FAILURE_DIAGNOSTICS '+JSON.stringify({url:page.url(),fixtureMode,fixtureErrors,requests,buttons:await page.getByRole('button').allTextContents(),pageErrors}))
 throw error
}finally{
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,status:verificationStatus,checks,pageErrors,fixtureErrors,requests,personalV2Coverage:'SYNTHETIC_8_ROWS_6_ELIGIBLE_1_AGGREGATE_1_UNSUPPORTED; NOT_ALL_15_PILOT_SCALES_OR_388_TESTS; NO_REAL_DATABASE_OR_REVIEWED_CONTENT_CLAIM',scope:'SYNTHETIC_COURSE_DTO_BROWSER_UI_NOT_DATABASE_OR_REAL_INTERPRETATIONS',serviceWorkerCoverage:'EXCLUDED_FOR_MOCKED_DTO_INTERCEPTION; REAL_SW_ENABLED_RELEASE_PATH_REQUIRED',auth:'ISOLATED_PROTOCOL_DOUBLE_NOT_GOOGLE'},null,2))
 await browser.close()
}
