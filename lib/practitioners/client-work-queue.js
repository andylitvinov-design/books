// These helpers arrange the already-authorized master directory. They never
// grant access to a request or infer a client identity from contact details.
const dayPattern=/^20\d\d-\d\d-\d\d$/
function isDay(value){
  if(typeof value!=='string'||!dayPattern.test(value))return false
  const parsed=new Date(value+'T00:00:00Z')
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value
}
const compare=(a,b)=>a<b?-1:a>b?1:0

export function buildPractitionerWorkQueue(groups,tasks,today,summary=null){
  const requests=new Map()
  for(const group of Array.isArray(groups)?groups:[]){
    for(const request of group.items||[]){
      if(request?.id&&request.requestKind!=='public')requests.set(request.id,group.key)
    }
  }
  const seen=new Set(),openTasks=[]
  for(const task of Array.isArray(tasks)?tasks:[]){
    if(!task||task.status!=='open'||typeof task.id!=='string'||!task.id||
      !requests.has(task.requestId)||!isDay(task.dueOn)||seen.has(task.id))continue
    seen.add(task.id)
    openTasks.push({...task,groupKey:requests.get(task.requestId)})
  }
  openTasks.sort((a,b)=>compare(a.dueOn,b.dueOn)||compare(a.id,b.id))
  const byRequest=new Map()
  const hasSummary=isDay(summary?.day)&&Array.isArray(summary?.requests)
  const day=hasSummary?summary.day:today
  if(hasSummary){
    // Counts come from all scoped tasks, even when the detail list is capped.
    for(const item of summary.requests){
      if(!item||!requests.has(item.requestId)||
        ![item.openCount,item.todayCount,item.overdueCount].every(value=>Number.isSafeInteger(value)&&value>=0)||
        item.todayCount+item.overdueCount>item.openCount)continue
      byRequest.set(item.requestId,{open:item.openCount,today:item.todayCount,overdue:item.overdueCount})
    }
  }else{
    for(const task of openTasks){
      const counts=byRequest.get(task.requestId)||{open:0,today:0,overdue:0}
      counts.open+=1
      if(isDay(day)&&task.dueOn===day)counts.today+=1
      if(isDay(day)&&task.dueOn<day)counts.overdue+=1
      byRequest.set(task.requestId,counts)
    }
  }
  const total=[...byRequest.values()].reduce((sum,item)=>({
    openCount:sum.openCount+item.open,todayCount:sum.todayCount+item.today,
    overdueCount:sum.overdueCount+item.overdue}),{openCount:0,todayCount:0,overdueCount:0})
  const visibleTasks=hasSummary?openTasks.filter(task=>(byRequest.get(task.requestId)?.open||0)>0):openTasks
  // Keep complete totals when stale; the UI requests a new snapshot and labels
  // this date instead of rebuilding incomplete totals from the detail page.
  const stale=hasSummary&&isDay(today)&&day!==today
  return {tasks:visibleTasks,byRequest,day,stale,...total}
}

export function filterPractitionerClientGroups(groups,{filter='all',search='',queue}={}){
  const term=typeof search==='string'?search.trim().toLocaleLowerCase():''
  return (Array.isArray(groups)?groups:[]).filter(group=>{
    if(term&&!`${group.name||''} ${group.contact||''}`.toLocaleLowerCase().includes(term))return false
    const hasTask=kind=>(group.items||[]).some(request=>(queue?.byRequest?.get(request.id)?.[kind]||0)>0)
    switch(filter){
      case 'new':return group.newMessages>0
      case 'reply':return group.awaiting>0
      case 'tasks':return hasTask('open')
      case 'today':return hasTask('today')
      case 'overdue':return hasTask('overdue')
      case 'open':return group.open>0
      case 'closed':return group.open===0
      default:return true
    }
  })
}

export function practitionerTaskTarget(groups,queue,taskId){
  const task=queue?.tasks?.find(item=>item.id===taskId)
  if(!task)return null
  const group=(Array.isArray(groups)?groups:[]).find(item=>item.key===task.groupKey&&
    item.items?.some(request=>request.id===task.requestId&&request.requestKind!=='public'))
  return group?{groupKey:group.key,requestId:task.requestId,taskId:task.id}:null
}
