/**
 * Source-backed OWNER history projection, not a grant or provider packet.
 * No durable copy: deleting the underlying archive removes the next search result.
 * Only server-validated reviewed fields are eligible; no transcript/AI summary.
 */
export const OWNER_MEMORY_VERSION='hh-owner-reviewed-memory-v1'
export const OWNER_MEMORY_MAX_RECORDS=120
export const OWNER_MEMORY_MAX_CIPHERTEXT_BYTES=4*1024*1024
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const key=/^[a-z0-9_]{1,60}$/
const types=new Set(['resource','goal_statement','action_statement','practice_observation','state_observation','client_statement'])
const mapping=Object.freeze({
 resources:'resource',support:'resource',strengths:'resource',
 goal:'goal_statement',direction:'goal_statement',wishes:'goal_statement',
 plan:'action_statement',next:'action_statement',timing:'action_statement',
 practices:'practice_observation',resource_observation:'practice_observation',experiment:'practice_observation',
 wellbeing:'state_observation',feelings:'state_observation',changes:'state_observation',baseline:'state_observation'
})
const validDate=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v
const invalid=()=>{throw Error('MY_COACH_MEMORY_QUERY_INVALID')}
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const fold=v=>v.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
const tokens=v=>[...new Set(fold(v).match(/[\p{L}\p{N}]+/gu)||[])]
const compare=(a,b)=>a<b?-1:a>b?1:0

export function normalizeOwnerMemoryQuery(input){
 if(!plain(input)||input.ownerReview!==true||
    Object.keys(input).some(k=>!['ownerReview','query','types','courseSessionId','through','limit'].includes(k)))invalid()
 const query=input.query===undefined?'':input.query
 if(typeof query!=='string'||query.length>120||/[\u0000-\u001f\u007f]/u.test(query))invalid()
 const terms=tokens(query)
 if(terms.length>12||(query.trim()&&terms.length===0))invalid()
 const requested=input.types===undefined?[]:input.types
 if(!Array.isArray(requested)||requested.length>types.size||
    requested.some(t=>!types.has(t))||new Set(requested).size!==requested.length)invalid()
 const course=input.courseSessionId===undefined?null:input.courseSessionId
 if(course!==null&&(typeof course!=='string'||!key.test(course)))invalid()
 const through=input.through===undefined?null:input.through
 if(through!==null&&(typeof through!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(through)||
    !Number.isFinite(Date.parse(through))||new Date(through).toISOString().slice(0,10)!==through))invalid()
 const limit=input.limit===undefined?8:input.limit
 if(!Number.isInteger(limit)||limit<1||limit>12||(!terms.length&&!requested.length&&!course))invalid()
 return {query:query.trim(),terms,types:[...requested],courseSessionId:course,through,limit}
}

/** Caller must use the real canonical course review resolver on an owner-bound
 * archived source. These redundant checks reject mismatched source turns.
 * The source date denotes session completion, not the event's real-world date.
 */
export function projectOwnerReviewedEvidence({accountId,protocol,reviewRows},owner){
 if(typeof owner!=='string'||!uuid.test(owner)||accountId!==owner||
    protocol?.provenance!=='client_reviewed_dialogue'||!uuid.test(protocol.id||'')||
    !validDate(protocol.completedAt)||!key.test(protocol.courseSessionId||'')||
    !protocol.courseFieldReview||!Array.isArray(protocol.turns)||!Array.isArray(reviewRows))
   return {supported:false,items:[]}
 const items=[],seen=new Set()
 for(const row of reviewRows){
   if(row?.status!=='confirmed'||row.source!=='client_reviewed_quote'||row.archived||
      !key.test(row.id||'')||seen.has(row.id)||!Number.isInteger(row.turnIndex)||row.turnIndex<0||
      !Number.isSafeInteger(row.revision)||row.revision<1||
      typeof row.quote!=='string'||!row.quote.trim()||row.quote.length>1200||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(row.quote))continue
   const turn=protocol.turns[row.turnIndex]
   if(turn?.role!=='user'||turn.unanswered===true||turn.requestedSavedContext===true||
      turn.privateGreetingPrefix===true||typeof turn.content!=='string'||turn.content.trim()!==row.quote)continue
   // Private recall/greeting assistant material cannot serve as the preceding
   // question for a newly extracted fact. Source flags only restrict reuse.
   const previous=protocol.turns[row.turnIndex-1]
   if(previous?.requestedSavedContext===true||previous?.privateGreetingPrefix===true)continue
   seen.add(row.id)
   items.push({
     accountId,kind:Object.hasOwn(mapping,row.id)?mapping[row.id]:'client_statement',
     evidenceStatus:'client_confirmed',temporalStatus:'historical',
     value:row.quote,sessionEndedAt:protocol.completedAt,
     ...(validDate(turn.capturedAt)?{observedAt:turn.capturedAt}:{}),
     source:{kind:'reviewed_coaching_protocol',protocolId:protocol.id.toLowerCase(),
       courseSessionId:protocol.courseSessionId,fieldId:row.id,fieldRevision:row.revision,
       turnIndex:row.turnIndex}
   })
 }
 return {supported:true,items}
}

export function searchOwnerReviewedEvidence(items,owner,query){
 if(!uuid.test(owner||'')||!Array.isArray(items)||!query||!Array.isArray(query.terms)||
    !Array.isArray(query.types)||!Number.isInteger(query.limit)||query.limit<1||query.limit>12)invalid()
 const ranked=[]
 for(const item of items){
   if(item?.accountId!==owner||item.evidenceStatus!=='client_confirmed'||
      item.temporalStatus!=='historical'||!types.has(item.kind)||
      !validDate(item.sessionEndedAt)||typeof item.value!=='string'||
      item.source?.kind!=='reviewed_coaching_protocol'||
      (query.courseSessionId&&item.source.courseSessionId!==query.courseSessionId)||
      (query.types.length&&!query.types.includes(item.kind))||
      (query.through&&item.sessionEndedAt.slice(0,10)>query.through))continue
   const words=tokens(item.value)
   // All terms must match exact words or a sufficiently long prefix.
   // No unrelated recent entry is substituted for a missing match.
   const matches=query.terms.map(t=>words.includes(t)?2:t.length>=3&&words.some(w=>w.startsWith(t))?1:0)
   if(matches.some(n=>n===0))continue
   const score=matches.reduce((a,b)=>a+b,0)+(query.query&&fold(item.value).includes(fold(query.query))?4:0)
   ranked.push({item,score})
 }
 ranked.sort((a,b)=>b.score-a.score||compare(b.item.sessionEndedAt,a.item.sessionEndedAt)||
   compare(a.item.source.protocolId,b.item.source.protocolId)||compare(a.item.source.fieldId,b.item.source.fieldId)||
   b.item.source.fieldRevision-a.item.source.fieldRevision)
 const seen=new Set(),result=[]
 for(const {item} of ranked){
   const id=item.source.protocolId+':'+item.source.fieldId+':'+item.source.fieldRevision
   if(seen.has(id))continue
   seen.add(id)
   const {accountId:ignored,...view}=item
   result.push(view)
   if(result.length===query.limit)break
 }
 return result
}
