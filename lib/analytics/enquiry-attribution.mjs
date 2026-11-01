import {safePublicSource,sourceFromPublicEntry} from './public-page-traffic.mjs'
import {verifiedEnquiryPath,verifiedEnquiryCampaign} from './enquiry-public-catalog.mjs'

// Attribution contains only public page paths and bounded source categories.
// No visitor IDs, account IDs, IP addresses, raw referrers, query strings,
// health information, free-text messages or advertising click IDs.
export const ENQUIRY_ATTRIBUTION_COOKIE='hh_enquiry_source_v1'
export const ENQUIRY_ATTRIBUTION_CONSENT_COOKIE='hh_enquiry_attribution_consent'
export const ENQUIRY_ATTRIBUTION_TTL=7200
const campaignToken=verifiedEnquiryCampaign

export function normalizeEnquiryAttribution(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const landingPath=verifiedEnquiryPath(value.landingPath)
 const trafficSource=value.initialUnknown===true?'unknown':safePublicSource(value.trafficSource)
 const previousPath=value.previousPath==null?null:verifiedEnquiryPath(value.previousPath)
 if(!landingPath||!trafficSource||(value.previousPath!=null&&!previousPath))return null
 const campaign=value.initialUnknown===true||value.campaign==null?null:campaignToken(value.campaign)
 return {landingPath,previousPath,trafficSource,...(campaign?{campaign}:{}),
  ...(value.initialUnknown===true?{initialUnknown:true}:{})}
}

export function parseEnquiryAttributionCookie(raw){
 if(typeof raw!=='string'||raw.length>600)return null
 try{
  const decoded=JSON.parse(decodeURIComponent(raw))
  const attribution=normalizeEnquiryAttribution(decoded)
  if(!attribution)return null
  const lastPath=decoded.lastPath===undefined?attribution.landingPath:
   decoded.lastPath===null?null:verifiedEnquiryPath(decoded.lastPath)
  return {...attribution,lastPath}
 }catch{return null}
}

export function advanceEnquiryAttribution(raw,{path,href,referrer,contextUnknown=false}){
 const publicPath=verifiedEnquiryPath(path)
 const previous=parseEnquiryAttributionCookie(raw)
 const unknown=encodeURIComponent(JSON.stringify({unknownInitial:true}))
 let unknownInitial=false
 if(raw){
  try{unknownInitial=JSON.parse(decodeURIComponent(raw))?.unknownInitial===true}catch{}
 }
 if(unknownInitial){
  if(!publicPath)return unknown
  // The first eligible page after consent is observable; an earlier source is
  // not. Never infer it from the new page's referrer or campaign parameters.
  return encodeURIComponent(JSON.stringify({landingPath:publicPath,previousPath:null,
   trafficSource:'unknown',initialUnknown:true,lastPath:publicPath}))
 }
 if(!publicPath){
  return previous?encodeURIComponent(JSON.stringify({...previous,previousPath:null,lastPath:null})):unknown
 }
 if(raw&&!previous)return unknown
 if(!previous&&contextUnknown)return encodeURIComponent(JSON.stringify({
  landingPath:publicPath,previousPath:null,trafficSource:'unknown',initialUnknown:true,lastPath:publicPath,
 }))
 let next
 if(previous){
  const {lastPath,...attribution}=previous
  next={...attribution,previousPath:lastPath===null?null:lastPath!==publicPath?lastPath:attribution.previousPath,
   lastPath:publicPath}
 }else{
  let campaign=null
  try{
   const url=new URL(href)
   const codes=url.searchParams.getAll('utm_campaign')
   if(codes.length===1)campaign=campaignToken(codes[0].trim().toLowerCase())
  }catch{}
  next={landingPath:publicPath,previousPath:null,
   trafficSource:sourceFromPublicEntry(href,referrer),...(campaign?{campaign}:{}),lastPath:publicPath}
 }
 return encodeURIComponent(JSON.stringify(next))
}

export function readPublicEnquiryAttribution(request){
 if(request?.cookies?.get(ENQUIRY_ATTRIBUTION_CONSENT_COOKIE)?.value!=='v1'||
    request?.cookies?.get('hh_public_stats_skip')?.value==='1')return null
 const cookie=parseEnquiryAttributionCookie(
  request.cookies.get(ENQUIRY_ATTRIBUTION_COOKIE)?.value)
 return normalizeEnquiryAttribution(cookie)
}
