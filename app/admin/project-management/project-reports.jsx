'use client';
import {useMemo,useState} from 'react';
import {deliveryLabel} from '@/lib/project-management/plans.mjs';
import {projectReports,reportWords,statusOf,textReport} from '@/lib/project-management/reporting.mjs';
import styles from './project-management.module.css';
const i18n={
 ru:{title:'Отчётность по проектам',hint:'Большая задача → этап → подзадача. Выполнение отдельно от PR, CI, Merge и LIVE.',projects:'Проекты',tasks:'Подзадачи',stages:'этапов',export:'Скачать отчёт',inspect:'Проверить PR',snapshot:'Срез',incomplete:'Неполный охват: суммы могут быть неточными',notLive:'Функция LIVE не подтверждена',prUnknown:'PR привязан, GitHub ещё не проверен',warning:'Наличие PR ≠ merge; Vercel READY ≠ функциональный LIVE',error:'Экспорт не удался'},
 en:{title:'Project reports',hint:'Major goal → stage → subtask. Completion and PR, CI, Merge, LIVE are separate.',projects:'Projects',tasks:'Subtasks',stages:'stages',export:'Download report',inspect:'Inspect PR',snapshot:'Snapshot',incomplete:'Partial coverage: totals may be incomplete',notLive:'Functional LIVE unverified',prUnknown:'PR linked, GitHub not inspected',warning:'Linked PR ≠ merge; Vercel READY ≠ functional LIVE',error:'Export failed'},
 es:{title:'Informes de proyectos',hint:'Objetivo → etapa → subtarea. Progreso separado de PR, CI, Merge y LIVE.',projects:'Proyectos',tasks:'Subtareas',stages:'etapas',export:'Descargar informe',inspect:'Revisar PR',snapshot:'Corte',incomplete:'Cobertura parcial: totales incompletos',notLive:'LIVE funcional sin verificar',prUnknown:'PR vinculada, GitHub sin revisar',warning:'PR vinculada ≠ merge; READY ≠ LIVE funcional',error:'Error al exportar'}
};
const time=value=>{if(!value)return '—';try{return new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(new Date(value))}catch{return '—'}};
function Metrics({totals,w}){return <div className={styles.pmRMetrics}>{['verified','partial','planned','blocked','withPR','inspected'].map(k=><span key={k}><b>{totals[k]}</b> {w[k]}</span>)}</div>}
export default function ProjectReports({lang='ru',snapshot,proofs={},busy=false,onInspect}){
 const t=i18n[lang]||i18n.ru,w=reportWords(lang),data=useMemo(()=>projectReports(snapshot,proofs),[snapshot,proofs]);
 const [expandedP,setExpandedP]=useState(null),[expandedE,setExpandedE]=useState(null),[error,setError]=useState('');
 const projects=data.projects.filter(p=>p.stages.length);
 const exportFile=(project,epicId=null,taskId=null)=>{try{
  const content=textReport(project,{lang,observedAt:data.observedAt,complete:data.complete,epicId,taskId});
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`hh-pm-${taskId||epicId||project.id}.txt`;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);setError('');
 }catch{setError(t.error)}};
 if(!snapshot)return null;
 return <section className={styles.pmReports} aria-labelledby="pm-r-title">
  <h2 id="pm-r-title">{t.title}</h2><p>{t.hint}</p><small>{t.snapshot}: {time(data.observedAt)}</small>
  {!data.complete&&<p role="status" className={styles.warning}>{t.incomplete}</p>}
  <div className={styles.pmRSummary}><div><b>{projects.length}</b>{t.projects}</div><div><b>{data.totals.total}</b>{t.tasks}</div><div><b>{data.totals.verified}/{data.totals.total}</b>{w.verified}</div></div>
  {projects.map((p,i)=>{
   const open=expandedP===p.id||(expandedP===null&&i===0);
   return <article className={styles.pmRProject} key={p.id}>
    <div className={styles.pmRHead}>
     <button type="button" className={styles.pmRToggle} aria-expanded={open} onClick={()=>{setExpandedP(open?'':p.id);setExpandedE(null)}}><span>{open?'−':'+'}</span><strong>{p.title}</strong></button>
     <button type="button" className={styles.secondary} onClick={()=>exportFile(p)}>{t.export}</button>
    </div>
    {p.summary&&<p>{p.summary}</p>}
    <div className={styles.pmRProgress}>{p.totals.verified}/{p.totals.total} {w.verified} · {p.stages.length} {t.stages}<progress className={styles.track} max={p.totals.total||1} value={p.totals.verified}/></div>
    <Metrics totals={p.totals} w={w}/>
    {open&&<div className={styles.pmRStages}>{p.stages.map(e=>{
     const eopen=expandedE===e.id;
     return <section key={e.id} className={styles.pmRStage}>
      <div className={styles.pmRHead}>
       <button type="button" className={styles.pmRToggle} aria-expanded={eopen} onClick={()=>setExpandedE(eopen?'':e.id)}><span>{eopen?'−':'+'}</span><strong>{e.title}</strong></button>
       <button type="button" className={styles.secondary} onClick={()=>exportFile(p,e.id)}>{t.export}</button>
      </div>
      <div className={styles.pmRProgress}>{e.totals.verified}/{e.totals.total} {w.verified}<progress className={styles.track} max={e.totals.total||1} value={e.totals.verified}/></div>
      <Metrics totals={e.totals} w={w}/>
      {eopen&&<div className={styles.pmRTasks}>{e.subs.map(task=>{
       const proof=task.proof;
       return <article key={task.id} className={styles.pmRTask}>
        <h4>{task.title}</h4><small className={styles.pmRState}>{w[statusOf(task.state)]}</small>
        <p><strong>{w.accept}:</strong> {task.acceptance||'UNKNOWN'}</p><p><strong>{w.facts}:</strong> {task.description||'UNKNOWN'}</p>
        <small>{w.updated}: {time(task.updated_at)}</small>
        <div className={styles.pmRActions}>
         {task.links.length?task.links.map(link=><a key={link.pr_number} href={`https://github.com/andylitvinov-design/books/pull/${link.pr_number}`} rel="noopener noreferrer" target="_blank">PR #{link.pr_number}</a>):<span>{w.noPR}</span>}
         {task.links.length>0&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>onInspect?.(task.id)}>{t.inspect}</button>}
         <button type="button" className={styles.secondary} onClick={()=>exportFile(p,e.id,task.id)}>{t.export}</button>
        </div>
        {proof?<div className={styles.pmRProof}>{time(proof.observedAt)} · HEAD {proof.headSha?.slice(0,9)||'—'} · {deliveryLabel(proof).label} · CI: {proof.ci||'UNKNOWN'} · merge: {proof.mergedSha?.slice(0,9)||'UNKNOWN'} · {proof.functionalAccepted===true&&proof.codeOnProduction===true?'LIVE VERIFIED':t.notLive}</div>:task.links.length>0&&<p className={styles.pmRNote}>{t.prUnknown}</p>}
       </article>
      })}</div>}
     </section>
    })}</div>}
   </article>
  })}
  <p className={styles.pmRNote}>{t.warning}</p>{error&&<p role="alert" className={styles.warning}>{error}</p>}
 </section>
}
