import {createHash} from 'node:crypto'
import {GrowthStudioError,normalizePostFields} from './model.mjs'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fail=()=>{throw new GrowthStudioError('invalid_post')}
export const MAX_BULK_POSTS=20
function idFor(batchId,index) {
  const hex=createHash('sha256').update('HH-GROWTH-v1:'+batchId+':'+index).digest('hex')
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32)
}
export function prepareGrowthBulk(input,now=new Date()){
  if (!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!['batchId','entries'].includes(key))||
      typeof input.batchId!=='string'||!UUID.test(input.batchId)||
      !Array.isArray(input.entries)||input.entries.length<1||
      input.entries.length>MAX_BULK_POSTS) fail()
  const iso=now.toISOString()
  const posts=input.entries.map((source,index)=>({
    ...normalizePostFields(source), id:idFor(input.batchId,index),
    status:'draft',revision:1,createdAt:iso,updatedAt:iso,
  }))
  if(new Set(posts.map(x=>x.id)).size!==posts.length) fail()
  return posts
}
export function sameGrowthDraft(previous,incoming){
  if (!previous||previous.id!==incoming.id) return false
  const fields=['brand','channel','locale','title','caption','sourceUrl','campaign','scheduledAt','mediaUrl','mediaAlt']
  return fields.every(key=>(previous[key]??'')===(incoming[key]??''))
}
