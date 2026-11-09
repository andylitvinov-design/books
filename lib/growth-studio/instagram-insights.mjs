import {isSavedGrowthPost} from './model.mjs'
import {createMetaInstagramInsightsClient} from './meta-instagram.mjs'

// Official media-insights response uses lifetime values. Missing values remain
// NO_DATA; a provider-returned zero is the only zero shown as measured.
const METRICS=Object.freeze({reach:'reach',saved:'saves',shares:'shares',likes:'likes',comments:'comments',views:'views'})
const fail=code=>{throw new Error(code)}
const POST_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function loadOwnerInstagramInsights({id,authorize,getStore,client,apiVersion,now}={}) {
  try {
    if(typeof authorize!=='function'||!await authorize())return {ok:false,error:'unauthorized'}
    if(typeof id!=='string'||!POST_ID.test(id))return {ok:false,error:'insights_invalid_post'}
    const store=typeof getStore==='function'?getStore():null
    if(!store)return {ok:false,error:'storage_unavailable'}
    const post=await store.get(id)
    if(!post)return {ok:false,error:'not_found'}
    const insights=await readInstagramPostInsights({post,client,apiVersion,now})
    return {ok:true,insights}
  } catch(error) {
    const code=error?.code||error?.message
    const safe=new Set(['insights_invalid_post','insights_not_configured','insights_invalid_response',
      'meta_not_configured','meta_account_not_connected','meta_token_invalid','meta_insights_rate_limited'])
    return {ok:false,error:safe.has(code)?code:'insights_unavailable'}
  }
}

export async function readInstagramPostInsights({post,client,apiVersion=process.env.META_GRAPH_API_VERSION,now=new Date()}={}) {
  if(typeof window!=='undefined')fail('insights_server_only')
  if(!isSavedGrowthPost(post)||post.status!=='published'||post.channel!=='instagram'||
    post.socialAccountId!=='wizards_secrets'||post.delivery?.provider!=='meta_graph_api'||
    post.delivery.accountId!=='wizards_secrets'||post.delivery.mediaType!=='IMAGE')fail('insights_invalid_post')
  if(!/^v\d+\.\d+$/.test(apiVersion||'')||!(now instanceof Date)||!Number.isFinite(now.getTime()))
    fail('insights_not_configured')
  const provider=client||await createMetaInstagramInsightsClient('wizards_secrets')
  if(provider?.targetId!=='wizards_secrets'||provider?.username?.toLowerCase()!=='wizards.secrets'||
    typeof provider?.readMediaInsights!=='function')fail('insights_account_mismatch')
  const body=await provider.readMediaInsights({mediaId:post.delivery.providerPostId,productType:'FEED'})
  if(!body||!Array.isArray(body.data)||body.data.length>Object.keys(METRICS).length||body.paging?.next)
    fail('insights_invalid_response')
  const metrics=Object.fromEntries(Object.entries(METRICS).map(([providerMetric,key])=>
    [key,{status:'NO_DATA',value:null,providerMetric}]))
  const seen=new Set()
  for(const entry of body.data){
    if(!entry||!Object.hasOwn(METRICS,entry.name)||seen.has(entry.name)||entry.period!=='lifetime'||
      !Array.isArray(entry.values)||entry.values.length>1)fail('insights_invalid_response')
    seen.add(entry.name)
    if(entry.values.length===0)continue
    const value=entry.values[0]?.value
    if(!Number.isSafeInteger(value)||value<0)fail('insights_invalid_response')
    metrics[METRICS[entry.name]]={status:'FRESH',value,providerMetric:entry.name}
  }
  return {socialAccountId:'wizards_secrets',providerPostId:post.delivery.providerPostId,
    source:'meta_graph_api',apiVersion,period:'lifetime',capturedAt:now.toISOString(),metrics}
}
