import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {AppError,requireUUID} from '../lib/assessments/contracts.js'

const source=readFileSync(new URL('../lib/app/session.js',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/export /g,'')+'; createRequestAuth'
const user='11111111-1111-4111-8111-111111111111'
const session='22222222-2222-4222-8222-222222222222'
const jwt=claims=>'synthetic.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.synthetic'
function fixture({claims={sub:user,session_id:session,exp:Math.floor(Date.now()/1000)+300},verifiedUser=user,error=null,rawToken=null}={}){
 const calls=[]
 const createServerClient=()=>({auth:{
  getUser:async()=>{calls.push('getUser');return {data:{user:verifiedUser?{id:verifiedUser,email:'synthetic@example.test'}:null},error}},
  getSession:async()=>{calls.push('getSession');return {data:{session:{access_token:rawToken||jwt(claims)}},error:null}},
 }})
 const create=runInNewContext(source,{createServerClient,AppError,requireUUID,Buffer,Map,Set,Date,JSON})
 return {auth:create({cookies:{getAll:()=>[]}},{test:true}),calls}
}
test('server verifies identity before using session claims',async()=>{
 const {auth,calls}=fixture()
 const actor=await auth.verified()
 assert.equal(actor.id,user)
 assert.deepEqual(calls,['getUser','getSession'])
})
test('unverified, expired, mismatched or malformed identities cannot authenticate',async()=>{
 for(const settings of [{verifiedUser:null},{error:new Error('unverified')}]){
  const {auth,calls}=fixture(settings)
  await assert.rejects(auth.verified(),e=>e.code==='SIGN_IN_REQUIRED')
  assert.deepEqual(calls,['getUser'])
 }
 for(const [settings,code] of [
  [{verifiedUser:'33333333-3333-4333-8333-333333333333'},'SIGN_IN_REQUIRED'],
  [{claims:{sub:user,session_id:session,exp:1}},'SIGN_IN_REQUIRED'],
  [{claims:{sub:user,session_id:session,exp:'9999999999'}},'SIGN_IN_REQUIRED'],
  [{rawToken:'synthetic.not-json.synthetic'},'SIGN_IN_REQUIRED'],
  [{claims:{sub:user,exp:Math.floor(Date.now()/1000)+300}},'INVALID_ID'],
 ]){
  const {auth}=fixture(settings)
  await assert.rejects(auth.verified(),e=>e.code===code)
 }
})
