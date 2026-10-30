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
// "active" is required by AppWorkspace to render the REAL authenticated
// PracticeWorkspace; "complete" previously tested only the destination URL.
const bootstrap={account:{id:'synthetic-qa',onboardingState:'active'},results:[],runs:[],requests:[],consents:[],services:[]}
const practice={practitioner:{id:'synthetic-practitioner',status:'approved',
  profile:{displayName:'Synthetic Practitioner'},draftProfile:{displayName:'Synthetic Practitioner'}},
  practiceActivated:true,serviceQuota:{canAdd:true,used:0,limit:10},
  newServices:{recent:[]},services:[],requests:[]}
function respond(route,status,body){
  // WebKit enforces CORS for intercepted navigation-time requests as well.
  // This allowance exists ONLY in the synthetic loopback fixture; never in
  // the application's real authenticated API response headers.
  return route.fulfill({status,contentType:'application/json',
    headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true',
      vary:'Origin'},body:JSON.stringify(body)})
}
async function api(page,signed,services=[]){
  await page.route('**/api/app/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(!signed)return respond(route,401,{error:'UNAUTHORIZED'})
    if(path==='/api/app/bootstrap')return respond(route,200,bootstrap)
    if(path==='/api/app/practice')return respond(route,200,{...practice,services,serviceQuota:{...practice.serviceQuota,used:services.length}})
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
        if(width===390||locale==='ru'){
          // The previous test stopped at waitForURL here, so it never saw
          // the oversized private service composer shown in the owner's image.
          await page.evaluate(()=>{window.__publicPracticeDocumentMarker='showcase'})
          await root.locator('[class*="quickGrid"] > button').first().click()
          // The public ES showcase deliberately routes its protected editor to
          // the currently supported EN cabinet, never the unsupported ES app URL.
          // This preserves actual server auth; it is not a synthetic shortcut.
          const protectedLocale=locale==='es'?'en':locale
          await page.waitForURL(u=>u.pathname==='/'+protectedLocale+'/app/practice'&&
            u.searchParams.get('panel')==='services'&&u.searchParams.get('create')==='1',
            {timeout:30000})
          assert.equal(new URL(page.url()).pathname,'/'+protectedLocale+'/app/practice',
            label+' real server-supported protected editor locale')
          assert.equal(await page.evaluate(()=>window.__publicPracticeDocumentMarker),undefined,
            label+' protected view uses a fresh document, not a fragile Next SPA chunk transition')
          const editor=page.locator('[data-service-slide-editor]')
          await editor.waitFor({state:'visible',timeout:45000})
          assert.equal(await editor.getAttribute('data-service-stage'),'0',label+' opens stage one')
          assert.equal(await editor.locator('[data-service-stage-nav] button').count(),3,
            label+' three real editor steps')
          const title=await page.locator('.hh-practice-inner-heading h2').innerText()
          assert.match(title,/Новая услуга|Create service|Crear servicio/,
            label+' not a duplicate list header')
          const layout=await page.evaluate(()=>{
            const rect=el=>{const r=el.getBoundingClientRect();return {
              x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
            const footer=document.querySelector('[data-service-editor-footer]')
            const fee=document.querySelector('.hh-practice-fee-notice')
            const buttons=[...document.querySelectorAll('[data-service-stage-nav] button')]
            const labels=buttons.map(b=>{const node=b.querySelector('strong');return {
              text:node?.textContent||'',clientWidth:node?.clientWidth||0,
              scrollWidth:node?.scrollWidth||0,clientHeight:node?.clientHeight||0,
              scrollHeight:node?.scrollHeight||0}})
            return {viewportWidth:document.documentElement.clientWidth,
              scrollWidth:document.documentElement.scrollWidth,footer:rect(footer),
              footerPosition:getComputedStyle(footer).position,feeHidden:!fee||
                getComputedStyle(fee).display==='none',
              labels,photo:rect(document.querySelector('[class*="photoCanvas"]'))}
          })
          assert.ok(layout.scrollWidth<=layout.viewportWidth+3,label+' no horizontal overflow '+JSON.stringify(layout))
          assert.equal(layout.footerPosition,'fixed',label+' visible fixed controls')
          assert.ok(layout.footer.bottom>=834&&layout.footer.bottom<=845,
            label+' Save/Next actually rests at the iPhone bottom '+JSON.stringify(layout.footer))
          assert.ok(layout.footer.height>=104&&layout.footer.height<170,label+' two-row Save/Continue footer height')
          assert.ok(layout.feeHidden,label+' no commission card under the wizard')
          assert.ok(layout.labels.every(x=>x.scrollWidth<=x.clientWidth+2&&x.scrollHeight<=x.clientHeight+2),
            label+' no truncated three-step headings '+JSON.stringify(layout.labels))
          assert.ok(layout.photo.height>=260&&layout.photo.height<=330,label+' owner-approved scenic service cover fits mobile '+JSON.stringify(layout.photo))
          if(width===390)await page.screenshot({
            path:out+'/'+engine.name()+'-'+locale+'-390-service-editor.png',fullPage:false})
          // SSR markup can be visible before React event handlers are ready.
          // Require hydration of BOTH the input and Next button, then exercise
          // the real protected editor. Never count visible SSR alone as E2E.
          await page.waitForFunction(() => {
            const form=document.querySelector('[data-service-slide-editor]')
            const field=form?.querySelector('[data-service-slide="presentation"] input[type="text"]')
            const next=form?.querySelector('[data-service-step-controls] button:last-child')
            const hydrated=node=>Boolean(node && Object.keys(node)
              .some(key=>key.startsWith('__reactProps$')))
            return hydrated(field) && hydrated(next)
          },null,{timeout:30000})
          // Photo controls must work, not merely resemble the owner's mockup.
          assert.equal(await editor.locator('[data-service-gallery-strip]').count(),1,label+' real photo strip')
          assert.equal(await editor.locator('[data-service-goals]').count(),1,label+' goal chips on first screen')
          const photoToggle=editor.locator('[data-service-visual-canvas] button[aria-expanded]').first()
          await photoToggle.click()
          await editor.locator('[data-service-photo-tools]').waitFor({state:'visible'})
          await editor.locator('[data-service-photo-tools] button').first().click()
          await editor.locator('[data-service-photo-tools]').waitFor({state:'hidden'})
          const input=editor.locator('[data-service-slide="presentation"] input[type=text]').first()
          await input.fill('Synthetic service title')
          // Regression: blur must not teleport the fixed footer before pointerup.
          const focusedFooter=await page.evaluate(()=>{
            const footer=document.querySelector('[data-service-editor-footer]')
            const box=footer.getBoundingClientRect()
            return {position:getComputedStyle(footer).position,active:document.activeElement?.tagName,
              bottom:box.bottom,viewport:document.documentElement.clientHeight}
          })
          assert.equal(focusedFooter.active,'INPUT',label+' input focus before Next')
          assert.equal(focusedFooter.position,'fixed',label+' focused footer does not teleport')
          assert.ok(Math.abs(focusedFooter.viewport-focusedFooter.bottom)<=12,
            label+' focused footer remains at mobile viewport bottom '+JSON.stringify(focusedFooter))
          await page.evaluate(()=>{
            window.__practiceEditorClickTrace=[]
            document.addEventListener('click',event=>{
              if(event.target.closest('[data-service-step-controls]'))
                window.__practiceEditorClickTrace.push(event.target.closest('button')?.textContent?.trim())
            },true)
          })
          await editor.locator('[data-service-step-controls] button').last().click()
          await page.waitForTimeout(300)
          console.log('PROTECTED_EDITOR_NEXT_DIAG '+JSON.stringify(await page.evaluate(()=>({
            pathname:location.pathname+location.search,
            formCount:document.querySelectorAll('[data-service-slide-editor]').length,
            stages:[...document.querySelectorAll('[data-service-slide-editor]')].map(el=>el.dataset.serviceStage),
            activeStep:document.querySelector('[data-service-stage-nav] button[aria-pressed=true]')?.textContent,
            buttons:[...document.querySelectorAll('[data-service-step-controls] button')].map(btn=>({
              text:btn.textContent?.trim(),disabled:btn.disabled,connected:btn.isConnected})),
            clicks:window.__practiceEditorClickTrace,
            inputs:[...document.querySelectorAll('[data-service-slide="presentation"] input')].map(e=>e.value),
          }))))
          await page.waitForFunction(()=>document.querySelector('[data-service-slide-editor]')
            ?.getAttribute('data-service-stage')==='1',null,{timeout:10000})
          assert.equal(await editor.getAttribute('data-service-stage'),'1',label+' Next opens booking')
          assert.equal(await editor.locator('[data-service-duration] button').count(),4,label+' real duration choices')
          await editor.locator('[data-service-duration] button').filter({hasText:'60 min'}).click()
          assert.equal(await editor.locator('[data-service-duration] button[aria-pressed="true"]').count(),1,
            label+' duration selection is interactive')
          await editor.locator('[data-service-step-controls] button').last().click()
          await page.waitForFunction(()=>document.querySelector('[data-service-slide-editor]')
            ?.getAttribute('data-service-stage')==='2',null,{timeout:10000})
          assert.equal(await editor.locator('[data-service-slide="details"]').count(),1,
            label+' third step has real details')
          assert.equal(await editor.locator('[data-service-detail-accordions] > details').count(),5,
            label+' five functional disclosure rows')
          await editor.locator('[data-service-advanced-details] summary').click()
          assert.equal(await editor.locator('[data-service-advanced-details]').getAttribute('open'),'',
            label+' full-description accordion opens')
          await editor.locator('[data-service-step-controls] button').first().click()
          await page.waitForFunction(()=>document.querySelector('[data-service-slide-editor]')
            ?.getAttribute('data-service-stage')==='1',null,{timeout:10000})
          await editor.locator('[data-service-step-controls] button').first().click()
          await page.waitForFunction(()=>document.querySelector('[data-service-slide-editor]')
            ?.getAttribute('data-service-stage')==='0',null,{timeout:10000})
          assert.equal(await editor.getAttribute('data-service-stage'),'0',label+' Back preserves step')
          assert.equal(await input.inputValue(),'Synthetic service title',
            label+' unsaved title stays in form when navigating stages')
          results.push({label:engine.name()+'-'+locale+'-'+width+'-real-editor',ok:true,
            mode:'rendered protected real wizard, synthetic account only',layout})
        }
        const fixtureCors=engine.name()==='webkit'&&errors.length===2&&
          errors.includes('[object Event]')&&
          errors.some(message=>message.includes('/api/app/bootstrap due to access control checks.'))
        if(fixtureCors)console.log(label+' synthetic fixture bootstrap CORS diagnostic (not production)')
        assert.deepEqual(fixtureCors?[]:errors,[],label+' browser exceptions')
        results.push({label,ok:true,mode:'synthetic signed-in browser render'})
      }catch(e){
        await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
        throw new Error(label+': '+e.message,{cause:e})
      }finally{await page.close()}
    }

    // Approved photo-led My Services must render ACTUAL record fields, not
    // screenshot sample prices/names. These values exist only in this fixture.
    const sampleServices=[
      {id:'11111111-1111-4111-8111-111111111111',slug:'synthetic-session',practitionerSlug:'synthetic-master',
        status:'published',revision:1,areaKey:'energy_spiritual',deliveryFormat:'online',
        durationMinutes:60,pricingMode:'fixed',confirmedPrice:37,currency:'EUR',
        localizedCopy:{ru:{title:'Тестовая услуга',shortDescription:'Синтетическое описание для CI'},
          en:{title:'Synthetic service',shortDescription:'Browser test only'}},
        draftCopy:{copy:{ru:{title:'Тестовая услуга',shortDescription:'Синтетическое описание для CI'},
          en:{title:'Synthetic service',shortDescription:'Browser test only'}},
          deliveryFormat:'online',durationMinutes:60,pricingMode:'fixed',confirmedPrice:37,currency:'EUR'},
        photos:[]},
      {id:'22222222-2222-4222-8222-222222222222',slug:'draft-test',practitionerSlug:'synthetic-master',
        status:'draft',revision:1,areaKey:'relationships',deliveryFormat:'hybrid',
        durationMinutes:90,pricingMode:'contact',confirmedPrice:null,currency:'',
        localizedCopy:{ru:{title:'Синтетический черновик'},en:{title:'Synthetic draft'}},
        draftCopy:{copy:{ru:{title:'Синтетический черновик',shortDescription:'Не опубликовано'},
          en:{title:'Synthetic draft',shortDescription:'Private test draft'}},
          deliveryFormat:'hybrid',durationMinutes:90,pricingMode:'contact'},
        photos:[]},
    ]
    for(const locale of ['ru','en'])for(const width of locale==='ru'?[320,390,430,768]:[390,1440]){
      const label=engine.name()+'-'+locale+'-'+width+'-service-list'
      const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,
        hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,true,sampleServices)
      try{
        const response=await page.goto(origin+'/'+locale+'/app/practice?panel=services',
          {waitUntil:'domcontentloaded',timeout:90000})
        assert.equal(response?.status(),200,label+' protected route response')
        await page.locator('[data-service-card-list]').waitFor({state:'visible',timeout:45000})
        assert.equal(await page.locator('[data-service-list-item]').count(),2,label+' two genuine synthetic service cards')
        const layout=await page.evaluate(()=>({
          viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
          cards:[...document.querySelectorAll('[data-service-list-item]')].map(el=>{
            const a=el.getBoundingClientRect()
            const photo=el.querySelector('[data-service-cover]').getBoundingClientRect()
            return {left:a.left,right:a.right,width:a.width,photoHeight:photo.height}
          }),
        }))
        assert.ok(layout.scroll<=layout.viewport+3,label+' no horizontal overflow '+JSON.stringify(layout))
        assert.ok(layout.cards.every(x=>x.left>=-3&&x.right<=layout.viewport+3&&x.photoHeight>=120),
          label+' full-width image led cards '+JSON.stringify(layout))
        assert.match(await page.locator('[data-service-list-item]').first().innerText(),
          /37|37,00|€37/,label+' record price, not mock €100')
        assert.equal(await page.locator('[data-service-list-item]').first().locator('a[href*="synthetic-session"]').count(),1,
          label+' published record has real details link')
        assert.equal(await page.locator('[data-service-list-item]').last().locator('a').count(),0,
          label+' draft has no public link')
        if(width===390)await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
        await page.locator('[data-service-list-item]').last().locator('[data-service-edit-action]').click()
        await page.locator('[data-service-slide-editor]').waitFor({state:'visible',timeout:20000})
        if(width>=651){
          const scene=await page.evaluate(()=>{
            const rect=selector=>{const el=document.querySelector(selector);const b=el.getBoundingClientRect();
              return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}}
            return {photo:rect('[class*="photoCanvas"]'),gallery:rect('[data-service-gallery-strip]'),
              content:rect('[class*="contentCanvas"]'),scroll:document.documentElement.scrollWidth,
              viewport:document.documentElement.clientWidth}
          })
          assert.ok(scene.photo.right<=scene.content.x+4,label+' desktop photo is left of editable content '+JSON.stringify(scene))
          assert.ok(scene.gallery.y>=scene.photo.bottom-5,label+' desktop photo thumbnails sit below cover '+JSON.stringify(scene))
          assert.ok(scene.scroll<=scene.viewport+3,label+' desktop editor has no horizontal overflow')
        }
        assert.equal(await page.locator('[data-service-slide-editor]').getAttribute('data-service-stage'),'0',
          label+' same private editor, no duplicate route')
        results.push({label,ok:true,mode:'real protected component with synthetic records only',layout})
      }finally{await page.close()}
    }

    // Historical bookmarked OAuth links must never recreate the large
    // "Continue: Create" panel in the approved practitioner screenshot.
    for(const locale of ['ru','en','es']){
      const label=engine.name()+'-'+locale+'-stale-ready'
      const page=await browser.newPage({viewport:{width:390,height:844},
        hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'})
      await api(page,true)
      try{
        const response=await page.goto(origin+'/'+locale+'/practice?ready=create',{waitUntil:'domcontentloaded'})
        assert.equal(response?.status(),200,label+' HTTP')
        await page.waitForFunction(()=>document.querySelector('[data-practice-showcase]')?.dataset.authState==='signed')
        await page.waitForFunction(()=>!location.search)
        assert.equal(await page.locator('[data-practice-after-google]').count(),0,label+' no continuation banner')
        assert.equal(await page.locator('[class*="quickGrid"] > button').count(),6,label+' six first-screen creation tiles')
        results.push({label,ok:true,mode:'synthetic legacy OAuth URL cleanup'})
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
        await page.locator('[class*="quickGrid"] > button').first().click()
        await page.locator('button[class*="modalPrimary"]').click()
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
