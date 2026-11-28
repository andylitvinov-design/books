// Owner-only recall; no provider grant or generated conclusions.
const clip=(value,n)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/gu,' ').replace(/\s+/gu,' ').trim().slice(0,n):'';
const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function coachExplicitRecall(message){
 const s=String(message||'').trim().normalize('NFC');
 return s.length<=400&&/(?:вспомни|помнишь|помните|напомни|что (?:мы|было)|о ч[её]м (?:мы|говорили)|на ч[её]м (?:мы|остановились|закончили)|what (?:did we|were we|was our|we discussed)|where (?:did we|we left)|remember|remind me|recall|recuerda|recuérdame|recordar|en qu[eé] (?:nos quedamos|terminamos)|qu[eé] (?:hablamos|dijimos))/iu.test(s)&&/(?:прошл|предыдущ|последн|закончил|остановил|говорил|обсуждал|до этого|last|previous|earlier|left off|leave off|before|anterior|pasad|quedamos|terminamos|hablamos)/iu.test(s);
}
export function projectPrivateCoachRecall(reviewed,draft){
 const r=reviewed?.provenance==='client_reviewed_dialogue'&&date(reviewed.savedAt||reviewed.completedAt)?reviewed:null;
 const d=draft?.protocol?.provenance==='client_autosaved_unreviewed_draft'&&date(draft.updatedAt)?draft:null;
 const quote=d&&Array.isArray(d.protocol.turns)?[...d.protocol.turns].reverse().find(t=>t?.role==='user'&&t.interim!==true&&t.interrupted!==true&&typeof t.content==='string'&&t.content.trim().length>=10&&!coachExplicitRecall(t.content)&&!/(?:password|парол|contraseña|bearer\s|private key|sk-or-v1-|github_pat_)/iu.test(t.content)):null;
 if(d&&(!r||Date.parse(d.updatedAt)>Date.parse(r.savedAt||r.completedAt)))return {kind:'draft',date:d.updatedAt.slice(0,10),lastWords:clip(quote?.content,240)};
 if(r)return {kind:'reviewed',date:(r.completedAt||r.savedAt).slice(0,10),topic:clip(r.goal,120),conclusions:clip(r.clientSummary,300),nextStep:clip(r.clientNextStep,160)};
 if(d)return {kind:'draft',date:d.updatedAt.slice(0,10),lastWords:''};
 return {kind:'none'};
}
export function privateCoachRecallText(result,locale='en'){
 const translations=({
 ru:{reviewed:'Нашёл сохранённый протокол от ',topic:'Тема: ',conclusions:'Ваш подтверждённый итог: ',nextStep:'Следующий шаг: ',draft:'Нашёл незавершённую запись от ',words:'Ваши последние записанные слова: ',unreviewed:'Итог ещё не подтверждён.',empty:'В протоколе пока нет подтверждённого итога.',none:'В доступном архиве нет предыдущего протокола. Не буду придумывать его.',unavailable:'Не удалось проверить сохранённую память. Это не значит, что прошлой сессии не было.',guest:'Чтобы проверить ваш приватный архив, войдите в кабинет.'},
 en:{reviewed:'I found your saved protocol from ',topic:'Topic: ',conclusions:'Your reviewed conclusion: ',nextStep:'Next step: ',draft:'I found an unfinished record from ',words:'Your last recorded words: ',unreviewed:'The conclusion has not been reviewed.',empty:'The saved protocol has no reviewed conclusion yet.',none:'No previous protocol was found in the available archive. I will not invent one.',unavailable:'I could not check saved memory. That does not mean there was no previous session.',guest:'Sign in to check your private archive.'},
 es:{reviewed:'Encontré tu protocolo guardado del ',topic:'Tema: ',conclusions:'Tu conclusión revisada: ',nextStep:'Siguiente paso: ',draft:'Encontré un registro sin terminar del ',words:'Tus últimas palabras registradas: ',unreviewed:'La conclusión aún no está revisada.',empty:'El protocolo aún no contiene una conclusión revisada.',none:'No encontré un protocolo anterior en el archivo disponible. No lo inventaré.',unavailable:'No pude consultar la memoria guardada. Eso no significa que no hubiera una sesión anterior.',guest:'Inicia sesión para consultar tu archivo privado.'}
 });
 const c=translations[locale]||translations.en;
 if(result?.kind==='reviewed')return [c.reviewed+result.date+'.',result.topic?c.topic+result.topic:'',result.conclusions?c.conclusions+result.conclusions:c.empty,result.nextStep?c.nextStep+result.nextStep:''].filter(Boolean).join(' ');
 if(result?.kind==='draft')return [c.draft+result.date+'.',result.lastWords?c.words+'«'+result.lastWords+'»':'',c.unreviewed].filter(Boolean).join(' ');
 return c[result?.kind]||c.unavailable;
}

// First-party entry uses one reviewed anchor. An unfinished record takes
// precedence, but its words and any unreviewed findings stay out of the greeting.
export function projectCoachEntryContext(reviewed,hasNewerDraft){
 if(hasNewerDraft)return {kind:'unfinished'}
 if(reviewed?.provenance!=='client_reviewed_dialogue'||!date(reviewed.completedAt))return {kind:'none'}
 const nextStep=clip(reviewed.clientNextStep,160)
 if(nextStep)return {kind:'next_step',value:nextStep}
 const topic=clip(reviewed.goal,120)
 return topic?{kind:'topic',value:topic}:{kind:'none'}
}
export function privateCoachEntryText(context,locale='en'){
 if(!context||context.kind==='none')return ''
 const translations={
  ru:{next_step:'Ваш предыдущий шаг',topic:'Тема прошлой сессии',nextQuestion:'Как сейчас обстоят дела с этим шагом?',topicQuestion:'Что изменилось с прошлой сессии?',unfinished:'У вас есть незавершённая сессия. Её можно продолжить из сохранённых сессий.',unavailable:'Не удалось загрузить сохранённую историю. Можно начать и уточнить контекст в диалоге.'},
  en:{next_step:'Your previous next step',topic:'Your last session topic',nextQuestion:'How has that step gone so far?',topicQuestion:'What has changed since that session?',unfinished:'You have an unfinished session. You can pick it up from your saved sessions.',unavailable:'I could not load your saved history. You can still start and clarify the context in the conversation.'},
  es:{next_step:'Tu siguiente paso anterior',topic:'El tema de tu última sesión',nextQuestion:'¿Cómo te ha ido con ese paso?',topicQuestion:'¿Qué ha cambiado desde esa sesión?',unfinished:'Tienes una sesión sin terminar. Puedes retomarla desde tus sesiones guardadas.',unavailable:'No pude cargar tu historial guardado. Puedes empezar y aclarar el contexto durante la conversación.'},
 }
 const copy=translations[locale]||translations.en
 if(context.kind==='unfinished'||context.kind==='unavailable')return copy[context.kind]
 if((context.kind==='next_step'||context.kind==='topic')&&typeof context.value==='string'&&context.value)
  return copy[context.kind]+': «'+context.value+'» '+(context.kind==='next_step'?copy.nextQuestion:copy.topicQuestion)
 return ''
}

// Voice recall waits for the suppressed provider response boundary AND the owner read.
export function createPrivateCoachRecallTurn(waitForBoundary){return {drained:!waitForBoundary,loaded:false,reply:null,playing:false}}
export function observePrivateCoachRecallFrame(turn,frame){if(frame?.turnComplete===true)turn.drained=true;return turn.drained&&turn.loaded&&!turn.playing}
export function resolvePrivateCoachRecallTurn(turn,reply){turn.loaded=true;turn.reply=typeof reply==='string'?reply:typeof reply?.reply==='string'?reply.reply:null;turn.record=reply?.record?.kind==='reviewed'?reply.record:null;turn.owner=typeof reply?.owner==='string'?reply.owner:null;return turn.drained&&!turn.playing}

// This only recognizes the same, reviewed recap already permitted by the
// server's signed provider-specific memory scope. Drafts never qualify.
export function coachHasReviewedRecallPermission(access){
 try{
  const grant=JSON.parse(access)
  return grant?.shareApproved===true&&grant.continuity==='previous'&&grant.consent?.priorSessions===true&&typeof grant.stageToken==='string'&&Boolean(grant.stageToken)
 }catch{return false}
}
export function coachApprovedRecallMatches(result,record){
 if(record?.kind!=='reviewed'||result?.schema!=='HH_MY_COACH_LIVE_CONTEXT_V1'||result.available!==true||
    !Array.isArray(result.scopes)||!result.scopes.includes('prior_session')||
    !/^[a-f0-9]{64}$/.test(result.fingerprint||'')||typeof result.note!=='string'||result.note.length>2400||
    !result.note.startsWith('CLIENT-APPROVED REFERENCE DATA ('))return false
 try{
  const start=result.note.indexOf('): ')
  if(start<0)return false
  const data=JSON.parse(result.note.slice(start+3))
  const row=data.items?.find(item=>item?.category==='prior_session')
  return Boolean(row&&row.source==='client_reviewed_dialogue'&&row.date===record.date&&
   row.topic===clip(record.topic,85)&&row.conclusions===clip(record.conclusions,170)&&row.nextStep===clip(record.nextStep,80)&&
   (row.topic||row.conclusions||row.nextStep))
 }catch{return false}
}
export function coachReturningSalutation(nameSalutation,hasPrevious,locale='en'){
 const base=typeof nameSalutation==='string'?nameSalutation.trim():''
 if(!hasPrevious)return base
 const welcome=({ru:'С возвращением.',en:'Welcome back.',es:'Bienvenido de nuevo.'})[locale]||'Welcome back.'
 return [base,welcome].filter(Boolean).join(' ')
}
