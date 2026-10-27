// Client-side presentation only: no extra CRM fetches, no cloned lead records.
export const normalizeMessagesTab=value=>value==='requests'?'requests':'chats'
export const inMessagesTab=(row,tab)=>{
  const kind=row?.kind
  const enquiry=kind==='request'||kind==='business'||
    (kind==='crm'&&row.lifecycle==='lead')
  return normalizeMessagesTab(tab)==='requests'
    ?enquiry
    :(kind==='crm'||kind==='direct')&&!enquiry
}
export const filterInboxRows=(rows,tab,search='')=>{
  const term=String(search||'').trim().toLocaleLowerCase()
  return (Array.isArray(rows)?rows:[]).filter(row=>inMessagesTab(row,tab)&&
    (!term||String(row?.name||'').toLocaleLowerCase().includes(term)))
}
