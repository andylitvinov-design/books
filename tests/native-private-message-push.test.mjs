import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync} from 'node:crypto'
import {readFileSync} from 'node:fs'
const withServerCondition=process.execArgv.some(arg=>arg.includes('react-server'))
const nativeTransport=()=>import('../lib/app/native-push-transport.js')
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const id='11111111-1111-4111-8111-111111111111'

test('APNs and FCM are off without explicit server secrets; tokens validated by platform',{skip:!withServerCondition},async()=>{
  const {nativePushReady,nativeTokenValid}=await nativeTransport()
  assert.equal(nativePushReady({},'ios'),false)
  assert.equal(nativePushReady({},'android'),false)
  assert.equal(nativeTokenValid('ios','abcdef0123456789'.repeat(4)),true)
  assert.equal(nativeTokenValid('ios','https://evil.example'),false)
  assert.equal(nativeTokenValid('android','abc:'.repeat(35)),true)
  assert.equal(nativeTokenValid('android','../../secrets'),false)
})
test('FCM HTTP v1 uses fixed service URLs and generic message-only payload',{skip:!withServerCondition},async()=>{
  const {nativePushReady,sendNativeClientPush}=await nativeTransport()
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048})
  const env={
    HH_FCM_PROJECT_ID:'hh-tests-project',
    HH_FCM_CLIENT_EMAIL:'notify@hh-tests-project.iam.gserviceaccount.com',
    HH_FCM_PRIVATE_KEY:privateKey.export({format:'pem',type:'pkcs8'}).toString(),
  }
  assert.equal(nativePushReady(env,'android'),true)
  const calls=[]
  const fetcher=async(url,options)=>{
    calls.push({url,options})
    return url.endsWith('/token')
      ? {ok:true,json:async()=>({access_token:'fake-test-token',expires_in:1800})}
      : {status:200}
  }
  const result=await sendNativeClientPush(
    {platform:'android',token:'AAA:'.repeat(35)},
    {kind:'client-message',locale:'ru',requestId:id},env,fetcher)
  assert.equal(result.accepted,true)
  assert.equal(calls.length,2)
  assert.equal(calls[0].url,'https://oauth2.googleapis.com/token')
  assert.equal(calls[1].url,'https://fcm.googleapis.com/v1/projects/hh-tests-project/messages:send')
  const body=JSON.parse(calls[1].options.body)
  assert.equal(body.message.data.kind,'client-message')
  assert.equal(body.message.data.requestId,id)
  assert.equal(body.message.notification.title,'Holistic House')
  assert.doesNotMatch(JSON.stringify(body),/diagnos|medical report|private note|test score/i)
})
test('private native devices are opt-in, encrypted, session-bound and not directly exposed to client roles',()=>{
  const sql=read('supabase/migrations/20261020150500_hh_native_private_message_push.sql')
  assert.match(sql,/session_id uuid not null/)
  assert.match(sql,/active_session\.id=d\.session_id/)
  assert.match(sql,/active_session\.user_id=d\.account_id/)
  assert.match(sql,/native_push_devices force row level security/i)
  assert.match(sql,/native_push_delivery_log force row level security/i)
  assert.match(sql,/revoke all on app_private\.native_push_devices from public,anon,authenticated/)
  assert.match(sql,/revoke all on app_private\.native_push_delivery_log from public,anon,authenticated,hh_app_backend/)
  assert.match(sql,/message_alerts boolean not null default false/)
  assert.match(sql,/consented_at is not null/)
  assert.match(sql,/msg\.author_role='practitioner'/)
  assert.match(sql,/msg\.visibility='participants'/)
  assert.match(sql,/on conflict\(message_id,device_id\) do nothing/)
  assert.match(sql,/security definer set search_path = ''/)
  assert.match(sql,/grant execute on function app_private\.claim_native_private_message_push\(uuid\)\s+to hh_app_backend/)
  const repo=read('lib/app/native-push-repository.js')
  assert.match(repo,/seal\(\{token\}/)
  assert.match(repo,/actor\.claims\.session_id/)
  assert.match(repo,/token_hash/)
  assert.match(repo,/messageAlerts!==true/)
  assert.match(repo,/account_id=\$1/)
  assert.doesNotMatch(repo,/localStorage|sessionStorage|NEXT_PUBLIC/)
})
test('after-commit only new authorized practitioner messages fan out through both transports',()=>{
  const route=read('app/api/app/practitioner-client-messages/route.js')
  assert.match(route,/data\.duplicate===false/)
  assert.match(route,/data\.notifyClient===true/)
  assert.match(route,/dispatchNativeClientMessagePush\(config,id\)/)
  assert.match(route,/dispatchClientMessagePush\(config,id\)/)
  const dispatch=read('lib/app/native-push-dispatch.js')
  assert.match(dispatch,/claimNativePushTargets\(config,messageId\)/)
  assert.match(dispatch,/finishNativePush/)
  assert.doesNotMatch(dispatch,/console\.(log|error)|body_ciphertext/)
})
test('native UI requires permission and explicit separate registration, not Web Push or browser storage',()=>{
  const ui=read('components/app/native-message-notifications.jsx')
  const workspace=read('components/app/app-workspace.jsx')
  const api=read('app/api/app/[...path]/route.js')
  const links=read('components/native-link-handler.tsx')
  assert.match(ui,/notifications\/native\/register/)
  assert.match(ui,/notifications\/native\/disable/)
  assert.match(ui,/checkPermissions/)
  assert.match(ui,/requestPermissions/)
  assert.match(ui,/messageAlerts:true/)
  assert.match(ui,/push\.register\(\)/)
  assert.match(ui,/hh_private_messages/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage/)
  assert.match(workspace,/NativeMessageNotifications/)
  assert.match(workspace,/notifications\/native\/disable/)
  assert.match(api,/nativePush\.register/)
  assert.match(api,/nativePush\.disable/)
  assert.match(links,/pushNotificationActionPerformed/)
  assert.match(links,/classifyHolisticHouseNativeLink/)
})
test('native build stages pinned Capacitor push plugin without changing PsiAlchemy package',()=>{
  const flow=read('.github/workflows/holistic-house-native.yml')
  const stage=read('scripts/prepare-holistic-house-native.mjs')
  const config=JSON.parse(read('capacitor.holistic-house.config.json'))
  const source=JSON.parse(read('capacitor.config.json'))
  assert.equal(source.appId,'app.psialchemy.mobile')
  assert.equal(config.appId,'com.holistichouse.app')
  assert.match(flow,/@capacitor\/push-notifications@7\.0\.1/)
  assert.match(flow,/HH_FIREBASE_CONFIG_B64/)
  assert.match(stage,/capacitorDidRegisterForRemoteNotifications/)
  assert.match(stage,/aps-environment/)
  assert.deepEqual(config.plugins.PushNotifications.presentationOptions,['badge','sound','alert'])
})
