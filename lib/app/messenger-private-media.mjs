// Private conversation media index: display-only references. No transfer, copy
// or join to a separate clinical profile is performed.
const validId=value=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(value||''))
export function mediaFromMessages(kind,messages){
 const found=(Array.isArray(messages)?messages:[]).flatMap(row=>{
   if(kind==='crm')
     return row.photo===true&&validId(row.id)?
       [{id:row.id,kind:'image',purpose:row.photoPurpose==='drawing'?'drawing':'portrait'}]:[]
   if(kind!=='direct')return []
   const asset=row.attachment
   return validId(asset?.id)&&['image','audio','video'].includes(asset.kind)?
     [{id:asset.id,kind:asset.kind}]:[]
 })
 return found.reverse()
}
export function mergeMediaPages(existing,older){
 const ids=new Set(existing.map(item=>item.id))
 return [...existing,...older.filter(item=>!ids.has(item.id))]
}
