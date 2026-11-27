import {coachProtocolSessionControlUtterance} from './coach-protocol-relevance.mjs'
import {protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
import {coachOpeningNameCandidate} from './coach-opening-protocol.mjs'
import {clarityDayOneScenario} from './clarity-day-one-scenario.mjs'
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
  const kind=protocolAnswerClass(row.content);
  const control=coachProtocolSessionControlUtterance(row.content);
  const openFeeling=progress.current==='feelings'&&['affirm','deny'].includes(kind);
  const invalidName=progress.current==='name'&&!coachOpeningNameCandidate(row.content)&&kind!=='skip'&&!(progress.prior?.name&&kind==='affirm');
  if(openingKeys.includes(progress.current)&&!control&&!openFeeling&&!invalidName)captured[progress.current]=row.content;
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
   if((active||matches(row,q.content))&&!coachProtocolSessionControlUtterance(a.content)&&(!['affirm','deny'].includes(protocolAnswerClass(a.content))||['balance_consent','balance_review','reviewed_summary','homework_consent'].includes(row.id))){
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
  status:confirmed===total?'done':confirmed+skipped===total?'skipped':recorded>0||skipped>0?'needs_confirmation':'pending'};
}
// Six real macro stages for every course and method. Preserve existing thematic
// groups and every underlying field. Merge neighbouring core groups when long;
// use real opening subdivisions when a short course has fewer core themes.
// Group membership depends on the schema, not on the elapsed time or evidence.
export const COACH_SESSION_MACRO_STAGES=6;
function compactCoreGroups(groups,maximum,locale){
 const result=groups.map(group=>({...group,kind:'core'}));
 while(result.length>maximum){
  // Prefer the Clarity life-domain pair; otherwise combine the lightest
  // adjacent groups without dropping fields or changing their original IDs.
  let at=result.findIndex((group,i)=>group.id==='personal'&&result[i+1]?.id==='realization');
  if(at<0){
   at=0;
   for(let i=1;i<result.length-1;i++){
    if(result[i].children.length+result[i+1].children.length<result[at].children.length+result[at+1].children.length)at=i;
   }
  }
  const a=result[at],b=result[at+1],life=a.id==='personal'&&b.id==='realization';
  const label=life?({ru:'Сферы жизни',en:'Life domains',es:'Áreas de vida'})[locale]||'Life domains':a.label+' / '+b.label;
  result.splice(at,2,{id:a.id+'+'+b.id,label,children:[...a.children,...b.children],kind:'core'});
 }
 return result;
}
function openingGroups(rows,count,locale){
 if(!rows.length||!count)return [];
 const size=Math.min(rows.length,count);
 return Array.from({length:size},(_,i)=>{
  const children=rows.slice(Math.floor(i*rows.length/size),Math.floor((i+1)*rows.length/size));
  const label=i===0?l('contact',locale):children.length===1?children[0].label:children[0].label+' / '+children.at(-1).label;
  return {id:i===0?'contact':'opening:'+children[0].id,label,children,kind:'opening'};
 });
}
export function groupedSessionPosition(opening,core,{mode='method',courseId='',locale='en',openingActive=false}={}){
 const initial=opening?.rows||[];
 const coreGroups=compactCoreGroups(groupedRows(core?.rows||[],mode,courseId,locale),COACH_SESSION_MACRO_STAGES-(initial.length?1:0),locale);
 const groups=[...openingGroups(initial,COACH_SESSION_MACRO_STAGES-coreGroups.length,locale),...coreGroups];
 // All live sessions have the six actual opening fields. Missing source data
 // in an isolated caller is not padded with invented completion.
 const active=openingActive?
  groups.find(g=>g.kind==='opening'&&g.children.some(row=>row.active))?.id||null:
  groups.find(g=>g.kind==='core'&&g.children.some(row=>row.active))?.id||null;
 return stagePosition(groups.map(summarizeGroup),active);
}

// Read-only v5 projection of the existing reviewed ledger. Missing v5
// fields are explicitly open until the versioned server ledger is activated.
// Do not reinterpret historical request/focus/ratings as new consent.
export function clarityDayOneStageView(opening,core,locale='en',openingActive=false){
 const scenario=clarityDayOneScenario(locale),initial=opening?.rows||[],actual=core?.rows||[];
 const byId=new Map(actual.map(row=>[row.id,row]));
 const rows=scenario.fields.filter(field=>field.stage!=='contact').map(field=>{
  const found=byId.get(field.id);
  return {...(found||{id:field.id,label:field.question,status:'pending',protocolStatus:'not_explored',quote:'',turnIndex:null,scenarioOnly:true}),progressStage:field.progressStage};
 });
 // Keep older real fields visible without awarding a v5 checkpoint.
 for(const row of actual)if(!rows.some(r=>r.id===row.id))rows.push({...row,progressStage:row.id==='request'?'situation':'integration'});
 const groups=scenario.stages.map(stage=>({id:stage.id,label:stage.label,kind:stage.id==='contact'?'opening':'core',
  children:stage.id==='contact'?initial:rows.filter(row=>row.progressStage===stage.id)}));
 const active=openingActive?(initial.some(row=>row.active)?'contact':null):
  groups.find(g=>g.kind==='core'&&g.children.some(row=>row.active))?.id||null;
 const position=stagePosition(groups.map(group=>group.children.length?summarizeGroup(group):{...group,total:0,confirmed:0,recorded:0,skipped:0,verifiedFraction:0,recordedFraction:0,skippedFraction:0,status:'pending'}),active);
 return {position,core:stagePosition(rows,actual.find(row=>row.active)?.id||null)};
}

// Read the actual four-turn client review, not a generated summary. The
// existing protocol normalizer validates exact question/answer/echo/assent
// and rejects mismatches. This is transcript-bound review, NOT a server
// delivery or durable receipt; it reconstructs from the same saved turns.
export function boundTranscriptReview({courseId,turns,fields,existing=null,afterIndex=-1,matchQuestion,matchEcho,answerClass,normalize}){
 if(!Array.isArray(turns)||!Array.isArray(fields)||!fields.length)return existing;
 const prior=existing?.courseSessionId===courseId?normalize(existing,courseId,turns):null;
 const manual=new Set((prior?.events||[]).map(e=>e.fieldId)),latest=new Map();
 for(let q=Math.max(0,afterIndex+1);q<turns.length;q++){
  const question=turns[q];
  if(question?.role!=='assistant'||question.interrupted===true||typeof question.content!=='string')continue;
  const matched=fields.filter(field=>matchQuestion(field,question.content));
  if(matched.length!==1||manual.has(matched[0].id))continue;
  latest.set(matched[0].id,{field:matched[0],q});
 }
 let result=prior;
 for(const {field,q} of [...latest.values()].sort((a,b)=>a.q-b.q)){
  const a=turns[q+1],echo=turns[q+2],confirm=turns[q+3];
  if(a?.role!=='user'||a.unanswered===true||a.interim===true||typeof a.content!=='string'||answerClass(a.content)!=='candidate'||
   echo?.role!=='assistant'||echo.interrupted===true||confirm?.role!=='user'||confirm.interim===true||confirm.unanswered===true||answerClass(confirm.content)!=='affirm')continue;
  const quote=a.content.trim();
  if(!matchEcho(field,turns[q].content,quote,echo.content))continue;
  const events=result?.events||[];
  if(events.length>=64)break;
  try{
   result=normalize({version:'hh-coach-course-review-v1',courseSessionId:courseId,events:[...events,
    {fieldId:field.id,status:'confirmed',turnIndex:q+1,quote,revision:events.length+1,binding:{questionTurnIndex:q,confirmationTurnIndex:q+3}}]},courseId,turns);
  }catch{/* keep recorded candidate; no check without validation */}
 }
 return result;
}
