/** Single read-only ordered projection for the horizontal progress indicator and its expanded rows. No new persistence or authority. */
const openingLabels={"ru":["Согласие на сессию","Как обращаться","Прошлая или новая тема","Тип работы","Чувства сегодня","Подтверждение начала"],"en":["Session invitation","Preferred name","Previous or new topic","Working focus","Feelings today","Ready to begin"],"es":["Invitación","Nombre preferido","Tema anterior o nuevo","Tipo de trabajo","Cómo te sientes","Confirmación"]}
const openingKeys=["invitation","name","continuity","focus","feelings","confirmation"]
const terminal=s=>s==='done'||s==='skipped'
export function stagePosition(rows,activeId=null){
 const normalized=rows.map(row=>({...row,active:row.id===activeId&&!terminal(row.status)}));
 const index=normalized.findIndex(row=>row.active);
 return {rows:normalized,index,step:index>=0?index+1:normalized.length&&normalized.every(row=>terminal(row.status))?normalized.length:0,total:normalized.length,finished:normalized.length>0&&normalized.every(row=>terminal(row.status))};
}
export function openingStagePosition(opening,locale='en'){
 if(!opening)return stagePosition([]);
 const labels=openingLabels[locale]||openingLabels.en;
 return stagePosition(openingKeys.map((id,i)=>{
  const answer=opening.answers?.[id],field=opening.fieldStatus?.[id];
  // An automatic new-topic choice was not spoken by the client. It and
  // explicit skips resolve the position without awarding a verified answer.
  const status=answer?.automatic===true||field==='skipped_by_client'?'skipped':
   field==='confirmed'&&opening.checkmarks?.[id]===true?'done':
   field==='needs_confirmation'?'needs_confirmation':
   !field&&opening.checkmarks?.[id]===true?'done':'pending';
  return {id,label:labels[i],status,quote:answer?.automatic===true?'':typeof answer?.quote==='string'?answer.quote:'',automatic:answer?.automatic===true};
 }),opening.completed||opening.declined?null:opening.current);
}
export function profileStagePosition(profile,axes,locale='en'){
 if(!profile)return stagePosition([]);
 return stagePosition(axes.map(axis=>{
  const rating=profile.ratings?.find(r=>r.axis===axis.id);
  return {id:axis.id,label:axis.name[locale]||axis.name.en,status:rating?.kind==='rated'?'done':rating?.kind==='skipped'?'skipped':rating?.kind==='partial'?'needs_confirmation':'pending'};
 }),profile.completed||profile.finished?null:profile.current);
}
export function methodStagePosition(ids,labels,index,verified,completed){
 return stagePosition(ids.map((id,i)=>({id,label:labels[i]||id,status:verified&&(i<index||completed===true&&i===index)?'done':'pending'})),ids[index]);
}
export function courseStagePosition(rows,{promptId=null,paused=false,completed=false,allowProvisional=true}={}){
 const converted=rows.map(row=>({...row,status:row.status==='confirmed'?'done':row.status==='skipped_by_client'?'skipped':row.status==='needs_confirmation'?'needs_confirmation':'pending',protocolStatus:row.status}));
 const planned=allowProvisional?converted.find(row=>!terminal(row.status))?.id:null;
 return stagePosition(converted,paused||completed?null:promptId||planned);
}
export function savedProfileStagePosition(report,step,locale='en'){
 if(!report)return stagePosition([]);
 const q=step?.pending;
 const rows=report.rows.map(row=>{
  const required=report.track==='inner'||q?.axis===row.id&&q.slot==='desired'||row.priority?[row.current,row.desired]:[row.current];
  const status=required.every(x=>x.status==='confirmed')?'done':required.every(x=>x.status==='confirmed'||x.status==='skipped_by_client')?'skipped':required.some(x=>x.status==='needs_confirmation')?'needs_confirmation':'pending';
  return {id:row.id,label:row.label,status:q?.axis===row.id&&status==='done'?'pending':status};
 });
 if(q?.slot==='priority')rows.push({id:'priority',label:({ru:'Приоритеты',en:'Priorities',es:'Prioridades'})[locale]||'Priorities',status:'pending'});
 return stagePosition(rows,step?.closed?null:q?.slot==='priority'?'priority':q?.axis);
}

/** The transcript and verified protocol are different: preserve every finalized
 * client turn (including pending answers) without inferring a fact or a field. */
export function coachCapturedClientTurns(turns=[]){
 return (Array.isArray(turns)?turns:[]).flatMap((turn,index)=>turn?.role==='user'&&turn.interim!==true&&typeof turn.content==='string'&&turn.content.trim()?[{turnIndex:index,quote:turn.content,unanswered:turn.unanswered===true}]:[]);
}
export function coachStageCounts(position){
 const rows=Array.isArray(position?.rows)?position.rows:[];
 return {confirmed:rows.filter(row=>row.status==='done').length,skipped:rows.filter(row=>row.status==='skipped').length,total:rows.length};
}
