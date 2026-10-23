// Scheduling preferences only. Personal goals, medical details and images
// must not enter sessionStorage, URLs, or third-party notifications.
export const REMOTE_SUPPORT_DRAFT_KEY = 'hh:remote-energy-support:draft:v1'
export const REMOTE_SUPPORT_DRAFT_TTL = 24 * 60 * 60 * 1000
export const REMOTE_SUPPORT_DURATIONS = [10,20,30,60]

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
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.startsAt))) return null
    return value
  } catch { return null }
}

export function formatRemoteSupportDraft(draft) {
  if (!draft) return ''
  return [
    'Remote energy support — REQUEST, not a confirmed or paid booking',
    'Practitioner: '+draft.practitioner,
    'Focus: '+draft.goal,
    'Method: '+draft.method,
    'Format: '+(draft.format==='live'?'Live online session':'Remote support without a video call'),
    'Requested duration: '+draft.duration+' minutes',
    'Preferred date/time: '+draft.date+' '+draft.time+' ('+draft.timezone+')',
    'Confirm the requested interval before payment.',
  ].join('\n')
}

// Server-side source of truth: browser-supplied amount, currency and availability
// are NEVER authoritative. Quote only a moderated public service offering.
export function normalizeRemoteSupportBooking(input,service,now=Date.now()){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('INVALID_REMOTE_BOOKING')
  const keys=['version','goal','method','format','duration','date','time','timezone','startsAt']
  if(Object.keys(input).some(key=>!keys.includes(key))||input.version!==2)throw new Error('INVALID_REMOTE_BOOKING')
  if(!service||service.slug!=='remote-energy-support'||service.area_key!=='energy_spiritual'||
    service.status!=='published'||!service.active||
    !['fixed','from'].includes(service.pricing_mode)||!['online','hybrid'].includes(service.delivery_format))
    throw new Error('OFFERING_NOT_BOOKABLE')
  if(!REMOTE_SUPPORT_DURATIONS.includes(input.duration)||!['asynchronous','live'].includes(input.format))
    throw new Error('INVALID_REMOTE_BOOKING')
  const goals=['Inner balance and calm','Grounding and body awareness',
    'Clarity and life direction','Connection and relationships',
    'Energy and resources','Work and money','Personal intention']
  if(!goals.includes(input.goal))throw new Error('INVALID_REMOTE_BOOKING')
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
  return {kind:'remote_energy_support',startsAt:new Date(timestamp).toISOString(),
    date:input.date,time:input.time,timezone:input.timezone,duration:input.duration,
    format:input.format,method:input.method,goal:input.goal,price,currency,
    paymentStatus:'not_enabled'}
}
