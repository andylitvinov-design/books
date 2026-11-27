import test from 'node:test'
import assert from 'node:assert/strict'
import {safePageAuthReturnPath,pageAuthSuccessPath,rememberPageAuthAction,takePageAuthAction,PAGE_AUTH_KEY} from '../lib/app/page-auth-continuation.mjs'
const now=1234567890000
function browser(path){
 const store=new Map()
 const b={location:new URL('https://holistichouse.vercel.app'+path),sessionStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)},history:{state:{},replaceState:(_,__,path)=>{b.location=new URL(path,b.location.origin)}}}
 return b
}
test('only known first-party locale routes and public scalar selection are accepted',()=>{
 for(const lang of ['en','ru','es']){
  const p='/'+lang+'/coaching/sessions?coach=genie&method=grow&warmth=3'
  assert.equal(safePageAuthReturnPath(p,'my-coach-action',lang),true)
  assert.equal(pageAuthSuccessPath(p,'my-coach-action',lang),p+'&hh_resume=my-coach-action')
 }
 assert.equal(safePageAuthReturnPath('/es/academy/principles-of-energywork','energywork-daybook','en'),true)
 for(const p of ['https://evil.test/','//evil.test','/\\evil.test','/en/../my-coach','/en/my-coach?coach=mira&coach=max','/en/my-coach?next=https://evil.test','/en/api/app/auth/callback','/en/my-coach?token=abc','/en/my-coach%2f..','/en/my-coach#x'])
  assert.equal(safePageAuthReturnPath(p,'my-coach-action','en'),false,p)
 assert.equal(safePageAuthReturnPath('/ru/my-coach','my-coach-action','en'),false)
 assert.equal(safePageAuthReturnPath('/en/my-coach','enquiry','en'),false)
})
test('coach selection is resumed once on exactly the original source, after callback marker',()=>{
 const b=browser('/ru/my-coach#all-coaches')
 const input={continuation:'my-coach-action',locale:'ru',kind:'coach-link',action:{href:'/ru/coaching/sessions?coach=genie&warmth=4'}}
 const path=rememberPageAuthAction(input,b,now)
 assert.equal(path,'/ru/my-coach')
 assert.equal(takePageAuthAction(input,b,now+100),null)
 b.location=new URL('https://holistichouse.vercel.app'+pageAuthSuccessPath(path,input.continuation,input.locale))
 assert.deepEqual(takePageAuthAction(input,b,now+200),input.action)
 assert.equal(b.location.hash,'#all-coaches')
 assert.equal(b.location.search,'')
 assert.equal(takePageAuthAction(input,b,now+300),null)
 assert.equal(b.sessionStorage.getItem(PAGE_AUTH_KEY),null)
})
test('Reiki Spanish preserves originating language; cancellation and expiry never resume',()=>{
 const input={continuation:'energywork-daybook',locale:'en',kind:'reiki',action:{}}
 for(const [suffix,at,expected] of [['?hh_resume=energywork-daybook',now+1,{}],['?auth=cancelled',now+1,null],['?hh_resume=energywork-daybook',now+900001,null]]){
  const b=browser('/es/academy/principles-of-energywork')
  const path=rememberPageAuthAction(input,b,now)
  b.location=new URL('https://holistichouse.vercel.app'+path+suffix)
  assert.deepEqual(takePageAuthAction(input,b,at),expected)
 }
})
test('unrelated component cannot consume pending action and arbitrary navigation cannot be staged',()=>{
 const b=browser('/en/coaching/sessions?coach=mira')
 const input={continuation:'my-coach-action',locale:'en',kind:'coach-topic',action:{id:'clarity-1'}}
 const p=rememberPageAuthAction(input,b,now)
 b.location=new URL('https://holistichouse.vercel.app'+pageAuthSuccessPath(p,input.continuation,input.locale))
 assert.equal(takePageAuthAction({...input,kind:'coach-link'},b,now+1),null)
 assert.deepEqual(takePageAuthAction(input,b,now+2),input.action)
 assert.throws(()=>rememberPageAuthAction({...input,kind:'coach-link',action:{href:'//evil.test'}},b,now))
})

test('Clarity day survives Google continuation without allowing private run identifiers or out-of-range days',()=>{
 const input={continuation:'my-coach-action',locale:'ru',kind:'coach-link',action:{href:'/ru/coaching/sessions?coach=genie&clarityDay=2'}}
 const b=browser('/ru/my-coach?clarityDay=2')
 const path=rememberPageAuthAction(input,b,now)
 assert.equal(path,'/ru/my-coach?clarityDay=2')
 b.location=new URL('https://holistichouse.vercel.app'+pageAuthSuccessPath(path,input.continuation,input.locale))
 assert.deepEqual(takePageAuthAction(input,b,now+1),input.action)
 for(const day of ['0','4','02','-1'])assert.equal(safePageAuthReturnPath('/ru/my-coach?clarityDay='+day,input.continuation,input.locale),false)
 assert.equal(safePageAuthReturnPath('/ru/my-coach?clarityDay=1&clarityDay=2',input.continuation,input.locale),false)
 assert.equal(safePageAuthReturnPath('/ru/my-coach?courseRunId=private',input.continuation,input.locale),false)
})


test('opaque Clarity run continuation keeps its exact day and rejects unrelated or malformed scope',()=>{
 const id='12345678-1234-4234-8234-123456789abc'
 assert.equal(safePageAuthReturnPath('/en/coaching/sessions?coach=mira&clarityDay=2&courseRunId='+id,'my-coach-action','en'),true)
 assert.equal(safePageAuthReturnPath('/en/coaching/sessions?coach=mira&courseRunId='+id,'my-coach-action','en'),false)
 assert.equal(safePageAuthReturnPath('/en/app/daybook?clarityDay=2&courseRunId='+id,'my-coach-action','en'),false)
 assert.equal(safePageAuthReturnPath('/en/coaching/sessions?coach=mira&clarityDay=2&courseRunId=unknown','my-coach-action','en'),false)
})
