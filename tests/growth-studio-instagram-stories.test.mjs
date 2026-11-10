import test from 'node:test'
import assert from 'node:assert/strict'
import {publishApprovedInstagramStory} from '../lib/growth-studio/instagram-publisher.mjs'
import {isSavedGrowthPost,normalizePostFields} from '../lib/growth-studio/model.mjs'

const environment={HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'true',META_GRAPH_API_VERSION:'v27.0'}
const base={
  id:'fb4a8dc4-115a-4b3a-bd3b-bc9b0eb7c3d0',revision:3,status:'approved',
  brand:'holistic_house',channel:'instagram',socialAccountId:'wizards_secrets',
  placement:'story',locale:'en',title:'A wizard secret',caption:'Approved owner copy',
  campaign:'',sourceUrl:'',scheduledAt:'',
  mediaUrl:'https://holistichouse.vercel.app/media/story.jpg',mediaAlt:'A wizard under starlight',
}
const post=(changes={})=>({...base,...changes})
const head=(video=false)=>async (_url,{method})=>{
  assert.equal(method,'HEAD')
  return new Response(null,{status:200,headers:{
    'content-type':video?'video/mp4':'image/jpeg','content-length':'50000',
  }})
}
function provider({type='BUSINESS',status='FINISHED',mediaProduct='STORY',readbackThrows=false,account='wizards_secrets'}={}){
  const calls=[]
  const client={
    targetId:account,username:'wizards.secrets',instagramAccountType:type,
    async createStoryContainer(input){calls.push({method:'create',input});return {id:'17880000001234567'}},
    async getContainerStatus(id){calls.push({method:'status',id});return {id,status_code:status}},
    async publishContainer(id){calls.push({method:'publish',id});return {id:'18000000004567891'}},
    async getPublishedMedia(id){calls.push({method:'readback',id})
      if(readbackThrows)throw new Error('unreliable provider response')
      return {id,media_product_type:mediaProduct,media_type:'IMAGE',
        timestamp:'2026-11-10T16:00:00+0000',permalink:null}
    },
  }
  return {client,calls}
}
const publish=(p,c,opts={})=>publishApprovedInstagramStory({
  post:p,expectedRevision:p.revision,confirmed:true,environment,
  providerClient:c.client,fetchFn:head(p.mediaUrl.endsWith('.mp4')),
  ...opts,
})

test('a business JPEG Story creates exactly one STORIES container and stores a permalink-free provider receipt',async()=>{
  const c=provider(),result=await publish(post(),c)
  assert.equal(result.state,'published')
  assert.equal(result.providerPostId,'18000000004567891')
  assert.equal(result.accountId,'wizards_secrets')
  assert.equal(result.mediaProductType,'STORY')
  assert.equal(result.permalink,null)
  assert.deepEqual(c.calls.map(x=>x.method),['create','status','publish','readback'])
  assert.deepEqual(c.calls[0].input,{imageUrl:base.mediaUrl})
  const saved={...post(),status:'published',revision:4,
    createdAt:'2026-11-10T15:00:00.000Z',updatedAt:'2026-11-10T16:00:00.000Z',
    delivery:{provider:'meta_graph_api',accountId:result.accountId,
      providerPostId:result.providerPostId,url:result.permalink,
      publishedAt:result.publishedAt,containerId:result.containerId,
      mediaType:result.mediaType,mediaProductType:result.mediaProductType}}
  assert.equal(isSavedGrowthPost(saved),true)
})

test('video Story waits for processing and resumes using the exact same container, without a second upload',async()=>{
  const c=provider({status:'IN_PROGRESS'})
  const initial=post({mediaUrl:'https://holistichouse.vercel.app/media/story.mp4'})
  const first=await publish(initial,c)
  assert.equal(first.state,'provider_processing')
  assert.equal(first.containerId,'17880000001234567')
  assert.deepEqual(c.calls.map(x=>x.method),['create','status'])
  assert.deepEqual(c.calls[0].input,{videoUrl:initial.mediaUrl})
  const resumed=post({...initial,status:'delivery_unknown',revision:5})
  c.client.getContainerStatus=async id=>{c.calls.push({method:'status',id});return {status_code:'FINISHED'}}
  const second=await publish(resumed,c,{resumeContainerId:first.containerId})
  assert.equal(second.state,'published')
  assert.equal(c.calls.filter(x=>x.method==='create').length,1)
  assert.equal(c.calls.filter(x=>x.method==='publish').length,1)
})

test('Creator profiles, foreign accounts and unapproved formats fail before Meta writes',async()=>{
  const creator=provider({type:'CREATOR'})
  await assert.rejects(publish(post(),creator),/meta_story_business_required/)
  assert.equal(creator.calls.length,0)
  const foreign=provider({account:'andy_therapist'})
  await assert.rejects(publish(post(),foreign),/instagram_account_not_connected/)
  assert.equal(foreign.calls.length,0)
  const jpeg=provider()
  await assert.rejects(publish(post({mediaUrl:'https://holistichouse.vercel.app/media/story.gif'}),jpeg),/instagram_media_preflight_failed/)
  assert.equal(jpeg.calls.length,0)
  await assert.rejects(publish(post({status:'draft'}),jpeg),/instagram_invalid_approved_post/)
  assert.equal(jpeg.calls.length,0)
})

test('no consent, disabled configuration and wrong revision produce zero provider calls',async()=>{
  const c=provider(),p=post()
  await assert.rejects(publishApprovedInstagramStory({post:p,expectedRevision:3,confirmed:false,
    environment,providerClient:c.client,fetchFn:head()}),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramStory({post:p,expectedRevision:2,confirmed:true,
    environment,providerClient:c.client,fetchFn:head()}),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramStory({post:p,expectedRevision:3,confirmed:true,
    environment:{...environment,HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'false'},
    providerClient:c.client,fetchFn:head()}),/instagram_publishing_disabled/)
  assert.equal(c.calls.length,0)
})

test('the provider never confirms a failed readback, wrong media product, or ambiguous processing',async()=>{
  const unavailable=provider({readbackThrows:true})
  const result=await publish(post(),unavailable)
  assert.equal(result.state,'delivery_unknown')
  assert.equal(unavailable.calls.filter(x=>x.method==='publish').length,1)
  const wrong=provider({mediaProduct:'FEED'})
  assert.equal((await publish(post(),wrong)).state,'delivery_unknown')
  const processing=provider({status:'IN_PROGRESS'})
  assert.equal((await publish(post(),processing)).state,'provider_processing')
  assert.equal(processing.calls.filter(x=>x.method==='publish').length,0)
})

test('saved Feed drafts retain their historic destination unless an owner explicitly chooses Story',()=>{
  const raw={brand:'holistic_house',channel:'instagram',socialAccountId:'wizards_secrets',
    title:'Historic',locale:'en',caption:'Ordinary Feed copy',sourceUrl:'',campaign:'',
    scheduledAt:'',mediaUrl:'',mediaAlt:''}
  assert.equal(normalizePostFields(raw).placement,'feed')
  assert.equal(normalizePostFields({...raw,placement:'story'}).placement,'story')
  assert.throws(()=>normalizePostFields({...raw,channel:'telegram',socialAccountId:'',
    placement:'story'}),/invalid_post/)
})
