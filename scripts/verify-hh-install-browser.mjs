#!/usr/bin/env node
// Real rendered PUBLIC /install page only: no auth, cookies or private account data.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.argv[2]||'http://127.0.0.1:3098'
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin),'Only a local CI app may be tested')
const output='artifacts/holistic-house-install'
mkdirSync(output,{recursive:true})
const iphoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
const androidUA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const cases=[
  {engine:'webkit',locale:'ru',width:320,platform:'iphone'},
  {engine:'webkit',locale:'ru',width:354,platform:'iphone'},
  {engine:'webkit',locale:'ru',width:390,platform:'iphone'},
  {engine:'webkit',locale:'ru',width:430,platform:'iphone'},
  {engine:'chromium',locale:'ru',width:390,platform:'iphone'},
  {engine:'webkit',locale:'en',width:390,platform:'iphone'},
  {engine:'webkit',locale:'es',width:390,platform:'iphone'},
  {engine:'chromium',locale:'ru',width:390,platform:'android'},
]
const evidence=[]
for(const engineName of ['webkit','chromium']){
  const browser=await (engineName==='webkit'?webkit:chromium).launch()
  try{
    for(const item of cases.filter(x=>x.engine===engineName)){
      const ctx=await browser.newContext({
        viewport:{width:item.width,height:844},
        deviceScaleFactor:1,
        isMobile:true,hasTouch:true,
        userAgent:item.platform==='android'?androidUA:iphoneUA,
        reducedMotion:'reduce',
        serviceWorkers:'block',
      })
      try{
        const page=await ctx.newPage(),errors=[]
        page.on('pageerror',error=>errors.push(error.message))
        const response=await page.goto(origin+'/'+item.locale+'/install',{waitUntil:'domcontentloaded',timeout:60000})
        assert.equal(response?.status(),200,'Install page HTTP')
        const action=page.locator('[data-hh-install-action]')
        await action.waitFor({state:'visible',timeout:30000})
        await page.locator('[data-hh-install-ready]').waitFor({state:'visible'})
        const measurements=await page.evaluate(()=>{
          const rect=selector=>{
            const el=document.querySelector(selector)
            if(!el)throw Error('Missing '+selector)
            const r=el.getBoundingClientRect()
            return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}
          }
          return {
            viewport:innerWidth,
            contentWidth:document.documentElement.scrollWidth,
            pwa:rect('[data-hh-pwa-alternative]'),
            action:rect('[data-hh-install-action]'),
            native:rect('[data-hh-native-downloads]'),
            installedGuide:document.querySelectorAll('[data-hh-ios-quicksteps]').length,
            nativeIosPending:!!document.querySelector('[data-hh-native-ios-pending]'),
            nativeAndroidPending:!!document.querySelector('[data-hh-native-android-pending]'),
          }
        })
        assert.ok(measurements.pwa.top<measurements.native.top,'Available PWA must appear before future native packages')
        assert.ok(measurements.action.top<844,'A genuine install instruction action must appear on the first phone screen; top='+Math.round(measurements.action.top)+'px, width='+item.width)
        assert.ok(measurements.action.height>=44,'Installation action must be thumb-sized')
        assert.ok(measurements.action.left>=0&&measurements.action.right<=item.width+1,'Installation action is clipped')
        assert.ok(measurements.contentWidth<=item.width+1,'Unexpected horizontal overflow on iPhone; page='+measurements.contentWidth+'px, width='+item.width)
        assert.ok(measurements.nativeIosPending&&measurements.nativeAndroidPending,'Unsigned native packages must remain unpublished')
        if(item.platform==='iphone'){
          assert.equal(measurements.installedGuide,1,'Safari installation steps must be immediately visible')
          const text=await page.locator('[data-hh-ios-quicksteps]').innerText()
          assert.ok(text.includes(item.locale==='ru'?'Safari':'Safari'),'Safari instructions')
          if(item.locale==='ru')assert.ok(text.includes('компаса'),'In-app browser exit instruction')
          const label=await action.innerText()
          assert.ok(/Install|Установить|Instalar/.test(label),'iPhone offer opens truthful manual instructions, never a binary download')
          await action.click()
          await page.locator('[data-hh-install-guidance]').waitFor({state:'visible',timeout:5000})
        }else{
          const label=await action.innerText()
          assert.ok(/Chrome|Установить/.test(label),'Android manual or eligible browser install')
          await action.click()
          assert.ok(await page.locator('[data-hh-install-guidance]').isVisible()||
            await page.locator('[data-hh-install-accepted]').isVisible(),
            'Click must give native prompt feedback or real Chrome instructions')
        }
        await page.screenshot({path:output+'/'+item.engine+'-'+item.locale+'-'+item.width+'-'+item.platform+'.png',fullPage:true})
        assert.deepEqual(errors,[],'Rendered page JavaScript errors')
        evidence.push({...item,measurements,errors:0})
      }finally{await ctx.close()}
    }
  }finally{await browser.close()}
}
writeFileSync(output+'/summary.json',JSON.stringify({public:true,cases:evidence},null,2)+'\n')
console.log('Verified '+evidence.length+' public install renderings with WebKit/Chromium; PWA first, Safari manual steps, no native fake downloads.')
