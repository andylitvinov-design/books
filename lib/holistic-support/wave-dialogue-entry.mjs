/** Shared first-party entry navigation. Hosts retain safety, consent and action authority. */
import {THREE_JOURNEY_PATHS,threeJourneyLabel,threeJourneyOpening,threeJourneyTurn} from './three-journeys.mjs';
import {buildWaveGoalMenu,readWaveGoalMenu,waveGoalDialogueTurn,waveGoalTopic,waveExplicitMoneyGoal,waveGoalTopicFromHistory,waveDialoguePreferences,waveHasMediaContext,readWaveGoalStage,isWaveGoalStageLabel} from './wave-goal-dialogue.mjs';

const languages=['ru','en','es'];
const questions={ru:'Что сейчас важнее для тебя?',en:'What matters most to you right now?',es:'¿Qué es lo más importante para ti ahora?'};
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/[.!?,;:¡¿]+/g,' ').replace(/\s+/g,' ').trim();
const reset=/^(?:заново|начать сначала|новый разговор|сменим тему|сменить тему|новая тема|другая тема|start over|restart|new conversation|new topic|change topic|empezar de nuevo|otro tema|cambiar de tema)$/u;
const explicitSupport=/(?:^|\s)(?:поговорить и снять напряжение|хочу (?:просто )?поговорить|поговори со мной|давай поговорим|мне нужна поддержка|нужна поддержка|поддержи меня|просто выслушай|i (?:just )?want to talk|i need support|please listen|quiero hablar|necesito apoyo)(?:\s|$)/u;
const explicitUnderstanding=/(?:^|\s)(?:хочу (?:понять|разобраться)|помоги (?:понять|разобраться)|понять что происходит|i want to understand|help me understand|quiero (?:entender|comprender)|ayudame a entender|ayúdame a entender)(?:\s|$)/u;
const feelingWhy=/^(?:почему (?:я|мне)|why (?:am i|do i|does it)|por qu[eé] (?:me|siento|tengo)).*(?:боюсь|страшно|тревож|не хватает|worri|afraid|anxious|miedo|ansiedad|falta)/u;
const feeling=/(?:^|\s)(?:мне (?:страшно|тревожно|грустно|тяжело)|я (?:боюсь|переживаю)|i(?:'m| am) (?:afraid|worried|anxious|sad)|i feel (?:anxious|sad)|tengo miedo|estoy (?:preocupad[oa]|triste))(?:\s|$)/u;
// Explicit content/operational requests belong to their existing handlers.
const technicalRequest=/(?:javascript|typescript|\bcss\b|\bhtml\b|как исправить ошибк|оплат[а-я]* заказ|pay for an order|pagar un pedido)/iu;
const protectedRequest=/(?:суицид|самоубийств|не хочу жить|убить себя|умереть|не могу дышать|боль в груди|насили|лекарств|диагноз|suicid|kill myself|want to die|cannot breathe|chest pain|violence|diagnos|prescription|quiero morir|dolor en el pecho|no puedo respirar|violencia)/iu;
const otherRequest=/(?:создай|сделай|покажи|подбери|включи|create|make|show|play|find|crea|haz|muestra|reproduce).{0,36}(?:видео|медитац|практик|video|meditat|practi|vídeo|meditaci)|^(?:переведи|отправь|оплати|купи|запиши меня|забронируй|transfer|send|pay|buy|book|transfiere|envía|paga|compra|reserva)(?:\s|$)|https?:\/\/|<[^>]*>/iu;

export function buildWaveEntryMenu(locale='en'){
 const lang=languages.includes(locale)?locale:'en';
 const choices=THREE_JOURNEY_PATHS.map(id=>({id,label:threeJourneyLabel(id,lang)}));
 const question=questions[lang];
 return {locale:lang,question,choices,reply:[question,...choices.map((choice,i)=>`${i+1}. ${choice.label}`)].join('\n')};
}
export function readWaveEntryMenu(text){
 for(const locale of languages){const menu=buildWaveEntryMenu(locale);if(menu.reply===text)return menu;}
 return null;
}

/** Recover only our own explicit route evidence; private local-only rows never participate. */
export function waveJourneyPathFromHistory(history=[]){
 const rows=Array.isArray(history)?history.filter(row=>row&&row.localOnly!==true).slice(-16):[];
 let selected=null;
 for(const row of rows){
  if(row.role==='user'&&reset.test(normalize(row.text))){selected=null;continue;}
  if(row.role==='assistant'){
   if(readWaveEntryMenu(row.text)){selected=null;continue;}
   if(readWaveGoalMenu(row.text)||readWaveGoalStage(row.text)){selected='goal';continue;}
   for(const locale of languages)for(const path of THREE_JOURNEY_PATHS)
    if(row.text===threeJourneyOpening(path,locale))selected=path;
  }
  if(row.role==='user'&&isWaveGoalStageLabel(row.text))continue;
  if(row.role==='user'){
   const words=normalize(row.text);
   if(explicitUnderstanding.test(words)||feelingWhy.test(words)){selected='consultation';continue;}
   if(explicitSupport.test(words)){selected='therapy';continue;}
   for(const locale of languages)for(const path of THREE_JOURNEY_PATHS)
    if(words===normalize(threeJourneyLabel(path,locale)))selected=path;
   if(!selected&&feeling.test(words))selected='therapy';
  }
 }
 return selected;
}

/**
 * @param {{message?:string,locale?:string,history?:Array<{role:string,text:string,localOnly?:boolean}>,path?:string|null,preferenceNoAdvice?:boolean,preferenceNoQuestions?:boolean,fallback?:boolean,continueJourney?:boolean}} [input]
 * @returns {{reply:string,kind:string,path:"therapy"|"consultation"|"goal"|null,source:string,action?:string|null,topic?:string|null,stage?:number|null,stageId?:string|null}|null}
 */
export function waveDialogueEntryTurn({message='',locale='en',history=[],path=null,
 preferenceNoAdvice=false,preferenceNoQuestions=false,fallback=false,continueJourney=false}={}){
 const words=normalize(message),lang=languages.includes(locale)?locale:'en';
 if(!words||protectedRequest.test(message)||technicalRequest.test(message)||otherRequest.test(message))return null;
 const rows=Array.isArray(history)?history.filter(row=>row&&row.localOnly!==true).slice(-16):[];
 const current=THREE_JOURNEY_PATHS.includes(path)?path:waveJourneyPathFromHistory(rows);
 const preferences=waveDialoguePreferences([...rows,{role:'user',text:message}]);
 preferenceNoAdvice=preferenceNoAdvice||preferences.noAdvice;
 preferenceNoQuestions=preferenceNoQuestions||preferences.noQuestions;
 const last=rows.at(-1),entry=last?.role==='assistant'?readWaveEntryMenu(last.text):null;
 const result=(reply,kind,selected=null,extra={})=>({reply,kind,path:selected,source:'wave-dialogue-entry',...extra});
 if(reset.test(words))return result(buildWaveEntryMenu(lang).reply,'entry_menu');
 let selected=null;
 for(const language of languages)for(const candidate of THREE_JOURNEY_PATHS)
  if(words===normalize(threeJourneyLabel(candidate,language)))selected=candidate;
 if(entry){
  const number=/^(?:пункт |вариант |option |opción |opcion )?([1-3])(?: пункт| вариант)?$/u.exec(words);
  if(number)selected=entry.choices[Number(number[1])-1].id;
 }
 const exactSelection=Boolean(selected);
 // A full goal-tile label is stronger evidence than a substring such as "understand".
 if(!selected&&(!current||current==='goal')&&!preferenceNoAdvice&&!preferenceNoQuestions){
  const stage=waveGoalDialogueTurn({message,locale:lang,history:rows,allowNewGoal:false});
  if(stage?.kind==='stage')return result(stage.reply,'stage','goal',{topic:stage.topic,stage:stage.stage,stageId:stage.stageId});
 }
 if(!selected&&(explicitUnderstanding.test(words)||feelingWhy.test(words)))selected='consultation';
 if(!selected&&explicitSupport.test(words))selected='therapy';
 if(!selected&&!current&&feeling.test(words))selected='therapy';
 if(selected==='therapy'||selected==='consultation'){
  const turn=!exactSelection||preferenceNoAdvice||preferenceNoQuestions
   ?threeJourneyTurn({path:selected,message,locale:lang,history:rows,preferenceNoAdvice,preferenceNoQuestions}):null;
  if(!exactSelection&&!turn)return null;
  return result(turn?.reply||threeJourneyOpening(selected,lang),'journey',selected,{action:turn?.action||null});
 }
 // An answer naming a topic inside support/understanding does not switch the person's intent.
 const explicitGoal=selected==='goal'||waveExplicitMoneyGoal(words)||/^(?:дай денег|give me money|dame dinero|хочу (?:больше зарабатывать|увеличить доход|заработать|достичь|найти цель)|i want to (?:earn|increase|achieve)|quiero (?:ganar|aumentar|lograr))/u.test(words);
 if(!exactSelection&&!explicitGoal&&waveHasMediaContext(rows))return null;
 if(!preferenceNoAdvice&&!preferenceNoQuestions&&(!current||current==='goal'||explicitGoal)){
  const goal=waveGoalDialogueTurn({message,locale:lang,history:rows});
  if(goal?.kind==='menu'||goal?.kind==='stage')return result(goal.reply,goal.kind,'goal',{topic:goal.topic,stage:goal.stage??null,stageId:goal.stageId??null});
  if(selected==='goal')return result(buildWaveGoalMenu(waveGoalTopicFromHistory(rows)||waveGoalTopic(message)||'goals',lang).reply,'menu','goal');
 }
 if(selected==='goal'){
  const turn=threeJourneyTurn({path:'goal',message,locale:lang,history:rows,preferenceNoAdvice,preferenceNoQuestions});
  return result(turn.reply,'journey','goal',{action:turn.action||null});
 }
 // Text-only hosts may opt into the same continuation used by the chat UI.
 // Resource selection and execution remain with the host's existing handlers.
 if(continueJourney&&current){
  const turn=threeJourneyTurn({path:current,message,locale:lang,history:rows,preferenceNoAdvice,preferenceNoQuestions});
  if(turn&&!turn.action)return result(turn.reply,'continuation',current,{stage:turn.stage??null});
 }
 if(fallback&&!current)return result(buildWaveEntryMenu(lang).reply,'entry_menu');
 return null;
}
