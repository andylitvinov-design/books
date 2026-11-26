#!/usr/bin/env node
// Render the public installation route. The browser event fixture never installs an OS app.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.argv[2]||'http://127.0.0.1:3098'
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/,'Only a local CI app may be tested')
const output='artifacts/holistic-house-install'
mkdirSync(output,{recursive:true})
const iphoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
const embeddedUA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ChatGPT/1.2026'
const androidUA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const cases=[
  ...[320,354,390,430].map(width=>({engine:'webkit',locale:'ru',width,device:'ios'})),
  {engine:'webkit',locale:'en',width:390,device:'ios'},
  {engine:'webkit',locale:'es',width:390,device:'ios'},
  {engine:'chromium',locale:'ru',width:390,device:'ios'},
  {engine:'webkit',locale:'ru',width:390,device:'ios',embedded:true},
  {engine:'webkit',locale:'ru',width:390,device:'ios',standalone:true},
  {engine:'chromium',locale:'ru',width:390,device:'android'},
]
const available={}
for(const platform of ['android','ios']){
  const response=await fetch(new URL('/api/native-download/'+platform,origin),{redirect:'manual'})
  assert.ok([302,404].includes(response.status),'Native endpoint must reject a pending release or redirect to the approved release')
  assert.match(response.headers.get('cache-control')||'',/no-store/)
  if(response.status===404){
    assert.equal((await response.json()).error,'native_'+platform+'_release_not_published')
  }else{
    const target=new URL(response.headers.get('location'))
    assert.equal(target.protocol,'https:')
    assert.equal(target.hostname,platform==='ios'?'apps.apple.com':'github.com')
  }
  available[platform]=response.status===302
}

async function verifyLayout(page,main,item){
  const controls=main.locator('a[href]:visible, button:visible')
  assert.equal(await controls.count(),1,'One visible primary action')
  const geometry=await controls.first().evaluate(element=>{
    const r=element.getBoundingClientRect()
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,
      viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,
      unobstructed:element===hit||element.contains(hit)}
  })
  assert.ok(geometry.height>=44,'Primary action must be thumb-sized')
  assert.ok(geometry.top>=0&&geometry.bottom<=geometry.viewportHeight,'Entire action must fit on first screen')
  assert.ok(geometry.left>=0&&geometry.right<=item.width+1&&geometry.documentWidth<=item.width+1,'No horizontal overflow')
  assert.equal(geometry.unobstructed,true,'Primary action must accept pointer input')
  assert.equal(await page.locator('[data-hh-unified-dock]:visible, .mobile-bottom-navigation:visible, [data-hh-ihelp-trigger]:visible, [data-sitewide-antistress-banner]:visible').count(),0,'No competing site chrome on installation')
  return geometry
}

async function offer(page,outcome){
  // Exercise the real registration handler and user click, supplying only the OS-owned event.
  await page.evaluate(result=>{
    const event=new Event('beforeinstallprompt',{cancelable:true})
    event.prompt=()=>{window.installCalls=(window.installCalls||0)+1}
    event.userChoice=Promise.resolve({outcome:result})
    window.dispatchEvent(event)
    if(!event.defaultPrevented)throw Error('Production registration did not capture the browser offer')
  },outcome)
}

const evidence=[]
for(const [engineName,engine] of Object.entries({webkit,chromium})){
  const browser=await engine.launch()
  try{
    for(const item of cases.filter(x=>x.engine===engineName)){
      const ctx=await browser.newContext({viewport:{width:item.width,height:item.width===320?568:844},deviceScaleFactor:1,
        isMobile:true,hasTouch:true,userAgent:item.device==='android'?androidUA:item.embedded?embeddedUA:iphoneUA,
        reducedMotion:'reduce',serviceWorkers:'block'})
      try{
        if(item.standalone)await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}))
        const page=await ctx.newPage(),errors=[]
        page.on('pageerror',error=>errors.push(error.message))
        const status=await page.goto(origin+'/'+item.locale+'/install',{waitUntil:'load',timeout:60000})
        assert.equal(status?.status(),200)
        const main=page.locator('main[data-hh-free-install-landing]')
        assert.equal(await main.getByRole('heading',{level:1}).innerText(),'Holistic House')
        await main.locator('[data-hh-install-platform="'+item.device+'"]').waitFor({state:'visible'})
        const home=main.locator('a[href="/'+item.locale+'"]')
        const prompt=main.locator('button[data-hh-install-action]')
        const steps=main.locator('[data-hh-ios-quicksteps]')
        const nativeLinks=main.locator('a[href^="/api/native-download/"]')
        if(item.standalone){
          await home.waitFor({state:'visible'})
          assert.match(await main.locator('[aria-live]').innerText(),/установлено/i)
          assert.equal(await steps.count(),0)
          assert.equal(await nativeLinks.count(),0)
        }else if(available[item.device]){
          await main.locator('a[href="/api/native-download/'+item.device+'"]').waitFor({state:'visible'})
          assert.equal(await nativeLinks.count(),1,'Only the device-appropriate signed release is offered')
        }else{
          await home.waitFor({state:'visible'})
          assert.equal(await nativeLinks.count(),0,'Unapproved installers must not appear')
          if(item.device==='ios'){
            if(item.embedded){
              assert.match(await steps.innerText(),/Safari/i)
              assert.match(await steps.innerText(),/ChatGPT.*компас/i)
            }else{
              await steps.waitFor({state:'visible'})
              const localized={ru:/Поделиться/,en:/Share/i,es:/Compartir/i}
              assert.match(await steps.innerText(),localized[item.locale])
            }
            assert.equal(await prompt.count(),0,'Safari has no website-triggered installation prompt')
          }else{
            await main.getByText(/Chrome|⋮/i).first().waitFor({state:'visible'})
          }
        }
        assert.ok(await main.locator('img').evaluate(async icon=>{
          await icon.decode()
          return icon.naturalWidth>0
        }),'The app icon must be loaded before capturing the installation screen')
        const geometry=await verifyLayout(page,main,item)
        const name=[item.engine,item.locale,item.width,item.device,item.embedded?'embedded':item.standalone?'installed':'browser'].join('-')
        await page.screenshot({path:output+'/'+name+'.png',fullPage:true})
        if(item.device==='android'&&!available.android){
          await offer(page,'dismissed')
          await prompt.waitFor({state:'visible'})
          await verifyLayout(page,main,item)
          await prompt.click()
          await home.waitFor({state:'visible'})
          assert.equal(await page.evaluate(()=>window.installCalls),1)
          assert.match(await main.locator('[aria-live]').innerText(),/меню браузера/i)
          await offer(page,'accepted')
          await prompt.click()
          await home.waitFor({state:'visible'})
          assert.equal(await page.evaluate(()=>window.installCalls),2)
          await main.getByText(/Запрос принят/i).waitFor({state:'visible'})
          await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')))
          await home.waitFor({state:'visible'})
          await main.getByText('Holistic House установлено.',{exact:true}).waitFor()
          assert.equal(await prompt.count(),0)
          await verifyLayout(page,main,item)
        }
        if(item.standalone||item.embedded&&!available.ios){
          const destination=origin+'/'+item.locale
          const navigation=page.waitForURL(destination,{waitUntil:'commit'})
          await home.click()
          await navigation
          assert.equal(page.url(),destination,'Open must take the user directly into the app')
        }
        assert.deepEqual(errors,[],'Install page must render and handle the available actions without JS errors')
        evidence.push({...item,geometry})
      }finally{await ctx.close()}
    }
  }finally{await browser.close()}
}
writeFileSync(output+'/summary.json',JSON.stringify({public:true,nativeReleaseAvailable:available,cases:evidence},null,2)+'\n')
console.log('Verified '+evidence.length+' installation page renderings, platform guidance, release gating and browser prompt handling.')
