'use server'
import {randomUUID} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GrowthStudioError, nextGrowthPost} from '@/lib/growth-studio/model.mjs'
import {prepareGrowthBulk,sameGrowthDraft} from '@/lib/growth-studio/bulk.mjs'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'

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
