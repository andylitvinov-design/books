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
const headings={ru:'Кабинет практика',en:'Practitioner workspace',es:'Espacio profesional'}
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
async function snapshot(page){
  return page.evaluate(()=>{
    const root=document.querySelector('[data-practice-showcase]')
    const pick=s=>root.querySelector(s)
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
    const grid=pick('[class*="quickGrid"]'),offers=pick('[class*="offerRail"]'),nav=pick('nav')
    return {url:location.pathname+location.search,width:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth,
      identity:rect(pick('[class*="identity"]')),grid:rect(grid),hero:rect(pick('[class*="hero"]')),
      offers:rect(pick('[class*="offers"]')),nav:rect(nav),
      tiles:[...grid.querySelectorAll('button')].map(rect),
      cover:[...offers.querySelectorAll('button')].map(rect),
      navPosition:getComputedStyle(nav).position,
      heroBackground:getComputedStyle(pick('[class*="hero"]')).backgroundImage}
  })
}
for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true})
  try{
    for(const locale of ['ru','en','es'])for(const width of [320,390,430]){
      const label=engine.name()+'-'+locale+'-'+width
      const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,
        hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,true)
      const errors=[]
      page.on('pageerror',e=>errors.push(e.message))
      try{
        const response=await page.goto(origin+'/'+locale+'/practice',{waitUntil:'domcontentloaded',timeout:90000})
        assert.equal(response?.status(),200,label+' page HTTP')
        const root=page.locator('[data-practice-showcase]')
        await root.waitFor({state:'visible',timeout:30000})
        await page.waitForFunction(()=>document.querySelector('[data-practice-showcase]')?.dataset.authState==='signed',
          null,{timeout:30000})
        await page.evaluate(async()=>{await document.fonts.ready})
        await page.waitForTimeout(250)
        assert.equal(await root.locator('header h1').innerText(),headings[locale])
        assert.equal(await root.locator('[class*="quickGrid"] > button').count(),6)
        assert.equal(await root.locator('[class*="offerRail"] > button').count(),6)
        assert.equal(await root.locator('nav button').count(),5)
        assert.equal(await root.locator('[data-practice-after-google]').count(),0,label+' unexpected Continue panel')
        const g=await snapshot(page)
        assert.equal(g.url,'/'+locale+'/practice',label+' no ?ready or editor')
        assert.ok(g.scroll<=g.width+3,label+' horizontal overflow '+JSON.stringify(g))
        assert.ok(g.identity.bottom<=g.grid.y+3&&g.grid.bottom<=g.hero.y+3&&g.hero.bottom<=g.offers.y+3,
          label+' approved section order')
        assert.ok(g.identity.h<155&&g.grid.h<180&&g.hero.h>=180&&g.hero.h<320,
          label+' approved iPhone proportions '+JSON.stringify(g))
        assert.equal(g.navPosition,'fixed',label+' fixed bottom navigation')
        assert.ok(g.nav.bottom<=845&&g.nav.bottom>=805,label+' bottom tab bar')
        assert.ok(g.tiles.every(r=>r.x>=-3&&r.right<=g.width+3),label+' six tiles fit')
        assert.ok(g.cover.every(r=>r.x>=-3&&r.right<=g.width+3),label+' six covers fit')
        assert.ok(g.heroBackground.includes('url('),label+' real scenic hero asset')
        if(width===390)await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
        if(locale==='ru'&&width===390){
          await root.locator('[class*="quickGrid"] > button').first().click()
          await page.waitForURL(u=>u.pathname==='/ru/app/practice'&&
            u.searchParams.get('panel')==='services'&&u.searchParams.get('create')==='1',
            {timeout:30000})
        }
        assert.deepEqual(errors,[],label+' browser exceptions')
        results.push({label,ok:true,mode:'synthetic signed-in browser render'})
      }catch(e){
        await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
        throw new Error(label+': '+e.message,{cause:e})
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
