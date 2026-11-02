// Holistic House CRM 2: business-only opportunities, not verified bookings/payments.
export const CRM_OPPORTUNITY_SERVICES=Object.freeze(['consultation','business','reiki','video_therapy','other'])
export const CRM_OPPORTUNITY_STAGES=Object.freeze([
  'new','qualified','offered','booking_requested','booked_manual','delivered_manual','lost','canceled',
])
export const CRM_OPPORTUNITY_NEXT=Object.freeze({
  new:['qualified','offered','booking_requested','lost','canceled'],
  qualified:['offered','booking_requested','lost','canceled'],
  offered:['booking_requested','lost','canceled'],
  booking_requested:['booked_manual','lost','canceled'],
  booked_manual:['delivered_manual','lost','canceled'],
  delivered_manual:[],lost:[],canceled:[],
})
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).every(key=>allowed.includes(key))
export function validateOpportunityCreate(value) {
  if(!keys(value,['operationId','contactId','service'])||
    !UUID.test(value.operationId)||!UUID.test(value.contactId)||
    !CRM_OPPORTUNITY_SERVICES.includes(value.service))
    throw new Error('INVALID_OPPORTUNITY')
  return {operationId:value.operationId,contactId:value.contactId,service:value.service}
}
export function validateOpportunityChange(value) {
  if(!keys(value,['id','expectedRevision','stage'])||!UUID.test(value.id)||
    !Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0||
    !CRM_OPPORTUNITY_STAGES.includes(value.stage))
    throw new Error('INVALID_OPPORTUNITY')
  return {id:value.id,expectedRevision:value.expectedRevision,stage:value.stage}
}
export function canAdvanceOpportunity(from,to) {
  return CRM_OPPORTUNITY_NEXT[from]?.includes(to)===true
}
