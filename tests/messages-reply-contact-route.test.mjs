import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {AppError} from '../lib/assessments/contracts.js'
import {PRIVATE_HEADERS} from '../lib/app/http.js'

const source=readFileSync(new URL('../app/api/app/messages/public-enquiries/[id]/reply-contact/route.js',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/export /g,'')+'; POST'
const account='11111111-1111-4111-8111-111111111111'
const enquiry='22222222-2222-4222-8222-222222222222'
function fixture({signedIn=true,origin=true,header=account,allowed=true}={}){
 const calls=[]
 const actor={id:account}
 const auth={verified:async()=>{calls.push('verified');if(!signedIn)throw new AppError('SIGN_IN_REQUIRED',401);return actor},
  apply:response=>response}
 const post=runInNewContext(source,{
  AppError,PRIVATE_HEADERS,NextResponse:{json:(body,options)=>({body,...options})},
  getAppConfig:()=>({}),requestOrigin:()=>{},
  requireSameOrigin:()=>{if(!origin)throw new AppError('ORIGIN_DENIED',403)},
  createRequestAuth:()=>auth,
  revealPublicEnquiryContact:async(_config,received,id)=>{
   calls.push('reveal');assert.equal(received,actor);assert.equal(id,enquiry)
   if(!allowed)throw new AppError('NOT_FOUND',404)
   return {email:'synthetic@example.test',phone:''}
  },
 })
 return {post,request:{headers:{get:name=>name==='x-hh-account-id'?header:null}},calls}
}
test('contact route denies cross-origin, unsigned, wrong-account and unauthorized requests',async()=>{
 for(const [settings,status,code] of [
  [{origin:false},403,'ORIGIN_DENIED'],[{signedIn:false},401,'SIGN_IN_REQUIRED'],
  [{header:'other'},409,'ACCOUNT_CHANGED'],[{allowed:false},404,'NOT_FOUND'],
 ]){
  const f=fixture(settings)
  const result=await f.post(f.request,{params:Promise.resolve({id:enquiry})})
  assert.equal(result.status,status)
  assert.equal(result.body.error,code)
  assert.equal(result.headers['Cache-Control'],PRIVATE_HEADERS['Cache-Control'])
  assert.equal(result.body.contact,undefined)
  if(settings.allowed!==false)assert.equal(f.calls.includes('reveal'),false)
 }
})
test('contact route returns no-store only after verified current account and authorized reveal',async()=>{
 const f=fixture(),result=await f.post(f.request,{params:Promise.resolve({id:enquiry})})
 assert.deepEqual(f.calls,['verified','reveal'])
 assert.equal(result.body.contact.email,'synthetic@example.test')
 assert.equal(result.headers['Cache-Control'],PRIVATE_HEADERS['Cache-Control'])
})
