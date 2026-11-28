import {sessionBlueprint,sessionBlueprintStage} from './session-blueprint.mjs'
import {coachProtocolSessionControlUtterance} from './coach-protocol-relevance.mjs'
import {protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
import {coachOpeningNameCandidate} from './coach-opening-protocol.mjs'
import {clarityDayOneScenario} from './clarity-day-one-scenario.mjs'
import {clarityVersionedScenario,clarityScenarioVersion} from './clarity-course-scenarios.mjs'
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
  return {id,label:labels[i],status:status==='pending'&&quote?'needs_confirmation':status,quote,automatic:answer?.automatic===true,...(id==='name'&&status==='done'&&typeof answer?.value==='string'&&answer.value.trim()?{value:answer.value}:{})};
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
 return stagePosition(ids.map((id,i)=>({id,label:labels[i]||id,status:verified&&(i<index||completed===true&&i===index)?'done':'pending',recorded:verified===true&&(i<index||completed===true&&i===index)})),ids[index]);
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
   if((active||matches(row,q.content))&&!coachProtocolSessionControlUtterance(a.content)&&(!['affirm','deny'].includes(protocolAnswerClass(a.content))||(row.kind==='consent'||row.kind==='review'||['balance_consent','balance_review','reviewed_summary','homework_consent'].includes(row.id)))){
    capture={quote:a.content,turnIndex:i,questionTurnIndex:i-1,source:'visible_prompt_capture',pending:a.unanswered===true};
   }
  }
  if(!capture)return row;
  return {...row,...capture,status:'needs_confirmation'};
 });
}
// Exactly six positions in the shared display. Empty positions never count
// as answered; they are grey, not invented protocol rows or completion.
export const COACH_PROGRESS_STAGE_IDS=Object.freeze(['contact','situation','method','insight','support','integration']);
const labels={
 contact:['Contact','Контакт','Contacto'],situation:['Situation','Ситуация','Situación'],
 method:['Method','Методика','Método'],insight:['Insight','Осознание','Comprensión'],
 support:['Support','Опора','Apoyo'],integration:['Integration','Итоги','Integración']
};
const clarityLabels={method:['Balance','Баланс','Equilibrio'],insight:['Needs','Потребности','Necesidades']};
const label=(id,locale,clarity=false)=>(clarity&&clarityLabels[id]||labels[id])[locale==='ru'?1:locale==='es'?2:0];
const dayOneIds=new Set(['clarity_day_1','clarity_discover','introductory']);
const dayOne={request:'situation',situation:'situation',feelings:'situation',impact:'situation',
 direction:'situation',facts:'situation',symptoms:'situation',balance_consent:'method',
 balance_review:'method',life_balance:'method',verification:'method',
 priority:'insight',needs:'insight',wishes:'insight',why:'insight',obstacle:'insight',
 resources:'support',strengths:'support',support:'support',next:'support',
 learning:'integration',reviewed_summary:'integration',homework_consent:'integration'};
const generic={
 changes:'situation',review_homework:'situation',request:'situation',situation:'situation',
 baseline:'situation',facts:'situation',feelings:'situation',wellbeing:'situation',symptoms:'situation',
 business_reality:'situation',function_map:'situation',feedback_evidence:'situation',
 goal:'method',direction:'method',wishes:'method',success:'method',horizon:'method',
 goal_success:'method',dream_image:'method',options:'method',tradeoffs:'method',strategic_options:'method',
 target_structure:'method',balance_consent:'method',balance_review:'method',
 needs:'insight',priority:'insight',why:'insight',boundaries:'insight',limits:'insight',
 obstacle:'insight',trigger:'insight',resources:'support',support:'support',strengths:'support',
 practices:'support',experiment:'support',plan:'support',levels:'support',contingency:'support',
 change_portfolio:'support',transition_plan:'support',accountability_people:'support',
 next:'integration',timing:'integration',review:'integration',learning:'integration',
 progress:'integration',adjust:'integration',leadership_validation:'integration',
 controls_metrics:'integration',launch_review:'integration',reviewed_summary:'integration',homework_consent:'integration'
};
const stageAliases={contact:'contact',situation:'situation',balance:'method',verification:'method',
 method:'method',needs:'insight',insight:'insight',support:'support',integration:'integration'};
function groupKey(row,mode,courseId,index,total){
 if(mode==='course'){
  if(row.id.startsWith('outer_')||row.id.startsWith('inner_'))return 'method';
  const authoredStage=sessionBlueprintStage(courseId,row.id);
  if(authoredStage&&COACH_PROGRESS_STAGE_IDS.includes(authoredStage))return authoredStage;
  if(dayOneIds.has(courseId)&&dayOne[row.id])return dayOne[row.id];
  if(row.progressStage&&stageAliases[row.progressStage])return stageAliases[row.progressStage];
  if(row.stage&&stageAliases[row.stage])return stageAliases[row.stage];
  return generic[row.id]||'integration';
 }
 if(mode==='profile'||mode==='profile-v3'){
  if(row.id==='priority')return 'insight';
  if(['anchor','connection','love'].includes(row.id))return 'support';
  if(['freedom','agency','dignity','self-realization','recognition'].includes(row.id))return 'insight';
  return 'method';
 }
 // Keep actual method steps in order, without inventing new method questions.
 // Five core slots; any legacy extra review/complete step shares the last.
 return COACH_PROGRESS_STAGE_IDS[Math.min(5,index+1)];
}
export function coachGroupTone({total=0,confirmed=0,recorded=0,touched=0}={}){
 return total>0&&confirmed===total&&recorded===total?'green':
  recorded>0||touched>0?'yellow':'gray';
}
function summarizeGroup(group){
 const total=group.children.length;
 const recorded=group.children.filter(row=>row.status!=='skipped'&&coachEvidenceMarks(row).recorded).length;
 const confirmed=group.children.filter(row=>row.status!=='skipped'&&!['declined','deferred'].includes(row.methodDecision)&&coachEvidenceMarks(row).verified).length;
 const skipped=group.children.filter(row=>row.status==='skipped').length;
 const touched=group.children.filter(row=>row.status==='skipped'&&row.automatic!==true||coachEvidenceMarks(row).recorded).length;
 const tone=coachGroupTone({total,confirmed,recorded,touched});
 return {...group,total,confirmed,recorded,skipped,touched,tone,
  verifiedFraction:total?confirmed/total:0,recordedFraction:total?recorded/total:0,skippedFraction:total?skipped/total:0,
  status:tone==='green'?'done':total>0&&confirmed+skipped===total?'skipped':tone==='yellow'?'needs_confirmation':'pending'};
}
export function groupedSessionPosition(opening,core,{mode='method',courseId='',locale='en',openingActive=false}={}){
 if(mode==='course'&&courseId==='clarity_day_1')return clarityDayOneStageView(opening,core,locale,openingActive).position;
 if(mode==='course'&&['clarity_day_2','clarity_day_3'].includes(courseId)&&core?.rows?.some(row=>row.scenarioVersion===clarityScenarioVersion(courseId)))return clarityVersionedStageView(courseId,opening,core,locale,openingActive).position;
 const blueprint=mode==='course'&&!courseId.startsWith('clarity_day_')?sessionBlueprint(courseId,locale):null;
 const groups=COACH_PROGRESS_STAGE_IDS.map(id=>({id,label:blueprint?.stages.find(s=>s.id===id)?.label||label(id,locale,dayOneIds.has(courseId)),kind:id==='contact'?'opening':'core',children:[],coreChildren:[]}));
 groups[0].children.push(...(opening?.rows||[]));
 const rows=core?.rows||[];
 rows.forEach((row,i)=>{
  const key=groupKey(row,mode,courseId,i,rows.length);
  const group=groups.find(g=>g.id===key);
  group.children.push(row);group.coreChildren.push(row);
  // Method stages keep their actual labels rather than being renamed GROW.
  if(mode==='method'&&key!=='contact')group.label=group.children.map(r=>r.label).join(' / ');
 });
 const active=openingActive?'contact':groups.find(g=>g.coreChildren.some(row=>row.active))?.id||null;
 const position=stagePosition(groups.map(summarizeGroup),active);
 const actual=position.rows.filter(r=>r.total>0);
 // An unavailable stage remains grey. Do not prevent a completed legacy
 // method from ending, and never give its unconfigured positions a green bar.
 const finished=actual.length>0&&actual.every(r=>terminal(r.status));
 return {...position,finished,step:position.index>=0?position.step:finished?position.total:0};
}

// B/C use the same versioned fields for both the six bars and expanded rows.
export function clarityVersionedStageView(courseId,opening,core,locale='en',openingActive=false){
 if(courseId==='clarity_day_1')return clarityDayOneStageView(opening,core,locale,openingActive)
 const scenario=clarityVersionedScenario(courseId,locale),actual=core?.rows||[],initial=opening?.rows||[]
 if(!scenario)return null
 const byId=new Map(actual.filter(r=>r.scenarioVersion===scenario.version).map(r=>[r.id,r]))
 const rows=scenario.fields.map(f=>{
  const found=byId.get(f.id)
  return {...(found||{id:f.id,label:f.label,status:'pending',protocolStatus:'not_explored',quote:'',turnIndex:null,scenarioOnly:true}),scenarioVersion:scenario.version,progressStage:f.progressStage,...(f.requiresConsent?{requiresConsent:f.requiresConsent}:{})}
 })
 const groups=scenario.stages.map(stage=>({id:stage.id,label:stage.label,kind:stage.id==='contact'?'opening':'core',
  children:stage.id==='contact'?initial:rows.filter(row=>row.progressStage===stage.id),coreChildren:stage.id==='contact'?[]:rows.filter(row=>row.progressStage===stage.id)}))
 const active=openingActive?(initial.some(row=>row.active)?'contact':null):groups.find(g=>g.kind==='core'&&g.children.some(r=>r.active))?.id||null
 return {position:stagePosition(groups.map(summarizeGroup),active),core:stagePosition(rows,actual.find(row=>row.active)?.id||null)}
}

// Read-only v5 projection of the existing reviewed ledger. Missing v5
// fields are explicitly open until the versioned server ledger is activated.
// Do not reinterpret historical request/focus/ratings as new consent.
export function clarityDayOneStageView(opening,core,locale='en',openingActive=false){
 const scenario=clarityDayOneScenario(locale),initial=opening?.rows||[],actual=core?.rows||[];
 const versioned=actual.some(row=>row.scenarioVersion===scenario.version);
 const byId=new Map(actual.filter(row=>!versioned||row.scenarioVersion===scenario.version).map(row=>[row.id,row]));
 const rows=scenario.fields.filter(field=>field.stage!=='contact').map(field=>{
  const found=byId.get(field.id);
  return {...(found||{id:field.id,label:field.question,status:'pending',protocolStatus:'not_explored',quote:'',turnIndex:null,scenarioOnly:true}),progressStage:field.progressStage};
 });
 // Keep older real fields visible without awarding a v5 checkpoint.
 if(!versioned)for(const row of actual)if(!rows.some(r=>r.id===row.id))rows.push({...row,progressStage:row.id==='request'?'situation':'integration'});
 const groups=scenario.stages.map(stage=>({id:stage.id,label:stage.label,kind:stage.id==='contact'?'opening':'core',
  children:stage.id==='contact'?initial:rows.filter(row=>row.progressStage===stage.id),coreChildren:stage.id==='contact'?[]:rows.filter(row=>row.progressStage===stage.id)}));
 const active=openingActive?(initial.some(row=>row.active)?'contact':null):
  groups.find(g=>g.kind==='core'&&g.children.some(row=>row.active))?.id||null;
 const position=stagePosition(groups.map(summarizeGroup),active);
 return {position,core:stagePosition(rows,actual.find(row=>row.active)?.id||null)};
}

// Read the actual four-turn client review, not a generated summary. The
// existing protocol normalizer validates exact question/answer/echo/assent
// and rejects mismatches. This is transcript-bound review, NOT a server
// delivery or durable receipt; it reconstructs from the same saved turns.
export function boundTranscriptReview({courseId,turns,fields,existing=null,afterIndex=-1,matchQuestion,matchEcho,answerClass,normalize}){
 if(!Array.isArray(turns)||!Array.isArray(fields)||!fields.length)return existing;
 const prior=existing?.courseSessionId===courseId?normalize(existing,courseId,turns):null;
 const manual=new Set((prior?.events||[]).filter(e=>!e.binding).map(e=>e.fieldId));
 const reviewedThrough=new Map();
 for(const e of prior?.events||[])if(e.binding)reviewedThrough.set(e.fieldId,Math.max(reviewedThrough.get(e.fieldId)??-1,e.binding.questionTurnIndex));
 let result=prior;
 // Replay confirmed sequences in order. A later incomplete or rejected
 // re-question does not undo earlier client-confirmed evidence. Explicit
 // manual open/skip/correction events still take precedence.
 for(let q=Math.max(0,afterIndex+1);q<turns.length;q++){
  const question=turns[q];
  if(question?.role!=='assistant'||question.interrupted===true||typeof question.content!=='string')continue;
  const matched=fields.filter(field=>matchQuestion(field,question.content));
  if(matched.length!==1||manual.has(matched[0].id)||q<=(reviewedThrough.get(matched[0].id)??-1))continue;
  const field=matched[0];
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
