'use client';
import {useState} from 'react';
import {CC_MAX_SELECTED,isReadyForSafeAudit,prepareCommandHandoff} from '@/lib/command-center/batch-selection.mjs';
import styles from './command-center-mobile.module.css';
const copy={
 ru:{choose:'Выберите до 3 задач',selected:'Выбрано',executor:'Исполнитель',reader:'GitHub Reader · настоящая проверка, без изменения кода',manual:'ChatGPT Work · подготовить задание вручную',notConnected:'не подключён',run:'Запустить выбранные проверки',prepare:'Подготовить и скопировать задания',notReady:'Для GitHub Reader нужны готовые PR/Issue проверки. Исправление кода он не запускает.',manualNote:'Задание подготовлено для ручной передачи, не отправлено агенту.',unsupported:'Выбранный исполнитель не подключён',repair:'Auto Free Repair · только утверждённые PR с проваленной CI',repairInfo:'Автоисправление запускается только из Project Management: нужен утверждённый план, PR с подтверждённой ошибкой CI и разрешённый GitHub Actions токен.',openPm:'Открыть Project Management',results:'Подтверждённый ответ сервера',unknown:'Нет подтверждения',error:'Сбой выполнения',empty:'Нет задач для выбора'},
 en:{choose:'Select up to 3 tasks',selected:'Selected',executor:'Executor',reader:'GitHub Reader · real read-only audit',manual:'ChatGPT Work · prepare manual handoff',notConnected:'not connected',run:'Run selected audits',prepare:'Prepare and copy tasks',notReady:'GitHub Reader requires ready PR/Issue audits; it cannot edit code.',manualNote:'Handoff prepared locally, not sent to an agent.',unsupported:'Selected executor is not connected',repair:'Auto Free Repair · approved PR with failed CI only',repairInfo:'Automatic repairs use Project Management only: an approved plan, an exact-head failed CI PR and an authorized GitHub Actions token are required.',openPm:'Open Project Management',results:'Confirmed server response',unknown:'No verified result',error:'Execution failed',empty:'No tasks to select'},
 es:{choose:'Selecciona hasta 3 tareas',selected:'Seleccionadas',executor:'Ejecutor',reader:'GitHub Reader · auditoría real de solo lectura',manual:'ChatGPT Work · preparar entrega manual',notConnected:'no conectado',run:'Ejecutar verificaciones elegidas',prepare:'Preparar y copiar tareas',notReady:'GitHub Reader solo ejecuta auditorías PR/Issue listas, no modifica código.',manualNote:'Entrega preparada localmente, no enviada a un agente.',unsupported:'El ejecutor seleccionado no está conectado',repair:'Auto Free Repair · PR aprobado con CI fallida',repairInfo:'La reparación requiere Project Management, un plan aprobado, CI fallida confirmada y token autorizado de GitHub Actions.',openPm:'Abrir Project Management',results:'Respuesta verificada del servidor',unknown:'Sin resultado confirmado',error:'Error de ejecución',empty:'No hay tareas'}
};
export default function CommandCenterBatch({lang='ru',tasks=[],projects=[],available=false,enabled=false,busy=false,onRun,onOpen}){
 const t=copy[lang]||copy.ru;
 const [selectedIds,setSelectedIds]=useState([]);
 const [executor,setExecutor]=useState('github-public-reader');
 const [handoff,setHandoff]=useState('');
 const [result,setResult]=useState(null);
 const selected=tasks.filter(task=>selectedIds.includes(task.id));
 const allSafe=selected.length>0&&selected.every(isReadyForSafeAudit);
 const toggle=id=>{setResult(null);setHandoff('');setSelectedIds(prev=>
   prev.includes(id)?prev.filter(v=>v!==id):prev.length<CC_MAX_SELECTED?[...prev,id]:prev);};
 const launch=async()=>{
   if(busy||!enabled||!available||!allSafe)return;
   setResult(null);setHandoff('');
   try{
     const response=await onRun(selected.map(task=>task.id));
     if(response?.status==='batch_observed'&&Array.isArray(response.results))
       setResult(response.results);
   }catch{setResult([{status:'unconfirmed'}]);}
 };
 const prepare=async()=>{
   const text=prepareCommandHandoff(selected,{locale:lang});
   if(!text)return;
   setHandoff(text);setResult(null);
   try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);}
   catch{/* Textarea remains available to copy deliberately. */}
 };
 return <div className={styles.batchArea}>
   <p className={styles.batchHint}>{t.choose} · {t.selected}: {selected.length}/{CC_MAX_SELECTED}</p>
   {tasks.map((task,i)=>{
    const checked=selectedIds.includes(task.id);
    return <div className={styles.batchRow} key={task.id}>
     <label className={styles.batchCheck}>
      <input type="checkbox" checked={checked} onChange={()=>toggle(task.id)}
       disabled={!checked&&selectedIds.length>=CC_MAX_SELECTED}
       aria-label={t.selected+': '+task.title}/>
     </label>
     <button type="button" className={styles.taskCard} onClick={()=>onOpen(task.id)}>
      <span className={styles.rank}>{i+1}</span>
      <span className={styles.taskCopy}><strong>{task.title}</strong>
       <small>{projects.find(p=>p.id===task.project_id)?.title||'—'} · {task.state} · {task.attempt_count||0}×</small></span>
      <span className={task.state==='completed_live'||(task.state==='completed_verified'&&task.has_evidence===true)?styles.good:styles.purple} aria-hidden="true">●</span>
     </button>
    </div>;
   })}
   {!tasks.length&&<p className={styles.muted}>{t.empty}</p>}
   {!!selected.length&&<section className={styles.batchExec}>
    <label htmlFor="cc-batch-executor">{t.executor}</label>
    <select id="cc-batch-executor" value={executor} onChange={event=>{setExecutor(event.target.value);setHandoff('');setResult(null);}}>
     <option value="github-public-reader">{t.reader}</option>
     <option value="chatgpt-work">{t.manual}</option>
     <option value="auto-free-repair">{t.repair}</option>
     <option value="codex-cli" disabled>Codex CLI · {t.notConnected}</option>
     <option value="hermes" disabled>Hermes · {t.notConnected}</option>
     <option value="openclaw" disabled>OpenClaw · {t.notConnected}</option>
    </select>
    {executor==='github-public-reader'?<>
     {!allSafe&&<p className={styles.muted}>{t.notReady}</p>}
     <button type="button" className={styles.primary} disabled={!allSafe||!enabled||!available||busy}
      onClick={launch}>{t.run}</button>
    </>:executor==='chatgpt-work'?<>
     <button type="button" className={styles.primary} disabled={busy} onClick={prepare}>{t.prepare}</button>
     {handoff&&<><p className={styles.muted}>{t.manualNote}</p>
      <textarea className={styles.batchHandoff} readOnly rows={9} value={handoff} aria-label={t.manual}/>
      <a className={styles.github} href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT Work ↗</a></>}
    </>:executor==='auto-free-repair'?<>
      <p className={styles.muted}>{t.repairInfo}</p>
      <a className={styles.github} href="/admin/project-management">{t.openPm} ↗</a>
    </>:<p className={styles.muted}>{t.unsupported}</p>}
    {result&&<div className={styles.batchReceipt} role="status"><strong>{t.results}</strong>
     {result.map((item,i)=><p key={item.taskId||i}>
      {i+1}. {item.status||t.unknown} {item.runId?' · '+item.runId:''}
     </p>)}
    </div>}
   </section>}
 </div>;
}
