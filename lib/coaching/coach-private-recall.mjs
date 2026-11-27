// Owner-only recall; no provider grant or generated conclusions.
const clip=(value,n)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/gu,' ').trim().slice(0,n):'';
const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function coachExplicitRecall(message){
 const s=String(message||'').trim().normalize('NFC');
 return s.length<=400&&/(?:вспомни|помнишь|помните|напомни|что (?:мы|было)|о ч[её]м (?:мы|говорили)|на ч[её]м (?:мы|остановились|закончили)|what (?:did we|were we|was our|we discussed)|where (?:did we|we left)|remember|remind me|recall|recuerda|recuérdame|recordar|en qu[eé] (?:nos quedamos|terminamos)|qu[eé] (?:hablamos|dijimos))/iu.test(s)&&/(?:прошл|предыдущ|последн|закончил|остановил|говорил|обсуждал|до этого|last|previous|earlier|left off|leave off|before|anterior|pasad|quedamos|terminamos|hablamos)/iu.test(s);
}
export function projectPrivateCoachRecall(reviewed,draft){
 const r=reviewed?.provenance==='client_reviewed_dialogue'&&date(reviewed.savedAt||reviewed.completedAt)?reviewed:null;
 const d=draft?.protocol?.provenance==='client_autosaved_unreviewed_draft'&&date(draft.updatedAt)?draft:null;
 const quote=d&&Array.isArray(d.protocol.turns)?[...d.protocol.turns].reverse().find(t=>t?.role==='user'&&t.interim!==true&&t.interrupted!==true&&typeof t.content==='string'&&t.content.trim().length>=10&&!/(?:password|парол|contraseña|bearer\s|private key|sk-or-v1-|github_pat_)/iu.test(t.content)):null;
 if(d&&(!r||Date.parse(d.updatedAt)>Date.parse(r.savedAt||r.completedAt)))return {kind:'draft',date:d.updatedAt.slice(0,10),lastWords:clip(quote?.content,240)};
 if(r)return {kind:'reviewed',date:(r.completedAt||r.savedAt).slice(0,10),topic:clip(r.goal,120),conclusions:clip(r.clientSummary,300),nextStep:clip(r.clientNextStep,160)};
 if(d)return {kind:'draft',date:d.updatedAt.slice(0,10),lastWords:''};
 return {kind:'none'};
}
export function privateCoachRecallText(result,locale='en'){
 const c=({
 ru:{reviewed:'Нашёл сохранённый протокол от ',topic:'Тема: ',conclusions:'Ваш подтверждённый итог: ',nextStep:'Следующий шаг: ',draft:'Нашёл незавершённую запись от ',words:'Ваши последние записанные слова: ',unreviewed:'Итог ещё не подтверждён.',empty:'В протоколе пока нет подтверждённого итога.',none:'В доступном архиве нет предыдущего протокола. Не буду придумывать его.',unavailable:'Не удалось проверить сохранённую память. Это не значит, что прошлой сессии не было.',guest:'Чтобы проверить ваш приватный архив, войдите в кабинет.'},
 en:{reviewed:'I found your saved protocol from ',topic:'Topic: ',conclusions:'Your reviewed conclusion: ',nextStep:'Next step: ',draft:'I found an unfinished record from ',words:'Your last recorded words: ',unreviewed:'The conclusion has not been reviewed.',empty:'The saved protocol has no reviewed conclusion yet.',none:'No previous protocol was found in the available archive. I will not invent one.',unavailable:'I could not check saved memory. That does not mean there was no previous session.',guest:'Sign in to check your private archive.'},
 es:{reviewed:'Encontré tu protocolo guardado del ',topic:'Tema: ',conclusions:'Tu conclusión revisada: ',nextStep:'Siguiente paso: ',draft:'Encontré un registro sin terminar del ',words:'Tus últimas palabras registradas: ',unreviewed:'La conclusión aún no está revisada.',empty:'El protocolo aún no contiene una conclusión revisada.',none:'No encontré un protocolo anterior en el archivo disponible. No lo inventaré.',unavailable:'No pude consultar la memoria guardada. Eso no significa que no hubiera una sesión anterior.',guest:'Inicia sesión para consultar tu archivo privado.'}
 })[locale]||({none:'No previous protocol found.',unavailable:'Saved memory unavailable.',guest:'Sign in to check your archive.'});
 if(result?.kind==='reviewed')return [c.reviewed+result.date+'.',result.topic?c.topic+result.topic:'',result.conclusions?c.conclusions+result.conclusions:c.empty,result.nextStep?c.nextStep+result.nextStep:''].filter(Boolean).join(' ');
 if(result?.kind==='draft')return [c.draft+result.date+'.',result.lastWords?c.words+'«'+result.lastWords+'»':'',c.unreviewed].filter(Boolean).join(' ');
 return c[result?.kind]||c.unavailable;
}
