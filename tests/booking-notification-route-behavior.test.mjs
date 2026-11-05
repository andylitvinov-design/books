import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {parse} from 'acorn'

// Execute the actual route callback, without Next's unrelated alias/provider setup.
const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
const ast=parse(route,{ecmaVersion:'latest',sourceType:'module'})
const declaration=ast.body.find(node=>node.type==='VariableDeclaration'&&
  node.declarations.some(item=>item.id.name==='notifyBookingParticipants'))
const source=route.slice(declaration.start,declaration.end)+'; notifyBookingParticipants'
const id='10000000-0000-4000-8000-000000000001'
function callback(overrides={}){
  const pending=[],sent=[],logs=[]
  const dependencies={after:fn=>pending.push(fn),randomUUID:()=>id,
    createPractitionerClientMessages:()=>({send:async()=>assert.fail('arrival already committed')}),
    dispatchClientMessagePush:async()=>assert.fail('wrong recipient'),
    dispatchNativeClientMessagePush:async()=>assert.fail('wrong recipient'),
    dispatchPractitionerMessagePush:async(_config,messageId)=>{sent.push(['push',messageId]);return {attempted:1,accepted:1}},
    dispatchClientTelegramNotification:async(_config,messageId)=>{sent.push(['telegram',messageId]);return {attempted:0,accepted:0}},
    sendBookingMasterEmail:async event=>{sent.push(['email',event]);return {attempted:false,reason:'not_configured'}},
    console:{error:code=>logs.push(code)},...overrides}
  return {notify:runInNewContext(source,dependencies),pending,sent,logs}
}
test('after callback reuses committed arrival without inserting a second message',async()=>{
  const c=callback()
  c.notify({}, {id:'client'},id,'master',{event:'new',revision:0,practitionerId:'assigned-master',messageId:id})
  assert.equal(c.pending.length,1);assert.equal(c.sent.length,0)
  await c.pending[0]()
  assert.deepEqual(c.sent.slice(0,2),[['push',id],['telegram',id]])
  assert.deepEqual(JSON.parse(JSON.stringify(c.sent[2])),['email',{
    requestId:id,revision:0,practitionerId:'assigned-master',event:'new'}])
})
test('provider rejection is visible through neutral operations codes without rejecting a committed booking',async()=>{
  for(const dispatch of [async()=>{throw new Error('PRIVATE_PROVIDER_PAYLOAD')},
    async()=>({attempted:1,accepted:0})]){
    const c=callback({dispatchPractitionerMessagePush:dispatch,
      sendBookingMasterEmail:async()=>{throw new Error('PRIVATE_MAIL_PAYLOAD')}})
    c.notify({}, {id:'client'},id,'master',{event:'new',revision:0,practitionerId:'assigned-master',messageId:id})
    await c.pending[0]()
    assert.ok(c.logs.includes('HH_BOOKING_EXTERNAL_NOTIFICATION_UNCONFIRMED'))
    assert.ok(c.logs.includes('HH_BOOKING_EMAIL_DELIVERY_UNCONFIRMED'))
    assert.doesNotMatch(JSON.stringify(c.logs),/PRIVATE_/)
  }
})
