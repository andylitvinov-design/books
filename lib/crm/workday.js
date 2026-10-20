// Owner CRM day board. Counts originate from owner-scoped server aggregates;
// the bounded detail list can be incomplete, so never infer global totals from it.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DAY=/^\d{4}-\d{2}-\d{2}$/
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null
export const CRM_WORKDAY_BUCKETS=Object.freeze(['urgent','overdue','today','upcoming','all'])

export function buildCrmWorkday(overview={},followups=[]) {
  const asOf=typeof overview?.asOf==='string'&&DAY.test(overview.asOf)?overview.asOf:''
  const rows=Array.isArray(followups)?followups:[]
  const tasks=rows.filter(row=>row&&row.status==='open'&&
    UUID.test(row.id||'')&&UUID.test(row.contactId||'')&&
    typeof row.dueOn==='string'&&DAY.test(row.dueOn))
    .sort((a,b)=>a.dueOn.localeCompare(b.dueOn)||a.id.localeCompare(b.id))
  const visibleOverdue=asOf?tasks.filter(t=>t.dueOn<asOf).length:0
  const visibleToday=asOf?tasks.filter(t=>t.dueOn===asOf).length:0
  const server=overview?.followups||{}
  const open=Math.max(count(server.open)??tasks.length,tasks.length)
  const overdue=Math.min(open,Math.max(count(server.overdue)??visibleOverdue,visibleOverdue))
  const today=Math.min(open-overdue,Math.max(count(server.today)??visibleToday,visibleToday))
  return {
    asOf,tasks,partial:open>tasks.length,loaded:tasks.length,
    counts:{open,overdue,today,upcoming:Math.max(0,open-overdue-today),
      urgent:overdue+today},
  }
}
export function filterCrmWorkdayTasks(board,{bucket='urgent',query=''}={}) {
  if(!board||!Array.isArray(board.tasks))return []
  const selected=CRM_WORKDAY_BUCKETS.includes(bucket)?bucket:'urgent'
  const needle=typeof query==='string'?query.trim().toLocaleLowerCase().slice(0,120):''
  return board.tasks.filter(item=>{
    if(selected==='urgent'&&!(board.asOf&&item.dueOn<=board.asOf))return false
    if(selected==='overdue'&&!(board.asOf&&item.dueOn<board.asOf))return false
    if(selected==='today'&&item.dueOn!==board.asOf)return false
    if(selected==='upcoming'&&!(board.asOf&&item.dueOn>board.asOf))return false
    if(!needle)return true
    return String(item.contactName||'').toLocaleLowerCase().includes(needle)||
      String(item.kind||'').toLocaleLowerCase().includes(needle)
  })
}
