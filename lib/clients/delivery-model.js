import { randomBytes } from 'node:crypto'

export const PRIVATE_MEDIA_BUCKET = 'hh-client-private-media'
export const SESSION_MEDIA_TYPES = Object.freeze({
  'audio/webm': { kind: 'audio', ext: 'webm', max: 20_000_000 },
  'audio/mp4': { kind: 'audio', ext: 'm4a', max: 20_000_000 },
  'audio/x-m4a': { kind: 'audio', ext: 'm4a', max: 20_000_000 },
  'audio/mpeg': { kind: 'audio', ext: 'mp3', max: 20_000_000 },
  'video/mp4': { kind: 'video', ext: 'mp4', max: 45_000_000 },
})
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const validUuid = value => typeof value === 'string' && uuid.test(value)
export const validSelector = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{22}$/.test(value)
export const validSecret = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(value)
export const newSelector = () => randomBytes(16).toString('base64url')
export const clipText = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : ''
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
    reportDocumentId: body.reportDocumentId || null,
    media: body.media.map((item,index) => {
      if (!item || !validUuid(item.assetId) || seen.has(item.assetId)
          || !['client','practitioner'].includes(item.scope)
          || typeof item.title !== 'string' || item.title.length > 160
          || typeof item.transcript !== 'string' || item.transcript.length > 12000)
        throw new Error('Invalid media item')
      seen.add(item.assetId)
      return { assetId:item.assetId, scope:item.scope, title:clipText(item.title,160),
        transcript:clipText(item.transcript,12000), sortOrder:index }
    }),
  }
}
export const clientPayload = draft => ({
  title:draft.title, summary:draft.summary, reportDocumentId:draft.reportDocumentId,
  media:draft.media.filter(item => item.scope === 'client'),
})
export const emptySessionDraft = ({title='Consultation',reportDocumentId=null}={}) =>
  ({title,summary:'',reportDocumentId,media:[]})
export const deliveryEnabled = (env=process.env) => env.HH_CLIENT_DELIVERY_ENABLED === 'true'
export const mediaDurationLabel = seconds => Number.isFinite(seconds) ? Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0') : ''


/** Public view for a single scoped session invitation; never serialize client
 * or consultation identifiers, revision metadata or owner-only fields. */
export function guestSessionProjection(session) {
  if(!session || typeof session!=='object') throw new Error('SESSION_UNAVAILABLE')
  const {id,occurredOn,title,summary,report,media}=session
  return {
    id,occurredOn,title,summary,
    report:report?{kind:report.kind}:null,
    media:Array.isArray(media)?media.filter(x=>x.scope==='client').map(x=>({
      assetId:x.assetId,kind:x.kind,title:x.title,transcript:x.transcript||'',
      durationSeconds:x.durationSeconds??null,sortOrder:x.sortOrder
    })):[],
  }
}
