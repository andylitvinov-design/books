// Client-side presentation only: no extra CRM fetches, no cloned lead records.
export const normalizeMessagesTab=value=>value==='requests'?'requests':'chats'
export const inMessagesTab=(row,tab)=>{
  const kind=row?.kind
  const enquiry=kind==='request'||kind==='business'||
    (kind==='crm'&&row.lifecycle==='lead')
  if(normalizeMessagesTab(tab)==='requests')return enquiry
  // A CRM lead already has a real provider thread, and an account-bound
  // consultation already has a private request thread. Surface their same
  // row in Conversations so the master can open the existing composer.
  // A public guest enquiry has no verified return channel: keep it in
  // Requests instead of pretending that a private message can be sent.
  // Only the server's verified account-bound request marker authorizes the
  // existing private conversation. Unknown/partial guest requests stay in
  // Requests; 'not public' alone is not proof of an account-bound recipient.
  const privateRequest=kind==='request'&&row.item?.accountRequest===true&&row.item.requestKind!=='public'
  return kind==='crm'||kind==='direct'||privateRequest
}
export const filterInboxRows=(rows,tab,search='')=>{
  const term=String(search||'').trim().toLocaleLowerCase()
  return (Array.isArray(rows)?rows:[]).filter(row=>inMessagesTab(row,tab)&&
    (!term||String(row?.name||'').toLocaleLowerCase().includes(term)))
}
