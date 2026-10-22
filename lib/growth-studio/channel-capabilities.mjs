// Public-facing publication capability and readiness contract.
// "draftSupported" means content can be PREPARED, never that an API is connected.
// Every platform is separate from credentials, permissions and live publication receipts.
const channel = (name, mode, formats, description, options = {}) => Object.freeze({
  name, mode, formats:Object.freeze(formats), description,
  supportsDirectPosting:false, ...options,
})

export const CHANNEL_CAPABILITIES = Object.freeze({
  facebook:channel('Facebook Pages','manual',['text','photo','video'],'Page permissions and Meta approval required. Personal profiles/groups may require assisted posting.'),
  instagram:channel('Instagram Business','manual',['photo','video'],'Business/Creator permissions, connected Page, approved media and platform audit required.',{requiresMedia:true,maxCaption:2200}),
  youtube:channel('YouTube','existing_uploader',['video'],'Use the separate owner-authorized RU/EN uploader; Google OAuth, channel and actual visibility need verification.',{requiresMedia:true,requiresVideo:true}),
  twitter:channel('X / Twitter','manual',['text','photo','video'],'Official API access and plan may involve fees; character limits depend on plan.'),
  linkedin:channel('LinkedIn','manual',['text','photo','video'],'Personal/business authorization and the official Posts API are needed.'),
  pinterest:channel('Pinterest','manual',['photo','video'],'An image/video and a destination board are required; boards are not configured in this editor.',{requiresMedia:true,requiresBoard:true}),
  google_business:channel('Google Business Profile','manual',['text','photo','video'],'Verified business location, approved API permissions and publication type are required.',{requiresLocation:true}),
  tiktok:channel('TikTok','manual',['photo','video'],'Approved Content Posting API and verified account; unaudited apps cannot freely direct-publish.',{requiresMedia:true}),
  telegram:channel('Telegram public channel','telegram_opt_in',['text','photo','video'],'Owner-only explicit send to a verified public channel through a dedicated bot.'),
  mastodon:channel('Mastodon','manual',['text','photo','video'],'Account instance and OAuth permissions required; per-instance text limits vary.'),
  threads:channel('Threads','manual',['text','photo','video'],'Official API permissions required; single-post copy is limited to 500 characters.',{maxCaption:500}),
  bluesky:channel('Bluesky','manual',['text','photo','video'],'App authorization required; single-post copy is limited to 300 characters.',{maxCaption:300}),
  wordpress:channel('WordPress','manual',['article','photo','video'],'Authenticated WordPress publishing, taxonomy and site permissions are not yet connected.'),
  eventbrite:channel('Eventbrite events','event_adapter',['event'],'Reuse approved TorontoTantra Event Publisher; draft text alone is not a validated event.',{requiresEvent:true}),
  meetup:channel('Meetup events','event_adapter',['event'],'Use authorized organizer integration when available; otherwise prepare manual event copy.',{requiresEvent:true}),
  manual:channel('Other / manual','manual',['text','photo','video'],'Copy the approved text and public media to the target yourself.'),
})

export const GROWTH_PUBLICATION_NETWORKS = Object.freeze(Object.keys(CHANNEL_CAPABILITIES))

const basename = value => {
  if(typeof value!=='string'||!value.trim())return ''
  try {return new URL(value,'https://holistichouse.vercel.app').pathname.toLowerCase()}catch{return ''}
}
const image = name => /\.(?:jpe?g|png|webp|gif)$/.test(name)
const video = name => /\.mp4$/.test(name)
const unicodeLength = value => [...String(value||'')].length
const asLink = fields => {
  // Construct only known public link metadata; this is for length estimates,
  // not for publishing. Public source URLs are validated by the editorial model.
  if(!fields?.sourceUrl)return ''
  try {
    const url=new URL(fields.sourceUrl,'https://holistichouse.vercel.app')
    if(fields.channel)url.searchParams.set('utm_source',fields.channel)
    url.searchParams.set('utm_medium','organic_social')
    url.searchParams.set('utm_campaign',fields.campaign||'hh_growth')
    url.searchParams.set('utm_content',fields.locale||'en')
    return url.toString()
  }catch{return ''}
}
export function reviewGrowthPublication(fields, readiness={}) {
  const channelId = fields?.channel
  const spec = CHANNEL_CAPABILITIES[channelId]
  if(!spec) return {state:'unsupported',mode:'manual',issues:['unsupported_channel'],canPublishNow:false,connected:false}
  const issues=[]
  const media = basename(fields?.mediaUrl)
  const hasMedia=Boolean(media)
  const isImage=image(media), isVideo=video(media)
  const length=unicodeLength([fields?.caption,asLink(fields)].filter(Boolean).join('\n\n'))
  if(spec.requiresMedia&&!hasMedia)issues.push('media_required')
  if(spec.requiresVideo&&!isVideo)issues.push('video_required')
  if(spec.maxCaption&&length>spec.maxCaption)issues.push('text_too_long')
  if(spec.requiresBoard)issues.push('pinterest_board_not_configured')
  if(spec.requiresLocation)issues.push('business_location_not_configured')
  if(spec.requiresEvent)issues.push('event_details_required')
  if(media && !isImage && !isVideo)issues.push('media_type_unsupported')
  if(channelId==='telegram') {
    if(isImage&&!/\.(?:jpe?g|png)$/.test(media))issues.push('telegram_media_unsupported')
    if(length>(hasMedia?1024:4096))issues.push('text_too_long')
    if(fields?.brand!=='holistic_house')issues.push('telegram_brand_not_configured')
  }
  const isConfigured=channelId==='telegram'&&readiness.telegramConfigured===true
  const isVerified=channelId==='telegram'&&readiness.telegramChannelVerified===true
  if(channelId==='telegram'&&!isConfigured)issues.push('telegram_not_configured')
  if(channelId==='telegram'&&isConfigured&&!isVerified)issues.push('telegram_channel_not_verified')
  const canPublishNow=channelId==='telegram' && isVerified && issues.length===0 &&
    ['approved','planned_manual'].includes(fields?.status)
  return {
    state:issues.length?'needs_action':canPublishNow?'eligible_after_confirm':'manual_or_external',
    mode:spec.mode,
    name:spec.name,
    issues,
    canPublishNow,
    connected:isVerified,
    draftSupported:true,
  }
}

// Only verified provider output can be described as delivered/published.
export function publicationStatusLabel(status,locale='en') {
  const ru=locale==='ru'
  const map = {
    draft:ru?'Черновик':'Draft',
    approved:ru?'Одобрено, не отправлено':'Approved, not sent',
    planned_manual:ru?'Ручной план, не в соцсети':'Manual plan, not scheduled externally',
    manual_done:ru?'Отмечено вручную · не проверено':'Owner marked done · unverified',
    sending:ru?'Отправка, не повторять':'Sending, do not retry',
    published:ru?'Подтверждено провайдером':'Provider confirmed',
    delivery_unknown:ru?'Результат неясен, проверить вручную':'Unknown delivery, manual verification needed',
    archived:ru?'В архиве, не отправлено':'Archived, not sent',
  }
  return map[status] ?? (ru?'Неизвестно':'Unknown')
}
