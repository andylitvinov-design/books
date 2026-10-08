import {chromium,webkit,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {createHmac} from 'node:crypto'
import {adminClient,assertIsolated,A} from '../tests/helpers/app-db-setup.mjs'
assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN||'http://127.0.0.1:3100'
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Only isolated loopback browser verification is permitted')
const output='artifacts/app-r1'
await mkdir(output,{recursive:true})
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(),context=await browser.newContext({viewport:{width:390,height:844}}),errors=[]
let page=await context.newPage()
const capturePageError=error=>{if(error.message.includes('/api/app/bootstrap due to access control checks.')||/\/api\/app\/results\/[^ ]+ due to access control checks\.$/.test(error.message))return;errors.push(error.message);console.log('SYNTHETIC_PAGE_ERROR',new URL(page.url()).pathname,error.message)}
page.on('pageerror',capturePageError)
const checks=[]
function passed(name){checks.push(name);console.log('PASS '+name)}
async function api(path,body,ctx=context){
 let error
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await ctx.request.fetch(origin+'/api/app/'+path,{method:body?'POST':'GET',headers:body?{Origin:origin,'Content-Type':'application/json'}:{},data:body})
   return{status:response.status(),data:await response.json(),headers:response.headers()}
  }catch(e){
   error=e
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)))
  }
 }
 throw error
}
async function ready(){await expect(page.locator('.hh-nav')).toBeVisible({timeout:60000});await page.waitForLoadState('networkidle')}
async function enterTest(name='Current State Check',mode='Guided'){
 await page.goto(origin+'/en/app/tests');await ready()
 const candidate=()=>page.locator('article').filter({
   has:page.getByRole('heading',{name,exact:true}),
 }).filter({has:page.getByRole('button',{name:/^(Start testing|Continue test|Retake test)/})}).first()
 if(!(await candidate().count())){
  const toggle=page.getByRole('button',{name:'Choose or change tests',exact:true})
  if(await toggle.count())await toggle.click()
  let card=page.locator('article').filter({
   has:page.getByRole('heading',{name,exact:true}),
  }).filter({has:page.getByRole('checkbox',{name,exact:true})}).first()
  if(!(await card.count())){
   const all=page.getByRole('button',{name:'Full database',exact:true})
   if(await all.count())await all.click()
   card=page.locator('article').filter({
    has:page.getByRole('heading',{name,exact:true}),
   }).filter({has:page.getByRole('checkbox',{name,exact:true})}).first()
  }
  await card.getByRole('checkbox',{name,exact:true}).check()
  await page.getByRole('button',{name:'Start free testing',exact:true}).click()
  if(await page.getByRole('heading',{name:'You already have an active test set'}).count())
   await page.getByRole('button',{name:'Use new selection'}).click()
  await expect(page.getByRole('heading',{name:'Your selected tests'})).toBeVisible()
 }
 await expect(candidate()).toBeVisible({timeout:15000})
 await candidate().getByRole('button',{name:/^(Start testing|Continue test|Retake test)/}).click()
 await expect(page).toHaveURL(/\/runs\//)
 await expect(page.locator('.hh-runner')).toBeVisible()
 const modeChoice=page.locator('.hh-test-mode-card').filter({hasText:mode}).first()
 if(await modeChoice.count())await modeChoice.click()
}
async function savedClick(button){
 const [response]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/save')&&r.request().method()==='POST'),button.click()])
 assert.equal(response.status(),200,'Server must acknowledge each save')
 await expect(page.getByRole('status')).toHaveText('Saved securely')
}
async function answerCurrent(value){await savedClick(page.locator('.hh-scale').getByRole('button',{name:String(value),exact:true}));await savedClick(page.getByRole('button',{name:'Next',exact:true}))}
async function saveAndExit(){
 await page.getByRole('button',{name:'Save and exit'}).click()
 // Do not cancel the in-flight save with a scripted page.goto. Wait for the app's own navigation.
 await expect(page).toHaveURL(/\/tests$/)
 await ready()
}
async function openCompletedPlanResult(){
 // A finished battery returns to its photo-led status dashboard; a retake may directly show the result.
 if(/\/results\//.test(page.url()))return
 await expect(page).toHaveURL(/\/tests\?plan=/)
 await expect(page.getByRole('heading',{name:'Your selected tests'})).toBeVisible()
 await page.getByRole('link',{name:'View result'}).first().click()
 await expect(page).toHaveURL(/\/results\//)
}
try {
 const response=await page.goto(origin+'/en/app');assert.match(response.headers()['cache-control'],/no-store/);assert.match(response.headers()['x-robots-tag'],/noindex/);assert.equal(response.headers()['referrer-policy'],'no-referrer')
 await page.getByRole('button',{name:'Continue with Google'}).click();await expect(page.getByRole('heading',{name:'Create my private space'})).toBeVisible({timeout:60000})
 await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to private processing',{exact:false}).check();assert.equal(await page.getByLabel('I agree to optional marketing',{exact:false}).count(),0)
 await page.getByRole('button',{name:'Create my private space'}).click();await ready();await expect(page.getByRole('heading',{name:'My profile',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Check your current state',exact:true})).toBeVisible();await expect(page.getByText('Profile',{exact:true}).first()).toBeVisible();await expect(page.getByRole('link',{name:/Take a free state analysis and get recommendations/})).toBeVisible();passed('supported SDK PKCE callback opens the action-first Cabinet dashboard')
 await page.goto(origin+'/en/app/monitoring');await ready();await expect(page.getByRole('heading',{name:'Psi-Monitoring',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'My Monitoring',exact:true})).toBeVisible();await expect(page.getByText('Not completed',{exact:true}).first()).toBeVisible();await page.screenshot({path:output+'/psi-monitoring-initial.png',fullPage:true});passed('Psi-Monitoring opens as a first-class signed-in monitoring workspace')
 await page.getByRole('button',{name:'Happy',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect.poll(async()=>((await api('bootstrap')).data.moodCheckins||[]).length).toBe(1);await page.getByRole('button',{name:'Not now',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);passed('signed-in mood tap persists even when the user chooses Not now')
 const practitionerDb=await adminClient();try{await practitionerDb.query('update app.practitioners set trusted_auth_user_id=$1 where active',[A])}finally{await practitionerDb.end()}
 await page.goto(origin+'/en/app');await ready();await expect(page.getByRole('heading',{name:'Practitioner tools',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/^Clients/})).toBeVisible()
 const practitionerOpen=await api('practitioner/open',{destination:'clients'});assert.equal(practitionerOpen.status,200);assert.equal(practitionerOpen.data.redirectUrl,'/admin/clients');const practitionerPage=await context.newPage();await practitionerPage.goto(origin+practitionerOpen.data.redirectUrl);await expect(practitionerPage.getByRole('heading',{name:'Clients',exact:true})).toBeVisible();await practitionerPage.close();passed('trusted practitioner opens existing client database from My Profile without PIN')
 await page.goto(origin+'/en/app');await ready()
 await page.goto(origin+'/en/app/reports');await ready();await expect(page.getByRole('heading',{name:'No reports from Andy have been saved yet.'})).toBeVisible();passed('Reports is a first-class empty Cabinet layer')
 const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.startsWith('hh-app-auth')&&c.httpOnly));assert.ok(!(await page.evaluate(()=>document.cookie)).includes('hh-app-auth'));passed('app tokens remain HttpOnly')
 await enterTest();assert.equal(await page.locator('.hh-scale [aria-pressed=true]').count(),0)
 await page.screenshot({path:output+'/current-state-runner.png',fullPage:true})
 await answerCurrent(7);await saveAndExit()
 await page.reload();await ready();await enterTest();await expect(page.getByRole('heading',{name:'How much energy and inner support do you feel right now?'})).toBeVisible();passed('saved answers and progress resume after reload')
 for(const v of[3,6,8,5])await answerCurrent(v)
 await page.getByText('Add optional context',{exact:true}).click();await page.getByLabel('Anything else you want to note?').fill('Synthetic private context, not a real person.');await page.getByLabel('What changed or seems to trigger this?').fill('Synthetic trigger.');await page.getByLabel('What would you like to change?').fill('Synthetic desired change.')
 await saveAndExit();await enterTest();await page.getByText('Add optional context',{exact:true}).click();await expect(page.getByLabel('Anything else you want to note?')).toHaveValue('Synthetic private context, not a real person.');await expect(page.getByLabel('What changed or seems to trigger this?')).toHaveValue('Synthetic trigger.');await expect(page.getByLabel('What would you like to change?')).toHaveValue('Synthetic desired change.');passed('Save and exit flushes versioned optional context without touching scores')
 await page.getByRole('button',{name:'Save my result'}).click();await openCompletedPlanResult();await expect(page.getByRole('heading',{name:'Context at this check-in'})).toBeVisible();await expect(page.getByText('Synthetic trigger.',{exact:true})).toBeVisible();const first=(await api('bootstrap')).data.results[0];assert.equal(first.dimensions.length,5);passed('first result, owner-only optional context and snapshot persist in actual PostgreSQL')
 await page.goto(origin+'/en/app');await ready();await expect(page.getByRole('heading',{name:'Add your baseline profile',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Results portfolio/})).toBeVisible()
 for(const width of[320,360,390,430,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${output}/portrait-en-${width}.png`,fullPage:true})}
 assert.equal(await page.locator('.mobile-bottom-navigation').count(),0);passed('action-first profile dashboard and responsive no-overflow screenshots 320–1280')
 await page.goto(origin+'/en/app/portfolio');await ready();await expect(page.getByRole('heading',{name:'Results portfolio',exact:true}).first()).toBeVisible();await expect(page.locator('.hh-metric')).toHaveCount(5);await page.locator('.hh-metric').first().click();await expect(page.locator('.hh-detail')).toBeVisible();passed('detailed measurements remain interactive inside the dedicated results portfolio')
 await page.setViewportSize({width:390,height:844});await enterTest();for(const v of[4,6,3,5,2])await answerCurrent(v);await page.getByRole('button',{name:'Save my result'}).click();await openCompletedPlanResult()
 let data=(await api('bootstrap')).data;assert.equal(data.results.length,2);assert.equal(data.results[0].id,first.id);assert.equal(new Set(data.snapshot.dimensions.map(d=>d.key)).size,5);passed('second run keeps original baseline and unique profile axes')
 await page.goto(origin+'/en/app/history');await ready();await expect(page.locator('.hh-change')).toContainText('7 → 4');await page.screenshot({path:output+'/history-en.png',fullPage:true});passed('history compares real results and exact point differences')
 await page.goto(origin+'/en/app/monitoring/hh-current-state');await ready();await expect(page.getByRole('heading',{name:'Current State Check',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Measurement history',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Compare measurements',exact:true})).toBeVisible();await page.screenshot({path:output+'/psi-monitoring-trend.png',fullPage:true});passed('Psi-Monitoring trend view compares compatible repeated measurements')
 await enterTest('Personality Baseline');await expect(page.getByText('Describe how you generally see yourself',{exact:false})).toBeVisible()
 await page.screenshot({path:output+'/personality-runner.png',fullPage:true})
 for(let i=0;i<20;i++){await savedClick(page.locator('.hh-scale').getByRole('button',{name:'3 Neither Inaccurate nor Accurate'}));await savedClick(page.getByRole('button',{name:'Next',exact:true}))}
 await page.getByRole('button',{name:'Save my result'}).click();await openCompletedPlanResult();data=(await api('bootstrap')).data;const trait=data.results.find(r=>r.definitionKey==='mini-ipip-20');assert.deepEqual(trait.dimensions.map(d=>d.value),[12,12,12,12,12]);assert.equal(data.snapshot.dimensions.length,10);passed('Mini-IPIP scoring is preserved alongside completed plan summaries')
 await enterTest('Weekly Psychic Health','Quick');await expect(page.getByText('Answer about the past 7 days.',{exact:false})).toBeVisible();await expect(page.getByRole('heading',{name:'Overall, how emotionally okay have you felt during the past 7 days?',exact:true})).toBeVisible();await savedClick(page.locator('.hh-scale button').first());await expect(page.getByText('Question 2 / 8',{exact:true})).toBeVisible();passed('Quick mode saves and auto-advances in the signed-in runner');await page.getByRole('button',{name:'Save and exit'}).click();await expect(page).toHaveURL(/\/tests$/);await ready();await page.locator('article').filter({has:page.getByRole('heading',{name:'Weekly Psychic Health',exact:true})}).getByRole('button',{name:'Continue test'}).click();await page.locator('.hh-test-mode-card').filter({hasText:'Quick'}).click();await expect(page.getByText('Question 2 / 8',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save and exit'}).click();await expect(page).toHaveURL(/\/tests$/);await ready();await page.goto(origin+'/en/app');await ready();await expect(page.getByRole('heading',{name:'Finish: Weekly Psychic Health',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Continue test',exact:true})).toBeVisible();passed('Weekly Psychic Health is a resumable sequential plan step')
 await page.goto(origin+'/ru/app');await ready();await expect(page.getByRole('heading',{name:'Мой профиль',exact:true})).toBeVisible();await page.screenshot({path:output+'/portrait-ru.png',fullPage:true});passed('Russian app chrome preserves English instrument provenance')
 await page.goto(origin+'/en/app/consultations');await ready();await page.getByRole('button',{name:'Request a consultation',exact:true}).first().click();await page.getByLabel('How should Andy contact you?').fill('synthetic@example.invalid');await page.getByLabel('Your message (optional)').fill('A synthetic request for CI only.')
 await page.screenshot({path:output+'/consultation-request.png',fullPage:true})
 await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page.getByText('Received',{exact:true})).toBeVisible();data=(await api('bootstrap')).data;assert.equal(data.requests.length,1);assert.equal(data.requests[0].sharedExcerpt,null);passed('real consultation request without implicit profile sharing')
 const admin=await browser.newContext();await admin.addCookies([{name:'prescriptions_admin',value:createHmac('sha256',process.env.PRESCRIPTIONS_ADMIN_TOKEN).update('prescriptions-admin-v1').digest('base64url'),url:origin+'/admin',httpOnly:true,sameSite:'Strict'}]);const adminPage=await admin.newPage();await adminPage.goto(origin+'/admin/app-requests');await expect(adminPage.getByText('synthetic@example.invalid',{exact:true})).toBeVisible();await adminPage.getByRole('button',{name:'Contacted',exact:true}).click();await expect(adminPage.locator('.hh-badge')).toHaveText('Contacted');await adminPage.screenshot({path:output+'/practitioner-inbox.png',fullPage:true});passed('existing practitioner authorization and real request status inbox')
 await page.goto(origin+'/en/app/consultations');await ready();await page.getByRole('button',{name:'Cancel request'}).click();await expect(page.locator('.hh-badge')).toHaveText('Cancelled');passed('user cancels contacted request')
 const other=await browser.newContext();await other.addCookies([{name:'hh_test_actor',value:'b',url:origin}]);const otherPage=await other.newPage();await otherPage.goto(origin+'/en/app');await otherPage.getByRole('button',{name:'Continue with Google'}).click();await expect(otherPage.getByRole('heading',{name:'Create my private space'})).toBeVisible();await otherPage.getByLabel('I am 18 or older.').check();await otherPage.getByLabel('I agree to private processing',{exact:false}).check();assert.equal(await otherPage.getByLabel('I agree to optional marketing',{exact:false}).count(),0);await otherPage.getByRole('button',{name:'Create my private space'}).click();await expect(otherPage.locator('.hh-nav')).toBeVisible();assert.equal((await api('results/'+first.id,null,other)).status,404);assert.equal((await api('bootstrap',null,other)).data.results.length,0);passed('browser A/B cross-user result denial')
 const blocked=await context.request.post(origin+'/api/app/requests',{headers:{Origin:'https://other.invalid'},data:{}});assert.equal(blocked.status(),403);passed('cross-origin mutations rejected')
 const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),caches:await Promise.all((await caches.keys()).map(async k=>(await(await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)))}));assert.ok(!JSON.stringify(storage).match(/hh-app-auth|profile:first|\/api\/app|\/en\/app|\/ru\/app/));passed('no private browser storage or service-worker response cache')
 const exported=await api('export');assert.equal(exported.status,200);assert.ok(exported.data.runs.every(r=>r.accountId===first.accountId));assert.equal(exported.data.results.length,3);passed('own complete data export')
 await page.goto(origin+'/en/app/settings');await ready();await page.getByRole('button',{name:'Sign out on all devices'}).click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await expect(page).toHaveURL(origin+'/en/app');await page.waitForLoadState('networkidle');assert.equal((await api('bootstrap')).status,401);passed('logout invalidates real test session and clears UI')
 // A fresh tab in the same cookie jar avoids racing Next's logout refresh.
 await page.close();page=await context.newPage();page.on('pageerror',capturePageError)
 await page.goto(origin+'/en/client');await expect(page.getByRole('heading',{name:'Your personal space'})).toBeVisible();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();assert.equal(await page.locator('.cabinet-legacy-entry').getAttribute('open'),null);passed('Cabinet is Google-first and legacy private-link entry is secondary')
 await page.getByRole('button',{name:'Start test'}).nth(1).click();await expect(page.getByRole('heading',{name:'Before you start'})).toBeVisible();await page.getByLabel('I am 18 or older.').check();await page.getByLabel('I agree to temporary private processing',{exact:false}).check();await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.locator('.hh-test-mode-card').filter({hasText:'Guided'}).click();await expect(page.getByText('Question 1 of 20',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:/Neither Inaccurate nor Accurate/}).click();await expect(page.getByRole('status')).toHaveText('Saved');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Question 2 of 20',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Your Mind–Body Monitor'})).toBeVisible();await page.getByRole('button',{name:/Start test: Personality Baseline/}).click();await page.locator('.hh-test-mode-card').filter({hasText:'Guided'}).click();await expect(page.getByText('Question 2 of 20',{exact:true})).toBeVisible();passed('external Cabinet stays on catalog after reload and explicit test selection resumes saved progress')
 for(let i=1;i<20;i++){await page.getByRole('button',{name:/Neither Inaccurate nor Accurate/}).click();await expect(page.getByRole('status')).toHaveText('Saved');await page.getByRole('button',{name:i===19?'See my result':'Next',exact:true}).click()}
 await expect(page.getByRole('heading',{name:'Personality Baseline'})).toBeVisible();passed('personality guest test completes while signed out with full result')
 await page.getByRole('button',{name:'Take another test'}).click();await page.getByRole('button',{name:'Start test'}).first().click();await page.locator('.hh-test-mode-card').filter({hasText:'Quick'}).click()
 for(const [i,v] of [4,6,3,5,2].entries()){await page.getByRole('button',{name:String(v),exact:true}).click();if(i<4){await expect(page.getByRole('status')).toHaveText('Saved');await expect(page.getByText(`Question ${i+2} of 5`,{exact:true})).toBeVisible()}}
 await expect(page.getByRole('heading',{name:'Optional context'})).toBeVisible();passed('Quick mode saves and auto-advances in the guest runner');await page.getByLabel('Anything else you want to note?').fill('Synthetic guest context.');await page.getByRole('button',{name:'See my result',exact:true}).click();await expect(page.getByRole('heading',{name:'Current State Check'})).toBeVisible();passed('current-state guest test completes while signed out')
 const privateStorage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}));assert.deepEqual(privateStorage,{local:[],session:[]});passed('guest flow uses no localStorage/sessionStorage canonical data')
 await page.getByRole('button',{name:'Save to my Cabinet'}).click();await expect(page).toHaveURL(/\/app\/continue\?intent=/,{timeout:60000});await ready();await expect(page.getByRole('heading',{name:'Save to your Cabinet'})).toBeVisible();await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page).toHaveURL(/\/results\//,{timeout:60000});await ready();data=(await api('bootstrap')).data;assert.equal(data.results.length,4);passed('explicit guest save intent survives Google and imports exactly one selected result')
 assert.deepEqual(errors,[]);passed('no uncaught browser errors')
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,realPostgreSQL:true,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE',production:'UNCHANGED'},null,2))
 await other.close();await admin.close()
} catch(error){await page.screenshot({path:output+'/failure-synthetic-only.png',fullPage:true}).catch(()=>{});await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,checks,failure:error.message,auth:'ISOLATED_PROVIDER_PROTOCOL_DOUBLE_NOT_GOOGLE'},null,2));throw error}
finally{await browser.close()}
