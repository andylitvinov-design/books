// Scheduling preferences only. Personal goals, medical details and images
// must not enter sessionStorage, URLs, or third-party notifications.
import { talismanFromCatalog } from './taoist-talismans.js'

export const REMOTE_SUPPORT_DRAFT_KEY = 'hh:remote-energy-support:draft:v1'
export const REMOTE_SUPPORT_DRAFT_TTL = 24 * 60 * 60 * 1000
export const REMOTE_SUPPORT_DURATIONS = [10,20,30,60]
export const TALISMAN_REQUEST_DRAFT_KEY = 'hh:talisman-enquiry:draft:v1'
export const REMOTE_SUPPORT_GOALS = [
  'Inner balance and calm','Grounding and body awareness',
  'Clarity and life direction','Connection and relationships',
  'Energy and resources','Work and money','Personal intention',
]

export function readRemoteSupportDraft(storage, serviceId, now=Date.now()) {
  try {
    if (!storage || typeof serviceId !== 'string') return null
    const raw=storage.getItem(REMOTE_SUPPORT_DRAFT_KEY)
    if (!raw || raw.length > 3000) return null
    const value=JSON.parse(raw)
    if (!value || ![1,2].includes(value.version) || value.serviceId !== serviceId) return null
    if (!Number.isSafeInteger(value.savedAt) || now < value.savedAt-60000 ||
        now-value.savedAt > REMOTE_SUPPORT_DRAFT_TTL) return null
    if (!['asynchronous','live'].includes(value.format)) return null
    if (!REMOTE_SUPPORT_DURATIONS.includes(value.duration)) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time)) return null
    const safeText=(str,max=100)=>typeof str==='string' && str.length<=max && !/[\r\n<>]/.test(str)
    if (!safeText(value.goal) || !safeText(value.method) ||
        !safeText(value.practitioner,120) || !safeText(value.timezone,80)) return null
    if (value.version === 2 && (typeof value.startsAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.startsAt) ||
        !Number.isFinite(value.expectedPrice) || value.expectedPrice <= 0 ||
        typeof value.expectedCurrency !== 'string' || !/^[A-Z]{3}$/.test(value.expectedCurrency))) return null
    return value
  } catch { return null }
}

export function formatRemoteSupportDraft(draft) {
  if (!draft) return ''
  return [
    'Remote energy support — request (not confirmed or paid)',
    'Practitioner: '+draft.practitioner,
    'Focus: '+draft.goal,
    'Method: '+draft.method,
    'Format: '+(draft.format==='live'?'Live online session':'Remote support without a video call'),
    'Requested duration: '+draft.duration+' minutes',
    'Preferred date/time: '+draft.date+' '+draft.time+' ('+draft.timezone+')',
    'Please confirm the requested interval before any payment.',
  ].join('\n')
}

// Server-side source of truth: browser-supplied amount, currency and availability
// are NEVER authoritative. Quote only a moderated public service offering.
export function normalizeRemoteSupportBooking(input,service,now=Date.now()){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('INVALID_REMOTE_BOOKING')
  const keys=['version','goal','method','format','duration','date','time','timezone','startsAt','expectedPrice','expectedCurrency']
  if(Object.keys(input).some(key=>!keys.includes(key))||input.version!==2)throw new Error('INVALID_REMOTE_BOOKING')
  if(!service||service.slug!=='remote-energy-support'||service.area_key!=='energy_spiritual'||
    service.status!=='published'||!service.active||
    !['fixed','from'].includes(service.pricing_mode)||!['online','hybrid'].includes(service.delivery_format))
    throw new Error('OFFERING_NOT_BOOKABLE')
  if(!REMOTE_SUPPORT_DURATIONS.includes(input.duration)||!['asynchronous','live'].includes(input.format))
    throw new Error('INVALID_REMOTE_BOOKING')
  if(!REMOTE_SUPPORT_GOALS.includes(input.goal))throw new Error('INVALID_REMOTE_BOOKING')
  const approvedMethods=service.discovery_metadata?.methods?.length
    ?service.discovery_metadata.methods:['Remote support']
  if(typeof input.method!=='string'||!approvedMethods.includes(input.method))
    throw new Error('INVALID_REMOTE_BOOKING')
  if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
    typeof input.time!=='string'||!/^\d{2}:\d{2}$/.test(input.time)||
    typeof input.timezone!=='string'||input.timezone.length>80||
    typeof input.startsAt!=='string'||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.startsAt))
    throw new Error('INVALID_REMOTE_BOOKING')
  const timestamp=Date.parse(input.startsAt)
  if(!Number.isFinite(timestamp)||timestamp<=now+5*60*1000||
    timestamp>now+90*24*60*60*1000)throw new Error('INVALID_REMOTE_BOOKING')
  let parts
  try{
    parts=new Intl.DateTimeFormat('en-US',{timeZone:input.timezone,
      year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
      minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp))
  }catch{throw new Error('INVALID_REMOTE_BOOKING')}
  const part=name=>parts.find(p=>p.type===name)?.value||''
  if(part('year')+'-'+part('month')+'-'+part('day')!==input.date||
    part('hour')+':'+part('minute')!==input.time)throw new Error('INVALID_REMOTE_BOOKING')
  const publishedOptions=Array.isArray(service.discovery_metadata?.priceOptions)
    ?service.discovery_metadata.priceOptions:[]
  const option=publishedOptions.find(value=>value.duration===input.duration)||
    (publishedOptions.length===0&&service.duration_minutes===input.duration&&service.confirmed_price!=null
      ?{duration:input.duration,price:Number(service.confirmed_price)}:null)
  const price=Number(option?.price),currency=service.currency
  if(!option||!Number.isFinite(price)||price<=0||price>100000||
    Math.abs(Math.round(price*100)-price*100)>1e-6||
    typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))
    throw new Error('PRICE_NOT_PUBLISHED')
  if(input.expectedPrice!==price||input.expectedCurrency!==currency)throw new Error('PRICE_CHANGED')
  return {kind:'remote_energy_support',startsAt:new Date(timestamp).toISOString(),
    date:input.date,time:input.time,timezone:input.timezone,duration:input.duration,
    format:input.format,method:input.method,goal:input.goal,price,currency,
    paymentStatus:'not_enabled'}
}

/** Parse a master's alternate UTC timestamp into the client's original timezone.
 * The master never sets price or declares a booking confirmed. */
export function proposedRemoteSlot(startsAt,timezone,now=Date.now()){
  if(typeof startsAt!=='string'||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(startsAt)||
    typeof timezone!=='string'||timezone.length>80)
    throw new Error('INVALID_PROPOSED_SLOT')
  const timestamp=Date.parse(startsAt)
  if(!Number.isFinite(timestamp)||timestamp<=now+5*60*1000||
    timestamp>now+90*24*60*60*1000)throw new Error('INVALID_PROPOSED_SLOT')
  let parts
  try{
    parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,
      year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
      minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp))
  }catch{throw new Error('INVALID_PROPOSED_SLOT')}
  const part=name=>parts.find(p=>p.type===name)?.value||''
  return {startsAt,date:part('year')+'-'+part('month')+'-'+part('day'),
    time:part('hour')+':'+part('minute'),timezone}
}


// Only an ephemeral in-memory bridge for client-side navigation. Never persist
// free-text intentions in sessionStorage, query strings, cookies or analytics.
let pendingPrivateIntention = null
export function stageRemoteSupportPrivateIntention(serviceId, intention) {
  if (typeof window === 'undefined') return
  const note = typeof intention === 'string' ? intention.trim().slice(0, 1000) : ''
  pendingPrivateIntention = typeof serviceId === 'string' && note
    ? {serviceId, intention: note} : null
}
export function takeRemoteSupportPrivateIntention(serviceId) {
  if (typeof window === 'undefined') return ''
  const staged = pendingPrivateIntention
  pendingPrivateIntention = null
  return staged?.serviceId === serviceId ? staged.intention : ''
}

// One-use, same-tab handoff from the Holistic Support question card.
// Free text must never enter query strings, cookies, sessionStorage, analytics,
// provider notifications or CRM without a later explicit consented request.
let pendingLandingIntention = null
export function stageRemoteSupportLandingIntention(value, now = Date.now()) {
  if (typeof window === 'undefined') return
  const intention = typeof value === 'string' ? value.trim().slice(0, 500) : ''
  pendingLandingIntention = intention ? {intention, savedAt: now} : null
}
export function takeRemoteSupportLandingIntention(now = Date.now()) {
  if (typeof window === 'undefined') return ''
  const staged = pendingLandingIntention
  pendingLandingIntention = null
  return staged && Number.isFinite(staged.savedAt) &&
    now >= staged.savedAt && now - staged.savedAt <= 5 * 60 * 1000
    ? staged.intention : ''
}


// The talisman choice is a request for a custom symbolic item, NOT a published
// energy-session price or a completed purchase. A vetted master's *public*
// remote-support listing is used only for addressing this private enquiry.
export function normalizeTalismanEnquiry(input, service) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !['goal,version','catalogId,goal,version'].includes(Object.keys(input).sort().join(',')) ||
      input.version !== 1 || !REMOTE_SUPPORT_GOALS.includes(input.goal))
    throw new Error('INVALID_TALISMAN_ENQUIRY')
  const catalogItem = input.catalogId === undefined ? null : talismanFromCatalog(input.catalogId)
  if (input.catalogId !== undefined && (!catalogItem || catalogItem.goal !== input.goal))
    throw new Error('INVALID_TALISMAN_ENQUIRY')
  if (!service || service.slug !== 'remote-energy-support' ||
      service.area_key !== 'energy_spiritual' || service.status !== 'published' ||
      !service.active || !['online','hybrid'].includes(service.delivery_format) ||
      !['fixed','from'].includes(service.pricing_mode))
    throw new Error('TALISMAN_MASTER_UNAVAILABLE')
  return { kind:'talisman_enquiry', goal:input.goal, ...(catalogItem ? {catalogId:catalogItem.id} : {}) }
}

// Public service/master identity and controlled theme only. Personal intentions
// stay in ephemeral same-tab memory until explicitly submitted to the cabinet.
export function readTalismanRequestDraft(storage, serviceId, now = Date.now()) {
  try {
    const raw = storage?.getItem(TALISMAN_REQUEST_DRAFT_KEY)
    if (!raw || raw.length > 1000) return null
    const draft = JSON.parse(raw)
    if (!draft || draft.version !== 1 || draft.serviceId !== serviceId ||
        !REMOTE_SUPPORT_GOALS.includes(draft.goal) ||
        (draft.catalogId !== undefined &&
          (!talismanFromCatalog(draft.catalogId) ||
            talismanFromCatalog(draft.catalogId).goal !== draft.goal)) ||
        typeof draft.practitioner !== 'string' || draft.practitioner.length > 120 ||
        /[\r\n<>]/.test(draft.practitioner) ||
        !Number.isSafeInteger(draft.savedAt) || draft.savedAt > now + 60000 ||
        now - draft.savedAt > REMOTE_SUPPORT_DRAFT_TTL) return null
    return draft
  } catch { return null }
}
export function formatTalismanRequestDraft(draft, locale = 'en') {
  if (!draft) return ''
  const catalog = talismanFromCatalog(draft.catalogId)
  const chosen = catalog ? ('\n' + (locale === 'ru' ? 'Образец: ' : locale === 'es' ? 'Modelo: ' : 'Selected design: ') +
    (catalog[locale] || catalog.en).title) : ''
  if (locale === 'ru') return 'Заявка на персональный талисман (НЕ подтверждён заказ или оплата)\nМастер: ' +
    draft.practitioner + chosen + '\nНаправление: ' + draft.goal + '\nУточните возможность изготовления и стоимость.'
  if (locale === 'es') return 'Consulta sobre talismán personal (sin pedido ni pago confirmado)\nProfesional: ' +
    draft.practitioner + chosen + '\nTema: ' + draft.goal + '\nConfirme primero la disponibilidad y el precio.'
  return 'Personal talisman enquiry (not ordered or paid)\nPractitioner: ' +
    draft.practitioner + chosen + '\nTheme: ' + draft.goal + '\nPlease confirm availability and price first.'
}
