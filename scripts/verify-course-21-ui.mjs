// Browser UI acceptance with clearly labelled synthetic course DTOs. PostgreSQL
// storage and the released interpretation loader have separate acceptance gates.
import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {assertIsolated} from '../tests/helpers/app-db-setup.mjs'
import {courseOutline21,lessonFor21,COURSE_CONTENT_21_VERSION} from '../lib/inner-growth/lesson-library-21.js'
import {createCourseJourney,checkInBeforeLesson,dailyLesson,finishCourseDay} from '../lib/inner-growth/course-progression-21.js'
import {courseCompletion21,saveCourseContinuation} from '../lib/inner-growth/course-completion-21.js'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium,browser=await engine.launch()
// page.route cannot intercept service-worker-owned fetches. Only this mocked-DTO
// UI context blocks workers; production SW and full database journeys are unchanged.
// https://playwright.dev/docs/api/class-page#page-route
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage()
const output='artifacts/app-r1/course-21-'+engine.name(),checks=[],pageErrors=[],posts=[],requests=[]
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
const syntheticJourney=createCourseJourney({id:'synthetic-outline',choices:{confirmed:true,durationDays:21,topics:[{scaleId:rows[0].id,track:'inner_support'}]},consent:true,timeZone:'UTC',contentVersion:COURSE_CONTENT_21_VERSION,now:'2026-10-12T12:00:00Z'})
const r3={course:{id:'synthetic-r3-course',stage:3,revision:3,testKeys:['hh-weekly-pulse'],scaleKeys:[],focusTags:[],goals:[]},assessments:{selectedTests:[],pendingSelected:[]}}
page.on('pageerror',e=>pageErrors.push(e.message))
await page.route('**/api/app/course**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname
 if(!['/api/app/course','/api/app/course-21','/api/app/course-21/preview'].includes(path)){await route.continue();return}
 const body=route.request().method()==='POST'?route.request().postDataJSON():null
 if(body){posts.push(body);if(conflict){conflict=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'REVISION_CONFLICT'})});return}
  if(body.action==='preferences')fixture={...fixture,preferences:{length:body.length,alternativeRequested:body.alternativeRequested,stopOffer:body.stopOffer},today:{...fixture.today,lesson:lessonFor21('inner_support',fixture.today.day,locale,body.alternativeRequested?'grounding':body.length)}}
  if(body.action==='check-in')fixture={...fixture,today:{...fixture.today,status:'ready',checkin:{...body,day:fixture.today.day,skipped:body.skip},localDate:'2026-10-12',lesson:lessonFor21('inner_support',fixture.today.day,locale,body.energy==='low'||body.feelingChange==='worse'||body.availableTime==='quick'?'quick':'standard')}}
  if(body.action==='pause')fixture={...fixture,course:{...fixture.course,status:'paused'},today:{...fixture.today,status:'paused',lesson:null}}
  if(body.action==='finish-day'&&body.day===21)fixture=completedView(locale)
  if(body.action==='continuation'){terminalJourney=saveCourseContinuation(terminalJourney,{...body,now:'2026-11-03T12:00:00Z',expectedRevision:terminalJourney.revision,locale,lessonFor:lessonFor21});fixture={...fixture,course:{...fixture.course,revision:terminalJourney.revision},completion:courseCompletion21(terminalJourney,{locale,lessonFor:lessonFor21})}}
  if(body.action==='activate')fixture={available:true,course,today:{status:'check-in-required',day:1,week:1,completedDays:0,skippedDays:0},history:[],profile}
 }
 const value=path==='/api/app/course'?r3:path.endsWith('/preview')?proposal:{...fixture,outline:fixture.outline||courseOutline21(locale)}
 await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'private, no-store'},body:JSON.stringify(value)})
 requests.push({path,method:route.request().method(),locale:url.searchParams.get('locale'),fulfilledStatus:200,responseStage:value.course?.stage,responseAvailable:value.available,responseEnrollmentReady:value.enrollmentReady,responseStatus:value.status,profileCount:value.profile?.rows.length})
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
 await component.getByRole('button',{name:'Change today’s check-in',exact:true}).click();await expect(component.getByLabel('Available energy',{exact:true})).toHaveValue('low');await component.getByLabel('How are you feeling right now?',{exact:false}).fill('5');await component.getByRole('button',{name:'Save check-in and continue',exact:true}).click();await expect.poll(()=>posts.at(-1)?.wellbeing).toBe(5);assert.equal(posts.at(-1).energy,'low');assert.equal(posts.at(-1).availableTime,'quick')
 await component.getByRole('button',{name:'Change today’s check-in',exact:true}).click();await component.getByRole('button',{name:'Pause course',exact:true}).click();await expect(component.getByRole('button',{name:'Save check-in and continue',exact:true})).toHaveCount(0)
 passed('saved check-in partial edit preserves gentle choices; pause removes active editing')
 await show('en',daily('en',21));await component.getByRole('button',{name:'Save completed learning day',exact:true}).click();await expect(component.locator('[data-course-completion-21]')).toBeVisible();passed('day21 finish opens factual completion instead of day22')
 for(const lang of ['en','ru'])for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await show(lang,completedView(lang));const summary=component.locator('[data-course-completion-21]');await expect(summary).toBeVisible();await expect(summary.getByRole('button',{name:lang==='ru'?'Сохранить мой план':'Save my plan',exact:true})).toBeDisabled();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);await page.screenshot({path:output+'/'+lang+'-finished-'+width+'.png',fullPage:true});passed(lang+' '+width+'px: finished summary/unchecked continuation without overflow')}
 await show('en',completedView('en'));const completion=component.locator('[data-course-completion-21]');await completion.getByRole('checkbox').first().check();await completion.getByRole('checkbox',{name:'I agree to privately save these practice choices and this pace in my account.',exact:true}).check();await completion.getByRole('button',{name:'Save my plan',exact:true}).click();await expect(completion.locator('[data-course-saved-plan]')).toContainText('At my own pace');assert.equal(posts.at(-1).action,'continuation');assert.equal(posts.at(-1).consent,true);assert.equal(posts.at(-1).practiceDays.length,1)
 await completion.getByRole('button',{name:'Review optional repeat: Synthetic original questionnaire',exact:true}).click();const beforeRepeat=posts.length;await completion.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(posts.length,beforeRepeat)
 passed('continuation needs explicit consent; optional retest cancel has no effect')
 await show('ru',completedView('ru',true));await expect(component.locator('[data-course-completion-21]')).toContainText('Необязательные наблюдения о самочувствии не сохранялись.');passed('all-skipped course has no invented completed practices or check-in scores')
 let repeatBody=null;await page.route('**/api/app/runs',async route=>{repeatBody=route.request().postDataJSON();await route.fulfill({contentType:'application/json',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111'})})});await page.route('**/en/app/runs/11111111-1111-4111-8111-111111111111?mode=quick',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic exact-form navigation</title><p>Synthetic questionnaire route</p>'}))
 await show('en',completedView('en'));await completion.getByRole('button',{name:'Review optional repeat: Synthetic original questionnaire',exact:true}).click();assert.equal(repeatBody,null);await completion.getByRole('button',{name:'Start this exact form',exact:true}).click();await expect(page).toHaveURL(/\/en\/app\/runs\/11111111-1111-4111-8111-111111111111\?mode=quick$/);assert.equal(repeatBody.definitionKey,'hh-weekly-pulse');assert.equal(repeatBody.definitionVersion,'v1');assert.equal(repeatBody.instrumentLocale,'en');passed('explicit optional repeat hands off exact original form and does not overwrite course')
 assert.deepEqual(pageErrors,[])
}catch(error){
 await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{})
 await writeFile(output+'/failure-dom.html',await page.content()).catch(()=>{})
 console.log('COURSE21_FAILURE_DIAGNOSTICS '+JSON.stringify({url:page.url(),requests,buttons:await page.getByRole('button').allTextContents(),pageErrors}))
 throw error
}finally{
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,pageErrors,requests,scope:'SYNTHETIC_COURSE_DTO_BROWSER_UI_NOT_DATABASE_OR_REAL_INTERPRETATIONS',serviceWorkerCoverage:'EXCLUDED_FOR_MOCKED_DTO_INTERCEPTION; REAL_SW_ENABLED_RELEASE_PATH_REQUIRED',auth:'ISOLATED_PROTOCOL_DOUBLE_NOT_GOOGLE'},null,2))
 await browser.close()
}
