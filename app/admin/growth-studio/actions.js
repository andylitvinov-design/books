'use server'
import {randomUUID} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GrowthStudioError, nextGrowthPost} from '@/lib/growth-studio/model.mjs'
import {previewPublicGrowthSource} from '@/lib/growth-studio/source-preview.mjs'
import {prepareGrowthBulk,sameGrowthDraft} from '@/lib/growth-studio/bulk.mjs'
import {prepareEvergreenGrowthDrafts} from '@/lib/growth-studio/evergreen.mjs'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
import {readGrowthStudioProviderReadiness} from '@/lib/growth-studio/provider-readiness.mjs'
import {isInstagramPublisherEnabled,publishApprovedInstagramImage,publishApprovedInstagramStory} from '@/lib/growth-studio/instagram-publisher.mjs'
import {isFacebookPublisherEnabled,publishApprovedFacebookPagePost,facebookPagePostPayload} from '@/lib/growth-studio/facebook-publisher.mjs'
import {createMetaFacebookPagePublisherClient} from '@/lib/growth-studio/meta-instagram.mjs'
import {createMetaInstagramPublisherClient} from '@/lib/growth-studio/meta-instagram.mjs'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from '@/lib/growth-studio/instagram-accounts.mjs'
import {isValidInstagramInsightDate,isValidInstagramInsightRange,normalizeInstagramInsightMetrics} from '@/lib/growth-studio/instagram-insights.mjs'
import {telegramConfig,telegramPayload,verifyTelegramPostingPermissions,sendTelegramPost} from '@/lib/growth-studio/telegram.mjs'

const safeError = error => error instanceof GrowthStudioError &&
  ['invalid_post','invalid_action','invalid_transition','not_found','conflict','capacity_reached','invalid_recurrence','invalid_source'].includes(error.code)
    ? error.code : 'storage_unavailable'

// Read-only public-page metadata preview, explicitly invoked by the owner.
// No save, provider side effect, AI translation or automatic publication.
export async function previewPublicGrowthSourceAction(input) {
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  try{
    const preview=await previewPublicGrowthSource(input)
    return {ok:true,preview}
  }catch(error){
    const allowed=new Set(['invalid_source','source_unavailable','source_not_public',
      'source_not_html','source_invalid_html','source_too_large','source_missing_metadata'])
    return {ok:false,error:error instanceof GrowthStudioError && allowed.has(error.code)
      ?error.code:'source_unavailable'}
  }
}


// Read-only, account-separated Instagram metrics. Never returns comments, captions,
// audience identities, tokens or customer/therapy data.
export async function getGrowthInstagramInsightsAction(input={}){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(key=>!['since','until'].includes(key)))
    return {ok:false,error:'invalid_insights_request'}
  const end=input.until||new Date().toISOString().slice(0,10)
  if(!isValidInstagramInsightDate(end))return {ok:false,error:'invalid_insights_request'}
  const start=input.since||new Date(Date.parse(end+'T00:00:00.000Z')-29*86_400_000).toISOString().slice(0,10)
  if(!isValidInstagramInsightDate(start)||!isValidInstagramInsightDate(end)||!isValidInstagramInsightRange(start,end))
    return {ok:false,error:'invalid_insights_request'}
  const accounts=await Promise.all(GROWTH_INSTAGRAM_ACCOUNT_TARGETS.map(async target=>{
    try{
      const client=await createMetaInstagramPublisherClient(target.id)
      const response=await client.getAccountInsights({since:start,until:end})
      const metrics=normalizeInstagramInsightMetrics(response)
      return {accountId:target.id,handle:target.handle,status:'available',
        period:{since:start,until:end},capturedAt:new Date().toISOString(),metrics}
    }catch(error){
      const allowed=new Set(['meta_not_configured','meta_storage_unavailable','meta_credential_unavailable',
        'meta_account_not_connected','meta_token_invalid','meta_permissions_missing',
        'meta_insights_permission_missing','meta_graph_error'])
      return {accountId:target.id,handle:target.handle,status:'unavailable',
        error:allowed.has(error?.code)?error.code:'insights_unavailable',
        period:{since:start,until:end},capturedAt:new Date().toISOString(),metrics:{}}
    }
  }))
  return {ok:true,period:{since:start,until:end},accounts}
}

// An explicit owner click verifies the existing Redis REST connection by
// creating, reading, CAS-updating and deleting ONE expiring synthetic Redis hash.
// No editorial posts or client data are read; no publish, Ads or video APIs.
export async function checkGrowthStudioStorageAction() {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  try {
    const store = getGrowthStudioStore()
    if (!store) return {ok:false,error:'storage_unavailable'}
    const verified = await store.verifyEditorialRoundTrip()
    return verified === true
      ? {ok:true,verified:true}
      : {ok:false,error:'storage_unavailable'}
  } catch {
    return {ok:false,error:'storage_unavailable'}
  }
}

export async function listGrowthStudioPostsAction() {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  try {
    const store = getGrowthStudioStore()
    if (!store) return {ok:false,error:'storage_unavailable'}
    return {ok:true,records:await store.list()}
  } catch {return {ok:false,error:'storage_unavailable'}}
}

// Every mutation is authenticated, read-checked and atomically versioned.
export async function updateGrowthStudioPostAction(input) {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['action','id','expectedRevision','fields','confirmed'].includes(key)) ||
      !['save','approve','plan','archive','reopen','complete_manual','undo_manual'].includes(input.action) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
      (input.action !== 'save' && input.fields !== undefined) ||
      (input.action === 'complete_manual' && input.confirmed !== true) ||
      (input.action !== 'complete_manual' && input.confirmed !== undefined))
    return {ok:false,error:'invalid_post'}
  try {
    const store = getGrowthStudioStore()
    if (!store) return {ok:false,error:'storage_unavailable'}
    const newRecord = input.action === 'save' && !input.id
    const id = newRecord ? randomUUID() : input.id
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return {ok:false,error:'invalid_post'}
    const current = newRecord ? null : await store.get(id)
    if ((current?.revision ?? 0) !== input.expectedRevision || (!current && !newRecord))
      return {ok:false,error:current ? 'conflict' : 'not_found'}
    const isRegisteredInstagramAccount=id=>GROWTH_INSTAGRAM_ACCOUNT_TARGETS.some(account=>account.id===id)
    if(input.action==='save' && ['instagram','facebook'].includes(input.fields?.channel) &&
       !isRegisteredInstagramAccount(input.fields.socialAccountId))
      return {ok:false,error:input.fields.channel==='facebook'?'facebook_account_required':'instagram_account_required'}
    if((input.action==='approve'||input.action==='plan') &&
       ['instagram','facebook'].includes(current?.channel) &&
       !isRegisteredInstagramAccount(current.socialAccountId))
      return {ok:false,error:current.channel==='facebook'?'facebook_account_required':'instagram_account_required'}
    const post = nextGrowthPost({current,fields:input.fields,action:input.action,id})
    await store.save(post,input.expectedRevision)
    return {ok:true,record:post}
  } catch (error) {return {ok:false,error:safeError(error)}}
}


// Atomic, replay-safe, owner-only bulk draft import. Does NOT send or schedule externally.
export async function createGrowthStudioBulkAction(input) {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  try {
    const store = getGrowthStudioStore()
    if (!store) return {ok:false,error:'storage_unavailable'}
    const drafts = prepareGrowthBulk(input)
    const current = await Promise.all(drafts.map(item=>store.get(item.id)))
    if (current.every(Boolean)) {
      if (!current.every((saved,index)=>sameGrowthDraft(saved,drafts[index])))
        return {ok:false,error:'conflict'}
      return {ok:true,records:current,reused:true}
    }
    if (current.some(Boolean)) return {ok:false,error:'conflict'}
    await store.batchCreate(drafts)
    return {ok:true,records:drafts,reused:false}
  } catch(error) {return {ok:false,error:safeError(error)}}
}


// Evergreen reuse is explicitly owner-requested and drafts-only.
// Atomic source-revision check prevents a concurrently edited/unapproved
// original from silently generating previously approved marketing copy.
export async function createGrowthEvergreenDraftsAction(input){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!['sourceId','expectedRevision','batchId','cadence','count','startAt'].includes(key))||
      typeof input.sourceId!=='string'|| !/^[0-9a-f-]{36}$/i.test(input.sourceId))
    return {ok:false,error:'invalid_recurrence'}
  try{
    const store=getGrowthStudioStore()
    if(!store)return {ok:false,error:'storage_unavailable'}
    const source=await store.get(input.sourceId)
    if(!source)return {ok:false,error:'not_found'}
    const {sourceId,...params}=input
    const drafts=prepareEvergreenGrowthDrafts(params,{source})
    const current=await Promise.all(drafts.map(item=>store.get(item.id)))
    if(current.every(Boolean)){
      if(!current.every((item,index)=>sameGrowthDraft(item,drafts[index])))
        return {ok:false,error:'conflict'}
      return {ok:true,records:current,reused:true}
    }
    if(current.some(Boolean))return {ok:false,error:'conflict'}
    await store.batchCreateFromSource(drafts,sourceId,input.expectedRevision)
    return {ok:true,records:drafts,reused:false}
  }catch(error){return {ok:false,error:safeError(error)}}
}

// Read-only account readiness. No provider write, no bot secrets returned to UI.
// Owner-gated, read-only local setup audit: no tokens, customer data,
// publishing, Ads or provider OAuth are accessed or returned to the browser.
export async function checkGrowthStudioProviderReadinessAction(){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  try{
    const result=await readGrowthStudioProviderReadiness()
    return {ok:true,...result}
  }catch{
    return {ok:false,error:'readiness_unavailable'}
  }
}

export async function checkGrowthTelegramPublisherAction(){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!telegramConfig().ready)return {ok:false,error:'telegram_unconfigured'}
  try{
    const status=await verifyTelegramPostingPermissions()
    return {ok:true,verified:status.verified===true,channel:status.channel}
  }catch{
    return {ok:false,error:'telegram_permission_unverified'}
  }
}

// A *single*, explicitly confirmed owner click. Not an automatic queue or auto-publisher.
// The atomic in-progress transition prevents duplicate concurrent API sends.
// If Telegram replies ambiguously, the post is locked for owner investigation.
export async function publishGrowthTelegramNowAction(input){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(key=>!['id','expectedRevision','confirmed'].includes(key))||
     input.confirmed!==true||typeof input.id!=='string'||
     !/^[0-9a-f-]{36}$/i.test(input.id)||
     !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)
    return {ok:false,error:'invalid_post'}
  const config=telegramConfig()
  if(!config.ready)return {ok:false,error:'telegram_unconfigured'}
  const store=getGrowthStudioStore()
  if(!store)return {ok:false,error:'storage_unavailable'}
  let claimed
  let source
  try{
    source=await store.get(input.id)
    if(!source)return {ok:false,error:'not_found'}
    if(source.revision!==input.expectedRevision)return {ok:false,error:'conflict'}
    // Validate full exact content/target before taking the non-repeatable claim.
    telegramPayload(source,config.chatId)
    await verifyTelegramPostingPermissions()
    claimed={...source,status:'sending',revision:source.revision+1,attemptId:randomUUID(),updatedAt:new Date().toISOString()}
    await store.save(claimed,source.revision)
  }catch(e){return {ok:false,error:e instanceof GrowthStudioError?e.code:'storage_unavailable'}}
  let receipt
  try{
    receipt=await sendTelegramPost(source)
  }catch{
    try{
      const uncertain={...claimed,status:'delivery_unknown',revision:claimed.revision+1,
        updatedAt:new Date().toISOString()}
      await store.save(uncertain,claimed.revision)
      return {ok:false,error:'telegram_delivery_unknown',record:uncertain}
    }catch{return {ok:false,error:'telegram_delivery_unknown'}}
  }
  const delivered={...claimed,status:'published',revision:claimed.revision+1,
    updatedAt:new Date().toISOString(),delivery:receipt}
  try{
    await store.save(delivered,claimed.revision)
    return {ok:true,record:delivered}
  }catch{
    // The provider may have delivered. Never auto-retry this ambiguous state.
    return {ok:false,error:'telegram_delivery_unknown'}
  }
}


// One exact, owner-confirmed Instagram Feed or Story. No cron/worker calls this.
// The global publishing flag is OFF by default; a separate scheduler/receipt worker
// must be commissioned before enabling unattended publishing.
export async function publishGrowthInstagramNowAction(input){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>!['id','expectedRevision','confirmed','resume'].includes(key))||
    (input.resume!==undefined&&input.resume!==true)||
    input.confirmed!==true||typeof input.id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.id)||
    !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)
    return {ok:false,error:'invalid_post'}
  if(!isInstagramPublisherEnabled())return {ok:false,error:'instagram_publishing_disabled'}
  const store=getGrowthStudioStore()
  if(!store)return {ok:false,error:'storage_unavailable'}
  let source
  let providerClient
  try{
    source=await store.get(input.id)
    if(!source)return {ok:false,error:'not_found'}
    if(source.revision!==input.expectedRevision)return {ok:false,error:'conflict'}
    const resume=input.resume===true
    const validResume=source.status==='delivery_unknown'&&source.placement==='story'&&
      source.delivery?.provider==='meta_graph_api'&&
      source.delivery?.providerState==='provider_processing'&&
      source.delivery?.accountId===source.socialAccountId&&
      !source.delivery?.providerPostId&&
      typeof source.delivery?.containerId==='string'&&/^\d{5,40}$/.test(source.delivery.containerId)
    if(source.channel!=='instagram'||!source.socialAccountId||
      (resume?!validResume:source.status!=='approved'))
      return {ok:false,error:'instagram_invalid_approved_post'}
    // Verify account ↔ Page ↔ Instagram identity before taking a non-repeatable claim.
    providerClient=await createMetaInstagramPublisherClient(source.socialAccountId)
  }catch(error){
    const code=error?.code
    const allowed=new Set(['meta_not_configured','meta_account_not_connected','meta_page_publish_access_missing',
      'meta_token_invalid','meta_permissions_missing','meta_identity_mismatch','meta_graph_error',
      'meta_story_business_required'])
    return {ok:false,error:allowed.has(code)?code:'instagram_account_not_connected'}
  }
  const claimed={...source,status:'sending',revision:source.revision+1,
    attemptId:randomUUID(),updatedAt:new Date().toISOString()}
  try{await store.save(claimed,source.revision)}
  catch{return {ok:false,error:'conflict'}}
  let result
  try{
    result=await (source.placement==='story'?publishApprovedInstagramStory:publishApprovedInstagramImage)({
      post:source,expectedRevision:source.revision,confirmed:true,providerClient,
      ...(input.resume===true?{resumeContainerId:source.delivery.containerId}:{}),
    })
  }catch(error){
    const code=error?.code
    // Deterministic preflight/configuration failures are known to occur before any
    // provider create/publish operation, so return the post to Approved with a new revision.
    const beforeWrite=new Set(['instagram_media_preflight_failed','instagram_invalid_approved_post',
      'instagram_publishing_disabled','instagram_account_not_connected','meta_story_business_required'])
    if(beforeWrite.has(code)){
      const reset={...source,revision:claimed.revision+1,updatedAt:new Date().toISOString()}
      try{await store.save(reset,claimed.revision);return {ok:false,error:code,record:reset}}
      catch{return {ok:false,error:'instagram_delivery_unknown'}}
    }
    const uncertain={...claimed,status:'delivery_unknown',revision:claimed.revision+1,
      updatedAt:new Date().toISOString(),delivery:{provider:'meta_graph_api',
        accountId:source.socialAccountId,providerState:'unknown'}}
    try{await store.save(uncertain,claimed.revision)}catch{}
    return {ok:false,error:'instagram_delivery_unknown',record:uncertain}
  }
  if(result.state==='published'){
    const delivered={...claimed,status:'published',revision:claimed.revision+1,
      updatedAt:new Date().toISOString(),
      delivery:{provider:'meta_graph_api',accountId:result.accountId,
        providerPostId:result.providerPostId,url:result.permalink,
        publishedAt:result.publishedAt,
        containerId:result.containerId,mediaType:result.mediaType,
        ...(result.mediaProductType?{mediaProductType:result.mediaProductType}:{})}}
    try{
      await store.save(delivered,claimed.revision)
      return {ok:true,record:delivered}
    }catch{
      return {ok:false,error:'instagram_delivery_unknown'}
    }
  }
  const uncertain={...claimed,status:'delivery_unknown',revision:claimed.revision+1,
    updatedAt:new Date().toISOString(),delivery:{provider:'meta_graph_api',
      accountId:source.socialAccountId,containerId:result.containerId||null,
      providerPostId:result.providerPostId||null,providerState:result.state}}
  try{
    await store.save(uncertain,claimed.revision)
  }catch{}
  return {ok:false,error:'instagram_delivery_unknown',record:uncertain}
}


// One expressly owner-confirmed native Facebook Page text/link post.
// All provider-token operations reuse existing encrypted Meta OAuth storage;
// the Page is verified against the selected Instagram destination, never guessed.
export async function publishGrowthFacebookNowAction(input){
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(key=>!['id','expectedRevision','confirmed'].includes(key))||
     input.confirmed!==true||typeof input.id!=='string'||
     !/^[0-9a-f-]{36}$/i.test(input.id)||
     !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)
    return {ok:false,error:'invalid_post'}
  if(!isFacebookPublisherEnabled())return {ok:false,error:'facebook_publishing_disabled'}
  const store=getGrowthStudioStore()
  if(!store)return {ok:false,error:'storage_unavailable'}
  let source,client
  try{
    source=await store.get(input.id)
    if(!source)return {ok:false,error:'not_found'}
    if(source.revision!==input.expectedRevision)return {ok:false,error:'conflict'}
    // Deterministic no-media check happens BEFORE claiming the irreversible send.
    facebookPagePostPayload(source)
    client=await createMetaFacebookPagePublisherClient(source.socialAccountId)
  }catch(error){
    const allowed=new Set(['facebook_invalid_approved_post','facebook_media_not_supported',
      'meta_not_configured','meta_page_publish_access_missing','meta_account_not_connected',
      'meta_token_invalid','meta_identity_mismatch'])
    return {ok:false,error:allowed.has(error?.code)?error.code:'facebook_account_not_connected'}
  }
  const claim={...source,status:'sending',revision:source.revision+1,
    attemptId:randomUUID(),updatedAt:new Date().toISOString()}
  try{await store.save(claim,source.revision)}
  catch{return {ok:false,error:'conflict'}}
  let outcome
  try{
    outcome=await publishApprovedFacebookPagePost({post:source,
      expectedRevision:source.revision,confirmed:true,providerClient:client})
  }catch{
    outcome={state:'delivery_unknown'}
  }
  if(outcome.state==='published'){
    const delivered={...claim,status:'published',revision:claim.revision+1,
      updatedAt:new Date().toISOString(),delivery:{
        provider:'meta_graph_api',mediaProductType:'PAGE_POST',
        accountId:outcome.accountId,pageId:outcome.pageId,
        providerPostId:outcome.providerPostId,publishedAt:outcome.publishedAt,
        url:outcome.permalink,
      }}
    try{await store.save(delivered,claim.revision);return {ok:true,record:delivered}}
    catch{return {ok:false,error:'facebook_delivery_unknown'}}
  }
  // A POST may have reached Meta despite a timeout: never automatically retry.
  const uncertain={...claim,status:'delivery_unknown',revision:claim.revision+1,
    updatedAt:new Date().toISOString(),delivery:{
      provider:'meta_graph_api',accountId:source.socialAccountId,
      mediaProductType:'PAGE_POST',providerPostId:outcome?.providerPostId||null,
      providerState:'unknown',
    }}
  try{await store.save(uncertain,claim.revision)}
  catch{}
  return {ok:false,error:'facebook_delivery_unknown',record:uncertain}
}
