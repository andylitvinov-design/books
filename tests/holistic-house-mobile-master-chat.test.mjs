import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {directMessengerRecipient,directMessengerReturnPath,directMessengerSetupPath} from '../lib/app/direct-messenger-handoff.mjs'
import {classifyHolisticHouseNativeAuth} from '../lib/native/deep-link-policy.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('one installable Holistic House PWA opens its real Messages tab in all locales',()=>{
  const native=JSON.parse(read('capacitor.holistic-house.config.json'))
  assert.equal(native.appId,'com.holistichouse.app')
  assert.equal(native.server.url,'https://holistichouse.vercel.app/en/app/messages')
  for(const locale of ['en','ru','es']){
    const file=locale==='en'?'public/holistic-house-app.webmanifest':
      'public/holistic-house-app-'+locale+'.webmanifest'
    const manifest=JSON.parse(read(file))
    assert.equal(manifest.id,'/en/app','all languages share one installed icon')
    assert.equal(manifest.display,'standalone')
    assert.equal(manifest.start_url,'/'+locale+'/app/messages')
    assert.ok(manifest.shortcuts.some(shortcut=>shortcut.url==='/'+locale+'/app/messages'))
  }
  const releases=JSON.parse(read('data/native-public-releases.json'))
  assert.equal(releases.android.status,'not_released')
  assert.equal(releases.ios.status,'not_released')
})

test('OAuth returns to precisely the approved practitioner slug, never to arbitrary URLs',()=>{
  for(const locale of ['en','ru','es']){
    assert.equal(directMessengerReturnPath(locale),'/'+locale+'/app/messages')
    assert.equal(directMessengerReturnPath(locale,'master-anna'),
      '/'+locale+'/app/messages?to=master-anna')
  }
  assert.equal(directMessengerRecipient('master-anna'),'master-anna')
  assert.equal(directMessengerRecipient(null),null)
  for(const slug of ['', 'a', '../admin','/en/app','admin?next=https://evil.test',
    'AnNa', 'x'.repeat(91),{},[],100]){
    assert.throws(()=>directMessengerRecipient(slug),/INVALID_RECIPIENT/)
  }
  for(const locale of ['', 'fr','EN',null])
    assert.throws(()=>directMessengerReturnPath(locale,'master-anna'),/INVALID_LOCALE/)
})

test('new account setup keeps the practitioner and language, but never skips consent',()=>{
  assert.equal(directMessengerSetupPath('ru','andy-litvinov'),
    '/ru/app/portrait?afterSignIn=messages&chatLocale=ru&to=andy-litvinov')
  assert.equal(directMessengerSetupPath('es','andy-litvinov'),
    '/en/app/portrait?afterSignIn=messages&chatLocale=es&to=andy-litvinov')
  assert.equal(directMessengerSetupPath('en'),
    '/en/app/portrait?afterSignIn=messages&chatLocale=en')
  const workspace=read('components/app/app-workspace.jsx')
  assert.match(workspace,/searchParams.get\('afterSignIn'\)==='messages'/)
  assert.match(workspace,/fresh\?\.account\?\.onboardingState==='active'/)
  assert.match(workspace,/directMessengerReturnPath\(/)
  assert.match(workspace,/router.replace\(destination\)/)
  const callback=read('app/api/app/[...path]/route.js')
  assert.match(callback,/account.onboardingState!=='active'/)
  assert.match(callback,/directMessengerSetupPath\(locale,recipientSlug\)/)
})
test('native Google OAuth carries only a validated public master slug back to the WebView',()=>{
  const native=classifyHolisticHouseNativeAuth(
    'holistichouse://auth/callback?code=sample123&locale=es&continue=direct-messages&recipientSlug=master-anna')
  assert.equal(native.kind,'hh-auth')
  const url=new URL(native.path,'https://holistichouse.vercel.app')
  assert.equal(url.pathname,'/api/app/auth/callback')
  assert.equal(url.searchParams.get('locale'),'es')
  assert.equal(url.searchParams.get('recipientSlug'),'master-anna')
  assert.equal(url.searchParams.get('continue'),'direct-messages')
  for(const url of [
    'holistichouse://auth/callback?code=x&locale=en&continue=direct-messages&recipientSlug=../admin',
    'holistichouse://auth/callback?code=x&locale=ru&continue=direct-messages&recipientSlug=Master',
    'holistichouse://auth/callback?code=x&locale=es&continue=cabinet&recipientSlug=master-anna',
    'holistichouse://auth/callback?code=x&locale=en&continue=direct-messages&recipientSlug=master-anna&recipientSlug=other',
    'holistichouse://auth/callback?code=x&locale=en&next=https://evil.test',
  ])assert.equal(classifyHolisticHouseNativeAuth(url).kind,'unsupported',url)
  const handler=read('components/native-link-handler.tsx')
  assert.match(handler,/classifyHolisticHouseNativeAuth/)
  assert.match(handler,/window\.location\.assign\(callback\.path\)/)
})

test('guest-to-master journey uses real server Google login; never fake a conversation',()=>{
  const master=read('app/[locale]/masters/[slug]/page.tsx')
  const hub=read('components/app/messages-hub.jsx')
  const signin=read('components/app/messenger-sign-in.jsx')
  const route=read('app/api/app/[...path]/route.js')
  assert.match(master,/app\/messages\?to=/)
  assert.match(hub,/recipientSlug=\{directDestination\}/)
  assert.match(hub,/masterSignIn/)
  assert.match(signin,/fetch\('\/api\/app\/auth\/start'/)
  assert.match(signin,/continueTo:'direct-messages'/)
  assert.match(signin,/isNativeHolisticHouse\(\)/)
  assert.match(signin,/Browser\.open\(\{url:destination\.href\}\)/)
  assert.match(route,/directMessengerReturnPath\(locale,recipientSlug\)/)
  assert.match(route,/createAppRepository\(config\)\.ensureAccount\(actor\)/)
  assert.doesNotMatch(signin,/localStorage|sessionStorage|fakeUser|fakeMessage/)
})

test('mobile inbox resumes replies only when visible and online, never caches private history',()=>{
  const inbox=read('components/app/direct-message-inbox.jsx')
  const sw=read('public/sw.js')
  const page=read('app/[locale]/app/messages/page.tsx')
  const css=read('app/[locale]/app/messages/messages-page.css')
  assert.match(inbox,/document\.visibilityState==='visible'/)
  assert.match(inbox,/navigator\.onLine===false/)
  assert.match(inbox,/window\.setInterval\(focus,45000\)/)
  assert.match(inbox,/window\.clearInterval\(timer\)/)
  assert.match(inbox,/window\.addEventListener\('focus',focus\)/)
  assert.match(inbox,/findMaster:'Найти мастера'/)
  assert.match(inbox,/\/masters'/)
  assert.match(page,/hh-phone-notifications/)
  assert.match(page,/<Bell size=\{17\}/)
  assert.match(css,/flex-wrap:wrap/)
  assert.match(sw,/PRIVATE_PREFIXES/)
  assert.match(sw,/\/es\/app/)
  assert.match(sw,/network-only/)
  assert.doesNotMatch(inbox,/localStorage|sessionStorage/)
})

test('messages remain real participant-scoped text/image/voice; video is not claimed live',()=>{
  const api=read('app/api/app/direct-messages/route.js')
  const inbox=read('components/app/direct-message-inbox.jsx')
  const policy=read('lib/practitioners/direct-message-policy.mjs')
  assert.match(api,/auth\.verified\(\)/)
  assert.match(api,/requireSameOrigin\(request,config\)/)
  assert.match(api,/expected!==actor\.id/)
  assert.match(api,/createDirectMessages\(config\)/)
  assert.match(inbox,/DirectVoiceRecorder/)
  assert.match(inbox,/preparePhoto\(file\)/)
  assert.match(inbox,/await post\(\{action:'send'/)
  assert.match(policy,/'audio\/ogg'/)
  assert.match(policy,/'image\/jpeg'/)
  assert.doesNotMatch(policy,/'video\/mp4'/)
})
