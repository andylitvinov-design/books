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
const title={en:'Practitioner Profile',ru:'Профиль мастера',es:'Perfil profesional'}
const reply=(route,status,data)=>route.fulfill({
  status,contentType:'application/json',body:JSON.stringify(data),
})
const report=[]

const measure=page=>page.evaluate(()=>{
  const root=document.querySelector('[data-practice-showcase]')
  const el=selector=>root?.querySelector(selector)
  const rect=node=>{
    if(!node)return null
    const r=node.getBoundingClientRect()
    return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}
  }
  const dock=document.querySelector('[data-hh-unified-dock]')
  return {
    viewport:document.documentElement.clientWidth,
    documentWidth:document.documentElement.scrollWidth,
    state:root?.dataset.authState,
    heading:el('[data-work-profile-scenic-hero] h1')?.textContent?.trim(),
    header:rect(el('[data-practice-workspace-heading]')),
    language:rect(el('[data-profile-language-switch]')),
    modes:rect(el('[data-profile-mode-switch]')),
    hero:rect(el('[data-work-profile-scenic-hero]')),
    service:rect(el('[data-work-primary-action="services"]')),
    grid:rect(el('[data-work-primary-grid]')),
    cards:[...root.querySelectorAll('[data-work-primary-grid] [data-work-card]')].map(rect),
    reports:rect(el('[data-work-card="reports"]')),
    account:rect(el('[data-work-account-actions]')),
    create:rect(el('[data-work-create-buttons]')),
    dock:rect(dock),
    dockPosition:dock?getComputedStyle(dock).position:'missing'
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

          const g=await measure(page)
          assert.equal(g.state,state,label+' real auth-state distinction')
          assert.equal(g.heading,title[locale],label+' scenic Work heading')
          assert.equal(await root.locator('[data-master-network-heading],[data-master-mode-switch]').count(),0,
            label+' no legacy double master header')
          assert.equal(await root.locator('[data-profile-mode="work"]').getAttribute('aria-current'),
            'page',label+' Work active')
          assert.equal(await root.locator('[data-profile-mode="live"]').getAttribute('href'),
            '/'+(locale==='es'?'en':locale)+'/my-page',label+' reversible My Page')
          assert.equal(await root.locator('[data-work-home-link]').getAttribute('href'),
            '/'+locale,label+' public Holistic House wordmark')
          assert.equal(await root.locator('[data-work-primary-grid] button').count(),4,
            label+' four functional core cards')
          for(const key of ['requests','clients','courseList','materials'])
            assert.equal(await root.locator('[data-work-card="'+key+'"]').count(),1,label+' '+key)
          assert.equal(await root.locator('[data-work-card="reports"]').count(),1,label+' reports action')
          assert.equal(await root.locator('[data-work-create-buttons] > button').count(),4,
            label+' four visible creation shortcuts')
          assert.equal(await root.locator('[data-work-create-tools]').isVisible(),false,
            label+' additional creation types initially hidden')
          assert.equal(await root.locator('[data-work-more-tools]').getAttribute('open'),null,
            label+' secondary tool grid hidden by default')
          assert.equal(await root.locator('[data-work-create-tools] > button').count(),
            3,label+' three further creation types retained, six in total')
          assert.equal(await root.locator('[data-work-more-tools] [class*="offerRail"] > button').count(),
            6,label+' six category links retained')
          assert.equal(await root.locator('[data-work-my-page]').getAttribute('href'),
            '/'+locale+'/my-page',label+' personal page retained')
          assert.equal(await root.locator('[data-work-settings]').count(),1,
            label+' separate account settings retained')
          assert.equal(await root.locator('[data-legacy-practice-bottom-nav] button').count(),
            5,label+' original legacy editor nav retained')
          assert.equal(await root.locator('[data-legacy-practice-bottom-nav]').isVisible(),false,
            label+' legacy nav is visually hidden')
          const unifiedDock=page.locator('[data-hh-unified-dock]')
          await unifiedDock.waitFor({state:'visible',timeout:15000})
          assert.equal(await unifiedDock.locator('[data-unified-dock-item]').count(),7,
            label+' shared seven-button navigation retained')
          assert.equal(await unifiedDock.locator('[data-unified-dock-item="profile"]').getAttribute('aria-current'),
            'page',label+' Profile selected')
          const localeNav=root.locator('[data-practice-workspace-heading] [data-profile-language-switch]')
          assert.equal(await localeNav.locator('a').count(),3,label+' EN/RU/ES options')
          for(const language of ['ru','en','es'])
            assert.equal(await localeNav.locator('a[lang="'+language+'"]').getAttribute('href'),
              '/'+language+'/practice',label+' language route')
          for(const key of ['header','language','modes','hero','service','grid','reports','account','create','dock'])
            assert.ok(g[key]&&g[key].width>0,label+' missing region '+key+': '+JSON.stringify(g))
          assert.ok(g.header.bottom<=g.modes.y+4&&g.modes.bottom<=g.hero.y+4,
            label+' header → mode → scenic hero')
          assert.ok(g.hero.bottom<=g.grid.y+4&&g.grid.bottom<=g.reports.y+4,
            label+' scenic hero → four cards → reports')
          assert.ok(g.reports.bottom<=g.account.y+80&&g.account.bottom<=g.create.y+4,
            label+' reports → paired account cards → four creations')
          assert.ok(g.hero.height>=220&&g.hero.height<=370,label+' mobile hero size')
          assert.equal(g.cards.length,4,label+' measured cards')
          for(const item of g.cards)
            assert.ok(item.width>0&&item.x>=-3&&item.right<=g.viewport+3,
              label+' card clipped on phone')
          assert.ok(g.documentWidth<=g.viewport+3,
            label+' unexpected horizontal overflow: '+JSON.stringify(g))
          assert.equal(g.dockPosition,'fixed',label+' global dock fixed')
          assert.equal(await root.locator('[data-work-presentation-disclosure] [data-profile-video-hero]').count(),0,
            label+' no heavy player mounted on first paint')
          assert.equal(await root.locator('[data-work-presentation-disclosure] > button').isVisible(),
            false,label+' presentation stays inside collapsed secondary tools')
          if(item.width===390&&!item.ready){
            await page.screenshot({path:out+'/'+label+'.png',fullPage:false})
            await page.screenshot({path:out+'/'+label+'-full.png',fullPage:true})
          }
          if(item.ready){
            await page.waitForURL(url=>url.pathname==='/'+locale+'/practice'&&!url.search,{timeout:10000})
            assert.equal(await root.locator('[data-practice-after-google]').count(),0,
              label+' no post-OAuth displacement')
            await root.locator('[data-work-create-button="service"]').click()
            await page.waitForURL(url=>url.pathname==='/'+locale+'/app/practice'&&
              url.searchParams.get('panel')==='services'&&url.searchParams.get('create')==='1',
              {timeout:35000})
          }else if(item.session==='guest'&&item.width===390){
            await root.locator('[data-work-primary-action="services"]').click()
            const dialog=root.getByRole('dialog')
            await dialog.waitFor({state:'visible',timeout:5000})
            await dialog.getByRole('button',{name:/Telegram/i}).waitFor({state:'visible',timeout:5000})
            await dialog.locator('button').last().click()
            await dialog.waitFor({state:'hidden',timeout:5000})
            await root.locator('[data-work-card="requests"]').click()
            await dialog.waitFor({state:'visible',timeout:5000})
            await page.keyboard.press('Escape')
            await dialog.waitFor({state:'hidden',timeout:5000})
            await root.locator('[data-work-more-tools] > summary').click()
            const videoToggle=root.locator('[data-work-presentation-disclosure] > button')
            await videoToggle.click()
            const video=root.locator('[data-work-presentation-disclosure] [data-profile-video-hero]')
            await video.waitFor({state:'visible',timeout:15000})
            if(locale==='ru'||locale==='en'){
              const presentation=video.locator('[data-profile-presentation-locale]')
              assert.equal(await presentation.count(),1,label+' requested real presentation player')
              assert.equal(await presentation.getAttribute('data-profile-presentation-locale'),
                locale,label+' media locale aligned')
            }else{
              assert.equal(await video.locator('video').count(),1,label+' ES scenic fallback')
              assert.match(await video.locator('source').getAttribute('src'),
                /sun-autumn-hills\.mp4/,label+' real scenic source')
            }
            await videoToggle.click()
            assert.equal(await video.count(),0,label+' closed video unmounted')
            const targetLanguage=locale==='ru'?'en':'ru'
            await localeNav.locator('summary').click()
            await localeNav.locator('a[lang="'+targetLanguage+'"]').click()
            await page.waitForURL(url=>url.pathname==='/'+targetLanguage+'/practice',{timeout:35000})
            assert.equal(await page.locator('[data-practice-showcase] [role="dialog"]:visible').count(),0,
              label+' guest language change does not require sign-in')
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
console.log('Work scenic dashboard, 4+6 actions and OAuth gate: '+report.length+' browser cases passed')
