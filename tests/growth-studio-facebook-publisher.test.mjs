import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {facebookPagePostPayload,publishApprovedFacebookPagePost,isFacebookPublisherEnabled}
  from '../lib/growth-studio/facebook-publisher.mjs'
import {facebookPagePublishReadiness}
  from '../lib/growth-studio/instagram-publish-readiness.mjs'
import {normalizePostFields,nextGrowthPost,isSavedGrowthPost,publicCampaignLink}
  from '../lib/growth-studio/model.mjs'
import {buildMetaAuthorizationUrl,META_REQUIRED_SCOPES,META_FACEBOOK_PAGE_SCOPES,
  encryptMetaCredentials,createMetaFacebookPagePublisherClient}
  from '../lib/growth-studio/meta-instagram.mjs'

const fields={
 brand:'holistic_house',channel:'facebook',socialAccountId:'wizards_secrets',
 locale:'en',title:'First Page update',caption:'A public update',
 sourceUrl:'https://holistichouse.vercel.app/en/academy',campaign:'native_page',
 scheduledAt:'',mediaUrl:'',mediaAlt:'',placement:'feed',
}
const post={...normalizePostFields(fields),id:'fb4a8dc4-115a-4b3a-bd3b-bc9b0eb7c3d0',
 revision:3,status:'approved',createdAt:'2026-11-10T15:00:00.000Z',
 updatedAt:'2026-11-10T15:30:00.000Z',
}
const enabled={HH_GROWTH_FACEBOOK_PUBLISH_ENABLED:'true'}
function mockProvider({postId='1234567890123_98765432109876',readback='published',
  pageId='1234567890123',targetId='wizards_secrets',handle='wizards.secrets',
  throwCreate=false}={}){
 const calls=[]
 const client={
  targetId,pageId,instagramUsername:handle,
  async createPageFeedPost(value){
   calls.push({type:'create',value})
   if(throwCreate)throw Error('provider rejected or timed out')
   return {id:postId}
  },
  async getPagePost(id){
   calls.push({type:'readback',id})
   if(readback==='throw')throw Error('provider unavailable')
   return {id:readback==='foreign'?'1234567890123_1':id,
    created_time:'2026-11-10T15:31:00+0000',
    is_published:readback==='published',permalink_url:'https://www.facebook.com/1234567890123/posts/98765432109876'}
  },
 }
 return {client,calls}
}
const publish=(p,provider,options={})=>publishApprovedFacebookPagePost({
 post:p,expectedRevision:p.revision,confirmed:true,environment:enabled,
 providerClient:provider.client,...options,
})

test('Page authoring has a selected exact account, preserves approvals and public URL policy',()=>{
 assert.equal(normalizePostFields(fields).socialAccountId,'wizards_secrets')
 assert.throws(()=>normalizePostFields({...fields,channel:'telegram'}),/invalid_post/)
 assert.throws(()=>normalizePostFields({...fields,channel:'facebook',socialAccountId:'unknown_page'}),/invalid_post/)
 const draft=nextGrowthPost({action:'save',id:post.id,fields})
 assert.equal(draft.status,'draft')
 assert.equal(nextGrowthPost({action:'approve',current:draft}).status,'approved')
 const url=publicCampaignLink(post)
 assert.match(url,/utm_source=facebook/)
 assert.match(url,/utm_campaign=native_page/)
 assert.deepEqual(facebookPagePostPayload(post),{message:'A public update',link:url})
 assert.throws(()=>facebookPagePostPayload({...post,mediaUrl:'https://holistichouse.vercel.app/img.jpg'}),/facebook_media_not_supported/)
 assert.throws(()=>facebookPagePostPayload({...post,channel:'instagram'}),/facebook_invalid_approved_post/)
})

test('exact Meta Page confirmed post is published and persisted with real Page ID',async()=>{
 const c=mockProvider()
 const result=await publish(post,c)
 assert.equal(result.state,'published')
 assert.equal(result.providerPostId,'1234567890123_98765432109876')
 assert.equal(result.pageId,'1234567890123')
 assert.equal(result.mediaProductType,'PAGE_POST')
 assert.match(result.permalink,/^https:\/\/www\.facebook\.com\//)
 assert.deepEqual(c.calls.map(x=>x.type),['create','readback'])
 assert.deepEqual(c.calls[0].value,facebookPagePostPayload(post))
 const saved={...post,status:'published',revision:4,delivery:{
  provider:'meta_graph_api',accountId:result.accountId,pageId:result.pageId,
  providerPostId:result.providerPostId,mediaProductType:result.mediaProductType,
  publishedAt:result.publishedAt,url:result.permalink,
 }}
 assert.equal(isSavedGrowthPost(saved),true)
 assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,pageId:'9999999999999'}}),false)
 assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,url:'https://evil.invalid/marketing'}}),false)
 assert.equal(isSavedGrowthPost({...saved,delivery:{...saved.delivery,mediaProductType:'FEED'}}),false)
})

test('provider ambiguous creates can NEVER claim success or retry',async()=>{
 for(const opts of [{throwCreate:true},{postId:'98765_23456'},{readback:'throw'},
  {readback:'foreign'},{readback:'unpublished'}]){
  const c=mockProvider(opts),out=await publish(post,c)
  assert.equal(out.state,'delivery_unknown')
  assert.equal(c.calls.filter(x=>x.type==='create').length,1)
 }
})

test('disabled, unconfirmed, unapproved, wrong account and media fail without ANY provider writes',async()=>{
 assert.equal(isFacebookPublisherEnabled({}),false)
 const cases=[
  {options:{environment:{}},message:'facebook_publishing_disabled'},
  {options:{confirmed:false},message:'facebook_invalid_approved_post'},
  {post:{...post,status:'draft'},message:'facebook_invalid_approved_post'},
  {post:{...post,mediaUrl:'https://holistichouse.vercel.app/reel.mp4'},message:'facebook_media_not_supported'},
  {client:{targetId:'andy_therapist'},message:'facebook_account_not_connected'},
 ]
 for(const item of cases){
  const c=mockProvider()
  await assert.rejects(publish(item.post||post,c,
    {...item.options,...(item.client?{providerClient:{...c.client,...item.client}}:{})}),
  new RegExp(item.message))
  assert.equal(c.calls.length,0)
 }
})

test('account readiness is separate for Facebook and Instagram, never inferred from a setup card',()=>{
 const account={targetId:'wizards_secrets',connectionState:'connected',
  handle:'wizards.secrets',pageId:'1234567890123',
  pageTasks:['CREATE_CONTENT'],scopes:['pages_manage_posts']}
 const setup={configuration:{authorizationReady:true,facebookPublishFlagEnabled:true,publishFlagEnabled:false},
  accounts:[account]}
 assert.deepEqual(facebookPagePublishReadiness(setup,'wizards_secrets'),{ready:true,reason:null})
 assert.equal(facebookPagePublishReadiness(null,'wizards_secrets').ready,false)
 assert.equal(facebookPagePublishReadiness(setup,'andy_therapist').ready,false)
 assert.equal(facebookPagePublishReadiness({...setup,accounts:[{...account,handle:'other'}]},'wizards_secrets').ready,false)
 assert.equal(facebookPagePublishReadiness({...setup,accounts:[{...account,scopes:[]}]},'wizards_secrets').reason,'meta_page_publish_access_missing')
 assert.equal(facebookPagePublishReadiness({...setup,configuration:{...setup.configuration,facebookPublishFlagEnabled:false}},'wizards_secrets').reason,'facebook_publishing_disabled')
})

test('official Facebook Page scope is requested OPTIONAL to existing mandatory Instagram scopes',()=>{
 assert.deepEqual(META_FACEBOOK_PAGE_SCOPES,['pages_manage_posts'])
 assert.ok(!META_REQUIRED_SCOPES.includes('pages_manage_posts'))
 const keys=['META_APP_ID','META_APP_SECRET','META_REDIRECT_URI','META_GRAPH_API_VERSION','META_TOKEN_ENCRYPTION_KEY']
 const prev=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
 try{
  Object.assign(process.env,{META_APP_ID:'synthetic',META_APP_SECRET:'synthetic',
   META_REDIRECT_URI:'https://holistichouse.vercel.app/api/admin/growth-studio/meta/callback',
   META_GRAPH_API_VERSION:'v27.0',META_TOKEN_ENCRYPTION_KEY:'synthetic'})
  const url=new URL(buildMetaAuthorizationUrl('wizards_secrets','synthetic-csrf'))
  assert.equal(url.hostname,'www.facebook.com')
  const scopes=url.searchParams.get('scope').split(',')
  for(const scope of [...META_REQUIRED_SCOPES,'pages_manage_posts'])assert.ok(scopes.includes(scope),scope)
 }finally{
  for(const key of keys){if(prev[key]===undefined)delete process.env[key];else process.env[key]=prev[key]}
 }
})

test('server action remains owner-only, CAS-claimed, unknown-is-not-published and no Metricool API',()=>{
 const action=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/growth-studio.jsx',import.meta.url),'utf8')
 const block=action.slice(action.indexOf('export async function publishGrowthFacebookNowAction'))
 assert.match(block,/requireAdminRequest\(\)/)
 assert.match(block,/facebookPagePostPayload\(source\)/)
 assert.match(block,/store\.save\(claim,source\.revision\)/)
 assert.match(block,/facebook_delivery_unknown/)
 assert.match(block,/createMetaFacebookPagePublisherClient/)
 assert.match(ui,/facebookPagePublishReadiness\(fresh,post\.socialAccountId\)/)
 assert.match(ui,/publishGrowthFacebookNowAction\(\{/)
 assert.doesNotMatch(block,/metricool|app\.metricool\.com/i)
})


test('official Meta client checks live Page identity and revoked scopes before Page POST (synthetic network only)',async()=>{
 const keys=['META_APP_ID','META_APP_SECRET','META_REDIRECT_URI','META_GRAPH_API_VERSION',
  'META_TOKEN_ENCRYPTION_KEY','PRESCRIPTIONS_KV_REST_API_URL','PRESCRIPTIONS_KV_REST_API_TOKEN']
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]])),originalFetch=globalThis.fetch
 let scopeGranted=true,postCount=0,redisValue=null
 const pageId='1234567890123',accountId='17880000001234567',metaUserId='998877665544'
 const record={provider:'meta_graph_api',targetId:'wizards_secrets',
  instagramAccountId:accountId,instagramUsername:'wizards.secrets',instagramAccountType:'BUSINESS',
  pageId,pageName:'Public Page',pageTasks:['CREATE_CONTENT'],
  scopes:[...META_REQUIRED_SCOPES,'pages_manage_posts'],metaUserId,
  userAccessToken:'synthetic-user-token',pageAccessToken:'synthetic-page-token',
  connectionState:'connected',publishingEnabled:false,lastVerifiedAt:'2026-11-11T00:00:00.000Z'}
 const json=result=>new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}})
 try{
  Object.assign(process.env,{META_APP_ID:'synthetic-id',META_APP_SECRET:'synthetic-secret',
    META_REDIRECT_URI:'https://holistichouse.vercel.app/api/admin/growth-studio/meta/callback',
    META_GRAPH_API_VERSION:'v27.0',META_TOKEN_ENCRYPTION_KEY:'synthetic-encryption-key',
    PRESCRIPTIONS_KV_REST_API_URL:'https://redis.example.test',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-redis-token'})
  redisValue=encryptMetaCredentials(record)
  globalThis.fetch=async (target,options={})=>{
   const url=new URL(String(target))
   if(url.hostname==='redis.example.test'){
     const args=JSON.parse(options.body)
     assert.equal(options.method,'POST')
     if(args[0]==='GET')return json({result:redisValue})
     if(args[0]==='SET'){redisValue=args[2];return json({result:'OK'})}
     throw Error('unexpected Redis operation '+args[0])
   }
   assert.equal(url.hostname,'graph.facebook.com')
   const path=url.pathname.replace(/^\/v27\.0\//,'')
   if(options.method==='POST'){
     assert.equal(path,pageId+'/feed')
     const body=new URLSearchParams(options.body)
     assert.equal(body.get('access_token'),'synthetic-page-token')
     assert.equal(body.get('message'),post.caption)
     assert.ok(body.get('appsecret_proof'))
     postCount++
     return json({id:pageId+'_98765432109876'})
   }
   assert.ok(url.searchParams.get('appsecret_proof'))
   if(path==='me')return json({id:metaUserId,name:'Synthetic owner'})
   if(path==='me/permissions')return json({data:[
     ...META_REQUIRED_SCOPES.map(permission=>({permission,status:'granted'})),
     {permission:'pages_manage_posts',status:scopeGranted?'granted':'declined'},
   ]})
   if(path===pageId)return json({id:pageId,name:'Public Page',
     instagram_business_account:{id:accountId,username:'wizards.secrets',account_type:'BUSINESS'}})
   if(path===pageId+'_98765432109876')return json({id:path,
     created_time:'2026-11-11T10:00:00+0000',is_published:true,
     permalink_url:'https://www.facebook.com/'+pageId+'/posts/98765432109876'})
   throw Error('unrecognized Graph request '+path)
  }
  const client=await createMetaFacebookPagePublisherClient('wizards_secrets')
  assert.equal(client.pageId,pageId)
  assert.equal(Object.hasOwn(client,'pageAccessToken'),false)
  assert.equal(Object.hasOwn(client,'userAccessToken'),false)
  const outcome=await publishApprovedFacebookPagePost({
    post,expectedRevision:post.revision,confirmed:true,environment:enabled,
    providerClient:client,
  })
  assert.equal(outcome.state,'published')
  assert.equal(postCount,1)
  scopeGranted=false
  await assert.rejects(createMetaFacebookPagePublisherClient('wizards_secrets'),
    /meta_page_publish_access_missing/)
  assert.equal(postCount,1,'revoked Meta scope must stop before a second write')
 }finally{
  globalThis.fetch=originalFetch
  for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k]}
 }
})
