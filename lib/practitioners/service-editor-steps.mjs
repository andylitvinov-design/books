import { normalizeReikiOffer, reikiOfferPricing } from './reiki-offer.mjs'

// UI preflight mirrors the existing service contract without granting publication.
// The server remains authoritative for ownership, quota, moderation and validation.
const copyReady=value=>Boolean(String(value?.title||'').trim()&&String(value?.shortDescription||'').trim())
export function getServiceEditorIssue(draft,{complete=false}={}){
 const copy=draft?.copy||{}
 const priceMode=draft?.pricingMode||'contact'
 if(draft?.reikiOffer){
  let offer
  try{offer=normalizeReikiOffer(draft.reikiOffer,{complete})}
  catch{return {step:1,code:'needReiki'}}
  const pricing=reikiOfferPricing(offer)
  if(draft.areaKey!=='energy_spiritual'||
   draft.offeringType!==(offer.kind==='course'?'course':'session')||
   draft.deliveryFormat==='in_person'||(draft.priceOptions||[]).length||
   draft.pricingMode!==pricing.pricingMode||
   draft.confirmedPrice!==pricing.confirmedPrice||
   draft.currency!==pricing.currency)return {step:1,code:'needReiki'}
 }
 if(['fixed','from'].includes(priceMode)){
  const amount=draft?.confirmedPrice
  const number=Number(amount)
  if(amount==null||String(amount).trim()===''||!Number.isFinite(number)||number<0||number>100000||
     !/^[A-Z]{3}$/.test(String(draft?.currency||'')))return {step:1,code:'needPrice'}
 }
 if(draft?.priceOptions?.length){
  if(!['fixed','from'].includes(priceMode)||draft.areaKey!=='energy_spiritual')
   return {step:1,code:'needPrice'}
  const durations=new Set()
  for(const option of draft.priceOptions){
   const price=Number(option.price)
   if(![10,20,30,60].includes(option.duration)||durations.has(option.duration)||
      !Number.isFinite(price)||price<=0||price>100000||
      Math.abs(Math.round(price*100)-price*100)>1e-6)return {step:1,code:'needPrice'}
   durations.add(option.duration)
  }
 }
 const minutes=draft?.durationMinutes
 if(minutes!=null&&String(minutes).trim()!==''){
  const n=Number(minutes)
  if(!Number.isSafeInteger(n)||n<5||n>1440)return {step:1,code:'needDuration'}
 }
 const spanish=draft?.displayLocales?.includes('es')||Boolean(String(copy.es?.title||'').trim())
 if(spanish&&!copyReady(copy.es))return {step:0,code:'needSpanish'}
 const phone=String(draft?.whatsapp||'').trim()
 if(phone&&!/^\+?[1-9]\d{6,14}$/.test(phone))return {step:2,code:'needContact'}
 const tg=String(draft?.telegram||'').trim()
 if(tg&&!/^@?[A-Za-z0-9_]{5,32}$/.test(tg))return {step:2,code:'needContact'}
 if(complete&&draft?.reikiOffer?.kind==='session'&&(!Array.isArray(draft.methods)||!draft.methods.length))return {step:1,code:'needReikiMethod'}
 if(!complete)return null
 if(!['en','ru','es'].some(lang=>copyReady(copy[lang])))return {step:0,code:'needBasics'}
 if(draft?.deliveryFormat!=='online'&&!String(draft?.locationLabel||'').trim())return {step:1,code:'needLocation'}
 if(!Array.isArray(draft?.languages)||!draft.languages.length)return {step:2,code:'needLanguages'}
 return null
}
export function servicePreviewPrice(draft,c){
 if(draft?.reikiOffer){
  const offer=draft.reikiOffer
  const prices=(offer.variants||[]).map(variant=>Number(variant.price))
   .filter(price=>Number.isFinite(price)&&price>=0)
  if(!prices.length)return c.contact
  const lowest=Math.min(...prices)
  return (prices.length>1?c.from+' ':'')+lowest+' '+(offer.currency||'EUR')
 }
 if(draft?.pricingMode==='free')return c.free
 if(draft?.pricingMode==='contact'||!draft?.pricingMode)return c.contact
 const amount=draft?.confirmedPrice
 if(amount==null||String(amount).trim()==='')return c.contact
 const prefix=draft.pricingMode==='from'?c.from+' ':''
 return prefix+amount+' '+(draft.currency||'CAD')
}
