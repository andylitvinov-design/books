import test from 'node:test'
import assert from 'node:assert/strict'
import {serviceEnquiryAction,publicQaRequestAction,fulfillSyntheticServiceEnquiry,createPopupClosureTracker,closePublicQaContext} from '../scripts/helpers/public-browser-network-guard.mjs'

const origin='http://127.0.0.1:3100'
test('only the exact loopback service-enquiry POST may receive a synthetic receipt',()=>{
  assert.equal(serviceEnquiryAction(origin+'/api/service-enquiries','POST',origin),'mock')
  for(const method of ['GET','HEAD','PUT','PATCH','DELETE','OPTIONS'])
    assert.equal(serviceEnquiryAction(origin+'/api/service-enquiries',method,origin),'block',method)
  for(const url of ['https://example.test/api/service-enquiries',origin+'/api/service-enquiries?unexpected=1',origin+'/api/service-enquiries/','invalid'])
    assert.equal(serviceEnquiryAction(url,'POST',origin),'block',url)
})
test('endpoint handler aborts and records foreign POST and nonPOST without reading payload or continuing transport',async()=>{
  for(const [url,method] of [[origin+'/api/service-enquiries','PATCH'],[origin+'/api/service-enquiries','GET'],['https://example.test/api/service-enquiries','POST']]){
    const calls=[],submissions=[],failures=[]
    const route={request:()=>({url:()=>url,method:()=>method,postData:()=>{throw new Error('Must not read blocked payload')}}),
      abort:async()=>calls.push('abort'),continue:async()=>{throw new Error('Transport forbidden')},fulfill:async()=>{throw new Error('Must not fulfill blocked request')}}
    await fulfillSyntheticServiceEnquiry(route,origin,submissions,failures)
    assert.deepEqual(calls,['abort']);assert.deepEqual(submissions,[])
    assert.deepEqual(failures,['UNEXPECTED_SERVICE_ENQUIRY_REQUEST'])
  }
})
test('unknown mutations are fatal classifications while blocked external static reads are distinct',()=>{
  assert.equal(publicQaRequestAction(origin+'/api/unknown','POST',origin),'block-mutation')
  assert.equal(publicQaRequestAction(origin+'/api/unknown','DELETE',origin),'block-mutation')
  assert.equal(publicQaRequestAction('https://example.test/image.png','GET',origin),'block-read')
  assert.equal(publicQaRequestAction(origin+'/image.png','GET',origin),'allow-read')
})
test('exact loopback POST gets one synthetic receipt and no transport continuation',async()=>{
  const calls=[],submissions=[],failures=[]
  const route={request:()=>({url:()=>origin+'/api/service-enquiries',method:()=>'POST',postData:()=>'{"synthetic":true}'}),
    abort:async()=>{throw new Error('Unexpected abort')},continue:async()=>{throw new Error('Transport forbidden')},fulfill:async value=>calls.push(value)}
  await fulfillSyntheticServiceEnquiry(route,origin,submissions,failures)
  assert.deepEqual(submissions,[{synthetic:true}]);assert.deepEqual(failures,[])
  assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].body),{saved:true,referenceCode:'HH-CA5016DE79E4'})
})
test('cleanup drains failures from a popup created during context close without leaking error messages',async()=>{
  let closed=0
  const page={close:async()=>{}}
  const popups=createPopupClosureTracker(page)
  popups.close(page)
  popups.close({close:async()=>{closed++}})
  const context={close:async()=>{popups.close({close:async()=>{closed++;throw new Error('PRIVATE_DIAGNOSTIC')}})}}
  assert.deepEqual(await closePublicQaContext(page,context,popups),['POPUP_CLOSE_FAILED'])
  assert.equal(closed,2)
})
test('cleanup attempts all operations and never replaces the primary assertion failure',async()=>{
  const original=new Error('ORIGINAL_ASSERTION')
  const page={close:async()=>{throw new Error('private page error')}}
  const context={close:async()=>{throw new Error('private context error')}}
  const popups=createPopupClosureTracker(page)
  let cleanup=[]
  await assert.rejects(async()=>{
    try { throw original }
    finally { cleanup=await closePublicQaContext(page,context,popups) }
  },error=>error===original)
  assert.deepEqual(cleanup,['PAGE_CLOSE_FAILED','CONTEXT_CLOSE_FAILED'])
})
