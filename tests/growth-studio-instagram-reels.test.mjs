import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {publishApprovedInstagramReel} from '../lib/growth-studio/instagram-publisher.mjs'
import {normalizePostFields,isSavedGrowthPost} from '../lib/growth-studio/model.mjs'
import {getInstagramManualHandoff} from '../lib/growth-studio/instagram-manual-handoff.mjs'
import {instagramPublishReadiness} from '../lib/growth-studio/instagram-publish-readiness.mjs'
import {reviewGrowthPublication} from '../lib/growth-studio/channel-capabilities.mjs'

const environment={HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'true',META_GRAPH_API_VERSION:'v27.0'}
const base={
  id:'fb4a8dc4-115a-4b3a-bd3b-bc9b0eb7c3d0',revision:3,status:'approved',
  brand:'holistic_house',channel:'instagram',socialAccountId:'wizards_secrets',
  placement:'reel',locale:'en',title:'A wisdom Reel',caption:'A public, approved Reel.',
  campaign:'',sourceUrl:'',scheduledAt:'',
  mediaUrl:'https://holistichouse.vercel.app/media/wisdom.mp4',mediaAlt:'',
}
const post=(changes={})=>({...base,...changes})
const head=(type='video/mp4',length='123456')=>async (_url,{method})=>{
  assert.equal(method,'HEAD')
  return new Response(null,{status:200,headers:{
    'content-type':type,...(length===null?{}:{'content-length':length}),
  }})
}
function fake({account='wizards_secrets',username='wizards.secrets',accountType='BUSINESS',
  status='FINISHED',product='REELS',mediaType='VIDEO',
  permalink='https://www.instagram.com/reel/Cba123_/',publishFails=false,
  readbackFails=false,timestamp='2026-11-22T15:00:00+0000'}={}){
  const calls=[]
  const client={
    targetId:account,username,instagramAccountType:accountType,
    async createReelContainer(input){calls.push({type:'create',input});return {id:'17880000001234567'}},
    async getContainerStatus(id){calls.push({type:'status',id});return {id,status_code:status}},
    async publishContainer(id){calls.push({type:'publish',id});if(publishFails)throw Error('timeout');return {id:'18000000004567891'}},
    async getPublishedMedia(id){calls.push({type:'readback',id});if(readbackFails)throw Error('timeout')
      return {id,media_product_type:product,media_type:mediaType,permalink,timestamp}},
  }
  return {client,calls}
}
const publish=(p,c,opts={})=>publishApprovedInstagramReel({
  post:p,expectedRevision:p.revision,confirmed:true,environment,
  providerClient:c.client,fetchFn:head(),...opts,
})

test('approved MP4 Reel publishes through exactly one container with full campaign caption and verifiable readback',async()=>{
  const p=post({campaign:'launch',sourceUrl:'https://holistichouse.vercel.app/about'})
  const c=fake()
  const outcome=await publish(p,c)
  assert.equal(outcome.state,'published')
  assert.equal(outcome.accountId,'wizards_secrets')
  assert.equal(outcome.providerPostId,'18000000004567891')
  assert.equal(outcome.mediaProductType,'REELS')
  assert.equal(outcome.mediaType,'VIDEO')
  assert.deepEqual(c.calls.map(v=>v.type),['create','status','publish','readback'])
  assert.equal(c.calls[0].input.videoUrl,p.mediaUrl)
  assert.equal(c.calls[0].input.shareToFeed,true)
  assert.equal(c.calls[0].input.caption,p.caption+'\n\nhttps://holistichouse.vercel.app/about?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch&utm_content=en')
  const saved={...p,status:'published',revision:5,createdAt:'2026-11-22T14:00:00.000Z',
    updatedAt:'2026-11-22T15:00:00.000Z',
    delivery:{provider:outcome.provider,accountId:outcome.accountId,
      providerPostId:outcome.providerPostId,url:outcome.permalink,
      publishedAt:outcome.publishedAt,containerId:outcome.containerId,
      mediaType:outcome.mediaType,mediaProductType:outcome.mediaProductType}}
  assert.equal(isSavedGrowthPost(saved),true)
  assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,mediaProductType:'STORY'}}),false)
  assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,url:'https://www.instagram.com/p/FakePost/'}}),false)
  assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,accountId:'andy_therapist'}}),false)
})

test('Reels may be sent to verified Creator or Business profiles but never foreign identities',async()=>{
  const creator=fake({accountType:'CREATOR'})
  assert.equal((await publish(post(),creator)).state,'published')
  const foreign=fake({account:'andy_therapist'})
  await assert.rejects(publish(post(),foreign),/instagram_account_not_connected/)
  assert.equal(foreign.calls.length,0)
  const snap={configuration:{authorizationReady:true,publishFlagEnabled:true},
    accounts:[{targetId:'wizards_secrets',handle:'wizards.secrets',connectionState:'connected',
      instagramAccountType:'CREATOR'}]}
  assert.deepEqual(instagramPublishReadiness(snap,'wizards_secrets','reel'),{ready:true,reason:null})
  assert.equal(instagramPublishReadiness(snap,'wizards_secrets','story').reason,'meta_story_business_required')
})

test('no authorization, wrong revision or unsupported media never creates a container',async()=>{
  const c=fake()
  for(const p of [post({status:'draft'}),post({placement:'story'}),
    post({mediaUrl:'https://holistichouse.vercel.app/en/client/file.mp4'}),
    post({mediaUrl:'https://other.example/video.mp4'}),
    post({mediaUrl:'https://holistichouse.vercel.app/media/movie.mov'}),
    post({sourceUrl:'https://holistichouse.vercel.app/en/myspace/private'}),
    post({caption:'x'.repeat(2300)})]){
    await assert.rejects(publish(p,c),/instagram_/)
  }
  await assert.rejects(publishApprovedInstagramReel({
    post:post(),expectedRevision:3,confirmed:false,environment,
    providerClient:c.client,fetchFn:head()}),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramReel({
    post:post(),expectedRevision:2,confirmed:true,environment,
    providerClient:c.client,fetchFn:head()}),/instagram_invalid_approved_post/)
  await assert.rejects(publishApprovedInstagramReel({
    post:post(),expectedRevision:3,confirmed:true,
    environment:{...environment,HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED:'false'},
    providerClient:c.client,fetchFn:head()}),/instagram_publishing_disabled/)
  assert.equal(c.calls.length,0)
})

test('MP4 HEAD preflight rejects nonvideo MIME and >1GB, without Meta writes',async()=>{
  const c=fake()
  for(const [type,length] of [['text/html','123'],['video/mp4',String(1024*1024*1024+1)],['video/mp4','-1']]){
    await assert.rejects(publish(post(),c,{fetchFn:head(type,length)}),/instagram_media_preflight_failed/)
  }
  assert.equal(c.calls.length,0)
})

test('processing resumes with the exact known Meta container without a new upload',async()=>{
  const c=fake({status:'IN_PROGRESS'})
  const first=await publish(post(),c)
  assert.equal(first.state,'provider_processing')
  assert.equal(first.containerId,'17880000001234567')
  assert.deepEqual(c.calls.map(v=>v.type),['create','status'])
  c.client.getContainerStatus=async id=>{c.calls.push({type:'status',id});return {status_code:'FINISHED'}}
  const pending=post({status:'delivery_unknown',revision:5})
  const final=await publish(pending,c,{resumeContainerId:first.containerId})
  assert.equal(final.state,'published')
  assert.equal(c.calls.filter(v=>v.type==='create').length,1)
  assert.equal(c.calls.filter(v=>v.type==='publish').length,1)
})

test('ambiguous delivery, processing ERROR or wrong Meta readback never counts as published or retries',async()=>{
  const cases=[
    [fake({status:'ERROR'}),'provider_error',0],
    [fake({publishFails:true}),'delivery_unknown',1],
    [fake({readbackFails:true}),'delivery_unknown',1],
    [fake({product:'FEED'}),'delivery_unknown',1],
    [fake({mediaType:'IMAGE'}),'delivery_unknown',1],
    [fake({permalink:'https://www.instagram.com/p/Wrong/'}),'delivery_unknown',1],
    [fake({timestamp:'not-a-date'}),'delivery_unknown',1],
  ]
  for(const [c,state,publishes] of cases){
    assert.equal((await publish(post(),c)).state,state)
    assert.equal(c.calls.filter(v=>v.type==='publish').length,publishes)
  }
})

test('Reel placement is Instagram-only, video-only when a media URL is supplied',()=>{
  const {id,status,revision,...fields}=post()
  assert.equal(normalizePostFields(fields).placement,'reel')
  assert.throws(()=>normalizePostFields({...fields,channel:'facebook',socialAccountId:'',placement:'reel'}),/invalid_post/)
  assert.throws(()=>normalizePostFields({...fields,mediaUrl:'https://holistichouse.vercel.app/media/photo.jpg',mediaAlt:'Photo'}),/invalid_post/)
  assert.equal(getInstagramManualHandoff(post())?.placement,'reel')
  assert.equal(getInstagramManualHandoff(post({mediaUrl:'https://holistichouse.vercel.app/media/photo.jpg'})),null)
  const preview=reviewGrowthPublication({...post(),mediaUrl:'https://holistichouse.vercel.app/media/photo.jpg'})
  assert.ok(preview.issues.includes('instagram_reel_mp4_required'))
})

test('owner-only server CAS action and UI expose Reels without scheduling or extra provider tokens',()=>{
  const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8')
  const actions=read('app/admin/growth-studio/actions.js')
  const ui=read('components/growth-studio.jsx')
  const meta=read('lib/growth-studio/meta-instagram.mjs')
  assert.match(actions,/source\.placement==='reel'\?publishApprovedInstagramReel/)
  assert.match(actions,/\['story','reel'\]\.includes\(source\.placement\)/)
  assert.match(actions,/await store\.save\(claimed,source\.revision\)/)
  assert.match(ui,/<option value="reel">/)
  assert.match(ui,/instagramReelResume/)
  assert.match(ui,/post\.placement==='reel'\?t\.instagramReelPublish/)
  assert.match(meta,/media_type:'REELS',video_url:videoUrl,caption,share_to_feed:'true'/)
  assert.doesNotMatch(ui,/META_APP_SECRET|pageAccessToken|META_TOKEN_ENCRYPTION_KEY/)
})
