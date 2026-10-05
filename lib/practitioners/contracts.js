import { AppError, assertObject, onlyKeys, text } from '../assessments/contracts.js'

export const PRACTITIONER_STATUSES = ['draft','submitted','changes_requested','approved','suspended','rejected','archived']
export const SERVICE_STATUSES = ['draft','submitted','changes_requested','published','paused','suspended','archived']
export const SERVICE_AREAS = ['emotional_psychological','body_somatic','relationships','homeopathy_holistic','energy_spiritual','career_purpose','business_money','personal_development']
export const OFFERING_TYPES = ['session','assessment','package','group','workshop','course','event','intro']
export const DELIVERY_FORMATS = ['online','in_person','hybrid']
export const PRICING_MODES = ['free','contact','fixed','from']
const PROFILE_KEYS=['displayName','professionalTitle','shortBio','fullBio','languages','city','region','country','formats','areas','methods','yearsExperience','websiteUrl','socialUrls','photoPath']
const SERVICE_KEYS=['copy','areaKey','offeringType','deliveryFormat','locationLabel','languages','pricingMode','confirmedPrice','currency','durationMinutes','imagePath']

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
    photoPath:text(value.photoPath||'',500),
  }
  if(profile.yearsExperience!==null&&(!Number.isSafeInteger(profile.yearsExperience)||profile.yearsExperience<0||profile.yearsExperience>80))throw new AppError('INVALID_EXPERIENCE',400)
  if(profile.photoPath&&(!profile.photoPath.startsWith('/')||profile.photoPath.startsWith('//')||/[?#]/.test(profile.photoPath)))throw new AppError('INVALID_IMAGE',400)
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
  onlyKeys(copy,['en','ru'])
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
    copy:{en:localizedText(copy.en||{},complete),ru:localizedText(copy.ru||{},complete)},
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
  }
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
  const local=copy[locale]||copy.en||copy.ru||{}
  return {
    title:local.title||'',
    shortDescription:local.shortDescription||local.description||'',
    description:local.description||local.shortDescription||'',
  }
}
export const isPublicPractitionerStatus=status=>['approved','submitted','changes_requested'].includes(status)
export const isPublicServiceStatus=status=>['published','submitted','changes_requested'].includes(status)
