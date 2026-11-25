import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {generateKeyPairSync} from 'node:crypto'
import {EventEmitter} from 'node:events'
import {registerNativePushToken} from '../lib/native/push-registration.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const server=process.execArgv.some(arg=>arg.includes('react-server'))
const tick=()=>new Promise(resolve=>setImmediate(resolve))
const id='11111111-1111-4111-8111-111111111111'

test('generated iOS AppDelegate actually contains both APNs forwarding callbacks once',()=>{
  const root=mkdtempSync(join(tmpdir(),'hh-apns-release-'))
  try{
    const files=['ios/App/App/Info.plist','ios/App/App/App.entitlements',
      'ios/App/App/AppDelegate.swift','ios/App/App.xcodeproj/project.pbxproj']
    for(const file of files){mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),read(file))}
    const config=read('capacitor.holistic-house.config.json')
    writeFileSync(join(root,'capacitor.config.json'),config)
    writeFileSync(join(root,'ios/App/App/capacitor.config.json'),config)
    const script=new URL('../scripts/prepare-holistic-house-native.mjs',import.meta.url)
    const result=spawnSync(process.execPath,[script.pathname,'after-ios-sync'],{cwd:root,encoding:'utf8',timeout:10000})
    assert.equal(result.status,0,result.stderr)
    const swift=readFileSync(join(root,'ios/App/App/AppDelegate.swift'),'utf8')
    for(const callback of ['.capacitorDidRegisterForRemoteNotifications, object: deviceToken',
      '.capacitorDidFailToRegisterForRemoteNotifications, object: error'])
      assert.equal(swift.split(callback).length-1,1,callback)
    assert.match(swift,/\n}\s*$/)
    assert.match(readFileSync(join(root,'ios/App/App/App.entitlements'),'utf8'),/<key>aps-environment<\/key>\s*<string>development<\/string>/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('native registration resolves token and removes both listeners',async()=>{
  const callbacks={};let removed=0,registered=0
  const value=await registerNativePushToken({
    addListener:async(name,fn)=>{callbacks[name]=fn;return {remove:async()=>removed++}},
    register:async()=>{registered++;callbacks.registration({value:'test-token'})},
  })
  assert.equal(value,'test-token');assert.equal(removed,2);assert.equal(registered,1)
})
test('account cancellation removes late native listeners without registering',async()=>{
  const controller=new AbortController(),deferred=[];let removed=0,registered=0
  const operation=registerNativePushToken({
    addListener:()=>new Promise(resolve=>deferred.push(resolve)),register:async()=>registered++,
  },{signal:controller.signal})
  const rejected=assert.rejects(operation,/CANCELLED/)
  await tick();assert.equal(deferred.length,2);controller.abort();await rejected
  for(const resolve of deferred)resolve({remove:async()=>removed++})
  await tick();assert.equal(removed,2);assert.equal(registered,0)
})
test('timeout and partially failed listener attachment never leak subscriptions',async()=>{
  const deferred=[];let removed=0
  const operation=registerNativePushToken({
    addListener:()=>new Promise(resolve=>deferred.push(resolve)),register:()=>assert.fail('register after timeout'),
  },{timeoutMs:5})
  await assert.rejects(operation,/TIMEOUT/)
  for(const resolve of deferred)resolve({remove:async()=>removed++})
  await tick();assert.equal(removed,2)
  let resolveLate
  const partial=registerNativePushToken({
    addListener:name=>name==='registrationError'?Promise.reject(new Error('failed')):new Promise(resolve=>resolveLate=resolve),
    register:()=>assert.fail('register after listener failure'),
  })
  await assert.rejects(partial,/FAILED/)
  resolveLate({remove:async()=>removed++});await tick();assert.equal(removed,3)
})
test('invalid platforms and malformed tokens fail closed',{skip:!server},async()=>{
  const {nativeTokenValid}=await import('../lib/app/native-push-transport.js')
  assert.equal(nativeTokenValid('other',''),false)
  assert.equal(nativeTokenValid('ios','a'.repeat(33)),false)
  assert.equal(nativeTokenValid('ios','a'.repeat(64)),true)
})
test('APNs uses P256, exact app topic, privacy-safe alert and closes its HTTP2 session',{skip:!server},async()=>{
  const {nativePushReady,sendNativeClientPush}=await import('../lib/app/native-push-transport.js')
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
  const env={HH_NATIVE_APNS_KEY_ID:'ABCDEFGHIJ',HH_NATIVE_APNS_TEAM_ID:'KLMNOPQRST',
    HH_NATIVE_APNS_ENV:'sandbox',HH_NATIVE_APNS_PRIVATE_KEY:privateKey.export({format:'pem',type:'pkcs8'}).toString()}
  assert.equal(nativePushReady(env,'ios'),true)
  let captured,body,host,destroyed=0
  const client=new EventEmitter(),stream=new EventEmitter()
  client.request=headers=>{captured=headers;return stream}
  client.destroy=()=>destroyed++
  stream.close=()=>{}
  stream.end=value=>{body=value;queueMicrotask(()=>{stream.emit('response',{':status':200});stream.emit('end')})}
  const result=await sendNativeClientPush({platform:'ios',token:'a'.repeat(64)},
    {kind:'client-message',locale:'ru',requestId:id,body:'PRIVATE_MEDICAL_TEXT',url:'https://evil.example'},
    env,()=>assert.fail('APNs must not use FCM'),origin=>{host=origin;return client})
  assert.equal(result.accepted,true);assert.equal(destroyed,1)
  assert.equal(host,'https://api.sandbox.push.apple.com')
  assert.equal(captured['apns-topic'],'com.holistichouse.app')
  assert.equal(captured['apns-priority'],'10')
  assert.doesNotMatch(body,/PRIVATE_MEDICAL_TEXT|evil\.example/)
  const wrong=generateKeyPairSync('ec',{namedCurve:'secp384r1'}).privateKey
  assert.equal(nativePushReady({...env,HH_NATIVE_APNS_PRIVATE_KEY:wrong.export({format:'pem',type:'pkcs8'}).toString()},'ios'),false)
})
test('generic FCM 404 is not a revoked token; UNREGISTERED is',{skip:!server},async()=>{
  const {sendNativeClientPush}=await import('../lib/app/native-push-transport.js')
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048})
  const env={HH_FCM_PROJECT_ID:'hh-release-test',HH_FCM_CLIENT_EMAIL:'notify@hh-release-test.iam.gserviceaccount.com',
    HH_FCM_PRIVATE_KEY:privateKey.export({format:'pem',type:'pkcs8'}).toString()}
  let unregistered=false
  const fetcher=async(url,options)=>url.endsWith('/token')
    ?{ok:true,json:async()=>({access_token:'test-only',expires_in:1800})}
    :{status:404,json:async()=>({error:{details:unregistered
      ?[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'UNREGISTERED'}]:[]}})}
  const device={platform:'android',token:'abc:'.repeat(35)}
  const payload={kind:'client-message',locale:'en',requestId:id}
  assert.equal((await sendNativeClientPush(device,payload,env,fetcher)).expired,false)
  unregistered=true
  assert.equal((await sendNativeClientPush(device,payload,env,fetcher)).expired,true)
  await assert.rejects(sendNativeClientPush(device,{...payload,requestId:'https://evil.example'},env,fetcher),/INVALID_MESSAGE_REQUEST/)
})
