// Synthetic guest and signed-in browser acceptance for the same Work/My Space
// mobile hierarchy as Live. Never uses private profile/health/real-account data.
// Browser screenshots/overlays are visual evidence only when this script runs.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright')
const origin = process.env.HH_PRACTICE_QA_ORIGIN || 'http://127.0.0.1:3119'
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error('Synthetic browser test requires loopback')
const out = 'artifacts/practice-visual'
await mkdir(out, { recursive:true })

const bootstrap = {
  account:{id:'synthetic-practice-qa-account',onboardingState:'complete'},
  results:[],runs:[],requests:[],consents:[],services:[],
}
const practitioner = {
  practitioner:{profile:{displayName:''},draftProfile:{displayName:''}},
  services:[],requests:[],
}
const title={en:'My Space',ru:'Моё пространство',es:'Mi espacio'}
const reply=(route,status,data)=>route.fulfill({
  status,contentType:'application/json',body:JSON.stringify(data),
})
const report=[]
const measure=page=>page.evaluate(()=>{
  const root=document.querySelector('[data-practice-showcase]')
  const rect=el=>{
    if(!el)return null
    const r=el.getBoundingClientRect()
    return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}
  }
  const el=selector=>root?.querySelector(selector)
  const all=selector=>[...root.querySelectorAll(selector)].map(rect)
  const video=el('[data-work-video-hero] video')
  // The unified seven-item dock is the only visible navigation on public Work.
  // The legacy five-item Practice nav remains in the DOM but is hidden by the shell.
  const bottom=document.querySelector('[data-hh-unified-dock]')
  return {
    viewport:document.documentElement.clientWidth,
    documentWidth:document.documentElement.scrollWidth,
    state:root.dataset.authState,
    heading:el('[data-practice-workspace-heading] h2')?.textContent?.trim(),
    header:rect(el('[data-practice-workspace-heading]')),
    switch:rect(el('[data-profile-mode-switch]')),
    tabs:rect(el('[data-work-profile-tabs]')),
    tabRects:all('[data-work-profile-tab]'),
    hero:rect(el('[data-work-video-hero]')),
    video:rect(video),
    videoPoster:video?.getAttribute('poster'),
    videoObjectFit:video?getComputedStyle(video).objectFit:null,
    actions:rect(el('[data-work-profile-quick-actions]')),
    actionRects:all('[data-work-quick-action]'),
    identity:rect(el('[class*="identity"]')),
    grid:rect(el('[class*="quickGrid"]')),
    tileRects:all('[class*="quickGrid"] > button'),
    offers:rect(el('[class*="offers"]')),
    offerRects:all('[class*="offerRail"] > button'),
    dock:rect(bottom),
    dockPosition:bottom?getComputedStyle(bottom).position:'missing',
  }
})

for(const browserType of [chromium,webkit]){
  const browser=await browserType.launch({headless:true})
  try{
    for(const locale of ['ru','en','es']){
      const cases=[
        ...[320,354,390,430].map(width=>({width,session:'guest',ready:false})),
        {width:390,session:'synthetic-signed',ready:false},
      ]
      if(locale==='ru')cases.push({width:390,session:'synthetic-signed',ready:true})
      for(const item of cases){
        const label=[browserType.name(),locale,item.width,item.session,item.ready?'ready':'home'].join('-')
        const page=await browser.newPage({
          viewport:{width:item.width,height:844},deviceScaleFactor:1,
          isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block',
        })
        const errors=[]
        page.on('pageerror',error=>errors.push(error.message))
        await page.route('**/api/app/**',async route=>{
          const path=new URL(route.request().url()).pathname
          if(path==='/api/app/auth/providers')
            return reply(route,200,{google:true,telegram:true})
          if(item.session==='guest')return reply(route,401,{error:'UNAUTHORIZED'})
          if(path==='/api/app/bootstrap')return reply(route,200,bootstrap)
          if(path==='/api/app/practice')return reply(route,200,practitioner)
          if(path==='/api/app/auth/contact-profile')return reply(route,200,{displayName:''})
          return reply(route,401,{error:'SYNTHETIC_FIXTURE_ONLY'})
        })
        try{
          const address=origin+'/'+locale+'/practice'+(item.ready?'?ready=service':'')
          const response=await page.goto(address,{waitUntil:'domcontentloaded',timeout:90000})
          assert.equal(response?.status(),200,label+' public Work page HTTP')
          const root=page.locator('[data-practice-showcase]')
          await root.waitFor({state:'visible',timeout:35000})
          const state=item.session==='guest'?'guest':'signed'
          await page.waitForFunction(expected=>document.querySelector('[data-practice-showcase]')?.dataset.authState===expected,
            state,{timeout:35000})
          await page.evaluate(async()=>{await document.fonts.ready})
          await page.waitForFunction(()=>[...document.querySelectorAll('[data-practice-showcase] img')].every(
            img=>img.complete&&img.naturalWidth>0),null,{timeout:20000})
          const g=await measure(page)
          assert.equal(g.state,state,label+' real auth-state distinction')
          assert.equal(g.heading,title[locale],label+' same My Space header as Live')
          assert.equal(await root.locator('[data-master-network-heading], [data-master-mode-switch]').count(),0,
            label+' no old Master Network masthead or double finder/share gate')
          assert.equal(await root.locator('[data-profile-mode="work"]').getAttribute('aria-current'),
            'page',label+' Work active in Profile switch')
          const myPage=root.locator('[data-work-my-page]')
          assert.equal(await myPage.getAttribute('href'),'/'+locale+'/my-page',
            label+' existing universal My Page entry remains reachable')
          assert.equal(await myPage.isVisible(),true,
            label+' My Page link is present for guest and owner')
          assert.equal(await root.locator('[data-profile-mode="live"]').getAttribute('href'),
            '/'+(locale==='es'?'en':locale)+'/app/portrait',label+' reversible Live link')
          assert.equal(await root.locator('[data-work-profile-tab]').count(),6,label+' six compact tabs before video')
          assert.equal(await root.locator('[data-work-profile-tab="today"]').getAttribute('aria-current'),
            'page',label+' initial Work/Today tab')
          assert.equal(await root.locator('[data-work-quick-action]').count(),4,
            label+' four actions immediately below video')
          assert.equal(await root.locator('[class*="quickGrid"] > button').count(),6,
            label+' existing six practitioner creation controls preserved')
          assert.equal(await root.locator('[class*="offerRail"] > button').count(),6,
            label+' existing six offering categories preserved')
          assert.equal(await root.locator('[data-legacy-practice-bottom-nav] button').count(),5,
            label+' legacy buttons preserved for the protected editor')
          assert.equal(await root.locator('[data-legacy-practice-bottom-nav]').isVisible(),false,
            label+' old five-button dock must not visually duplicate the unified dock')
          const unifiedDock=page.locator('[data-hh-unified-dock]')
          await unifiedDock.waitFor({state:'visible',timeout:15000})
          assert.equal(await unifiedDock.locator('[data-unified-dock-item]').count(),7,
            label+' visible sitewide seven-button dock')
          assert.equal(await unifiedDock.locator('[data-unified-dock-item="profile"]').getAttribute('aria-current'),
            'page',label+' Profile selected on public Work')
          const video=root.locator('[data-work-video-hero] video')
          assert.equal(await video.count(),1,label+' actual accessible scenic film')
          assert.match(await video.locator('source').getAttribute('src'),/sun-autumn-hills\.mp4/,
            label+' exact shared Live film')
          assert.match(g.videoPoster||'',/sun-autumn-hills\.jpg/,label+' real film poster')
          assert.equal(g.videoObjectFit,'cover',label+' shared visual crop')
          for(const key of ['header','switch','tabs','hero','video','actions','identity','grid','offers','dock'])
            assert.ok(g[key]&&g[key].width>0,label+' missing region '+key+': '+JSON.stringify(g))
          assert.ok(g.header.bottom<=g.tabs.y+3&&g.tabs.bottom<=g.hero.y+3,
            label+' Work header → six tabs → video')
          assert.ok(g.video.bottom<=g.actions.y+3&&g.actions.bottom<=g.identity.y+3,
            label+' film → four actions → practitioner tools')
          assert.ok(g.identity.bottom<=g.grid.y+3&&g.grid.bottom<=g.offers.y+3,
            label+' profile → six service-creation tiles → offers')
          assert.ok(g.hero.height>150&&g.hero.height<330,label+' same mobile video proportions')
          assert.ok(g.documentWidth<=g.viewport+3,label+' unexpected horizontal overflow: '+JSON.stringify(g))
          for(const [name,rects] of [
            ['tabs',g.tabRects],['quick',g.actionRects],['tiles',g.tileRects],['offers',g.offerRects]
          ])assert.ok(rects.every(r=>r.width>0&&r.x>=-3&&r.right<=g.viewport+3),
            label+' '+name+' controls clipped off screen')
          assert.equal(g.dockPosition,'fixed',label+' existing unified dock remains fixed')
          if(item.width===390&&!item.ready){
            await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
            await page.screenshot({path:out+'/'+label+'-full.png',fullPage:true})
          }
          if(item.ready){
            await page.waitForURL(url=>url.pathname==='/'+locale+'/practice'&&!url.search,{timeout:10000})
            assert.equal(await root.locator('[data-practice-after-google]').count(),0,
              label+' no extra post-OAuth banner above new header')
            await root.locator('[data-work-quick-action="service"]').click()
            await page.waitForURL(url=>url.pathname==='/'+locale+'/app/practice'&&
              url.searchParams.get('panel')==='services'&&url.searchParams.get('create')==='1',
              {timeout:35000})
          }else if(item.session==='guest'&&item.width===390){
            await root.locator('[data-work-quick-action="service"]').click()
            const dialog=root.getByRole('dialog')
            await dialog.waitFor({state:'visible',timeout:5000})
            await dialog.getByRole('button',{name:/Telegram/i}).waitFor({state:'visible',timeout:5000})
            await dialog.locator('button').last().click()
            await dialog.waitFor({state:'hidden',timeout:5000})
            assert.ok(page.url().endsWith('/'+locale+'/practice'),
              label+' cancel leaves guest in Work without editor')
            await root.locator('[data-work-profile-tab="requests"]').click()
            await dialog.waitFor({state:'visible',timeout:5000})
            await page.keyboard.press('Escape')
            await dialog.waitFor({state:'hidden',timeout:5000})
          }
          assert.deepEqual(errors,[],label+' no browser runtime exceptions')
          report.push({label,ok:true,geometry:g,fixture:'synthetic, no real OAuth or provider'})
        }catch(error){
          await page.screenshot({path:out+'/failure-'+label+'.png',fullPage:false}).catch(()=>{})
          throw new Error(label+': '+error.message,{cause:error})
        }finally{await page.close()}
      }
    }
  }finally{await browser.close()}
}
await writeFile(out+'/manifest.json',JSON.stringify({
  kind:'synthetic Work visual and route acceptance; not real auth/DB or physical Safari E2E',
  origin,cases:report,
},null,2)+'\n')
console.log('Work/Live compact hierarchy, 6+4 actions and OAuth gate: '+report.length+' browser cases passed')
