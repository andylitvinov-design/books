import { randomBytes } from 'node:crypto'
import { parseSessionYouTubeUrl } from './youtube-resource.js'

export const PRIVATE_MEDIA_BUCKET = 'hh-client-private-media'
export const SESSION_MEDIA_TYPES = Object.freeze({
  'audio/webm': { kind: 'audio', ext: 'webm', max: 20_000_000 },
  'audio/mp4': { kind: 'audio', ext: 'm4a', max: 20_000_000 },
  'audio/x-m4a': { kind: 'audio', ext: 'm4a', max: 20_000_000 },
  'audio/mpeg': { kind: 'audio', ext: 'mp3', max: 20_000_000 },
  'audio/wav': { kind: 'audio', ext: 'wav', max: 20_000_000 },
  'audio/x-wav': { kind: 'audio', ext: 'wav', max: 20_000_000 },
  'audio/ogg': { kind: 'audio', ext: 'ogg', max: 20_000_000 },
  'audio/flac': { kind: 'audio', ext: 'flac', max: 20_000_000 },
  'audio/aac': { kind: 'audio', ext: 'aac', max: 20_000_000 },
  'video/mp4': { kind: 'video', ext: 'mp4', max: 45_000_000 },
  'video/quicktime': { kind: 'video', ext: 'mov', max: 45_000_000 },
  'application/pdf': { kind: 'pdf', ext: 'pdf', max: 15_000_000 },
  'image/jpeg': { kind: 'image', ext: 'jpg', max: 5_000_000 },
  'image/png': { kind: 'image', ext: 'png', max: 5_000_000 },
  'image/webp': { kind: 'image', ext: 'webp', max: 5_000_000 },
})
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const validUuid = value => typeof value === 'string' && uuid.test(value)
export const validSelector = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{22}$/.test(value)
export const validSecret = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(value)
export const newSelector = () => randomBytes(16).toString('base64url')
export const clipText = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : ''
// A small, practitioner-authored session plan. This is not a new medical record,
// prescription engine or automatic recommendation system. Missing fields in
// older encrypted snapshots normalize to an empty plan.
export function normalizeClientPlan(value=null) {
  const empty={focus:'',nextStep:'',takeaways:[],practices:[],additionalRecommendations:'',resources:[]}
  if(value==null)return empty
  if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(key=>!['focus','nextStep','takeaways','practices','additionalRecommendations','resources','materialIds','materials'].includes(key)))
    throw new Error('INVALID_SESSION_PLAN')
  const clean=(text,max)=>{
    if(typeof text!=='string'||text.length>max||text.includes('\0')) throw new Error('INVALID_SESSION_PLAN')
    return text.trim()
  }
  const takeaways=value.takeaways??[],practices=value.practices??[],resources=value.resources??[]
  if(!Array.isArray(resources)||resources.length>8)throw new Error('INVALID_SESSION_PLAN')
  // Reusable library selections are only identifiers in the editor. The server
  // resolves snapshots from the protected catalog before saving/publishing.
  const materialIds=value.materialIds??[]
  if(!Array.isArray(materialIds)||materialIds.length>24||new Set(materialIds).size!==materialIds.length||
    materialIds.some(id=>!validUuid(id)))throw new Error('INVALID_SESSION_MATERIALS')
  const materials=value.materials??[]
  if(!Array.isArray(materials)||materials.length>24||new Set(materials.map(item=>item?.id)).size!==materials.length)
    throw new Error('INVALID_SESSION_MATERIALS')
  const approvedMaterials=materials.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||!validUuid(item.id)||
      Object.keys(item).some(key=>!['id','kind','title','description','url','mime'].includes(key))||
      !['youtube','image','video','audio'].includes(item.kind))
      throw new Error('INVALID_SESSION_MATERIALS')
    const title=typeof item.title==='string'?item.title.trim():'',
      description=typeof item.description==='string'?item.description.trim():''
    if(!title||title.length>140||description.length>500||title.includes('\\0')||description.includes('\\0'))
      throw new Error('INVALID_SESSION_MATERIALS')
    if(item.kind==='youtube'){
      const video=parseSessionYouTubeUrl(item.url)
      if(!video||item.mime!==undefined)throw new Error('INVALID_SESSION_MATERIALS')
      return {id:item.id,kind:'youtube',title,description,url:video.url}
    }
    if(item.url!==undefined||SESSION_MEDIA_TYPES[item.mime]?.kind!==item.kind)
      throw new Error('INVALID_SESSION_MATERIALS')
    return {id:item.id,kind:item.kind,title,description,mime:item.mime}
  })
  const validLink=(raw)=>{
    if(typeof raw!=='string'||raw.length>1500)throw new Error('INVALID_SESSION_RESOURCE')
    let url
    try{url=new URL(raw)}catch{throw new Error('INVALID_SESSION_RESOURCE')}
    const host=url.hostname.toLowerCase()
    if(url.protocol!=='https:'||url.username||url.password||!host||
      ['localhost','127.0.0.1','::1','drive.google.com','docs.google.com'].includes(host)||
      /\.local(host)?$/.test(host)||
      /^((10|127|192|169)\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host)||
      url.searchParams.has('token')||url.searchParams.has('secret')||
      url.hash)throw new Error('INVALID_SESSION_RESOURCE')
    return url.href
  }
  const approvedResources=resources.map(resource=>{
    if(!resource||typeof resource!=='object'||Array.isArray(resource)||
      Object.keys(resource).some(k=>!['title','description','url','kind','placement'].includes(k)))
      throw new Error('INVALID_SESSION_RESOURCE')
    const title=clean(resource.title,140),description=clean(resource.description??'',500)
    if(!title)throw new Error('INVALID_SESSION_RESOURCE')
    if(resource.kind!==undefined&&resource.kind!=='youtube')
      throw new Error('INVALID_SESSION_RESOURCE')
    if(resource.kind==='youtube'){
      // This is only for general educational material already on YouTube.
      // Never treat Unlisted as a private session video.
      const video=parseSessionYouTubeUrl(resource.url)
      if(!video)throw new Error('INVALID_SESSION_RESOURCE')
      if(resource.placement!==undefined&&!['top','materials'].includes(resource.placement))
        throw new Error('INVALID_SESSION_RESOURCE')
      return {kind:'youtube',title,description,url:video.url,
        ...(resource.placement==='materials'?{placement:'materials'}:{})}
    }
    if(resource.placement!==undefined)throw new Error('INVALID_SESSION_RESOURCE')
    return {title,description,url:validLink(resource.url)}
  })
  if(!Array.isArray(takeaways)||takeaways.length>3||
     !Array.isArray(practices)||practices.length>3)throw new Error('INVALID_SESSION_PLAN')
  const mapped=practices.map(practice=>{
    if(!practice||typeof practice!=='object'||Array.isArray(practice)||
       Object.keys(practice).some(key=>!['title','instructions'].includes(key)))
      throw new Error('INVALID_SESSION_PLAN')
    const title=clean(practice.title,120),instructions=clean(practice.instructions,1500)
    if(!title)throw new Error('INVALID_SESSION_PLAN')
    return {title,instructions}
  })
  return {
    focus:clean(value.focus??'',300),
    nextStep:clean(value.nextStep??'',300),
    takeaways:takeaways.map(item=>clean(item,300)).filter(Boolean),
    practices:mapped,
    additionalRecommendations:clean(value.additionalRecommendations??'',4000),
    resources:approvedResources,
    ...(value.materialIds!==undefined?{materialIds}:{}),
    ...(value.materials!==undefined?{materials:approvedMaterials}:{}),
  }
}

export function normalizeDraft(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid session draft')
  if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.length > 160
      || typeof body.summary !== 'string' || body.summary.length > 6000
      || (body.reportDocumentId != null && !validUuid(body.reportDocumentId))
      || !Array.isArray(body.media) || body.media.length > 30) throw new Error('Invalid session fields')
  const seen = new Set()
  return {
    title: clipText(body.title,160),
    summary: clipText(body.summary,6000),
    plan:normalizeClientPlan(body.plan),
    reportDocumentId: body.reportDocumentId || null,
    media: body.media.map((item,index) => {
      if (!item || !validUuid(item.assetId) || seen.has(item.assetId)
          || !['client','practitioner'].includes(item.scope)
          || typeof item.title !== 'string' || item.title.length > 160
          || typeof item.transcript !== 'string' || item.transcript.length > 12000
          || (item.role!==undefined&&!['personal','instruction','meditation','additional','hidden'].includes(item.role)))
        throw new Error('Invalid media item')
      seen.add(item.assetId)
      return { assetId:item.assetId, scope:item.scope, title:clipText(item.title,160),
        transcript:clipText(item.transcript,12000), role:item.role||'personal',sortOrder:index }
    }),
  }
}
export const clientPayload = draft => ({
  title:draft.title, summary:draft.summary, plan:normalizeClientPlan(draft.plan), reportDocumentId:draft.reportDocumentId,
  media:draft.media.filter(item => item.scope === 'client' && item.role !== 'hidden'),
})
export const emptySessionDraft = ({title='Consultation',reportDocumentId=null}={}) =>
  ({title,summary:'',reportDocumentId,media:[],plan:normalizeClientPlan()})
export const deliveryEnabled = (env=process.env) => env.HH_CLIENT_DELIVERY_ENABLED === 'true'
export const mediaDurationLabel = seconds => Number.isFinite(seconds) ? Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0') : ''


/** Public view for a single scoped session invitation; never serialize client
 * or consultation identifiers, revision metadata or owner-only fields. */
export function guestSessionProjection(session) {
  if(!session || typeof session!=='object') throw new Error('SESSION_UNAVAILABLE')
  const {id,occurredOn,title,summary,report,media,plan}=session
  return {
    id,occurredOn,title,summary,plan:normalizeClientPlan(plan),
    report:report?{kind:report.kind}:null,
    media:Array.isArray(media)?media.filter(x=>x.scope==='client'&&x.role!=='hidden').map(x=>({
      assetId:x.assetId,kind:x.kind,mime:['video/mp4','video/quicktime'].includes(x.mime)?x.mime:null,
      title:x.title,transcript:x.transcript||'',role:x.role||'personal',
      durationSeconds:x.durationSeconds??null,sortOrder:x.sortOrder
    })):[],
  }
}
