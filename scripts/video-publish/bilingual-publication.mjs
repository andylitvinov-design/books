import { REVIEWED_MASTERS } from './reviewed-masters.mjs'
import { isAllowedHeyGenUrl } from './youtube-private-core.mjs'

// Owner decision, 2026-10-02: both languages use this connected channel.
export const BILINGUAL_TARGET = Object.freeze({
  provider: 'metricool', brandId: '7153286', channelId: 'UCjWq6NHZTQkUr3bC3WbXXcw',
  channelHandle: '@shamanic_academy', timezone: 'America/Toronto',
})

export function planPublication(job, connected, checkpoint) {
  if (!job || job.scope !== 'public' || job.approval !== 'approved' || job.clientId || job.followUpId) {
    throw new Error('Only explicitly approved public content may enter distribution')
  }
  if (String(connected?.brandId) !== BILINGUAL_TARGET.brandId || connected?.channelId !== BILINGUAL_TARGET.channelId) {
    throw new Error('Connected channel does not match the owner-selected channel')
  }
  const master = REVIEWED_MASTERS.find(m => `${m.page}:${m.locale}` === job.masterKey)
  if (!master || master.locale !== job.language) throw new Error('Unknown or mismatched approved master')
  const title = String(job.title || '').trim()
  const description = String(job.description || '').trim()
  if (!title || title.length > 100 || description.length > 5000) throw new Error('Invalid publication copy')
  const plan = {
    schemaVersion: 1, ...BILINGUAL_TARGET, masterKey: job.masterKey, language: master.locale,
    heygenId: master.heygenId, driveFileId: master.fileId, sha256: master.sha256,
    title, description, action: 'schedule',
  }
  if (!checkpoint) return plan
  for (const field of ['masterKey', 'language', 'driveFileId', 'sha256', 'channelId', 'brandId']) {
    if (checkpoint[field] !== plan[field]) throw new Error('Publication checkpoint identity mismatch')
  }
  const actions = {'submission-intent':'reconcile', uncertain:'reconcile', failed:'reconcile', scheduled:'wait', published:'verify-playback', verified:'reuse'}
  if (!Object.hasOwn(actions, checkpoint.state)) throw new Error('Unknown publication checkpoint state')
  if (['published', 'verified'].includes(checkpoint.state) && !/^[A-Za-z0-9_-]{11}$/.test(checkpoint.youtubeId || '')) {
    throw new Error('Published checkpoint requires its exact YouTube ID')
  }
  if (checkpoint.state === 'scheduled' && !checkpoint.metricoolUuid) throw new Error('Scheduled checkpoint requires its provider UUID')
  return {...plan, action:actions[checkpoint.state], ...(checkpoint.youtubeId ? {youtubeId:checkpoint.youtubeId} : {}), ...(checkpoint.metricoolUuid ? {metricoolUuid:checkpoint.metricoolUuid} : {})}
}

// This produces a connected-tool request; it does not upload or archive anything itself.
// The operator must stream-hash the exact media bytes, then durably record intent BEFORE dispatch.
export function buildMetricoolRequest(plan, media, scheduledFor, now = Date.now()) {
  if (plan.action !== 'schedule' || plan.channelId !== BILINGUAL_TARGET.channelId || plan.brandId !== BILINGUAL_TARGET.brandId) {
    throw new Error('Only a fresh approved plan may be scheduled')
  }
  const master = REVIEWED_MASTERS.find(m => `${m.page}:${m.locale}` === plan.masterKey)
  if (!master || master.locale !== plan.language || master.fileId !== plan.driveFileId || master.heygenId !== plan.heygenId || master.sha256 !== plan.sha256) {
    throw new Error('Publication plan does not match the approved master')
  }
  if (media?.sha256 !== plan.sha256 || !isAllowedHeyGenUrl(media?.url)) throw new Error('Verified original HeyGen media is required')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/.test(scheduledFor) || !(Date.parse(scheduledFor) > now)) {
    throw new Error('A future Toronto ISO date with UTC offset is required')
  }
  // Verify the supplied offset agrees with Toronto DST rather than silently shifting the slot.
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:BILINGUAL_TARGET.timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(new Date(scheduledFor))
  const p = Object.fromEntries(parts.map(x => [x.type,x.value]))
  const wallTime = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
  if (wallTime !== scheduledFor.slice(0,19)) throw new Error('Date offset does not match Toronto timezone')
  return {
    blogId: BILINGUAL_TARGET.brandId, date: scheduledFor,
    info: JSON.stringify({
      publicationDate: {dateTime:wallTime, timezone:BILINGUAL_TARGET.timezone},
      text:plan.description, providers:[{network:'youtube'}], media:[media.url],
      autoPublish:true, saveExternalMediaFiles:true, draft:false,
      youtubeData:{title:plan.title, type:'video', privacy:'unlisted', madeForKids:false, isAiGeneratedContent:true, notifySubscribers:false},
    }),
  }
}
