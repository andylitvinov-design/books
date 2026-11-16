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
  socialAccountId:'wizards_secrets',locale:'en',title:'Test image post',
  caption:'A public post approved for the Wizards Secrets profile.',
  sourceUrl:'',campaign:'',scheduledAt:'',
  mediaUrl:'https://holistichouse.vercel.app/uploads/approved-image.jpg',
  mediaAlt:'A sunlit green garden',
  ...overrides,
})

test('the caption sent to Instagram matches the confirmed caption including the campaign link',async()=>{
  const post=approvedPost({sourceUrl:'https://holistichouse.vercel.app/about',campaign:'launch'})
  const {client,calls,fetchFn}=fakeProvider()
  await publishApprovedInstagramImage({post,expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn})
  assert.equal(calls.find(call=>call.method==='create').caption,
    post.caption+'\n\nhttps://holistichouse.vercel.app/about?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch&utm_content=en')
})

test('the Instagram caption limit includes the campaign link before provider requests',async()=>{
  const post=approvedPost({caption:'x'.repeat(2180),sourceUrl:'https://holistichouse.vercel.app/about'})
  const {client,calls,fetchFn}=fakeProvider()
  await assert.rejects(publishApprovedInstagramImage({post,expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn}),/instagram_media_preflight_failed/)
  assert.equal(calls.length,0)
})
function fakeProvider({publishFailure=false,statusCode='FINISHED',timestamp='2026-11-09T16:30:00+0000',targetId='wizards_secrets',username=META_ACCOUNT_TARGETS[targetId]?.handle||'wizards.secrets'}={}){
  const calls=[]
  const client={
    targetId,username,
    async createImageContainer(input){calls.push({method:'create',...input});return {id:'container-test-100'}},
    async getContainerStatus(id){calls.push({method:'status',id});return {id,status_code:statusCode}},
    async publishContainer(id){calls.push({method:'publish',id});if(publishFailure)throw new Error('ambiguous timeout');return {id:'media-test-200'}},
    async getPublishedMedia(id){calls.push({method:'readback',id});return {
      id:'media-test-200',permalink:'https://www.instagram.com/p/AbCdEf123/',
      ...(timestamp===null?{}:{timestamp}),media_type:'IMAGE',
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
  assert.equal(result.accountId,'wizards_secrets')
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
    post:approvedPost({socialAccountId:'andy_therapist'}),expectedRevision:3,confirmed:true,
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
  const otherProfile=fakeProvider({username:'andy.therapist'})
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,
    providerClient:otherProfile.client,fetchFn:otherProfile.fetchFn,now,
  }),/instagram_account_not_connected/)
  assert.equal(calls.length,0)
})

test('the personal professional profile uses its own exact Meta destination and provider receipt',async()=>{
  const targetId='andy_therapist'
  const {client,calls,fetchFn}=fakeProvider({targetId,username:'andy.therapist'})
  const post=approvedPost({socialAccountId:targetId,caption:'A personal professional post.'})
  const result=await publishApprovedInstagramImage({
    post,expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn,now,
  })
  assert.equal(result.state,'published')
  assert.equal(result.accountId,targetId)
  assert.equal(client.targetId,targetId)
  assert.equal(calls.filter(item=>item.method==='publish').length,1)
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

test('missing or invalid Meta provider timestamp never creates a confirmed published receipt',async()=>{
  for(const timestamp of [null,'not-a-date']){
    const {client,calls,fetchFn}=fakeProvider({timestamp})
    const result=await publishApprovedInstagramImage({post:approvedPost(),expectedRevision:3,confirmed:true,environment,providerClient:client,fetchFn,now})
    assert.equal(result.state,'delivery_unknown')
    assert.equal(calls.filter(x=>x.method==='publish').length,1)
    assert.equal(calls.filter(x=>x.method==='readback').length,1)
    assert.equal(result.publishedAt,undefined)
  }
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
  assert.deepEqual(Object.keys(META_ACCOUNT_TARGETS),['wizards_secrets','andy_therapist'])
  assert.equal(META_ACCOUNT_TARGETS.wizards_secrets.handle,'wizards.secrets')
  assert.equal(META_ACCOUNT_TARGETS.andy_therapist.handle,'andy.therapist')
})

// The same official Meta connection supports an independently gated Facebook Page.
// Reuse existing protected Meta specialist test suite (no new CI workflow).
import './growth-studio-facebook-publisher.test.mjs'
