import test from 'node:test'
import assert from 'node:assert/strict'
import {readInstagramPostInsights,loadOwnerInstagramInsights} from '../lib/growth-studio/instagram-insights.mjs'
import {createMetaInstagramInsightsClient,encryptMetaCredentials,META_REQUIRED_SCOPES} from '../lib/growth-studio/meta-instagram.mjs'

const post={id:'fb4a8dc4-115a-4b3a-bd3b-bc9b0eb7c3d0',revision:4,status:'published',
  brand:'holistic_house',channel:'instagram',socialAccountId:'wizards_secrets',locale:'en',
  title:'Public image',caption:'Public caption',sourceUrl:'',campaign:'',scheduledAt:'',
  mediaUrl:'https://holistichouse.vercel.app/images/post.jpg',mediaAlt:'A garden',
  createdAt:'2026-11-01T12:00:00.000Z',updatedAt:'2026-11-01T12:00:00.000Z',
  delivery:{provider:'meta_graph_api',accountId:'wizards_secrets',providerPostId:'123456789',
    containerId:'987654321',mediaType:'IMAGE',url:'https://www.instagram.com/p/AbCdEf123/',
    publishedAt:'2026-11-01T12:00:00+0000'}}
const now=new Date('2026-11-09T12:00:00.000Z')
const client=(read)=>({targetId:'wizards_secrets',username:'wizards.secrets',readMediaInsights:read})

test('a confirmed Wizards image returns real values and keeps absent metrics distinct from zero',async()=>{
  const calls=[]
  const result=await readInstagramPostInsights({post,apiVersion:'v27.0',now,client:client(async input=>{
    calls.push(input)
    return {data:[{name:'reach',period:'lifetime',values:[{value:100}]},
      {name:'saved',period:'lifetime',values:[{value:0}]}]}
  })})
  assert.deepEqual(calls,[{mediaId:'123456789',productType:'FEED'}])
  assert.deepEqual(result.metrics.reach,{status:'FRESH',value:100,providerMetric:'reach'})
  assert.deepEqual(result.metrics.saves,{status:'FRESH',value:0,providerMetric:'saved'})
  assert.deepEqual(result.metrics.likes,{status:'NO_DATA',value:null,providerMetric:'likes'})
  assert.equal(result.capturedAt,now.toISOString())
  assert.equal(result.apiVersion,'v27.0')
})

test('no connection, unconfirmed posts or another account cause no provider request',async()=>{
  let calls=0
  const fake=client(async()=>{calls++;return {data:[]}})
  for(const unsafe of [{...post,status:'draft'},{...post,socialAccountId:'andy_therapist'},
    {...post,delivery:{...post.delivery,accountId:'andy_therapist'}},
    {...post,delivery:{...post.delivery,url:'https://example.com/'}}])
    await assert.rejects(readInstagramPostInsights({post:unsafe,apiVersion:'v27.0',now,client:fake}),/insights_invalid_post/)
  await assert.rejects(readInstagramPostInsights({post,apiVersion:'v27.0',now,client:{...fake,username:'other'}}),/insights_account_mismatch/)
  assert.equal(calls,0)
})

test('malformed, duplicate and incomplete-paginated provider responses fail closed',async()=>{
  const responses=[{data:[{name:'reach',period:'lifetime',values:[{value:-1}]}]},
    {data:[{name:'reach',period:'lifetime',values:[{value:1}]},{name:'reach',period:'lifetime',values:[{value:2}]}]},
    {data:[],paging:{next:'https://example.com/'}}]
  for(const body of responses)
    await assert.rejects(readInstagramPostInsights({post,apiVersion:'v27.0',now,client:client(async()=>body)}),/insights_invalid_response/)
})

test('owner insights reads the saved receipt only after authorization and never exposes provider errors',async()=>{
  let storeCalls=0,providerCalls=0
  const getStore=()=>{storeCalls++;return {get:async id=>id===post.id?post:null}}
  const provider=client(async()=>{providerCalls++;return {data:[]}})
  assert.deepEqual(await loadOwnerInstagramInsights({id:post.id,authorize:async()=>false,getStore,client:provider,apiVersion:'v27.0',now}),{ok:false,error:'unauthorized'})
  assert.equal(storeCalls,0)
  const result=await loadOwnerInstagramInsights({id:post.id,authorize:async()=>true,getStore,client:provider,apiVersion:'v27.0',now})
  assert.equal(result.ok,true)
  assert.equal(result.insights.metrics.reach.status,'NO_DATA')
  assert.equal(providerCalls,1)
  const error=await loadOwnerInstagramInsights({id:post.id,authorize:async()=>true,getStore,
    client:client(async()=>{throw new Error('sensitive-provider-detail')}),apiVersion:'v27.0',now})
  assert.deepEqual(error,{ok:false,error:'insights_unavailable'})
})

test('the Meta insights client rechecks account identity and uses a server-only user token',async t=>{
  const env={META_APP_ID:'synthetic-app',META_APP_SECRET:'synthetic-app-secret',
    META_REDIRECT_URI:'https://holistichouse.vercel.app/api/admin/growth-studio/meta/callback',
    META_GRAPH_API_VERSION:'v27.0',META_TOKEN_ENCRYPTION_KEY:'synthetic-encryption-secret',
    PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic-redis.example',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-redis-token'}
  const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]))
  Object.assign(process.env,env)
  t.after(()=>{for(const [key,value] of Object.entries(previous))value===undefined?delete process.env[key]:process.env[key]=value})
  const record={targetId:'wizards_secrets',instagramUsername:'wizards.secrets',instagramAccountId:'111111',
    pageId:'222222',metaUserId:'333333',userAccessToken:'synthetic-user-token',pageAccessToken:'synthetic-page-token',
    scopes:META_REQUIRED_SCOPES,pageTasks:['CREATE_CONTENT'],connectionState:'connected',publishingEnabled:false}
  let encrypted=encryptMetaCredentials(record),insightRequests=0,readReserved=false
  t.mock.method(globalThis,'fetch',async(input,options={})=>{
    const url=new URL(input)
    if(url.hostname==='synthetic-redis.example'){
      const command=JSON.parse(options.body)
      if(command[0]==='GET')return Response.json({result:encrypted})
      if(command[0]==='SET'&&command.includes('NX')){
        if(readReserved)return Response.json({result:null})
        readReserved=true;return Response.json({result:'OK'})
      }
      if(command[0]==='SET'){encrypted=command[2];return Response.json({result:'OK'})}
      throw new Error('unexpected_redis_command')
    }
    assert.equal(url.hostname,'graph.facebook.com')
    if(url.pathname==='/v27.0/me')return Response.json({id:'333333'})
    if(url.pathname==='/v27.0/me/permissions')return Response.json({data:META_REQUIRED_SCOPES.map(permission=>({permission,status:'granted'}))})
    if(url.pathname==='/v27.0/222222')return Response.json({id:'222222',instagram_business_account:{id:'111111',username:'wizards.secrets'}})
    if(url.pathname==='/v27.0/123456789/insights'){
      insightRequests++
      assert.equal(url.searchParams.get('access_token'),'synthetic-user-token')
      assert.equal(url.searchParams.get('metric'),'reach,saved,shares,likes,comments,views')
      assert.match(url.searchParams.get('appsecret_proof'),/^[a-f0-9]{64}$/)
      return Response.json({data:[{name:'reach',period:'lifetime',values:[{value:20}]}]})
    }
    throw new Error('unexpected_graph_request')
  })
  const provider=await createMetaInstagramInsightsClient('wizards_secrets')
  const result=await readInstagramPostInsights({post,client:provider,apiVersion:'v27.0',now})
  assert.equal(insightRequests,1)
  assert.equal(result.metrics.reach.value,20)
  assert.doesNotMatch(JSON.stringify(result),/synthetic-(?:user|page|app|redis)-token/)
  await assert.rejects(createMetaInstagramInsightsClient('wizards_secrets'),/meta_insights_rate_limited/)
  await assert.rejects(createMetaInstagramInsightsClient('andy_therapist'),/meta_invalid_target/)
})
