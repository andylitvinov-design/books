// Real rendered UI / synthetic Google-auth state only. No private user data, tokens or actual Google login.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PRACTICE_ORIGIN || 'http://127.0.0.1:3121'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error('Loopback only')
const out='artifacts/practice-after-google'
await mkdir(out,{recursive:true})
const results=[]
const headings={ru:'Профиль мастера',en:'Practitioner Profile',es:'Perfil profesional'}
const bootstrap={account:{id:'synthetic-qa',onboardingState:'complete'},results:[],runs:[],requests:[],consents:[],services:[]}
const practice={practitioner:{profile:{displayName:''},draftProfile:{displayName:''}},services:[],requests:[]}
function respond(route,status,body){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})}
async function api(page,signed){
  await page.route('**/api/app/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(!signed)return respond(route,401,{error:'UNAUTHORIZED'})
    if(path==='/api/app/bootstrap')return respond(route,200,bootstrap)
    if(path==='/api/app/practice')return respond(route,200,practice)
    if(path==='/api/app/auth/contact-profile')return respond(route,200,{displayName:''})
    return respond(route,401,{error:'SYNTHETIC_FIXTURE_ONLY'})
  })
}
// The canonical Practice visual verifier owns full geometry, 320/354/390/430px
// coverage and screenshots. Here exercise the distinct OAuth lifecycle only.
async function verifySignedWork(page,locale,label){
  const root=page.locator('[data-practice-showcase]')
  await root.waitFor({state:'visible',timeout:30000})
  await page.waitForFunction(()=>document.querySelector('[data-practice-showcase]')?.dataset.authState==='signed',null,{timeout:30000})
  const hero=root.locator('[data-work-profile-scenic-hero] h1')
  assert.equal(await hero.innerText(),headings[locale],label+' current localized practitioner heading')
  assert.equal(await root.locator('[data-profile-mode="work"]').getAttribute('aria-current'),'page',label+' Work selected')
  assert.equal(await root.locator('[data-work-primary-grid] [data-work-card]').count(),4,label+' four core tools')
  assert.equal(await root.locator('[data-work-create-buttons] > button').count(),4,label+' four creation shortcuts')
  assert.equal(await root.locator('[data-work-create-tools] > button').count(),3,label+' further creation choices remain')
  assert.equal(await root.locator('[data-practice-after-google]').count(),0,label+' no injected Continue panel')
  assert.equal(await root.locator('[data-work-create-tools]').isVisible(),false,label+' no unsolicited editor')
  return root
}
for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true})
  try{
    // One signed-in lifecycle per language/browser replaces two overlapping
    // signed-in matrices. Verify clean return, stale OAuth URL cleanup and the
    // real user-initiated editor transition on the CURRENT Work surface.
    for(const locale of ['ru','en','es']){
      const label=engine.name()+'-'+locale+'-signed-oauth-return'
      const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,
        hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,true)
      const errors=[]
      page.on('pageerror',e=>errors.push(e.message))
      try{
        const response=await page.goto(origin+'/'+locale+'/practice?ready=create',{waitUntil:'domcontentloaded',timeout:90000})
        assert.equal(response?.status(),200,label+' HTTP')
        const root=await verifySignedWork(page,locale,label)
        await page.waitForURL(url=>url.pathname==='/'+locale+'/practice'&&!url.search,{timeout:30000})
        assert.equal(await root.locator('[data-practice-after-google]').count(),0,label+' stale URL did not create a panel')
        await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
        await root.locator('[data-work-create-button="service"]').click()
        await page.waitForURL(url=>url.pathname==='/'+(locale==='es'?'en':locale)+'/app/practice'&&
          url.searchParams.get('panel')==='services'&&url.searchParams.get('create')==='1'&&url.searchParams.get('starter')==='session',{timeout:30000})
        assert.deepEqual(errors,[],label+' browser exceptions')
        results.push({label,ok:true,mode:'synthetic signed-in OAuth return and explicit editor'})
      }catch(e){
        await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
        throw new Error(label+': '+e.message,{cause:e})
      }finally{await page.close()}
    }

    // A guest clicking Create -> Google on the approved dashboard must not
    // send profi=create: that formerly injected the unwanted second screenshot.
    for(const locale of ['ru','en','es']){
      const label=engine.name()+'-'+locale+'-public-google'
      const page=await browser.newPage({viewport:{width:390,height:844},
        hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,false)
      let payload=null
      await page.route('**/api/app/auth/start',route=>{
        payload=route.request().postDataJSON()
        return respond(route,200,{redirectUrl:'https://accounts.google.com/o/oauth2/v2/auth?synthetic=1'})
      })
      await page.route('https://accounts.google.com/**',route=>
        route.fulfill({status:200,contentType:'text/html',body:'<html>synthetic OAuth</html>'}))
      try{
        await page.goto(origin+'/'+locale+'/practice',{waitUntil:'domcontentloaded'})
        await page.waitForFunction(()=>document.querySelector('[data-practice-showcase]')?.dataset.authState==='guest')
        await page.locator('[data-work-create-button="service"]').click()
        const dialog=page.locator('[data-practice-showcase]').getByRole('dialog')
        await dialog.waitFor({state:'visible',timeout:10000})
        await dialog.locator('button[class*="modalPrimary"]').click()
        await page.waitForURL(url=>url.hostname==='accounts.google.com')
        assert.equal(payload?.continueTo,'practice-preview',label+' same dashboard after login')
        assert.equal(payload?.profi,undefined,label+' no extra Continue banner')
        assert.equal(payload?.locale,locale,label+' preserve locale')
        results.push({label,ok:true,mode:'synthetic guest create -> Google continuation'})
      }finally{await page.close()}
    }

    // Reproduce the real broken starting URL before Google sign-in, without making an external OAuth request.
    for(const locale of ['ru','en']){
      const label=engine.name()+'-'+locale+'-legacy-auth'
      const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,
        isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,false)
      let payload=null
      await page.route('**/api/app/auth/start',async route=>{
        payload=route.request().postDataJSON()
        return respond(route,200,{redirectUrl:'https://accounts.google.com/o/oauth2/v2/auth?synthetic=1'})
      })
      await page.route('https://accounts.google.com/**',route=>
        route.fulfill({status:200,contentType:'text/html',body:'<html>synthetic OAuth</html>'}))
      try{
        const res=await page.goto(origin+'/'+locale+'/app/practice?panel=services&create=1&starter=session',
          {waitUntil:'domcontentloaded',timeout:90000})
        assert.equal(res?.status(),200,label+' legacy screen')
        const button=page.locator('button.hh-primary').filter({hasText:/Google|Войти|Sign in/i}).first()
        await button.waitFor({state:'visible',timeout:30000})
        await button.click()
        await page.waitForURL(url=>url.hostname==='accounts.google.com',{timeout:30000})
        assert.equal(payload?.continueTo,'practice-preview',label+' must return to reference dashboard')
        assert.equal(payload?.profi,undefined,label+' MUST NOT add ?ready=service banner')
        assert.equal(payload?.locale,locale,label+' preserves language')
        results.push({label,ok:true,mode:'synthetic OAuth-start routing; NOT provider login'})
      }catch(e){
        await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
        throw new Error(label+': '+e.message,{cause:e})
      }finally{await page.close()}
    }
  }finally{await browser.close()}
}
await writeFile(out+'/manifest.json',JSON.stringify({privacy:'synthetic only; real Google login and saves require separate owner E2E',results},null,2)+'\n')
console.log('Post-Google Practice visual browser checks:',results.length,'passed')
