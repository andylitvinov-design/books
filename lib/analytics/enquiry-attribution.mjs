import {safePublicPagePath,safePublicSource,sourceFromPublicEntry} from './public-page-traffic.mjs'

// Attribution contains only public page paths and bounded source categories.
// No visitor IDs, account IDs, IP addresses, raw referrers, query strings,
// health information, free-text messages or advertising click IDs.
export const ENQUIRY_ATTRIBUTION_COOKIE='hh_enquiry_source_v1'
export const ENQUIRY_ATTRIBUTION_TTL=7200
// Public, reviewed campaign names only: arbitrary UTM text can encode a
// person's name, health context or a tracking identifier even when slug-shaped.
// Extend this list alongside the corresponding public campaign configuration.
const PUBLIC_CAMPAIGNS=new Set(['gbp','hh_free_review_en_toronto_202610','hh_reiki_yggdrasil_en'])
const campaignToken=value=>typeof value==='string'&&PUBLIC_CAMPAIGNS.has(value)?value:null

export function normalizeEnquiryAttribution(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const landingPath=safePublicPagePath(value.landingPath)
 const trafficSource=safePublicSource(value.trafficSource)
 const previousPath=value.previousPath==null?null:safePublicPagePath(value.previousPath)
 if(!landingPath||!trafficSource||(value.previousPath!=null&&!previousPath))return null
 const campaign=value.campaign==null?null:campaignToken(value.campaign)
 return {landingPath,previousPath,trafficSource,...(campaign?{campaign}:{})}
}

export function parseEnquiryAttributionCookie(raw){
 if(typeof raw!=='string'||raw.length>600)return null
 try{
  const decoded=JSON.parse(decodeURIComponent(raw))
  const attribution=normalizeEnquiryAttribution(decoded)
  if(!attribution)return null
  const lastPath=safePublicPagePath(decoded.lastPath)||attribution.landingPath
  return {...attribution,lastPath}
 }catch{return null}
}

export function advanceEnquiryAttribution(raw,{path,href,referrer}){
 const publicPath=safePublicPagePath(path)
 if(!publicPath)return null
 const previous=parseEnquiryAttributionCookie(raw)
 let next
 if(previous){
  const {lastPath,...attribution}=previous
  next={...attribution,previousPath:lastPath!==publicPath?lastPath:attribution.previousPath,
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
 if(request?.cookies?.get('hh_public_stats_consent')?.value!=='v1'||
    request?.cookies?.get('hh_public_stats_skip')?.value==='1')return null
 const cookie=parseEnquiryAttributionCookie(
  request.cookies.get(ENQUIRY_ATTRIBUTION_COOKIE)?.value)
 return normalizeEnquiryAttribution(cookie)
}
