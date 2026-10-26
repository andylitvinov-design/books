import test from 'node:test'
import assert from 'node:assert/strict'
import {createECDH} from 'node:crypto'
import vm from 'node:vm'
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
  // Exercise the actual metadata producer without importing Next or mounting the app.
  const start=page.indexOf('export async function generateMetadata(')
  const end=page.indexOf('export default async function AppPage(')
  assert.ok(start>=0&&end>start)
  const metadata=vm.runInNewContext('('+page.slice(start,end).replace('export ','')+')')
  for(const locale of ['en','ru','es']){
    const expected='/holistic-house-app'+(locale==='en'?'':'-'+locale)+'.webmanifest'
    for(const path of [[],['portrait'],['consultations'],['course']]){
      const result=await metadata({params:{locale,path},searchParams:{}})
      assert.equal(result.manifest,expected)
      assert.equal(result.robots.index,false)
      assert.equal(result.robots.follow,false)
      assert.equal(result.referrer,'no-referrer')
    }
    const manifest=JSON.parse(await readFile(new URL('../public'+expected,import.meta.url),'utf8'))
    assert.equal(manifest.name,'Holistic House')
    assert.equal(manifest.id,'/en/app')
    assert.equal(manifest.start_url,'/'+locale+'/app/messages')
    assert.equal(manifest.scope,'/')
    assert.equal(manifest.display,'standalone')
    for(const size of [192,512]) assert.ok(manifest.icons.some(icon=>
      icon.src==='/holistic-house-icon/'+size&&icon.sizes===size+'x'+size&&icon.type==='image/png'))
    assert.equal((await metadata({params:{locale,path:['course']},searchParams:{program:'stress'}})).manifest,
      locale==='ru'?'/opora-antistress-ru.webmanifest':'/opora-antistress-en.webmanifest')
  }
  const legacy=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'))
  assert.equal(legacy.name,'PsiAlchemy')
  assert.equal(legacy.start_url,'/ru/homeopathy')
  for(const path of ['app/[locale]/homeopathy/layout.tsx','app/es/homeopathy/layout.tsx'])
    assert.match(await readFile(new URL('../'+path,import.meta.url),'utf8'),/manifest: "\/manifest\.webmanifest"/)
})
