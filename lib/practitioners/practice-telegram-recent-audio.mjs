// Presentation-only selector. Storage access stays behind the existing owner API.
// Combined recordings are kept; uncommitted batch parts must never surface.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function practiceTelegramRecentAudio(items,search='',limit=4){
  if(!Array.isArray(items))return []
  const query=String(search||'').trim().slice(0,120).toLocaleLowerCase()
  const seen=new Set()
  return items.filter(item=>{
    if(!item||typeof item.id!=='string'||!UUID.test(item.id)||
       typeof item.title!=='string'||!item.title.trim()||
       (item.status&&item.status!=='ready')||item.combine_batch_id!=null||
       seen.has(item.id))return false
    const matches=!query||item.title.toLocaleLowerCase().includes(query)||
      String(item.folder||'').toLocaleLowerCase().includes(query)
    if(matches)seen.add(item.id)
    return matches
  }).sort((a,b)=>{
    const left=Date.parse(a.received_at)||0,right=Date.parse(b.received_at)||0
    return right-left||b.id.localeCompare(a.id)
  }).slice(0,Math.max(1,Math.min(60,Number(limit)||4)))
}
