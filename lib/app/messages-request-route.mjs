// Opaque URL selectors are not authorization. All record data stays scoped to the
// authenticated owner/practitioner session inside the existing Messages API.
const REQUEST_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function normalizeMessagesRequestId(value){
 if(typeof value!=='string')return ''
 const id=value.trim().toLowerCase()
 return REQUEST_ID.test(id)?id:''
}
export function messagesRequestPath(locale,id){
 const language=['en','ru','es'].includes(locale)?locale:'en'
 const selector=normalizeMessagesRequestId(id)
 return '/'+language+'/app/messages?section=clients'+(selector?'&requestId='+encodeURIComponent(selector):'')
}
export function findMessagesRequestRow(rows,id){
 const selector=normalizeMessagesRequestId(id)
 if(!selector||!Array.isArray(rows))return null
 return rows.find(row=>row?.kind==='request'&&normalizeMessagesRequestId(row.id)===selector)||null
}
