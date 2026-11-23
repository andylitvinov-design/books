import test from 'node:test'
import assert from 'node:assert/strict'
import { issueDaybookCoachTicket, verifyDaybookCoachTicket } from '../lib/app/daybook-coach-ticket.mjs'
const config={encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'test'}
const actor={id:'11111111-1111-4111-8111-111111111111'}
const other={id:'22222222-2222-4222-8222-222222222222'}
const selection={kind:'journal',itemId:'33333333-3333-4333-8333-333333333333',revision:7,coachId:'mira'}
const now=1795399200000
test('encrypted locator roundtrips only for its owner and chosen existing coach',()=>{
 const issued=issueDaybookCoachTicket(config,actor,selection,now)
 assert.deepEqual(verifyDaybookCoachTicket(config,actor,issued.token,'mira',now),selection)
 assert.equal(issued.expiresAt,now+45*60*1000)
 assert.ok(issued.token.length<=2048)
 assert.ok(!issued.token.includes(selection.itemId))
 assert.equal(verifyDaybookCoachTicket(config,other,issued.token,'mira',now),null)
 assert.equal(verifyDaybookCoachTicket(config,actor,issued.token,'max',now),null)
 assert.notEqual(issueDaybookCoachTicket(config,actor,selection,now).token,issued.token)
})
test('expiry, future issuance, changed encryption key and every ciphertext tamper fail closed',()=>{
 const {token,expiresAt}=issueDaybookCoachTicket(config,actor,selection,now)
 assert.equal(verifyDaybookCoachTicket(config,actor,token,'mira',expiresAt),null)
 assert.equal(verifyDaybookCoachTicket(config,actor,token,'mira',now-1),null)
 assert.equal(verifyDaybookCoachTicket({...config,encryptionKey:Buffer.alloc(32,43)},actor,token,'mira',now),null)
 const [id,encoded]=token.split('.')
 const envelope=JSON.parse(Buffer.from(encoded,'base64url').toString())
 for(const key of ['iv','tag','data']){
  const changed={...envelope,[key]:Buffer.from('tampered bytes').toString('base64')}
  assert.equal(verifyDaybookCoachTicket(config,actor,id+'.'+Buffer.from(JSON.stringify(changed)).toString('base64url'),'mira',now),null)
 }
 assert.equal(verifyDaybookCoachTicket(config,actor,other.id+'.'+encoded,'mira',now),null)
})
test('ticket issue accepts only saved source locators, never diary text or arbitrary coaches',()=>{
 for(const patch of [{text:'private diary'}, {kind:'report'}, {revision:0}, {revision:'7'},
  {revision:Infinity},{revision:Number.MAX_SAFE_INTEGER+1},{itemId:other.id+'x'}, {coachId:'unknown'}]){
  assert.throws(()=>issueDaybookCoachTicket(config,actor,{...selection,...patch},now))
 }
 const goal={...selection,kind:'goal'}
 assert.deepEqual(verifyDaybookCoachTicket(config,actor,issueDaybookCoachTicket(config,actor,goal,now).token,'mira',now),goal)
})
test('untrusted oversized, noncanonical and malformed tokens never throw or resolve',()=>{
 const {token}=issueDaybookCoachTicket(config,actor,selection,now)
 for(const value of [null,{},[],0,'',token+'=',token+'.extra','x'.repeat(2049),
  token.slice(0,36)+'.'+Buffer.from('null').toString('base64url')]){
  assert.equal(verifyDaybookCoachTicket(config,actor,value,'mira',now),null)
 }
 assert.equal(verifyDaybookCoachTicket(config,null,token,'mira',now),null)
 assert.equal(verifyDaybookCoachTicket(config,actor,token,'mira',NaN),null)
})
