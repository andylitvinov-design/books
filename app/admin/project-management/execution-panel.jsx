'use client';
import {useState} from 'react';
import styles from './project-management.module.css';

const labels={
 ru:{heading:'Исполнение',choosePR:'Связанный PR',executor:'AI-исполнитель',
  auto:'Auto Free Repair',work:'ChatGPT Work · передача задания',codex:'Codex Host · не подключён',
  prepare:'Проверить возможность запуска',handoff:'Подготовить задание ChatGPT',
  launch:'Запустить исправление',retry:'Повторить при новой ошибке',
  cancel:'Остановить будущие попытки',status:'Проверить выполнение',copy:'Копировать задание',
  open:'Открыть ChatGPT Work',confirm:'Подтверждаю запуск реального GitHub Actions для указанного PR и HEAD. Продолжить?',
  caution:'Только после проверки владельца, текущего HEAD и подписанной резервации. Без платных моделей.',
  missing:'Для запуска нужен связанный PR.',noModel:'Запуск Codex Host запрещён до OAuth, разрешённого runtime и успешного inference.',
  unconfirmed:'Доказательство ещё не получено',accepted:'Запрос принят; это не коммит и не LIVE',
  failed:'Блокировка',at:'Наблюдение',head:'Исходный HEAD',error:'Последняя проверенная ошибка',
  openPR:'Открыть PR',run:'GitHub Actions',none:'Не запускалось',stages:'Доказательства',
  attribution:'Изменения HEAD не приписываются этому агенту без подтверждённого коммита',
  copyFail:'Не удалось скопировать',idle:'Проверяется по нажатию; фонового запуска нет.'},
 en:{heading:'Execution',choosePR:'Linked PR',executor:'AI executor',
  auto:'Auto Free Repair',work:'ChatGPT Work · task handoff',codex:'Codex Host · not connected',
  prepare:'Check execution readiness',handoff:'Prepare ChatGPT task',
  launch:'Start real repair',retry:'Retry with new verified failure',
  cancel:'Stop future attempts',status:'Check execution status',copy:'Copy task',
  open:'Open ChatGPT Work',confirm:'I approve running real GitHub Actions for this exact PR and HEAD. Continue?',
  caution:'Requires owner verification, current HEAD and signed reservation. No paid models.',
  missing:'Link a PR first.',noModel:'Codex Host is blocked pending OAuth, authorized runtime and proven inference.',
  unconfirmed:'Evidence not available yet',accepted:'Dispatch accepted; not a commit or LIVE',
  failed:'Blocked',at:'Observed',head:'Starting HEAD',error:'Last verified failure',
  openPR:'View PR',run:'GitHub Actions',none:'Not launched',stages:'Evidence',
  attribution:'Do not attribute an unrelated HEAD change to this agent without commit proof',
  copyFail:'Could not copy',idle:'Status is requested on demand, not launched in background.'},
 es:{heading:'Ejecución',choosePR:'PR vinculado',executor:'Agente IA',
  auto:'Auto Free Repair',work:'ChatGPT Work · entregar tarea',codex:'Codex Host · no conectado',
  prepare:'Verificar disponibilidad',handoff:'Preparar tarea ChatGPT',
  launch:'Iniciar corrección real',retry:'Reintentar con error nuevo',
  cancel:'Detener intentos futuros',status:'Comprobar estado',copy:'Copiar tarea',
  open:'Abrir ChatGPT Work',confirm:'Autorizo ejecutar GitHub Actions para este PR y HEAD. ¿Continuar?',
  caution:'Solo con validación del propietario, HEAD actual y reserva firmada. Sin modelos de pago.',
  missing:'Primero vincula un PR.',noModel:'Codex Host bloqueado hasta OAuth, runtime autorizado e inferencia verificada.',
  unconfirmed:'Todavía no hay pruebas',accepted:'Envío aceptado; no equivale a commit ni LIVE',
  failed:'Bloqueado',at:'Consultado',head:'HEAD inicial',error:'Último error comprobado',
  openPR:'Abrir PR',run:'GitHub Actions',none:'Sin ejecutar',stages:'Evidencia',
  attribution:'Un cambio de HEAD no prueba que este agente haya generado un commit',
  copyFail:'No se pudo copiar',idle:'Consulta manual del estado; no se lanza nada en segundo plano.'}
};
function githubPR(number){return 'https://github.com/andylitvinov-design/books/pull/'+number;}
const short=value=>value?String(value).slice(0,12):'—';

export default function ExecutionPanel({task,linkedPRs=[],initialExecutions=[],lang='ru'}){
 const t=labels[lang]||labels.ru;
 const [pr,setPr]=useState(String(linkedPRs[0]?.pr_number||''));
 const [executor,setExecutor]=useState('auto_free_repair');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [prepared,setPrepared]=useState(initialExecutions[0]||null);
 const [result,setResult]=useState(null);
 const [observed,setObserved]=useState(null);
 const [handoff,setHandoff]=useState('');
 const run=async(action,details={})=>{
  if(busy)return null;
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/admin/project-management',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,requestId:crypto.randomUUID(),taskId:task.id,...details})
   });
   const body=await response.json();
   if(!response.ok||body?.error)throw Error(body.error||'HTTP '+response.status);
   if(action==='prepare_execution'||action==='retry_execution'){
    if(body.status==='prepared'){setPrepared(body.execution);setResult(body.candidate);}
    else setMessage(body.reason||body.status);
   }else if(action==='prepare_chatgpt_handoff')setHandoff(body.text||'');
   else if(action==='launch_execution'){setObserved(null);setResult(body);setMessage(t.accepted);}
   else if(action==='execution_status')setObserved(body);
   else if(action==='cancel_future_attempts')setMessage(body.status);
   return body;
  }catch(error){setMessage(t.failed+' · '+String(error?.message||error).slice(0,180));return null;}
  finally{setBusy(false);}
 };
 const selected=Number(pr);
 const prepare=()=>{
  setPrepared(null);setObserved(null);setHandoff('');
  if(executor==='chatgpt_work')return run('prepare_chatgpt_handoff',{prNumber:selected});
  if(executor==='codex_host'){setMessage(t.noModel);return;}
  return run('prepare_execution',{prNumber:selected,executor});
 };
 const launch=()=>{
  if(!prepared?.id||!window.confirm(t.confirm))return;
  return run('launch_execution',{executionId:prepared.id,confirmed:true});
 };
 const showStatus=()=>prepared?.id&&run('execution_status',{executionId:prepared.id});
 const retry=()=>{
  if(!prepared?.id||!window.confirm(t.confirm))return;
  return run('retry_execution',{prNumber:selected,executor:'auto_free_repair',
   previousExecutionId:prepared.id});
 };
 const evidence=observed?.events||[];
 const workflow=result?.dispatch?.workflowRunUrl||observed?.execution?.workflow_run_url;
 const errorLink=result?.failure?.runUrl||result?.candidate?.failure?.runUrl;
 return <section className={styles.executionPanel} aria-label={t.heading}>
  <h4>{t.heading}</h4>
  <p className={styles.execIntro}>{t.caution}</p>
  {!linkedPRs.length?<p className={styles.muted}>{t.missing}</p>:<>
   {initialExecutions.length>0&&<div className={styles.executionEvidence}>
     <strong>{t.stages}</strong>
     {initialExecutions.slice(0,5).map(e=><p key={e.id}>
       <button type="button" className={styles.secondary} disabled={busy}
        onClick={()=>{setPrepared(e);setPr(String(e.pr_number));setObserved(null);}}>
        PR #{e.pr_number} · {e.state} · {short(e.expected_sha)}
       </button>
       {e.workflow_run_url&&<> · <a href={e.workflow_run_url} target="_blank"
        rel="noopener noreferrer">{t.run} #{e.workflow_run_id}</a></>}
       {e.blocker_code&&<> · {e.blocker_code}</>}
     </p>)}
    </div>}
   <div className={styles.executionControls}>
    <label>{t.choosePR}
     <select value={pr} onChange={e=>{
       setPr(e.target.value);setPrepared(null);setObserved(null);setResult(null);setHandoff('');
     }}>
      {linkedPRs.map(link=><option key={link.pr_number} value={link.pr_number}>#{link.pr_number}</option>)}
     </select>
    </label>
    <label>{t.executor}
     <select value={executor} onChange={e=>{
       setExecutor(e.target.value);setPrepared(null);setObserved(null);setHandoff('');
     }}>
      <option value="auto_free_repair">{t.auto}</option>
      <option value="chatgpt_work">{t.work}</option>
      <option value="codex_host">{t.codex}</option>
     </select>
    </label>
   </div>
   <a className={styles.execLink} href={githubPR(selected)} target="_blank" rel="noopener noreferrer">{t.openPR} #{selected}</a>
   <div className={styles.executionActions}>
    <button type="button" disabled={busy} onClick={prepare}>
      {executor==='chatgpt_work'?t.handoff:t.prepare}
    </button>
    {prepared?.state==='PREPARED'&&executor==='auto_free_repair'&&
     <button type="button" disabled={busy} onClick={launch}>{t.launch}</button>}
    {prepared?.id&&<>
     <button type="button" className={styles.secondary} disabled={busy} onClick={showStatus}>{t.status}</button>
     <button type="button" className={styles.secondary} disabled={busy}
      onClick={()=>run('cancel_future_attempts',{executionId:prepared.id})}>{t.cancel}</button>
     {(observed?.execution?.state==='BLOCKED'||observed?.execution?.state==='CANCELLED')&&
      <button type="button" className={styles.secondary} disabled={busy} onClick={retry}>{t.retry}</button>}
    </>}
   </div>
   {prepared?.expected_sha&&<p className={styles.execDetail}>{t.head}: <code>{short(prepared.expected_sha)}</code></p>}
   {(result?.failure||result?.candidate?.failure)&&
    <p className={styles.execDetail}>{t.error}: {result.failure?.conclusion||result.candidate?.failure?.conclusion}
      {' · '}<a href={errorLink} target="_blank" rel="noopener noreferrer">{t.run}</a></p>}
   {workflow&&<p className={styles.execDetail}><a href={workflow} target="_blank" rel="noopener noreferrer">{t.run} #{observed?.execution?.workflow_run_id||result?.dispatch?.workflowRunId||'—'}</a></p>}
   {observed&&<div className={styles.executionEvidence}>
     <strong>{t.stages}: {observed.verifiedStage||t.unconfirmed}</strong>
     {evidence.map((ev,index)=><p key={index}>
       {ev.stage} · {ev.observed_at?new Date(ev.observed_at).toLocaleString(lang):'—'}
       {ev.evidence?.workflowRunUrl&&<> · <a href={ev.evidence.workflowRunUrl} target="_blank" rel="noopener noreferrer">{t.run}</a></>}
     </p>)}
     <p>{t.at}: {observed.watchdog?.workflowState||t.unconfirmed}
      {' · '}CI: {observed.deliveryProof?.ci||'unknown'}
      {' · '}Merge: {short(observed.deliveryProof?.mergedSha)}
      {' · '}LIVE: {observed.liveVerified?'yes':t.unconfirmed}</p>
     <small>{t.attribution}</small>
    </div>}
   {handoff&&<div className={styles.executionEvidence}>
     <textarea value={handoff} readOnly aria-label={t.handoff} rows={9}/>
     <div className={styles.executionActions}>
      <button type="button" onClick={()=>navigator.clipboard.writeText(handoff)
       .then(()=>setMessage(t.copy)).catch(()=>setMessage(t.copyFail))}>{t.copy}</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">{t.open}</a>
     </div>
    </div>}
   <p aria-live="polite" className={styles.execDetail}>{message||t.idle}</p>
  </>}
 </section>;
}
