// Mobile manual-publication inbox. NEVER contacts a social provider or
// confuses an owner checkmark with external publication verification.
import {GrowthStudioError,isSavedGrowthPost,publicCampaignLink} from './model.mjs'

export const MANUAL_DESTINATIONS=Object.freeze({
  instagram:'https://www.instagram.com/',
  facebook:'https://www.facebook.com/',
  telegram:'https://web.telegram.org/a/',
  youtube:'https://studio.youtube.com/',
  linkedin:'https://www.linkedin.com/feed/',
  threads:'https://www.threads.net/',
  bluesky:'https://bsky.app/',
  pinterest:'https://www.pinterest.com/',
  tiktok:'https://www.tiktok.com/',
  twitter:'https://x.com/',
  google_business:'https://business.google.com/',
  eventbrite:'https://www.eventbrite.ca/organize/overview/',
  meetup:'https://www.meetup.com/',
  // WordPress and Mastodon use user-controlled instances. Never guess an
  // instance or silently navigate to another user's account.
  mastodon:null,wordpress:null,manual:null,
})

const DATE_FORMAT=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',
})
function torontoDate(value) {
  const parts=DATE_FORMAT.formatToParts(new Date(value))
  const field=t=>parts.find(p=>p.type===t)?.value||''
  return field('year')+'-'+field('month')+'-'+field('day')
}
export function manualGrowthPostingInbox(records,now=new Date()) {
  const instant=now instanceof Date?now:new Date(now)
  if(!Array.isArray(records)||!Number.isFinite(instant.getTime()))
    throw new GrowthStudioError('invalid_manual_inbox')
  const currentDay=torontoDate(instant)
  const queue=records.filter(item=>isSavedGrowthPost(item)&&item.status==='planned_manual')
    .sort((left,right)=>left.scheduledAt.localeCompare(right.scheduledAt)||left.id.localeCompare(right.id))
  const result={overdue:[],today:[],upcoming:[],manuallyCompleted:0,total:queue.length}
  for(const post of queue){
    if(Date.parse(post.scheduledAt)<instant.getTime())result.overdue.push(post)
    else if(torontoDate(post.scheduledAt)===currentDay)result.today.push(post)
    else result.upcoming.push(post)
  }
  result.manuallyCompleted=records.filter(item=>isSavedGrowthPost(item)&&item.status==='manual_done').length
  return result
}
export function manualGrowthCopyText(post) {
  if(!isSavedGrowthPost(post)||!['approved','planned_manual'].includes(post.status))
    throw new GrowthStudioError('invalid_manual_handoff')
  const link=publicCampaignLink(post)
  const text=[post.caption,link].filter(Boolean).join('\n\n').trim()
  if(!text)throw new GrowthStudioError('invalid_manual_handoff')
  return text
}
export function manualGrowthDestination(channel) {
  // Predefined official HTTPS navigation only. No untrusted user-provided URL
  // can become a destination and clicking cannot mark a post published.
  return Object.hasOwn(MANUAL_DESTINATIONS,channel)?MANUAL_DESTINATIONS[channel]:null
}
