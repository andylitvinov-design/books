import { requireUUID } from '../assessments/contracts.js'

export const CRM_SOURCES = Object.freeze(['manual','website','referral','event','academy','other'])
export const CRM_FOLLOWUP_KINDS = Object.freeze(['reply','call','send_details','booking','check_in','other'])
export const CRM_ACTIVITY_KINDS = Object.freeze([
  'contacted','call_completed','offer_sent','booking_requested','booking_confirmed',
])

function strictObject(value, allowed) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).some(key => !allowed.includes(key))) throw new Error('INVALID_CRM_WORKFLOW')
}

export function validCrmDate(value) {
  if (typeof value !== 'string' || !/^(20[2-9][0-9]|2100)-[0-1][0-9]-[0-3][0-9]$/.test(value))
    throw new Error('INVALID_CRM_DATE')
  const time = Date.parse(value + 'T00:00:00.000Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value)
    throw new Error('INVALID_CRM_DATE')
  return value
}

export function torontoBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(now)
  const get = key => parts.find(part => part.type === key)?.value
  return [get('year'),get('month'),get('day')].join('-')
}

export function validateFollowupCreate(input) {
  strictObject(input,['id','contactId','kind','dueOn'])
  requireUUID(input.id)
  requireUUID(input.contactId)
  if (!CRM_FOLLOWUP_KINDS.includes(input.kind)) throw new Error('INVALID_CRM_FOLLOWUP_KIND')
  validCrmDate(input.dueOn)
  return { id:input.id,contactId:input.contactId,kind:input.kind,dueOn:input.dueOn }
}

export function validateFollowupUpdate(input) {
  strictObject(input,['id','action','expectedRevision','dueOn'])
  requireUUID(input.id)
  if (!['complete','cancel','reschedule'].includes(input.action) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
    throw new Error('INVALID_CRM_FOLLOWUP_CHANGE')
  if (input.action === 'reschedule') validCrmDate(input.dueOn)
  else if (input.dueOn !== undefined) throw new Error('INVALID_CRM_FOLLOWUP_CHANGE')
  return input
}

export function validateBusinessActivity(input) {
  strictObject(input,['id','contactId','kind'])
  requireUUID(input.id)
  requireUUID(input.contactId)
  if (!CRM_ACTIVITY_KINDS.includes(input.kind)) throw new Error('INVALID_CRM_ACTIVITY')
  return input
}
