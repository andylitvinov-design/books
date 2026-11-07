'use strict';
/* In a read-only historical archive, a green run on the previous HEAD is not
 * current merge eligibility; a failed job isn't proof of the underlying cause.
 * Use only data already fetched by /api/pr-attribution.
 */
const SHA=/^[0-9a-f]{40}$/i;
const clock=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))?Date.parse(t):null;
function summarizeHeadStatus({pr,chronology=[],runs=[],historyPartial=false,live=null}){
 const head=SHA.test(pr?.head?.sha||'')?pr.head.sha.toLowerCase():null;
 if(!head)return {green_exact_head:false,green_at:null,green_url:null,
   stop_reason:'Текущий HEAD не подтверждён; причина остановки не определена.'};
 const events=(Array.isArray(chronology)?chronology:[]).filter(e=>
   typeof e?.kind==='string'&&clock(e.at)!==null&&e.head===head).sort((a,b)=>clock(a.at)-clock(b.at));
 const green=[...events].reverse().find(x=>x.kind==='ci_green')||null;
 const failed=[...events].reverse().find(x=>x.kind==='ci_failed')||null;
 const activeRun=(Array.isArray(runs)?runs:[]).filter(r=>
   r?.pull_requests?.[0]?.head?.sha?.toLowerCase?.()===head &&
   ['queued','pending','waiting','requested','in_progress'].includes(r.status) &&
   clock(r.created_at)!==null&&(!green||clock(r.created_at)>=clock(green.at)));
 const newerAttempt=green&&events.some(e=>clock(e.at)>clock(green.at)&&
   ['ci_failed','ci_queued','repeat_ci_queued'].includes(e.kind));
 const greenExact=!!green&&!historyPartial&&!newerAttempt&&activeRun.length===0;
 const currentFailure=failed&&(!green||clock(failed.at)>clock(green.at));
 const allEvents=(Array.isArray(chronology)?chronology:[]).filter(e=>
   ['conflict_labeled','conflict_unlabeled'].includes(e?.kind)&&clock(e.at)!==null)
   .sort((a,b)=>clock(a.at)-clock(b.at));
 const unresolvedConflict=allEvents.length&&allEvents.at(-1).kind==='conflict_labeled';
 const merged=!!pr?.merged_at;
 let stop;
 if(merged){stop=live?'LIVE подтверждён независимой квитанцией.':'После Merge нет подтверждённой квитанции LIVE и функционального smoke.';}
 else if(unresolvedConflict){stop='Есть метка конфликта без подтверждённого снятия; актуальный merge-tree необходимо проверить.';}
 else if(activeRun.length){stop='GitHub Core CI на текущем HEAD ещё ожидает или выполняет jobs.';}
 else if(currentFailure){stop='На текущем HEAD обнаружена ошибка CI: '+String(failed.reason||'job failed').slice(0,130);}
 else if(greenExact){stop='На текущем HEAD Green подтверждён; причина ожидания Merge (review, lease или gate) не подтверждена.';}
 else if(historyPartial){stop='История Core CI неполная; установить причину остановки нельзя.';}
 else{stop='Причина остановки не подтверждена: нет достаточных событий текущего HEAD.';}
 return {green_exact_head:greenExact,green_at:greenExact?green.at:null,
   green_url:greenExact?green.url||null:null,stop_reason:stop};
}
module.exports={summarizeHeadStatus};
