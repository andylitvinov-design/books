// Pure, privacy-preserving aggregation for the practitioner dashboard.
// "Week" is the seven completed calendar days ending yesterday in Toronto.
const zero=()=>({impressions:0,orders:0,whatsapp:0,telegram:0})
const safeNumber=value=>{
  const number=Number(value)
  return Number.isFinite(number)&&number>0?Math.floor(number):0
}
function accumulate(target,row){
  for(const key of ['impressions','orders','whatsapp','telegram'])
    target[key]+=safeNumber(row[key])
}
export function summarizeServiceAnalytics(services,daily,dates){
  const list=(Array.isArray(services)?services:[]).map(service=>({
    id:service.id,
    title:service.copy?.title||service.slug||'Service',
    yesterday:zero(),
    week:zero(),
  }))
  const indexed=new Map(list.map(item=>[item.id,item]))
  for(const row of Array.isArray(daily)?daily:[]){
    const item=indexed.get(row.serviceId)
    if(!item||typeof row.day!=='string')continue
    if(row.day>=dates.weekStart&&row.day<=dates.yesterday)accumulate(item.week,row)
    if(row.day===dates.yesterday)accumulate(item.yesterday,row)
  }
  return {timeZone:'America/Toronto',yesterday:dates.yesterday,weekStart:dates.weekStart,weekEnd:dates.yesterday,services:list}
}
