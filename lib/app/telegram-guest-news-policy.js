// Guest news subscription is distinct from clinical/CRM client identities.
// No messaging is authorised by storing an unverified request.
export const TG_GUEST_NEWS_CONSENT='hh-tg-guest-news-v1'
export function validGuestTelegramToken(value){
 return typeof value==='string'&&/^g_[A-Za-z0-9_-]{30}$/.test(value)
}
export function validateGuestNewsOptIn(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(key=>!['locale','noticeVersion','permissionAccepted'].includes(key))||
    !['en','ru','es'].includes(value.locale)||
    value.noticeVersion!==TG_GUEST_NEWS_CONSENT||
    value.permissionAccepted!==true)
   throw new Error('GUEST_NEWS_OPT_IN_REQUIRED')
 return {locale:value.locale,noticeVersion:value.noticeVersion}
}
export function guestTelegramIpBucket(raw){
 // Transport-provided forwarded IP is used transiently only as a keyed
 // rate-limit bucket. Never save or return the literal address.
 if(typeof raw!=='string')return 'unknown'
 const ip=raw.split(',')[0].trim()
 return /^[0-9a-f:.]{3,64}$/i.test(ip)?ip.toLowerCase():'unknown'
}
