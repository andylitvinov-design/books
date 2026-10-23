import test from 'node:test'
import assert from 'node:assert/strict'
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

test('Holistic House app has its own branded install manifest, without renaming the legacy library PWA',async()=>{
  const {readFile}=await import('node:fs/promises')
  const page=await readFile(new URL('../app/[locale]/app/[[...path]]/page.jsx',import.meta.url),'utf8')
  const metadataSource=page.slice(page.indexOf('export async function generateMetadata'),page.indexOf('export default async function AppPage'))
  const metadata=new Function(metadataSource.replace('export async function','async function')+'; return generateMetadata')()
  for(const locale of ['en','ru']) {
    const path=locale==='ru'?'/holistic-house-app-ru.webmanifest':'/holistic-house-app.webmanifest'
    for(const route of [[],['portrait'],['course'],['consultations']]) {
      const result=await metadata({params:Promise.resolve({locale,path:route}),searchParams:Promise.resolve({})})
      assert.equal(result.manifest,path)
    }
    const manifest=JSON.parse(await readFile(new URL('../public'+path,import.meta.url),'utf8'))
    assert.equal(manifest.name,'Holistic House')
    assert.equal(manifest.id,'/en/app','Locales share the same installed app identity')
    assert.equal(manifest.start_url,'/'+locale+'/app/portrait')
    assert.ok(manifest.icons.some(icon=>icon.src==='/holistic-house-icon/192'&&icon.type==='image/png'))
    const stress=await metadata({params:Promise.resolve({locale,path:['course']}),searchParams:Promise.resolve({program:'stress'})})
    assert.equal(stress.manifest,'/opora-antistress-'+locale+'.webmanifest')
    const other=await metadata({params:Promise.resolve({locale,path:['portrait']}),searchParams:Promise.resolve({program:'stress'})})
    assert.equal(other.manifest,path,'Stress query outside course must not change installed app')
  }
})
