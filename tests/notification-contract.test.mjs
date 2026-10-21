import test from 'node:test'
import assert from 'node:assert/strict'
import {sourceFunction} from './helpers/source-contract-runtime.mjs'
import {createECDH} from 'node:crypto'
import {trustedPushEndpoint,validatePushSubscription,validPushTimezone,coursePushPayload} from '../lib/app/notification-contract.js'
test('Only public push providers allowed; never internal/redirected URL',()=>{
  for(const url of ['http://127.0.0.1/a','https://localhost/a','https://web.push.apple.com.evil.com/a','file:///etc/passwd','https://evil.org/push'])
    assert.equal(trustedPushEndpoint(url),false)
  assert.equal(trustedPushEndpoint('https://web.push.apple.com/abc'),true)
  assert.equal(trustedPushEndpoint('https://fcm.googleapis.com/fcm/send/id'),true)
})
test('Validates Web Push keys before DB persistence',()=>{
  const key=createECDH('prime256v1');key.generateKeys()
  const sub={endpoint:'https://web.push.apple.com/abc',keys:{
    p256dh:key.getPublicKey().toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}}
  assert.equal(validatePushSubscription(sub).endpoint,sub.endpoint)
  assert.throws(()=>validatePushSubscription({...sub,keys:{...sub.keys,auth:'a'}}),/INVALID_PUSH_SUBSCRIPTION/)
})
test('Only generic bilingual course messages are allowed',()=>{
  assert.equal(coursePushPayload('en').path,'/en/app/course')
  assert.equal(coursePushPayload('ru').path,'/ru/app/course')
  assert.equal(validPushTimezone('America/Toronto'),true)
  assert.equal(validPushTimezone('not-a-timezone'),false)
})

test('only the explicit OPORA stress entry offers a separate install; ordinary Cabinet routes keep one private localized app',async()=>{
  const {readFile}=await import('node:fs/promises')
  const metadata=sourceFunction('app/[locale]/app/[[...path]]/page.jsx','generateMetadata')
  const assertPrivate=value=>{
    assert.equal(value.robots.index,false)
    assert.equal(value.robots.follow,false)
    assert.equal(value.referrer,'no-referrer')
    assert.equal(value.icons.apple,'/holistic-house-icon/180')
  }
  const assertHouseManifest=(manifest,locale)=>{
    assert.equal(manifest.name,'Holistic House')
    assert.equal(manifest.id,'/en/app','EN and RU share the same installed app identity')
    assert.equal(manifest.lang,locale)
    assert.equal(manifest.start_url,`/${locale}/app/portrait`)
    assert.equal(manifest.scope,'/')
    assert.equal(manifest.display,'standalone')
    for(const size of [192,512]) assert.ok(manifest.icons.some(icon=>
      icon.src===`/holistic-house-icon/${size}`&&icon.sizes===`${size}x${size}`&&icon.type==='image/png'),
    `A real ${size}px PNG icon is required for installation`)
  }
  for(const locale of ['en','ru']) {
    const expected=locale==='ru'?'/holistic-house-app-ru.webmanifest':'/holistic-house-app.webmanifest'
    const manifest=JSON.parse(await readFile(new URL('../public'+expected,import.meta.url),'utf8'))
    assertHouseManifest(manifest,locale)
    for(const path of [[],['portrait'],['tests'],['settings'],['documents','synthetic'],['business'],['consultations']]) {
      // A stress query on a non-course screen must not change the app identity.
      for(const searchParams of [undefined,Promise.resolve({program:'stress'})]) {
        const value=await metadata({params:Promise.resolve({locale,path}),searchParams})
        assert.equal(value.manifest,expected)
        assertPrivate(value)
      }
    }
    // Plain course entry and malformed/non-stress query values stay in Holistic House.
    for(const query of [undefined,{}, {program:'calm'}, {program:'Stress'}, {program:'stress '}, {program:['stress']}]) {
      const value=await metadata({params:Promise.resolve({locale,path:['course']}),
        searchParams:query===undefined?undefined:Promise.resolve(query)})
      assert.equal(value.manifest,expected)
      assertPrivate(value)
    }
    const value=await metadata({params:Promise.resolve({locale,path:['course']}),
      searchParams:Promise.resolve({program:'stress'})})
    assert.equal(value.manifest,`/opora-antistress-${locale}.webmanifest`)
    assertPrivate(value)
    const course=JSON.parse(await readFile(new URL('../public'+value.manifest,import.meta.url),'utf8'))
    assert.equal(course.id,'/opora-antistress')
    assert.equal(course.start_url,`/${locale}/app/course?program=stress`)
    assert.equal(course.display,'standalone')
    assert.notEqual(course.id,manifest.id)
  }
  // Existing generic install links remain an alias for the same English app.
  const legacy=JSON.parse(await readFile(new URL('../public/holistic-house.webmanifest',import.meta.url),'utf8'))
  assertHouseManifest(legacy,'en')
})
