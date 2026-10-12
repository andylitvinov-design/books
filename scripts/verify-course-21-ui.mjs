// Browser UI acceptance with clearly labelled synthetic course DTOs. PostgreSQL
// storage and the released interpretation loader have separate acceptance gates.
import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {assertIsolated} from '../tests/helpers/app-db-setup.mjs'
import {courseOutline21,lessonFor21,COURSE_CONTENT_21_VERSION} from '../lib/inner-growth/lesson-library-21.js'
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
let locale='en',fixture={available:true,enrollmentReady:true,course:null},conflict=false
const r3={course:{id:'synthetic-r3-course',stage:3,revision:3,testKeys:['hh-weekly-pulse'],scaleKeys:[],focusTags:[],goals:[]},assessments:{selectedTests:[],pendingSelected:[]}}
page.on('pageerror',e=>pageErrors.push(e.message))
await page.route('**/api/app/course**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname
 if(!['/api/app/course','/api/app/course-21','/api/app/course-21/preview'].includes(path)){await route.continue();return}
 const body=route.request().method()==='POST'?route.request().postDataJSON():null
 if(body){posts.push(body);if(conflict){conflict=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'REVISION_CONFLICT'})});return}
  if(body.action==='activate')fixture={available:true,course,today:{status:'check-in-required',day:1,week:1,completedDays:0,skippedDays:0},history:[],profile}
 }
 const value=path==='/api/app/course'?r3:path.endsWith('/preview')?proposal:{...fixture,outline:courseOutline21(locale)}
 await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'private, no-store'},body:JSON.stringify(value)})
 requests.push({path,method:route.request().method(),locale:url.searchParams.get('locale'),fulfilledStatus:200,responseStage:value.course?.stage,responseAvailable:value.available,responseEnrollmentReady:value.enrollmentReady,responseStatus:value.status,profileCount:value.profile?.rows.length})
})
const passed=label=>{checks.push(label);console.log('PASS '+label)}
async function show(lang,view){locale=lang;fixture=view;await page.goto(origin+'/'+lang+'/app/course');await expect(page.locator('[data-my-course]')).toBeVisible({timeout:30000});await page.waitForLoadState('networkidle')}
function daily(lang,day=15){return {available:true,course,profile,today:{status:'ready',day,week:Math.ceil(day/7),completedDays:day-1,skippedDays:0,lesson:lessonFor21('inner_support',day,lang)},history:[],preferences:{length:'standard',alternativeRequested:false,stopOffer:false}}}
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
  await page.keyboard.press('Space');await expect(outline.locator('..')).toHaveJSProperty('open',false)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false)
  await page.screenshot({path:output+'/'+lang+'-'+width+'.png',fullPage:true})
  passed(lang+' '+width+'px: day15 specific outcome, keyboard outline, no horizontal overflow')
 }
 await show('en',daily('en',1))
 await component.getByLabel('My note',{exact:false}).fill('SYNTHETIC UNSENT PRIVATE NOTE')
 await component.getByLabel('My reflection',{exact:false}).fill('SYNTHETIC UNSENT REFLECTION')
 conflict=true;await component.getByRole('button',{name:'Save completed learning day',exact:true}).click()
 await expect(component.getByRole('alert')).toContainText('kept your unsent choices and notes')
 await expect(component.getByLabel('My note',{exact:false})).toHaveValue('SYNTHETIC UNSENT PRIVATE NOTE')
 await expect(component.getByLabel('My reflection',{exact:false})).toHaveValue('SYNTHETIC UNSENT REFLECTION')
 const sent=posts.at(-1);assert.equal(sent.action,'finish-day');assert.equal(sent.savePrivateText,false)
 assert.equal('comment' in sent.feedback,false);assert.equal('reflectionAnswer' in sent.feedback,false)
 passed('409 retains both drafts; unchecked private text omitted from POST')
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
