// Business-only marketing attribution. Do not add health/test contents, messages or PII.
import { requireUUID } from '../assessments/contracts.js'

export const MARKETING_SOURCES = Object.freeze([
  'instagram', 'facebook', 'google_ads', 'google_organic', 'google_maps', 'youtube',
  'telegram', 'eventbrite', 'meetup', 'luma', 'allevents', 'humanitix',
  'tickettailor', 'partner', 'website', 'academy',
  'referral', 'event', 'direct', 'offline', 'manual', 'other', 'unknown',
])
export const MARKETING_MEDIA = Object.freeze([
  'paid_social', 'cpc', 'organic_social', 'organic_search', 'referral',
  'organic_event', 'email', 'course', 'direct', 'offline', 'unknown',
])
export const MARKETING_OFFERS = Object.freeze([
  'free_review', 'personal_session', 'reiki_course', 'reiki_initiation',
  'business_consulting', 'other',
])
export const MARKETING_STAGES = Object.freeze(['received','qualified','booked','closed_lost'])
export const MARKETING_MILESTONES = Object.freeze(['reiki_course_started','reiki_initiation_requested'])
function strictObject(input, keys) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !keys.includes(key))) throw new Error('INVALID_MARKETING_PAYLOAD')
}
function slug(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.length > 80 || !/^[a-z0-9][a-z0-9_-]*$/i.test(value)) throw new Error('INVALID_MARKETING_SLUG')
  return value.toLowerCase()
}
export function validateMarketingLead(input) {
  strictObject(input, ['id','contactId','source','medium','campaign','creative','offer'])
  if(input.id !== undefined) requireUUID(input.id)
  requireUUID(input.contactId)
  const source = input.source ?? 'unknown'
  const medium = input.medium ?? 'unknown'
  const offer = input.offer ?? 'other'
  if (!MARKETING_SOURCES.includes(source) || !MARKETING_MEDIA.includes(medium) ||
      !MARKETING_OFFERS.includes(offer)) throw new Error('INVALID_MARKETING_DIMENSION')
  return { id:input.id, contactId:input.contactId, source, medium, campaign:slug(input.campaign),
    creative:slug(input.creative), offer }
}
export function validateMarketingStage(input) {
  strictObject(input,['id','stage','expectedRevision'])
  requireUUID(input.id)
  if (!MARKETING_STAGES.includes(input.stage) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
    throw new Error('INVALID_MARKETING_STAGE')
  return input
}
export function validateMarketingMilestone(input) {
  strictObject(input,['id','milestone'])
  requireUUID(input.id)
  if (!MARKETING_MILESTONES.includes(input.milestone)) throw new Error('INVALID_MARKETING_MILESTONE')
  return input
}
export function marketingSnapshot(leads, contacts) {
  const summary = new Map()
  const verified = Array.isArray(leads) ? leads : []
  const get = source => {
    if (!summary.has(source)) summary.set(source,{source,leads:0,qualified:0,booked:0,uniqueContacts:new Set()})
    return summary.get(source)
  }
  for (const lead of verified) {
    const group = get(lead.source || 'unknown')
    group.leads += 1
    if (lead.stage === 'qualified' || lead.stage === 'booked') group.qualified += 1
    if (lead.stage === 'booked') group.booked += 1
    group.uniqueContacts.add(lead.contact_id)
  }
  const rows = [...summary.values()].map(row => ({
    source:row.source, leads:row.leads, qualified:row.qualified, booked:row.booked,
    uniqueContacts:row.uniqueContacts.size,
  })).sort((a,b)=>b.leads-a.leads || a.source.localeCompare(b.source))
  const contacted = Array.isArray(contacts) ? contacts : []
  const legacy = {}
  for (const contact of contacted) {
    const source = MARKETING_SOURCES.includes(contact.source) ? contact.source : 'unknown'
    legacy[source] = (legacy[source]||0)+1
  }
  return { rows, legacy, totals:{
    leads:rows.reduce((sum,row)=>sum+row.leads,0),
    qualified:rows.reduce((sum,row)=>sum+row.qualified,0),
    booked:rows.reduce((sum,row)=>sum+row.booked,0),
    uniqueContacts:new Set(verified.map(row=>row.contact_id)).size,
  } }
}
