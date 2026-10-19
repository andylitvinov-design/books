// Owner-only editorial calendar. No provider calls or auto-publishing occur here.
export const GROWTH_BRANDS = Object.freeze({
  holistic_house: 'https://holistichouse.vercel.app',
  toronto_tantra: 'https://torontotantra.vercel.app',
  psitrends: 'https://psitrends.com',
})
export const GROWTH_CHANNELS = Object.freeze(['instagram', 'facebook', 'telegram', 'youtube', 'linkedin', 'threads', 'bluesky', 'pinterest', 'tiktok', 'eventbrite', 'meetup', 'manual'])
export const GROWTH_LANGUAGES = Object.freeze(['en', 'ru', 'es'])
export const GROWTH_STATES = Object.freeze(['draft', 'approved', 'planned_manual', 'archived', 'sending', 'published', 'delivery_unknown'])
const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CAMPAIGN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/
const POST_KEYS = new Set(['brand', 'channel', 'locale', 'title', 'caption', 'sourceUrl', 'campaign', 'scheduledAt', 'mediaUrl', 'mediaAlt'])
const PRIVATE_ROUTES = /(?:^|\/)(?:api|admin|app|client|clients|reports|prescriptions|myspace|account|checkout|login)(?:\/|$)/i

export class GrowthStudioError extends Error {
  constructor(code) { super(code); this.name = 'GrowthStudioError'; this.code = code }
}
const reject = () => { throw new GrowthStudioError('invalid_post') }
function shortText(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) reject()
  const text = value.trim()
  if (required && !text) reject()
  return text
}
export function normalizePublicSource(value, brand) {
  if (!Object.hasOwn(GROWTH_BRANDS, brand)) reject()
  const text = shortText(value, 500)
  if (!text) return ''
  if (text.startsWith('//') || text.startsWith('\\') || /[\s\\]/.test(text)) reject()
  let url
  try { url = new URL(text, GROWTH_BRANDS[brand]) } catch { return reject() }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.search ||
      url.origin !== GROWTH_BRANDS[brand]) reject()
  let path
  try { path = decodeURIComponent(url.pathname) } catch { return reject() }
  // Reject encoded paths, including double-encoded private route and slash tricks.
  if (url.pathname.includes('%') || path.includes('\\') || path.includes('//') || PRIVATE_ROUTES.test(path)) reject()
  return url.origin + url.pathname
}
export function normalizePostFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !POST_KEYS.has(key))) reject()
  const brand = value.brand
  if (!Object.hasOwn(GROWTH_BRANDS, brand) || !GROWTH_CHANNELS.includes(value.channel) ||
      !GROWTH_LANGUAGES.includes(value.locale)) reject()
  const title = shortText(value.title, 120, true)
  const caption = shortText(value.caption, 3500)
  const campaign = shortText(value.campaign, 64).toLowerCase()
  if (campaign && !CAMPAIGN.test(campaign)) reject()
  const sourceUrl = normalizePublicSource(value.sourceUrl, brand)
  const mediaUrl = normalizePublicSource(value.mediaUrl ?? '', brand)
  if (mediaUrl && !/\.(?:png|jpe?g|webp|gif|mp4)$/i.test(new URL(mediaUrl).pathname)) reject()
  const mediaAlt = shortText(value.mediaAlt ?? '', 240)
  if (mediaUrl && /\.(?:png|jpe?g|webp|gif)$/i.test(new URL(mediaUrl).pathname) && !mediaAlt) reject()
  const scheduledAt = shortText(value.scheduledAt, 35)
  if (scheduledAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(scheduledAt) ||
      !Number.isFinite(Date.parse(scheduledAt)) || new Date(scheduledAt).toISOString() !== scheduledAt)) reject()
  return {brand, channel:value.channel, locale:value.locale, title, caption, campaign, sourceUrl, scheduledAt, mediaUrl, mediaAlt}
}
export function isSavedGrowthPost(value) {
  try {
    if (!value || typeof value !== 'object' || !POST_ID.test(value.id) || !GROWTH_STATES.includes(value.status) ||
        !Number.isSafeInteger(value.revision) || value.revision < 1 ||
        typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) ||
        typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) return false
    const fields = normalizePostFields(Object.fromEntries([...POST_KEYS].map(key => [key, value[key]])))
    if ((value.status === 'planned_manual' || value.status === 'approved') && !fields.caption) return false
    if (value.status === 'planned_manual' && !fields.scheduledAt) return false
    if (['sending','delivery_unknown'].includes(value.status)&&
        (typeof value.attemptId!=='string'||!POST_ID.test(value.attemptId))) return false
    if (value.status === 'published'&&(
      !value.delivery||value.delivery.provider!=='telegram'||
      !Number.isSafeInteger(value.delivery.messageId)||value.delivery.messageId<=0||
      typeof value.delivery.publishedAt!=='string'||
      !Number.isFinite(Date.parse(value.delivery.publishedAt))||
      (value.delivery.url && !/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\/\d+$/.test(value.delivery.url)))) return false
    return true
  } catch { return false }
}
export function nextGrowthPost({current = null, fields = null, action, id, now = new Date()}) {
  if (!['save', 'approve', 'plan', 'archive', 'reopen'].includes(action)) throw new GrowthStudioError('invalid_action')
  const time = now.toISOString()
  const original = current
  if (current && !isSavedGrowthPost(current)) reject()
  if (action !== 'save' && !current) throw new GrowthStudioError('not_found')
  if (action === 'save' && (!POST_ID.test(id) || (current && current.id !== id))) reject()
  if (action === 'save') {
    if (current && ['sending','published','delivery_unknown'].includes(current.status))
      throw new GrowthStudioError('invalid_transition')
    const normalized = normalizePostFields(fields)
    return { ...normalized, id, revision:(original?.revision ?? 0)+1,
      createdAt:original?.createdAt ?? time, updatedAt:time, status:'draft' }
  }
  let status
  if (action === 'approve') {
    if (current.status !== 'draft' || !current.caption.trim()) throw new GrowthStudioError('invalid_transition')
    status = 'approved'
  } else if (action === 'plan') {
    if (current.status !== 'approved' || !current.scheduledAt ||
        Date.parse(current.scheduledAt) < now.getTime()+60_000) throw new GrowthStudioError('invalid_transition')
    status = 'planned_manual'
  } else if (action === 'archive') {
    if (['archived','sending','published','delivery_unknown'].includes(current.status)) throw new GrowthStudioError('invalid_transition')
    status = 'archived'
  } else {
    if (!['approved', 'planned_manual', 'archived'].includes(current.status)) throw new GrowthStudioError('invalid_transition')
    status = 'draft'
  }
  return {...current, status, revision:current.revision+1, updatedAt:time}
}
export function publicCampaignLink(post) {
  const fields = normalizePostFields(Object.fromEntries([...POST_KEYS].map(key => [key, post?.[key]])))
  if (!fields.sourceUrl) return ''
  const url = new URL(fields.sourceUrl)
  url.searchParams.set('utm_source', fields.channel)
  url.searchParams.set('utm_medium', 'organic_social')
  url.searchParams.set('utm_campaign', fields.campaign || 'hh_growth')
  url.searchParams.set('utm_content', fields.locale)
  return url.toString()
}
export function orderGrowthPosts(records) {
  return [...records].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
}
