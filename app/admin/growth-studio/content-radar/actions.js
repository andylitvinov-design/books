'use server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
import {scanGrowthPublicRadar,createGrowthRadarDraft} from '@/lib/growth-studio/content-radar.mjs'

const safeError=error=>new Set([
  'invalid_source','radar_unavailable','source_unavailable','source_not_public',
  'source_not_html','source_too_large','source_invalid_html','source_missing_metadata',
  'conflict','capacity_reached',
]).has(error?.code)?error.code:'storage_unavailable'

// Read ONLY the already-published public sitemap, and only at an owner's
// explicit click. No customer data ever leaves the server.
export async function scanGrowthRadarAction(input) {
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>key!=='locale')||
    !['en','ru','es'].includes(input.locale))return {ok:false,error:'invalid_source'}
  try {
    const store=getGrowthStudioStore()
    if(!store)return {ok:false,error:'storage_unavailable'}
    const posts=await store.list()
    const candidates=await scanGrowthPublicRadar({
      locale:input.locale,existingSourceUrls:posts.map(post=>post.sourceUrl),
    })
    return {ok:true,candidates}
  }catch(error){return {ok:false,error:safeError(error)}}
}

// Explicit owner confirmation creates exactly one review-only first-party
// editorial draft using existing atomic store and a deterministic ID.
// Never sends anything to a social provider or remote marketing tool.
export async function createGrowthRadarDraftAction(input) {
  if(!await requireAdminRequest())return {ok:false,error:'unauthorized'}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>!['sourceUrl','locale','channel','confirmed'].includes(key))||
    input.confirmed!==true||typeof input.sourceUrl!=='string'||
    !['en','ru','es'].includes(input.locale)||
    !['manual','facebook','instagram','telegram','linkedin','threads','bluesky'].includes(input.channel))
    return {ok:false,error:'invalid_source'}
  try {
    const store=getGrowthStudioStore()
    if(!store)return {ok:false,error:'storage_unavailable'}
    const result=await createGrowthRadarDraft(input,{store})
    return {ok:true,reused:result.reused,
      draftId:result.record.id,status:result.record.status}
  }catch(error){return {ok:false,error:safeError(error)}}
}
