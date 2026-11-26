// Pure domain rules; SQL transactions provide the owner lock and server clock.
export const CLARITY_ACTIVE_MS=1200000
export const CLARITY_CLOCK_LEASE_MS=15000
export const CLARITY_MAX_TICK_MS=6500
const publicCoaches=new Set(['mira','max','sofia','alex','merlin','harry','genie','caesar'])
export const validClarityCoach=id=>publicCoaches.has(id)
export const clarityNextDay=rows=>[1,2,3].find(day=>!rows.some(r=>Number(r.course_day)===day&&Number(r.active_ms)===CLARITY_ACTIVE_MS&&r.reviewed_at!=null))??null
export const clarityReviewPending=row=>Number(row?.active_ms)===CLARITY_ACTIVE_MS&&row?.reviewed_at==null
export function clarityClockAdvance(row,now,active){
 const elapsed=Number(row.active_ms)
 const before=row.clock_at==null?null:new Date(row.clock_at).getTime()
 if(!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>CLARITY_ACTIVE_MS||!Number.isFinite(now)||typeof active!=='boolean')throw Error('CLARITY_CLOCK_INVALID')
 const delta=before===null?0:now-before
 // Count only consecutive fresh, connected observations. Never credit a lost
 // connection, stale tab, hidden page, or time before the first active beat.
 const credit=active&&delta>=0&&delta<=CLARITY_MAX_TICK_MS?delta:0
 const activeMs=Math.min(CLARITY_ACTIVE_MS,elapsed+Math.floor(credit))
 return {activeMs,clockAt:active&&activeMs<CLARITY_ACTIVE_MS?new Date(now).toISOString():null,complete:activeMs===CLARITY_ACTIVE_MS}
}
export function clarityTurnAttribution(item){
 if(item.coachId===undefined&&item.visitId===undefined)return {}
 if(!validClarityCoach(item.coachId)||typeof item.visitId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.visitId))throw Error('MY_COACH_PROTOCOL_INVALID')
 return {coachId:item.coachId,visitId:item.visitId}
}
export function clarityReviewExtends(before,after){
 const old=before?.events||[],next=after?.events||[]
 return old.length<=next.length&&old.every((event,i)=>JSON.stringify(event)===JSON.stringify(next[i]))
}
export function clarityRecap(rows,locale,seconds){
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 const confirmed=rows.filter(r=>r.status==='confirmed'&&r.quote)
 const pending=rows.filter(r=>r.status==='needs_confirmation'||r.status==='not_explored')
 const copy={ru:{intro:'Ранее мы подтвердили:',none:'Подтверждённых ответов пока нет.',pending:'Осталось уточнить:',time:'Осталось секунд:',ask:'Продолжим коучинговую сессию?'},en:{intro:'Previously confirmed:',none:'No confirmed answers yet.',pending:'Still to clarify:',time:'Seconds remaining:',ask:'Shall we continue the coaching session?'},es:{intro:'Confirmado anteriormente:',none:'Todavía no hay respuestas confirmadas.',pending:'Falta aclarar:',time:'Segundos restantes:',ask:'¿Continuamos la sesión de coaching?'}}[lang]
 return [confirmed.length?copy.intro+' '+confirmed.map(r=>r.label+': '+r.quote).join('; '):copy.none,pending.length?copy.pending+' '+pending.map(r=>r.label).join('; '):'',copy.time+' '+Math.max(0,1200-Math.floor(seconds)) + '.',copy.ask].filter(Boolean).join(' ')
}

export const clarityConsentQuestion=locale=>({ru:'Вы готовы начать или продолжить коучинговую сессию?',en:'Are you ready to start or continue the coaching session?',es:'¿Estás listo para empezar o continuar la sesión de coaching?'})[locale]||'Are you ready to start or continue the coaching session?'
const normalizeConsent=text=>String(text||'').normalize('NFKC').toLocaleLowerCase().replace(/[«»“”‘’"'¿¡.!?,:;]+/gu,' ').replace(/\s+/gu,' ').trim()
export const clarityHeardInvitation=(text,locale)=>normalizeConsent(text).endsWith(normalizeConsent(clarityConsentQuestion(locale)))
export const clarityExplicitAssent=(text,locale)=>({ru:['да','да готов','да готова','да давайте','да продолжим','да начнем','да начнём','готов','готова','согласен','согласна'],en:['yes','yes i am','yes ready','yes let s continue','yes let s start','i am ready','i agree'],es:['sí','si','sí estoy listo','sí estoy lista','sí continuemos','sí empecemos','estoy listo','estoy lista','acepto']})[locale]?.includes(normalizeConsent(text))===true
