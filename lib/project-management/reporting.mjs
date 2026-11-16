const list=x=>Array.isArray(x)?x:[];
export function statusOf(s){return ['completed_verified','completed_live'].includes(s)?'verified':String(s||'').startsWith('blocked_')?'blocked':['awaiting_evidence','running','ready','retry_wait'].includes(s)?'partial':'planned'}
export function taskTotals(tasks){const o={total:0,verified:0,partial:0,planned:0,blocked:0,withPR:0,inspected:0,percent:null},ids=new Set();for(const t of list(tasks)){if(!t?.id||ids.has(t.id))continue;ids.add(t.id);o.total++;o[statusOf(t.state)]++;if(list(t.links).length)o.withPR++;if(t.proof?.observedAt)o.inspected++}o.percent=o.total?Math.round(o.verified/o.total*100):null;return o}
export function projectReports(snapshot,proofs={}){
 const projects=list(snapshot?.projects),epics=list(snapshot?.epics),tasks=list(snapshot?.tasks),links=list(snapshot?.prLinks);
 const result=projects.map(p=>{const stages=epics.filter(e=>e.project_id===p.id).map(e=>{const subs=tasks.filter(t=>t.epic_id===e.id).map(t=>({...t,links:links.filter(x=>x.task_id===t.id),proof:proofs[t.id]||null}));return {...e,subs,totals:taskTotals(subs)}});return {...p,stages,totals:taskTotals(stages.flatMap(e=>e.subs))}});
 return {projects:result,totals:taskTotals(result.flatMap(p=>p.stages.flatMap(e=>e.subs))),observedAt:snapshot?.observedAt||null,complete:snapshot?.coverage?.complete===true}
}
const langMap={
 ru:{verified:'Проверено',partial:'Частично',planned:'Не начато',blocked:'Блокировано',withPR:'С PR',inspected:'PR проверены',stage:'Этап',task:'Подзадача',accept:'Критерий',facts:'Факт/остаток',updated:'Обновлено',noPR:'PR не привязан',unknown:'GitHub не проверен'},
 en:{verified:'Verified',partial:'Partial',planned:'Not started',blocked:'Blocked',withPR:'With PR',inspected:'PR inspected',stage:'Stage',task:'Subtask',accept:'Acceptance',facts:'Current facts',updated:'Updated',noPR:'No linked PR',unknown:'GitHub not inspected'},
 es:{verified:'Verificado',partial:'Parcial',planned:'No iniciado',blocked:'Bloqueado',withPR:'Con PR',inspected:'PR revisadas',stage:'Etapa',task:'Subtarea',accept:'Criterio',facts:'Estado actual',updated:'Actualizado',noPR:'Sin PR',unknown:'GitHub sin revisar'}
};
export const reportWords=lang=>langMap[lang]||langMap.ru;
export function textReport(p,{lang='ru',observedAt=null,complete=false,epicId=null,taskId=null}={}){
 const w=reportWords(lang),stages=list(p.stages).filter(e=>!epicId||e.id===epicId);
 const used=stages.map(e=>({...e,subs:list(e.subs).filter(t=>!taskId||t.id===taskId)})),sum=taskTotals(used.flatMap(e=>e.subs));
 const out=[p.title,`Snapshot: ${observedAt||'UNKNOWN'}; coverage: ${complete?'COMPLETE':'PARTIAL'}`,`Tasks ${sum.total}: ${w.verified} ${sum.verified}, ${w.partial} ${sum.partial}, ${w.planned} ${sum.planned}, ${w.blocked} ${sum.blocked}, PR ${sum.withPR} / inspected ${sum.inspected}`,''];
 for(const e of used){out.push(`${w.stage}: ${e.title}`);for(const t of e.subs){
  out.push(`${w.task}: ${t.title} [${w[statusOf(t.state)]}]`,`${w.accept}: ${t.acceptance||'UNKNOWN'}`,`${w.facts}: ${t.description||'UNKNOWN'}`,`${w.updated}: ${t.updated_at||'UNKNOWN'}`);
  if(t.links.length)for(const link of t.links)out.push(`PR #${link.pr_number}: https://github.com/andylitvinov-design/books/pull/${link.pr_number}`);else out.push(w.noPR);
  const q=t.proof;out.push(q?`PR ${q.prState||'UNKNOWN'}; CI ${q.ci||'UNKNOWN'}; HEAD ${q.headSha||'UNKNOWN'}; merge ${q.mergedSha||'UNKNOWN'}; served ${q.codeOnProduction===true?'YES':'UNVERIFIED'}; LIVE ${q.codeOnProduction===true&&q.functionalAccepted===true?'VERIFIED':'UNVERIFIED'}; observed ${q.observedAt||'UNKNOWN'}`:w.unknown,'');
 }}
 return out.join('\n').trim()+'\n'
}
