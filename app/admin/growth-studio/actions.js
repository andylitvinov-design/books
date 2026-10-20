'use server'
import {randomUUID} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GrowthStudioError, nextGrowthPost} from '@/lib/growth-studio/model.mjs'
import {previewPublicGrowthSource} from '@/lib/growth-studio/source-preview.mjs'
import {prepareGrowthBulk,sameGrowthDraft} from '@/lib/growth-studio/bulk.mjs'
import {prepareEvergreenGrowthDrafts} from '@/lib/growth-studio/evergreen.mjs'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
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
      Object.keys(input).some(key => !['action','id','expectedRevision','fields'].includes(key)) ||
      !['save','approve','plan','archive','reopen'].includes(input.action) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
      (input.action !== 'save' && input.fields !== undefined)) return {ok:false,error:'invalid_post'}
  try {
    const store = getGrowthStudioStore()
    if (!store) return {ok:false,error:'storage_unavailable'}
    const newRecord = input.action === 'save' && !input.id
    const id = newRecord ? randomUUID() : input.id
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return {ok:false,error:'invalid_post'}
    const current = newRecord ? null : await store.get(id)
    if ((current?.revision ?? 0) !== input.expectedRevision || (!current && !newRecord))
      return {ok:false,error:current ? 'conflict' : 'not_found'}
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
