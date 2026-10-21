import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  capturePwaInstallPrompt,onPwaInstallPrompt,requestPwaInstallation,pwaInstalled,
} from '../lib/pwa/install-prompt.js'
import {shouldPauseNewSignupSave} from '../lib/pwa/post-signup-flow.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('deferred browser install event survives registration and is consumed once',async()=>{
  const observed=[]
  const release=onPwaInstallPrompt(event=>observed.push(Boolean(event)))
  let prompted=0,prevented=0
  const browserEvent={
    preventDefault(){prevented++},
    async prompt(){prompted++},
    userChoice:Promise.resolve({outcome:'accepted'}),
  }
  assert.equal(capturePwaInstallPrompt(browserEvent),true)
  assert.equal(prevented,1)
  assert.equal(observed.at(-1),true)
  assert.deepEqual(await requestPwaInstallation(),{available:true,accepted:true})
  assert.deepEqual(await requestPwaInstallation(),{available:false,accepted:false})
  assert.equal(prompted,1)
  assert.equal(observed.at(-1),false)
  release()
  pwaInstalled()
})

test('failed or absent PWA prompt shows browser instructions instead of inventing an App Store download',async()=>{
  const attempted=capturePwaInstallPrompt({userChoice:Promise.resolve({outcome:'accepted'})})
  assert.equal(attempted,false)
  assert.deepEqual(await requestPwaInstallation(),{available:false,accepted:false})
  const failed={
    preventDefault(){},
    async prompt(){throw Error('not eligible')},
    userChoice:Promise.resolve({outcome:'dismissed'}),
  }
  assert.equal(capturePwaInstallPrompt(failed),true)
  assert.deepEqual(await requestPwaInstallation(),{available:true,accepted:false})
  pwaInstalled()
})

test('Android PWA availability is collected globally before Google OAuth and onboarding',()=>{
  const registration=read('components/pwa-registration.tsx')
  assert.match(registration,/capturePwaInstallPrompt\(event\)/)
  assert.match(registration,/beforeinstallprompt/)
  assert.match(registration,/appinstalled/)
  assert.match(registration,/serviceWorker\.register\('\/sw\.js'\)/)
  const helper=read('lib/pwa/install-prompt.js')
  assert.doesNotMatch(helper,/localStorage|sessionStorage|cookie|accountId/)
})

test('post-signup offer requires successful persisted consent and account identity match',()=>{
  const app=read('components/app/app-workspace.jsx')
  assert.match(app,/PostSignupInstallOffer/)
  assert.match(app,/onboarding onDone=\{async\(\)=>\{/)
  assert.match(app,/const fresh=await load\(\)/)
  assert.match(app,/fresh\?\.account\?\.onboardingState==='active'&&fresh\.account\.id===data\.account\.id/)
  assert.match(app,/visible=\{data\.account\.onboardingState==='active' && installOfferAccountId===data\.account\.id\}/)
  assert.match(app,/setInstallOfferAccountId\(null\)/)
  const save=app.substring(app.indexOf('function Preferences('),app.indexOf('function TestCatalog('))
  assert.ok(save.indexOf("await appFetch(onboarding ? 'onboarding' : 'preferences', body)")<
    save.indexOf('await onDone()'))
  assert.doesNotMatch(app,/localStorage\.(setItem|getItem)\(/)
})

test('Square-inspired install offer is optional, mobile-only and does not enable push automatically',()=>{
  const ui=read('components/app/post-signup-install-offer.jsx')
  assert.match(ui,/data-post-signup-install/)
  assert.match(ui,/role="dialog" aria-modal="true"/)
  assert.match(ui,/Я сделаю это позже/)
  assert.match(ui,/I’ll do this later/)
  assert.match(ui,/Установить Holistic House/)
  assert.match(ui,/Add to Home Screen|На экран/)
  assert.match(ui,/beforeinstallprompt|onPwaInstallPrompt/)
  assert.match(ui,/visible&&device\.mobile&&!device\.installed/)
  assert.match(ui,/navigator\.standalone===true/)
  assert.match(ui,/window\.Capacitor\?\.isNativePlatform/)
  assert.match(ui,/navigator\.clipboard\.writeText/)
  assert.match(ui,/event\.key==='Escape'/)
  assert.match(ui,/event\.key!=='Tab'/)
  assert.doesNotMatch(ui,/PushManager|Notification\.requestPermission|registerNativePushToken|sendTwilioSms|sendMessage|App Store download/)
  const css=read('components/app/post-signup-install-offer.module.css')
  assert.match(css,/@media\(max-width:360px\)/)
  assert.match(css,/max-height:calc\(100dvh/)
  assert.match(css,/min-height:52px/)
  assert.match(css,/outline:3px/)
  assert.match(css,/safe-area-inset-bottom/)
})

test('existing iOS/Android PWA remains same Holistic House app; no test-only APK offered',()=>{
  const en=JSON.parse(read('public/holistic-house-app.webmanifest'))
  const ru=JSON.parse(read('public/holistic-house-app-ru.webmanifest'))
  for(const x of [en,ru]){
    assert.equal(x.name,'Holistic House')
    assert.equal(x.id,'/en/app')
    assert.equal(x.display,'standalone')
    assert.ok(x.shortcuts.some(y=>y.url.endsWith('/app/consultations')))
  }
  const ui=read('components/app/post-signup-install-offer.jsx')
  assert.doesNotMatch(ui,/\.apk|testflight|app-store|play\.google|google-services\.json|HH_FCM/)
})

test('post-signup report Save offers install only for the matching new active account after commit',()=>{
  assert.equal(shouldPauseNewSignupSave({pendingAccountId:'a',accountId:'a',installEligible:true}),true)
  for(const args of [
    {pendingAccountId:null,accountId:'a',installEligible:true},
    {pendingAccountId:'a',accountId:'b',installEligible:true},
    {pendingAccountId:'a',accountId:'a',installEligible:false},
    {pendingAccountId:'a',accountId:null,installEligible:true},
  ])assert.equal(shouldPauseNewSignupSave(args),false)
  const app=read('components/app/app-workspace.jsx')
  const continuation=app.slice(app.indexOf('function SaveContinuation('),app.indexOf('function Preferences('))
  const commit=continuation.indexOf("const saved = await appFetch('save-intents/' + intentId + '/commit'")
  assert.ok(commit>=0)
  assert.ok(continuation.indexOf('if(onComplete)onComplete(destination)')>commit)
  assert.match(app,/if\(page==='continue'\) pendingSaveInstallAccountId\.current=fresh\.account\.id/)
  assert.match(app,/onComplete=\{completeSaveContinuation\}/)
  assert.match(app,/context=\{savedInstallContext \? 'saved' : 'signup'\}/)
  assert.match(app,/savedExitDestination\.current=null/)
  assert.match(app,/shouldPauseNewSignupSave\(/)
  assert.match(app,/router\.replace\(destination\)/)
  const offer=read('components/app/post-signup-install-offer.jsx')
  assert.match(offer,/isPostSignupInstallEligible/)
  assert.match(offer,/if\(offerVisible\.current\)close\.current\?\.\(\)/)
  assert.match(offer,/setDevice\(\{\.\.\.mobileDevice\(\),installed:true\}\)/)
  assert.match(offer,/context!=='saved'/)
  assert.match(offer,/context==='saved'/)
  assert.doesNotMatch(offer,/sessionStorage|localStorage|PushManager|Notification\.requestPermission/)
})
