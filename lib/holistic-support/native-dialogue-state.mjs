/**
 * Pure bounded dialogue-state transition. No authentication, persistence,
 * concurrency control, tools, catalog lookup or side effects. Callers must
 * verify the actor and atomically bind state revision/turn IDs on the server.
 */
const goals=new Set(['consultation','conversation']);
const topics=new Set(['relationships','work','energy','meaning','goals','other']);
const times=new Set(['morning','afternoon','evening']);
const declinedFormats=new Set(['meditation']);
const declinedKinds=new Set(['advice']);
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const validChoiceId=value=>typeof value==='string'&&/^(?:[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}|[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9_:-]{1,85})$/.test(value);
const validSlot=(slot,allowed)=>slot===null||(slot&&typeof slot==='object'&&allowed.has(slot.value)&&slot.confirmed===true&&validId(slot.sourceTurnId));
const validGoalText=value=>typeof value==='string'&&value.trim()===value&&value.length>=2&&value.length<=160&&!/[\u0000-\u001f\u007f]/u.test(value);
const validGoalStatement=slot=>slot===null||(slot&&typeof slot==='object'&&validGoalText(slot.value)&&slot.confirmed===true&&validId(slot.sourceTurnId));
export function emptyNativeDialogueState(){
 return {version:1,revision:0,goal:null,goalStatement:null,topic:null,timePreference:null,declinedMeditation:null,declinedAdvice:null,pendingAdviceConfirmation:false,pendingJudgmentTurnId:null,lastOfferedChoices:[],selectedChoiceId:null,recentTurnIds:[]};
}
export function isValidNativeDialogueState(s){
 return s&&s.version===1&&Number.isSafeInteger(s.revision)&&s.revision>=0&&s.revision<1000000&&
  validSlot(s.goal,goals)&&validSlot(s.topic,topics)&&validSlot(s.timePreference,times)&&
  (s.goalStatement===undefined||validGoalStatement(s.goalStatement))&&
  (s.pendingJudgmentTurnId===undefined||s.pendingJudgmentTurnId===null||validId(s.pendingJudgmentTurnId))&&
  (s.declinedMeditation===undefined||validSlot(s.declinedMeditation,declinedFormats))&&
  (s.declinedAdvice===undefined||validSlot(s.declinedAdvice,declinedKinds))&&
  (s.pendingAdviceConfirmation===undefined||typeof s.pendingAdviceConfirmation==='boolean'&&(!s.pendingAdviceConfirmation||s.declinedAdvice?.value==='advice'))&&
  (s.selectedChoiceId===undefined||s.selectedChoiceId===null||validChoiceId(s.selectedChoiceId))&&
  Array.isArray(s.lastOfferedChoices)&&s.lastOfferedChoices.length<=3&&s.lastOfferedChoices.every(validChoiceId)&&
  new Set(s.lastOfferedChoices).size===s.lastOfferedChoices.length&&
  Array.isArray(s.recentTurnIds)&&s.recentTurnIds.length<=32&&s.recentTurnIds.every(validId)&&
  new Set(s.recentTurnIds).size===s.recentTurnIds.length;
}
export function transitionNativeDialogueState(state,event,{offeredChoiceIds,excludedChoiceIds=[],verifiedChoiceIds,pendingAdviceConfirmation=false,pendingJudgmentTurnId}={}){
 if(!isValidNativeDialogueState(state)||!event||!validId(event.turnId)||!Number.isSafeInteger(event.expectedRevision))throw Error('INVALID_STATE_TRANSITION');
 if(event.expectedRevision!==state.revision)throw Error('REVISION_MISMATCH');
 if(state.recentTurnIds.includes(event.turnId))throw Error('TURN_REPLAY');
 if(!Array.isArray(excludedChoiceIds)||excludedChoiceIds.length>40||!excludedChoiceIds.every(validChoiceId))throw Error('INVALID_EVENT');
 if(verifiedChoiceIds!==undefined&&(!Array.isArray(verifiedChoiceIds)||verifiedChoiceIds.length>3||!verifiedChoiceIds.every(validChoiceId)||new Set(verifiedChoiceIds).size!==verifiedChoiceIds.length))throw Error('INVALID_EVENT');
 if(typeof pendingAdviceConfirmation!=='boolean')throw Error('INVALID_EVENT');
 const next={version:1,revision:state.revision+1,goal:state.goal&&{...state.goal},goalStatement:state.goalStatement?{...state.goalStatement}:null,topic:state.topic&&{...state.topic},
  timePreference:state.timePreference&&{...state.timePreference},declinedMeditation:state.declinedMeditation?{...state.declinedMeditation}:null,
  declinedAdvice:state.declinedAdvice?{...state.declinedAdvice}:null,
  pendingAdviceConfirmation:false,
  pendingJudgmentTurnId:state.pendingJudgmentTurnId??null,
  selectedChoiceId:excludedChoiceIds.includes(state.selectedChoiceId)?null:(state.selectedChoiceId??null),
  lastOfferedChoices:state.lastOfferedChoices.filter(id=>!excludedChoiceIds.includes(id)),
  recentTurnIds:[...state.recentTurnIds,event.turnId].slice(-32)};
 const confirmed=value=>({value,confirmed:true,sourceTurnId:event.turnId});
 let choiceId=null;
 if(['set_goal_statement','clear_goal_statement','set_goal','set_topic','clear_topic','pause_topic','refuse_meditation','refuse_advice','cancel_to_talk','decline_booking','new_question','stop','offer_choices'].includes(event.type))next.selectedChoiceId=null;
 switch(event.type){
  case 'set_goal_statement':
   if(!validGoalText(event.value))throw Error('INVALID_EVENT');
   next.goalStatement=confirmed(event.value);next.lastOfferedChoices=[];break;
  case 'clear_goal_statement':
   next.goal=null;next.goalStatement=null;next.topic=null;next.timePreference=null;next.lastOfferedChoices=[];break;
  case 'set_goal':
   if(!goals.has(event.value)||(event.topic!==undefined&&!topics.has(event.topic)))throw Error('INVALID_EVENT');
   if(next.goal?.value!==event.value)next.timePreference=null;
   next.goal=confirmed(event.value);if(event.topic!==undefined)next.topic=confirmed(event.topic);
   next.lastOfferedChoices=[];break;
  case 'set_topic':
   if(!topics.has(event.value))throw Error('INVALID_EVENT');
   if(event.newTopic===true){next.goalStatement=null;next.goal=null;next.timePreference=null;}
   next.topic=confirmed(event.value);next.lastOfferedChoices=[];break;
  case 'clear_topic':case 'pause_topic':
   next.topic=null;next.lastOfferedChoices=[];break;
  case 'set_time':
   if(!times.has(event.value)||next.goal?.value!=='consultation')throw Error('INVALID_EVENT');
   next.timePreference=confirmed(event.value);break;
  case 'clear_time':
   if(!times.has(event.value)||next.goal?.value!=='consultation'||next.timePreference?.value!==event.value)throw Error('INVALID_EVENT');
   next.timePreference=null;break;
  case 'refuse_meditation':
   next.declinedMeditation=confirmed('meditation');next.lastOfferedChoices=[];break;
  case 'allow_meditation':
   next.declinedMeditation=null;break;
  case 'refuse_advice':
   next.declinedAdvice=confirmed('advice');next.lastOfferedChoices=[];break;
  case 'allow_advice':
   next.declinedAdvice=null;break;
  case 'retain_advice':break;
  case 'cancel_to_talk':
   next.goal=confirmed('conversation');next.timePreference=null;next.lastOfferedChoices=[];break;
  case 'decline_booking':
   next.lastOfferedChoices=[];break;
  case 'new_question':
   next.goal=null;next.goalStatement=null;next.topic=null;next.timePreference=null;next.lastOfferedChoices=[];break;
  case 'stop':
   next.goal=null;next.goalStatement=null;next.topic=null;next.timePreference=null;next.lastOfferedChoices=[];
   next.declinedAdvice=null;next.declinedMeditation=null;next.pendingJudgmentTurnId=null;break;
  case 'offer_choices':
   if(!Array.isArray(event.choiceIds)||event.choiceIds.length<1||event.choiceIds.length>3||
      !event.choiceIds.every(validChoiceId)||new Set(event.choiceIds).size!==event.choiceIds.length||
      (next.declinedMeditation&&event.choiceIds.some(id=>id.startsWith('youtube:'))))throw Error('INVALID_EVENT');
   next.lastOfferedChoices=[...event.choiceIds];break;
  case 'choose':
   if(!Number.isInteger(event.ordinal)||event.ordinal<1||event.ordinal>3)throw Error('INVALID_EVENT');
   choiceId=next.lastOfferedChoices.filter(id=>!excludedChoiceIds.includes(id))[event.ordinal-1]||null;
   if(choiceId&&verifiedChoiceIds!==undefined&&!verifiedChoiceIds.includes(choiceId))choiceId=null;
   next.selectedChoiceId=choiceId;
   next.lastOfferedChoices=[];break;
  default:break;
 }
 if(pendingAdviceConfirmation){
  if(event.type!=='ordinary'||next.declinedAdvice?.value!=='advice')throw Error('INVALID_EVENT');
  next.pendingAdviceConfirmation=true;
 }
 if(offeredChoiceIds!==undefined){
  if(!Array.isArray(offeredChoiceIds)||offeredChoiceIds.length>3||!offeredChoiceIds.every(validChoiceId)||
     new Set(offeredChoiceIds).size!==offeredChoiceIds.length||
     (offeredChoiceIds.length>0&&['stop','cancel_to_talk','decline_booking','clear_topic','clear_goal_statement','refuse_advice','pause_topic','new_question'].includes(event.type))||
     (next.declinedMeditation&&offeredChoiceIds.some(id=>id.startsWith('youtube:')))||
     (offeredChoiceIds.length>0&&event.type==='refuse_meditation'&&
      (event.mixed!==true||offeredChoiceIds.some(id=>id.startsWith('youtube:')))))throw Error('INVALID_EVENT');
  next.lastOfferedChoices=[...offeredChoiceIds];if(offeredChoiceIds.length>0)next.selectedChoiceId=null;
 }
 if(pendingJudgmentTurnId!==undefined){
  if(pendingJudgmentTurnId!==null&&!validId(pendingJudgmentTurnId))throw Error('INVALID_EVENT');
  if(event.type==='stop'&&pendingJudgmentTurnId!==null)throw Error('INVALID_EVENT');
  next.pendingJudgmentTurnId=pendingJudgmentTurnId;
 }
 return {state:next,choiceId,action:null};
}
