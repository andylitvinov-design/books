import { relayContactAlias } from './relay-privacy.mjs'
// Public UI-only grouping. The HMAC is created server-side from the actual
// consultation_requests.account_id + practitioner_id, never a typed contact.
export function safePractitionerContactText(value){
  // Defensive UI boundary: never concatenate hidden contact fields.
  return value?relayContactAlias(value):''
}
const activityAt=item=>{
  const primary=Date.parse(item?.lastConversationAt||'')
  const requested=Date.parse(item?.createdAt||'')
  return Math.max(Number.isFinite(primary)?primary:0,Number.isFinite(requested)?requested:0)
}
export function groupVerifiedPractitionerClients(requests,locale='en'){
  const groups=new Map()
  for(const request of Array.isArray(requests)?requests:[]){
    if(!request||typeof request.id!=='string')continue
    const verifiedKey=/^[a-f0-9]{64}$/i.test(request.clientKey||'')
      ?request.clientKey:'request:'+request.id
    if(!groups.has(verifiedKey))groups.set(verifiedKey,{key:verifiedKey,items:[]})
    groups.get(verifiedKey).items.push(request)
  }
  return [...groups.values()].map(group=>{
    group.items.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))
    group.latest=group.items[0]
    const contact=group.latest?.contact
    const given=contact&&typeof contact==='object'
      ?relayContactAlias(contact):''
    group.name=given||safePractitionerContactText(contact)||
      (locale==='ru'?'Клиент':locale==='es'?'Cliente':'Client')
    group.contact=safePractitionerContactText(contact)
    group.open=group.items.filter(item=>['requested','contacted'].includes(item.status)).length
    group.awaiting=group.items.filter(item=>item.needsReply===true).length
    group.newMessages=group.items.reduce((count,item)=>
      count+(Number.isSafeInteger(item.newMessageCount)&&item.newMessageCount>0
        ?item.newMessageCount:0),0)
    group.lastActivityAt=new Date(Math.max(0,...group.items.map(activityAt))).toISOString()
    return group
  }).sort((a,b)=>Date.parse(b.lastActivityAt)-Date.parse(a.lastActivityAt)||
    Date.parse(b.latest.createdAt)-Date.parse(a.latest.createdAt))
}
