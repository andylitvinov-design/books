/** Single read-only ordered projection for the horizontal progress indicator and its expanded rows. No new persistence or authority. */
const openingLabels={"ru":["Согласие на сессию","Как обращаться","Прошлая или новая тема","Тип работы","Чувства сегодня","Подтверждение начала"],"en":["Session invitation","Preferred name","Previous or new topic","Working focus","Feelings today","Ready to begin"],"es":["Invitación","Nombre preferido","Tema anterior o nuevo","Tipo de trabajo","Cómo te sientes","Confirmación"]}
const openingKeys=["invitation","name","continuity","focus","feelings","confirmation"]
const terminal=s=>s==='done'||s==='skipped'
export function stagePosition(rows,activeId=null){
 const normalized=rows.map(row=>({...row,active:row.id===activeId&&!terminal(row.status)}));
 const index=normalized.findIndex(row=>row.active);
 return {rows:normalized,index,step:index>=0?index+1:normalized.length&&normalized.every(row=>terminal(row.status))?normalized.length:0,total:normalized.length,finished:normalized.length>0&&normalized.every(row=>terminal(row.status))};
}
export function openingStagePosition(opening,locale='en',captured={}){
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
  const quote=answer?.automatic===true?'':typeof answer?.quote==='string'&&answer.quote?answer.quote:captured[id]||'';
  return {id,label:labels[i],status:status==='pending'&&quote?'needs_confirmation':status,quote,automatic:answer?.automatic===true};
 }),opening.completed||opening.declined?null:opening.current);
}
export function profileStagePosition(profile,axes,locale='en'){
 if(!profile)return stagePosition([]);
 return stagePosition(axes.map(axis=>{
  const rating=profile.ratings?.find(r=>r.axis===axis.id);
  return {id:axis.id,label:axis.name[locale]||axis.name.en,status:rating?.kind==='rated'?'done':rating?.kind==='skipped'?'skipped':rating?.kind==='partial'?'needs_confirmation':'pending',quote:rating?.quote||'',recorded:rating?.kind==='rated'||rating?.kind==='partial'};
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
  return {id:row.id,label:row.label,status:q?.axis===row.id&&status==='done'?'pending':status,recorded:required.some(x=>x.status==='confirmed'),value:required.map(x=>x.value??x.label).join(' / ')};
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


// Two independent display marks. A captured candidate is not a verified fact
// and neither mark is proof of durable storage without the existing receipt.
export function coachEvidenceMarks(row){
 const recorded=Boolean(row?.recorded===true||typeof row?.quote==='string'&&row.quote.trim());
 return {recorded,verified:recorded&&(row?.status==='done'||row?.status==='confirmed')};
}
// The active opening reducer is used only to label provisional responses;
// a pending utterance never enters the accepted history or awards a check.
export function openingCapturedAnswers(turns,getProgress){
 const history=[],captured={};
 for(const row of Array.isArray(turns)?turns:[]){
  if(row?.role!=='user'||row.interim===true||typeof row.content!=='string'||!row.content.trim())continue;
  if(history.length>=32)break;
  const progress=getProgress(history);
  if(progress.completed||progress.declined)break;
  if(openingKeys.includes(progress.current))captured[progress.current]=row.content;
  if(row.unanswered!==true)history.push(row.content.slice(0,160));
 }
 return captured;
}
// Display the actual response before checking its relevance or format. Exact
// visible prompt association is provisional, even for a short or invalid reply.
// Unknown / free-form prompts remain in the literal client transcript.
export function courseCapturedRows(rows,turns,matches,{afterIndex=-1,livePrompt=null}={}){
 const source=Array.isArray(turns)?turns:[];
 return rows.map(row=>{
  if(row.status==='confirmed'||row.status==='skipped_by_client')return row;
  let capture=null;
  for(let i=Math.max(1,afterIndex+1);i<source.length;i++){
   const a=source[i],q=source[i-1];
   if(a?.role!=='user'||a.interim===true||typeof a.content!=='string'||!a.content.trim()||q?.role!=='assistant'||q.interrupted===true)continue;
   const active=livePrompt?.fieldId===row.id&&livePrompt.kind!=='confirm'&&livePrompt.turnIndex===i-1;
   if(row.source==='client_selected_open'&&!active)continue;
   if(active||matches(row,q.content)){
    capture={quote:a.content,turnIndex:i,questionTurnIndex:i-1,source:'visible_prompt_capture',pending:a.unanswered===true};
   }
  }
  if(!capture)return row;
  return {...row,...capture,status:'needs_confirmation'};
 });
}
const labels={
 contact:['Contact','Контакт','Contacto'],request:['Request','Запрос','Petición'],
 wellbeing:['Wellbeing','Благополучие','Bienestar'],personal:['Personal life','Личная жизнь','Vida personal'],
 realization:['Realization','Реализация','Realización'],self:['Self-discovery','Самопознание','Autoconocimiento'],
 integration:['Integration','Интеграция','Integración'],checkin:['Check-in','Сверка','Revisión'],
 support:['Support','Опора и связь','Apoyo'],agency:['Agency','Свобода и сила','Autonomía'],
 identity:['Identity','Ценность себя','Identidad'],resources:['Resources','Ресурсы','Recursos'],
 practice:['Practice','Практика','Práctica'],dream:['Dream','Мечта','Sueño'],
 goal:['Goal','Цель','Meta'],meaning:['Meaning','Смысл','Sentido'],
 action:['Action','Действия','Acción'],reality:['Reality','Реальность','Realidad'],
 constraints:['Obstacles','Препятствия','Obstáculos'],options:['Options','Возможности','Opciones'],
 review:['Review','Итоги','Revisión'],plan:['Plan','План','Plan'],focus:['Focus','Фокус','Enfoque']
};
const l=(id,locale)=>labels[id]?.[locale==='ru'?1:locale==='es'?2:0]||id;
const day1={request:'request',outer_body_health:'wellbeing',outer_emotional_wellbeing:'wellbeing',outer_relationships:'personal',outer_lifestyle:'personal',outer_career_business:'realization',outer_finance:'realization',outer_personal_growth:'self',outer_meaning_purpose:'self',needs:'integration'};
const day2={changes:'checkin',review_homework:'checkin',inner_anchor:'support',inner_connection:'support',inner_love:'support',inner_freedom:'agency',inner_agency:'agency',inner_dignity:'identity','inner_self-realization':'identity',inner_recognition:'identity',strengths:'resources',resources:'resources',practices:'practice'};
const day3={changes:'checkin',review_homework:'checkin',dream_image:'dream',goal:'goal',why:'meaning',success:'goal',next:'action',timing:'action'};
const general={situation:'reality',baseline:'reality',facts:'reality',business_reality:'reality',request:'request',wishes:'request',feelings:'wellbeing',wellbeing:'wellbeing',needs:'focus',why:'meaning',boundaries:'meaning',goal:'goal',success:'goal',horizon:'goal',goal_success:'goal',direction:'goal',support:'resources',resources:'resources',strengths:'resources',limits:'constraints',obstacle:'constraints',trigger:'constraints',options:'options',tradeoffs:'options',strategic_options:'options',plan:'plan',levels:'plan',timing:'plan',contingency:'plan',function_map:'reality',target_structure:'plan',leadership_validation:'review',feedback_evidence:'reality',change_portfolio:'plan',transition_plan:'action',accountability_people:'action',controls_metrics:'review',launch_review:'review',experiment:'action',next:'action',practices:'practice',progress:'review',adjust:'plan',learning:'review',review:'review',changes:'checkin'};
const profileGroups={anchor:'support',connection:'support',love:'support',freedom:'agency',agency:'agency',dignity:'identity','self-realization':'identity',recognition:'identity',priority:'integration',...Object.fromEntries(Object.entries(day1).filter(([id])=>id.startsWith('outer_')).map(([id,key])=>[id.slice(6),key]))};
function groupKey(row,mode,courseId){
 if(mode==='course')return (courseId==='clarity_day_1'?day1:courseId==='clarity_day_2'?day2:courseId==='clarity_day_3'?day3:{})[row.id]||general[row.id]||'field:'+row.id;
 if(mode==='profile'||mode==='profile-v3')return profileGroups[row.id]||'field:'+row.id;
 return 'field:'+row.id;
}
function groupedRows(rows,mode,courseId,locale){
 const groups=new Map();
 for(const row of rows){
  const key=groupKey(row,mode,courseId);
  if(!groups.has(key))groups.set(key,{id:key,label:key.startsWith('field:')?row.label:l(key,locale),children:[]});
  groups.get(key).children.push(row);
 }
 return [...groups.values()];
}
function summarizeGroup(group){
 const total=group.children.length;
 const confirmed=group.children.filter(row=>row.status==='done').length;
 const skipped=group.children.filter(row=>row.status==='skipped').length;
 // Capture can lead verification; never count the same field twice.
 const recorded=group.children.filter(row=>row.status!=='skipped'&&(coachEvidenceMarks(row).recorded||row.status==='done')).length;
 const verified=confirmed/total,entered=recorded/total,omitted=skipped/total;
 return {...group,total,confirmed,recorded,skipped,verifiedFraction:verified,recordedFraction:entered,skippedFraction:omitted,
  status:confirmed===total?'done':confirmed+skipped===total?'skipped':recorded>0?'needs_confirmation':'pending'};
}
// Always one Contact segment plus the actual core groups. No dummy stages.
// Unknown future fields get their own group, never disappear from progress.
export function groupedSessionPosition(opening,core,{mode='method',courseId='',locale='en',openingActive=false}={}){
 const groups=[];
 if(opening?.rows?.length)groups.push({id:'contact',label:l('contact',locale),children:opening.rows});
 groups.push(...groupedRows(core?.rows||[],mode,courseId,locale));
 const active=openingActive?'contact':groups.find(g=>g.id!=='contact'&&g.children.some(row=>row.active))?.id||null;
 return stagePosition(groups.map(summarizeGroup),active);
}
