import test from 'node:test'
import assert from 'node:assert/strict'
import {encryptInstagramAccessToken} from '../lib/growth-studio/instagram-meta.mjs'
import {publishApprovedInstagramImage,isInstagramPublisherEnabled} from '../lib/growth-studio/instagram-publisher.mjs'

const key=Buffer.alloc(32,11).toString('base64')
const token='long-lived-instagram-token-for-tests'
const now=new Date('2026-11-09T16:30:00.000Z')
const environment={
  HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'true',
  HH_GROWTH_INSTAGRAM_GRAPH_API_VERSION:'v25.0',
  HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY:key,
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
const accountStore={
  async getProviderConnection(accountId){
    return {
      identity:{
        accountId,providerAccountId:'ig-test-100',username:'my.coach.ai',
        connectionState:'connected',
        permissions:['instagram_business_basic','instagram_business_content_publish'],
        expiresAt:'2027-01-01T00:00:00.000Z',
      },
      envelope:encryptInstagramAccessToken(token,key),
    }
  },
}
function fakeProvider({publishFailure=false,statusCode='FINISHED'}={}){
  const calls=[]
  const fetchFn=async(url,options={})=>{
    const parsed=new URL(String(url))
    calls.push({url:String(url),method:options.method||'GET',headers:options.headers||{},body:options.body||''})
    if(options.method==='HEAD'){
      return new Response(null,{status:200,headers:{'content-type':'image/jpeg','content-length':'12345'}})
    }
    if(parsed.pathname.endsWith('/media_publish')){
      if(publishFailure)throw new Error('synthetic timeout after request')
      return new Response(JSON.stringify({id:'media-test-200'}),{status:200,headers:{'content-type':'application/json'}})
    }
    if(parsed.pathname.endsWith('/media')&&options.method==='POST'){
      return new Response(JSON.stringify({id:'container-test-100'}),{status:200,headers:{'content-type':'application/json'}})
    }
    if(parsed.pathname.endsWith('/container-test-100')){
      return new Response(JSON.stringify({id:'container-test-100',status_code:statusCode}),{status:200,headers:{'content-type':'application/json'}})
    }
    if(parsed.pathname.endsWith('/media-test-200')){
      return new Response(JSON.stringify({
        id:'media-test-200',permalink:'https://www.instagram.com/p/AbCdEf123/',
        timestamp:'2026-11-09T16:30:00+0000',media_type:'IMAGE',
      }),{status:200,headers:{'content-type':'application/json'}})
    }
    throw new Error('unexpected_provider_url')
  }
  return {calls,fetchFn}
}

test('Instagram publishing is disabled by default and requires an explicit owner confirmation',async()=>{
  assert.equal(isInstagramPublisherEnabled({}),false)
  assert.equal(isInstagramPublisherEnabled(environment),true)
  let calls=0
  const fetchFn=async()=>{calls++;throw new Error('must_not_fetch')}
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,
    environment:{...environment,HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'false'},
    accountStore,fetchFn,now,
  }),/instagram_publishing_disabled/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:false,environment,accountStore,fetchFn,now,
  }),/instagram_invalid_approved_post/)
  assert.equal(calls,0)
})

test('approved JPEG Feed Post uses the bound account, public media, provider container and readback',async()=>{
  const {calls,fetchFn}=fakeProvider()
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,accountStore,fetchFn,now,
  })
  assert.equal(result.state,'published')
  assert.equal(result.accountId,'my_coach_ai')
  assert.equal(result.providerPostId,'media-test-200')
  assert.equal(result.permalink,'https://www.instagram.com/p/AbCdEf123/')
  assert.equal(result.containerId,'container-test-100')
  assert.equal(calls.length,5)
  assert.equal(calls[0].method,'HEAD')
  assert.equal(calls[1].method,'POST')
  assert.equal(calls[1].url,'https://graph.instagram.com/v25.0/ig-test-100/media')
  assert.equal(calls[1].headers.Authorization,'Bearer '+token)
  const body=new URLSearchParams(calls[1].body)
  assert.equal(body.get('image_url'),approvedPost().mediaUrl)
  assert.equal(body.get('alt_text'),approvedPost().mediaAlt)
  assert.equal(calls[2].method,'GET')
  assert.equal(calls[3].method,'POST')
  assert.equal(calls[3].url,'https://graph.instagram.com/v25.0/ig-test-100/media_publish')
  assert.equal(calls[4].method,'GET')
})

test('account, permission, approval revision and media constraints fail before provider writes',async()=>{
  const {calls,fetchFn}=fakeProvider()
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({socialAccountId:'my_couch_ai'}),expectedRevision:3,confirmed:true,
    environment,accountStore,fetchFn,now,
  }),/instagram_account_not_connected/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({revision:4}),expectedRevision:3,confirmed:true,
    environment,accountStore,fetchFn,now,
  }),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({mediaUrl:'https://holistichouse.vercel.app/uploads/private-test.pdf'}),expectedRevision:3,confirmed:true,
    environment,accountStore,fetchFn,now,
  }),/instagram_media_preflight_failed/)
  await assert.rejects(publishApprovedInstagramImage({
    post:approvedPost({mediaAlt:''}),expectedRevision:3,confirmed:true,
    environment,accountStore,fetchFn,now,
  }),/instagram_media_preflight_failed/)
  assert.equal(calls.length,0)
})

test('ambiguous media_publish response returns delivery_unknown and must never be labelled published',async()=>{
  const {calls,fetchFn}=fakeProvider({publishFailure:true})
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,accountStore,fetchFn,now,
  })
  assert.equal(result.state,'delivery_unknown')
  assert.equal(result.containerId,'container-test-100')
  assert.equal(calls.filter(x=>x.url.includes('/media_publish')).length,1)
})

test('container not ready is returned as provider_processing without publishing',async()=>{
  const {calls,fetchFn}=fakeProvider({statusCode:'IN_PROGRESS'})
  const result=await publishApprovedInstagramImage({
    post:approvedPost(),expectedRevision:3,confirmed:true,environment,accountStore,fetchFn,now,
  })
  assert.equal(result.state,'provider_processing')
  assert.equal(calls.some(x=>x.url.includes('/media_publish')),false)
})
