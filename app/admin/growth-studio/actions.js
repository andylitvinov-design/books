'use server'
import {randomUUID} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GrowthStudioError, nextGrowthPost} from '@/lib/growth-studio/model.mjs'
import {prepareGrowthBulk,sameGrowthDraft} from '@/lib/growth-studio/bulk.mjs'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
import {telegramConfig,telegramPayload,sendTelegramPost} from '@/lib/growth-studio/telegram.mjs'

const safeError = error => error instanceof GrowthStudioError &&
  ['invalid_post','invalid_action','invalid_transition','not_found','conflict','capacity_reached'].includes(error.code)
    ? error.code : 'storage_unavailable'

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
