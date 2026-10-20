import { AppError, assertObject, onlyKeys, text } from '../assessments/contracts.js'
import { normalizeVideoPresentation } from './presentation-contract.js'

export const PRACTITIONER_STATUSES = ['draft','submitted','changes_requested','approved','suspended','rejected','archived']
export const SERVICE_STATUSES = ['draft','submitted','changes_requested','published','paused','suspended','archived']
export const SERVICE_AREAS = ['emotional_psychological','body_somatic','relationships','homeopathy_holistic','energy_spiritual','career_purpose','business_money','personal_development']
export const OFFERING_TYPES = ['session','assessment','package','group','workshop','course','event','intro']
export const DELIVERY_FORMATS = ['online','in_person','hybrid']
export const PRICING_MODES = ['free','contact','fixed','from']
const PROFILE_KEYS=['displayName','professionalTitle','shortBio','fullBio','languages','city','region','country','formats','areas','methods','yearsExperience','websiteUrl','socialUrls','photoPath','videoPresentation','videoMaterials']
const SERVICE_KEYS=['copy','areaKey','offeringType','deliveryFormat','locationLabel','languages','pricingMode','confirmedPrice','currency','durationMinutes','imagePath','photos','goals','methods','benefits','faq','displayLocales','whatsapp','telegram','videoPresentation']

function strings(value,{maxItems=12,maxLength=100,enumValues=null}={}){
  if(!Array.isArray(value)||value.length>maxItems) throw new AppError('INVALID_LIST',400)
  const out=[...new Set(value.map(item=>text(item,maxLength)).filter(Boolean))]
  if(enumValues&&out.some(item=>!enumValues.includes(item))) throw new AppError('INVALID_LIST',400)
  return out
}
function httpsUrl(value,max=500){
  const v=text(value||'',max)
  if(!v)return ''
  let url
  try{url=new URL(v)}catch{throw new AppError('INVALID_URL',400)}
  if(url.protocol!=='https:')throw new AppError('INVALID_URL',400)
  return url.toString()
}
function localizedText(value,required=false){
  assertObject(value||{})
  onlyKeys(value||{},['title','shortDescription','description'])
  const title=text(value?.title||'',160)
  const shortDescription=text(value?.shortDescription||value?.description||'',500)
  const description=text(value?.description||value?.shortDescription||'',4000)
  if(required&&(!title||!shortDescription)) throw new AppError('INCOMPLETE_SERVICE',400)
  return {title,shortDescription,description}
}
export function slugify(value,fallback='item'){
  const normalized=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
  return normalized||fallback
}
// Marketing photos use a public-only, opaque-key bucket. The authenticated
// repository additionally checks that the path belongs to the signed-in master.
function marketingPhoto(value){
  let url
  try{url=new URL(value)}catch{throw new AppError('INVALID_IMAGE',400)}
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.endsWith('.supabase.co')||
    url.search||url.hash||
    !/^\/storage\/v1\/object\/public\/hh-service-photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/.test(url.pathname))
    throw new AppError('INVALID_IMAGE',400)
  return url.toString()
}
function portraitPhoto(value){
  const path=text(value||'',500)
  if(!path)return ''
  if(path.startsWith('/')&&!path.startsWith('//')&&!/[?#]/.test(path))return path
  return marketingPhoto(path)
}
function validateVideoMaterials(value){
  if(value==null)return []
  if(!Array.isArray(value)||value.length>12)throw new AppError('INVALID_LIST',400)
  const keys=new Set()
  return value.map(item=>{
    assertObject(item)
    onlyKeys(item,['title','description','locale','url'])
    const title=text(item.title||'',140)
    const description=text(item.description||'',500)
    const locale=text(item.locale||'en',2)
    if(!title||!['en','ru','es'].includes(locale))throw new AppError('INVALID_VIDEO_MATERIAL',400)
    const presentation=normalizeVideoPresentation({kind:'external',url:item.url})
    if(!presentation||presentation.kind!=='external')throw new AppError('INVALID_VIDEO_MATERIAL',400)
    const key=locale+':'+presentation.url
    if(keys.has(key))throw new AppError('DUPLICATE_VIDEO_MATERIAL',400)
    keys.add(key)
    return {title,description,locale,url:presentation.url}
  })
}
export function validateProfile(value,{complete=false}={}){
  assertObject(value)
  onlyKeys(value,PROFILE_KEYS)
  const profile={
    displayName:text(value.displayName||'',120),
    professionalTitle:text(value.professionalTitle||'',160),
    shortBio:text(value.shortBio||'',600),
    fullBio:text(value.fullBio||'',5000),
    languages:strings(value.languages||[],{maxItems:12,maxLength:20}),
    city:text(value.city||'',120),
    region:text(value.region||'',120),
    country:text(value.country||'',120),
    formats:strings(value.formats||[],{maxItems:2,maxLength:20,enumValues:['online','in_person']}),
    areas:strings(value.areas||[],{maxItems:8,maxLength:50,enumValues:SERVICE_AREAS}),
    methods:strings(value.methods||[],{maxItems:20,maxLength:100}),
    yearsExperience:value.yearsExperience==null||value.yearsExperience===''?null:Number(value.yearsExperience),
    websiteUrl:httpsUrl(value.websiteUrl||''),
    socialUrls:strings(value.socialUrls||[],{maxItems:6,maxLength:500}).map(url=>httpsUrl(url)),
    photoPath:portraitPhoto(value.photoPath),
    videoPresentation:normalizeVideoPresentation(value.videoPresentation),
    videoMaterials:validateVideoMaterials(value.videoMaterials),
  }
  if(profile.yearsExperience!==null&&(!Number.isSafeInteger(profile.yearsExperience)||profile.yearsExperience<0||profile.yearsExperience>80))throw new AppError('INVALID_EXPERIENCE',400)
  if(complete&&(!profile.displayName||!profile.professionalTitle||!profile.shortBio||!profile.languages.length||!profile.formats.length||!profile.areas.length||(profile.formats.includes('in_person')&&(!profile.city||!profile.country))))throw new AppError('INCOMPLETE_PROFILE',400)
  return profile
}
export function validateCredential(value){
  assertObject(value)
  onlyKeys(value,['title','issuer','jurisdiction','reference','public','expiresOn'])
  const expires=value.expiresOn?String(value.expiresOn):null
  if(expires&&!/^\d{4}-\d{2}-\d{2}$/.test(expires))throw new AppError('INVALID_DATE',400)
  return {
    title:text(value.title||'',200),
    issuer:text(value.issuer||'',200),
    jurisdiction:text(value.jurisdiction||'',120),
    reference:text(value.reference||'',160),
    public:value.public!==false,
    expiresOn:expires,
  }
}
export function validateServiceDraft(value,{complete=false}={}){
  assertObject(value)
  onlyKeys(value,SERVICE_KEYS)
  const copy=value.copy||{}
  assertObject(copy)
  onlyKeys(copy,['en','ru','es'])
  const areaKey=text(value.areaKey||'',60), offeringType=text(value.offeringType||'session',30), deliveryFormat=text(value.deliveryFormat||'online',30), pricingMode=text(value.pricingMode||'contact',20)
  if(!SERVICE_AREAS.includes(areaKey)||!OFFERING_TYPES.includes(offeringType)||!DELIVERY_FORMATS.includes(deliveryFormat)||!PRICING_MODES.includes(pricingMode))throw new AppError('INVALID_SERVICE',400)
  const confirmedPrice=value.confirmedPrice==null||value.confirmedPrice===''?null:Number(value.confirmedPrice)
  const currency=text(value.currency||'',3).toUpperCase()
  const durationMinutes=value.durationMinutes==null||value.durationMinutes===''?null:Number(value.durationMinutes)
  if(confirmedPrice!==null&&(!Number.isFinite(confirmedPrice)||confirmedPrice<0||confirmedPrice>100000))throw new AppError('INVALID_PRICE',400)
  if(durationMinutes!==null&&(!Number.isSafeInteger(durationMinutes)||durationMinutes<5||durationMinutes>1440))throw new AppError('INVALID_DURATION',400)
  if(['free','contact'].includes(pricingMode)&&confirmedPrice!==null)throw new AppError('INVALID_PRICE',400)
  if(['fixed','from'].includes(pricingMode)&&(confirmedPrice===null||!/^[A-Z]{3}$/.test(currency)))throw new AppError('INVALID_PRICE',400)
  const service={
    copy:{en:localizedText(copy.en||{}),ru:localizedText(copy.ru||{}),es:localizedText(copy.es||{})},
    areaKey,
    offeringType,
    deliveryFormat,
    locationLabel:text(value.locationLabel||'',200),
    languages:strings(value.languages||[],{maxItems:12,maxLength:20}),
    pricingMode,
    confirmedPrice:pricingMode==='free'?null:confirmedPrice,
    currency:['free','contact'].includes(pricingMode)?'':currency,
    durationMinutes,
    imagePath:text(value.imagePath||'',500),
    photos:strings(value.photos||[],{maxItems:5,maxLength:500}).map(marketingPhoto),
    goals:strings(value.goals||[],{maxItems:8,maxLength:40,enumValues:['confidence','relationships','relaxation','learning','clarity','purpose','energy','self_awareness']}),
    methods:strings(value.methods||[],{maxItems:12,maxLength:70}),
    benefits:strings(value.benefits||[],{maxItems:5,maxLength:180}),
    faq:strings(value.faq||[],{maxItems:6,maxLength:320}),
    displayLocales:strings(value.displayLocales||['en','ru'],{maxItems:3,maxLength:2,enumValues:['en','ru','es']}),
    whatsapp:text(value.whatsapp||'',18),
    telegram:text(value.telegram||'',33),
    videoPresentation:normalizeVideoPresentation(value.videoPresentation),
  }
  // Original-language-only submissions are valid; the public UI uses
  // the first non-empty translation as a fallback until others are provided.
  if(complete&&!Object.values(service.copy).some(copy=>copy.title&&copy.shortDescription))
    throw new AppError('INCOMPLETE_SERVICE',400)
  if(service.displayLocales.includes('es')&&(!service.copy.es.title||!service.copy.es.shortDescription))
    throw new AppError('INCOMPLETE_TRANSLATION',400)
  if(service.whatsapp&&!/^\+?[1-9]\d{6,14}$/.test(service.whatsapp))throw new AppError('INVALID_CONTACT',400)
  if(service.telegram&&!/^@?[A-Za-z0-9_]{5,32}$/.test(service.telegram))throw new AppError('INVALID_CONTACT',400)
  if(service.imagePath&&(!service.imagePath.startsWith('/')||service.imagePath.startsWith('//')||/[?#]/.test(service.imagePath)))throw new AppError('INVALID_IMAGE',400)
  if(complete&&(!service.languages.length||(deliveryFormat!=='online'&&!service.locationLabel)))throw new AppError('INCOMPLETE_SERVICE',400)
  return service
}
export function publicProfile(profile={}){
  const allowed={}
  for(const key of PROFILE_KEYS) if(profile[key]!==undefined&&profile[key]!==''&&profile[key]!==null) allowed[key]=profile[key]
  return allowed
}
export function serviceCopy(row,locale='en'){
  const copy=row.localized_copy||{}
  const local=(copy[locale]?.title?copy[locale]:null)||(['en','ru','es'].map(lang=>copy[lang]).find(value=>value?.title))||{}
  return {
    title:local.title||'',
    shortDescription:local.shortDescription||local.description||'',
    description:local.description||local.shortDescription||'',
  }
}
export const isPublicPractitionerStatus=status=>['approved','submitted','changes_requested'].includes(status)
export const isPublicServiceStatus=status=>['published','submitted','changes_requested'].includes(status)
