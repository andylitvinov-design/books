import test from 'node:test'
import assert from 'node:assert/strict'
import {META_ACCOUNT_TARGETS} from '../lib/growth-studio/meta-instagram.mjs'
import {publishApprovedInstagramImage,isInstagramPublisherEnabled} from '../lib/growth-studio/instagram-publisher.mjs'

const now=new Date('2026-11-09T16:30:00.000Z')
const environment={
  HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'true',
  META_GRAPH_API_VERSION:'v27.0',
}
const approvedPost=(overrides={})=>({
  id:'fb4a8dc4-115a-4b3a-bd3b-bc9b0eb7c3d0',
  revision:3,status:'approved',brand:'holistic_house',channel:'instagram',
  socialAccountId:'my_coach_ai',locale:'en',title:'Test image post',
  caption:'A public post approved for the My Coach AI profile.',
  mediaUrl:'https://holistichouse.vercel.app/uploads/approved-image.jpg',
  mediaAlt:'A sunlit green garden',
  ...overrides,
})
function fakeProvider({publishFailure=false,statusCode='FINISHED',username='my.coach.ai'}={}){
  const calls=[]
  const client={
    targetId:'my_coach_ai',username,
    async createImageContainer(input){calls.push({method:'create',...input});return {id:'container-test-100'}},
    async getContainerStatus(id){calls.push({method:'status',id});return {id,status_code:statusCode}},
    async publishContainer(id){calls.push({method:'publish',id});if(publishFailure)throw new Error('ambiguous timeout');return {id:'media-test-200'}},
    async getPublishedMedia(id){calls.push({method:'readback',id});return {
      id:'media-test-200',permalink:'https://www.instagram.com/p/AbCdEf123/',
      timestamp:'2026-11-09T16:30:00+0000',media_type:'IMAGE',
    }},
  }
  const fetchFn=async(url,options={})=>{
    calls.push({method:'preflight',url:String(url),fetchMethod:options.method})
    if(options.method==='HEAD')return new Response(null,{status:200,headers:{'content-type':'image/jpeg','content-length':'12345'}})
    throw new Error('unexpected network request')
  }
  return {client,calls,fetchFn}
}

test('Instagram publishing remains disabled by default and requires explicit owner confirmation',async()=>{
  assert.equal(isInstagramPublisherEnabled({}),false)
  assert.equal(isInstagramPublisherEnabled(environment),true)
  let calls=0
  const {client}=fakeProvider()
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,
    environment:{...environment,HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'false'},
    providerClient:client,fetchFn:async()=>{calls++;throw new Error('must_not_fetch')},now,
  }),/instagram_publishing_disabled/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:false,environment,
    providerClient:client,fetchFn:async()=>{calls++;throw new Error('must_not_fetch')},now,
  }),/instagram_invalid_approved_post/)
  assert.equal(calls,0)
})

test('approved JPEG Feed Post uses the existing Meta Graph account client and requires provider readback',async()=>{
  const {client,calls,fetchFn}=fakeProvider()
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn,now,
  })
  assert.equal(result.state,'published')
  assert.equal(result.provider,'meta_graph_api')
  assert.equal(result.accountId,'my_coach_ai')
  assert.equal(result.providerPostId,'media-test-200')
  assert.equal(result.permalink,'https://www.instagram.com/p/AbCdEf123/')
  assert.equal(result.containerId,'container-test-100')
  assert.deepEqual(calls.map(x=>x.method),['preflight','create','status','publish','readback'])
  assert.equal(calls[0].fetchMethod,'HEAD')
  assert.equal(calls[1].imageUrl,approvedPost().mediaUrl)
  assert.equal(calls[1].altText,approvedPost().mediaAlt)
  assert.equal(calls[3].id,'container-test-100')
  assert.equal(calls[4].id,'media-test-200')
})

test('wrong Meta handle, wrong account, missing approval revision and unsupported media fail before provider writes',async()=>{
  const {client,calls,fetchFn}=fakeProvider()
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({socialAccountId:'my_couch_ai'}),expectedRevision:3,confirmed:true,
    environment,providerClient:client,fetchFn,now,
  }),/instagram_account_not_connected/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({revision:4}),expectedRevision:3,confirmed:true,
    environment,providerClient:client,fetchFn,now,
  }),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({mediaUrl:'https://holistichouse.vercel.app/uploads/private-test.pdf'}),expectedRevision:3,confirmed:true,
    environment,providerClient:client,fetchFn,now,
  }),/instagram_media_preflight_failed/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({mediaAlt:''}),expectedRevision:3,confirmed:true,
    environment,providerClient:client,fetchFn,now,
  }),/instagram_media_preflight_failed/)
  const otherProfile=fakeProvider({username:'my.couch.ai'})
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,
    providerClient:otherProfile.client,fetchFn:otherProfile.fetchFn,now,
  }),/instagram_account_not_connected/)
  assert.equal(calls.length,0)
})

test('ambiguous media_publish response returns delivery_unknown and is never labelled published',async()=>{
  const {client,calls,fetchFn}=fakeProvider({publishFailure:true})
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn,now,
  })
  assert.equal(result.state,'delivery_unknown')
  assert.equal(result.containerId,'container-test-100')
  assert.equal(calls.filter(x=>x.method==='publish').length,1)
  assert.equal(calls.some(x=>x.method==='readback'),false)
})

test('container not ready is returned as provider_processing without publish',async()=>{
  const {client,calls,fetchFn}=fakeProvider({statusCode:'IN_PROGRESS'})
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn,now,
  })
  assert.equal(result.state,'provider_processing')
  assert.equal(result.providerStatus,'IN_PROGRESS')
  assert.equal(calls.some(x=>x.method==='publish'),false)
})

test('only registered account IDs are accepted by the official Meta account mapping',()=>{
  assert.deepEqual(Object.keys(META_ACCOUNT_TARGETS),['my_coach_ai','my_couch_ai'])
  assert.equal(META_ACCOUNT_TARGETS.my_coach_ai.handle,'my.coach.ai')
  assert.equal(META_ACCOUNT_TARGETS.my_couch_ai.handle,'my.couch.ai')
})
