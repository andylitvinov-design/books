// Pure pending-contact policy. A saved username or number is NOT a verified notification endpoint.
export const MESSENGER_NOTIFICATION_CHANNELS=Object.freeze(['telegram','whatsapp'])
export const MESSENGER_NOTIFICATION_TOPICS=Object.freeze(['messages','booking','reports','courses','news'])
export const MESSENGER_CONTACT_NOTICE_VERSION='hh-messenger-contact-v1'
export const DEFAULT_MESSENGER_TOPICS=Object.freeze({
  messages:true,booking:true,reports:true,courses:true,news:false,
})
const validObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)
function reject(){throw new Error('INVALID_MESSENGER_NOTIFICATION_REQUEST')}
function keys(value,allowed){
  if(!validObject(value)||Object.keys(value).some(key=>!allowed.includes(key)))reject()
}
export function normalizeMessengerTopics(value){
  keys(value,MESSENGER_NOTIFICATION_TOPICS)
  if(MESSENGER_NOTIFICATION_TOPICS.some(key=>typeof value[key]!=='boolean'))reject()
  return Object.fromEntries(MESSENGER_NOTIFICATION_TOPICS.map(key=>[key,value[key]]))
}
export function normalizeMessengerDestination(channel,raw){
  if(!MESSENGER_NOTIFICATION_CHANNELS.includes(channel)||typeof raw!=='string'||raw.length>80||
     /[\u0000-\u001f\u007f]/.test(raw))reject()
  const value=raw.trim()
  if(channel==='telegram'){
    if(!/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value))reject()
    return '@'+value.replace(/^@/,'')
  }
  if(!/^\+[0-9\s().-]{7,40}$/.test(value))reject()
  const phone=value.replace(/[\s().-]/g,'')
  if(!/^\+[1-9][0-9]{7,14}$/.test(phone))reject()
  return phone
}
export function validateMessengerNotificationInput(input){
  keys(input,['action','channel','destination','topics','locale','noticeVersion','permissionAccepted'])
  if(!MESSENGER_NOTIFICATION_CHANNELS.includes(input.channel))reject()
  if(input.action==='remove'){
    if(Object.keys(input).some(key=>!['action','channel'].includes(key)))reject()
    return {action:'remove',channel:input.channel}
  }
  if(!['save','preferences'].includes(input.action)||
    input.noticeVersion!==MESSENGER_CONTACT_NOTICE_VERSION||input.permissionAccepted!==true||
    !['en','ru','es'].includes(input.locale))reject()
  const topics=normalizeMessengerTopics(input.topics)
  if(input.action==='preferences'){
    if(Object.prototype.hasOwnProperty.call(input,'destination'))reject()
    return {action:'preferences',channel:input.channel,topics,locale:input.locale,
      noticeVersion:input.noticeVersion}
  }
  return {action:'save',channel:input.channel,
    destination:normalizeMessengerDestination(input.channel,input.destination),
    topics,locale:input.locale,noticeVersion:input.noticeVersion}
}
export function maskMessengerDestination(channel,value){
  const normalized=normalizeMessengerDestination(channel,value)
  if(channel==='whatsapp')return '+'+'•'.repeat(Math.max(3,normalized.length-3))+normalized.slice(-2)
  const valueWithoutAt=normalized.slice(1)
  return '@'+valueWithoutAt[0]+'•'.repeat(Math.min(9,Math.max(3,valueWithoutAt.length-2)))+
    valueWithoutAt.slice(-1)
}
// Future dispatcher must pass ALL gates, including separate marketing permission.
export function messengerNotificationEligible({
  verified=false,channelReady=false,topicEnabled=false,accountActive=false,
  suppressed=false,marketing=false,marketingConsent=false,
}={}){
  return verified===true&&channelReady===true&&topicEnabled===true&&
    accountActive===true&&suppressed!==true&&(!marketing||marketingConsent===true)
}
