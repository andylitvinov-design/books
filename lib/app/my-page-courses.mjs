// Owner-only course-card projection. No private notes or transcript text.
export function coursePercent(done,total,complete=false){
 if(!Number.isSafeInteger(total)||total<1||!Number.isSafeInteger(done)||done<0||done>total)return null
 return complete?100:Math.min(99,Math.floor(100*done/total))
}

export function summarizeMyPageCourses({growth,reiki,business,protocols,sequence=[]}={}){
 const courses=[],seen=new Set()
 const add=item=>{if(!seen.has(item.key)){seen.add(item.key);courses.push(item)}}
 for(const c of Array.isArray(growth?.courses)?growth.courses:[]){
  if(typeof c.id!=='string'||!c.id||!Number.isInteger(c.stage)||c.stage<1)continue
  const done=c.completedLessons,total=c.durationDays
  const state=c.status==='completed'?'completed':['archived','closed'].includes(c.status)?'closed':c.status==='paused'?'paused':c.stage<4?'setup':'active'
  add({key:'growth:'+c.id,kind:'growth',id:c.id,presetId:['calm_balance','business_focus','confidence'].includes(c.presetId)?c.presetId:null,state,done:Number.isSafeInteger(done)&&done>=0?done:null,total:Number.isSafeInteger(total)&&total>0?total:null,percent:state==='completed'?100:coursePercent(done,total)})
 }
 if(reiki?.enrolled===true){
  const index=sequence.indexOf(reiki.slideId),complete=reiki.status==='completed'&&Boolean(reiki.completedAt)
  add({key:'reiki',kind:'reiki',state:complete?'completed':reiki.status==='paused'?'paused':'active',done:complete?sequence.length:index<0?null:index,total:sequence.length||null,percent:complete?100:index<0?null:coursePercent(index,sequence.length),slideId:index>=0?reiki.slideId:null})
 }
 const b=business?.course
 if(b&&typeof b.startedAt==='string'){
  const done=Object.entries(b.days||{}).filter(([n,v])=>/^[1-9]\d?$/.test(n)&&Number(n)<=90&&v?.done===true).length
  const state=b.status==='completed'?'completed':b.status==='paused'?'paused':'active'
  add({key:'business',kind:'business',state,done,total:90,percent:state==='completed'?100:coursePercent(done,90)})
 }
 // A reviewed legacy protocol proves saved coaching activity, not enrollment,
 // a logical run, or the completion of a sequence of sessions.
 const groups=new Map()
 for(const p of Array.isArray(protocols?.protocols)?protocols.protocols:[]){
  if(p?.provenance!=='client_reviewed_dialogue'||typeof p.id!=='string'||!p.id||typeof p.completedAt!=='string')continue
  const id=p.courseSessionId
  const group=typeof id==='string'&&id.startsWith('goal_')?'goal':typeof id==='string'&&id.startsWith('clarity_')?'clarity':typeof id==='string'&&id.startsWith('anti_stress_')?'antistress':'coach'
  if(!groups.has(group))groups.set(group,new Set())
  groups.get(group).add(p.id)
 }
 for(const [group,ids] of groups)add({key:'legacy:'+group,kind:'legacy',group,state:'saved',done:ids.size,total:null,percent:null})
 return courses
}

export function summarizeClarityRuns(runs){
 const courses=[],seen=new Set()
 for(const run of Array.isArray(runs)?runs:[]){
  if(!run||typeof run.id!=='string'||!run.id||seen.has(run.id)||!Number.isSafeInteger(run.ordinal)||run.ordinal<1||!['ready','in_progress','completed'].includes(run.status)||!Array.isArray(run.days)||run.days.length!==3)continue
  const elapsed=run.totalElapsedMs
  if(!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>3600000)continue
  if(run.status==='ready'&&elapsed===0)continue
  const complete=run.status==='completed'&&elapsed===3600000
  if(run.status==='completed'&&!complete)continue
  seen.add(run.id)
  courses.push({key:'clarity:'+run.id,kind:'clarity',id:run.id,ordinal:run.ordinal,state:complete?'completed':'active',done:elapsed,total:3600000,percent:coursePercent(elapsed,3600000,complete),day:Number.isSafeInteger(run.currentDay)&&run.currentDay>=1&&run.currentDay<=3?run.currentDay:null})
 }
 return courses
}

export function combineMyPageCourses(saved,runs){
 const list=[...(Array.isArray(saved)?saved:[]),...summarizeClarityRuns(runs)]
 // Keep legacy history visible: it may predate the independent run catalog.
 return list.sort((a,b)=>Number(['completed','closed'].includes(a.state))-Number(['completed','closed'].includes(b.state)))
}

// Self Discovery is ongoing: percent is catalogue coverage, never a completion
// award, psychometric score or health percentage. A legacy result starts it.
export function summarizeDiscoveryCoverage({done,total,axes,attempts}={}){
 if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(done)||done<0||done>total||
    !Number.isSafeInteger(axes)||axes<0||axes>16||!Number.isSafeInteger(attempts)||attempts<0||done>attempts)return null
 if(attempts===0&&axes===0)return null
 return {key:'self-discovery',kind:'self-discovery',state:'active',done,total,axes,
  percent:total>0?Math.floor(100*done/total):null}
}
