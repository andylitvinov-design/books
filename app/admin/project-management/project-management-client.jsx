'use client';
import Link from 'next/link';
import {useCallback,useState} from 'react';
import {deliveryLabel,projectProgress} from '@/lib/project-management/plans.mjs';
import ProjectReports from './project-reports';
import styles from './project-management.module.css';
const words={
 ru:{title:'Управление проектами',subtitle:'От большой задачи до проверенного результата',monitor:'PR Monitor',center:'Command Center',projects:'Проекты',new:'Новая большая задача',create:'Создать задачу',problem:'Какая проблема?',result:'Ожидаемый результат',priority:'Приоритет',name:'Название задачи',selectProject:'Выберите проект',noProjects:'Проектов пока нет. Сначала создайте проект в Command Center.',none:'Нет больших задач',noBackend:'Приватная база недоступна или миграция ещё не применена. Данные неизвестны.',choose:'Открыть',plans:'Варианты решения',propose:'Предложить 3 плана',engine:'Бесплатные шаблонные предложения, без вызова платного AI',approve:'Утвердить этот план',selected:'Выбранный план',steps:'Работы',noPR:'PR не привязан',link:'Привязать PR',inspect:'Проверить PR / CI / LIVE',next:'Следующий шаг',refresh:'Обновить',save:'Сохранить',cancel:'Отмена',loading:'Выполняется…',error:'Не удалось подтвердить действие',done:'Изменения сохранены',pr:'Ссылка на GitHub PR',confirmed:'Подтверждённые',unknown:'Пока не измерен',coverage:'Частичный охват',noLive:'LIVE не подтверждён: нужна независимая функциональная проверка',manual:'PR привязан владельцем, статус GitHub проверяется отдельно',needsEvidence:'Отмечено завершённым, но нет независимого подтверждения',watchdogOnly:'Watchdog — диспетчер, не AI-разработчик. Запуск кодового агента, commit и LIVE ещё не подтверждены',sourceProof:'Подписанное подтверждение исходного кода',sourceVerified:'Новый commit проверен по GitHub',sourceNotPublished:'Изменения исходного кода не опубликованы',runnerOnly:'Реальный runner подтверждён, исправление ещё не доказано',sourceUnconfirmed:'Независимого подтверждения пока нет'},
 en:{title:'Project Management',subtitle:'From strategic goal to verified delivery',monitor:'PR Monitor',center:'Command Center',projects:'Projects',new:'New major task',create:'Create epic',problem:'What is the problem?',result:'Expected outcome',priority:'Priority',name:'Epic title',selectProject:'Choose project',noProjects:'No projects yet. Create one in Command Center first.',none:'No epics yet',noBackend:'Private storage or migration unavailable. State unknown.',choose:'Open',plans:'Solution options',propose:'Suggest 3 plans',engine:'Free deterministic templates; no paid AI call',approve:'Approve this plan',selected:'Selected plan',steps:'Tasks',noPR:'No PR linked',link:'Link PR',inspect:'Inspect PR / CI / LIVE',next:'Next step',refresh:'Refresh',save:'Save',cancel:'Cancel',loading:'Working…',error:'Could not confirm action',done:'Saved',pr:'GitHub PR URL',confirmed:'Verified',unknown:'Not measured',coverage:'Partial coverage',noLive:'LIVE not verified; independent user-flow smoke required',manual:'PR linked by owner; GitHub status verified separately',needsEvidence:'Marked complete, but no independent verification receipt',watchdogOnly:'Watchdog is a dispatcher, not a coding agent. Coding, commit and LIVE are not verified',sourceProof:'Signed source evidence',sourceVerified:'New commit verified through GitHub',sourceNotPublished:'No source commit was published',runnerOnly:'GitHub runner confirmed; source fix not proven',sourceUnconfirmed:'Independent proof unavailable'},
 es:{title:'Gestión de proyectos',subtitle:'De la gran tarea a un resultado verificado',monitor:'PR Monitor',center:'Command Center',projects:'Proyectos',new:'Nueva tarea principal',create:'Crear',problem:'¿Qué problema?',result:'Resultado esperado',priority:'Prioridad',name:'Título',selectProject:'Elige proyecto',noProjects:'No hay proyectos. Crea uno en Command Center.',none:'No hay tareas principales',noBackend:'Base privada o migración no disponible. Estado desconocido.',choose:'Abrir',plans:'Opciones de solución',propose:'Proponer 3 planes',engine:'Plantillas gratis, sin llamada IA de pago',approve:'Aprobar plan',selected:'Plan elegido',steps:'Tareas',noPR:'PR sin asociar',link:'Vincular PR',inspect:'Verificar PR / CI / LIVE',next:'Siguiente paso',refresh:'Actualizar',save:'Guardar',cancel:'Cancelar',loading:'Procesando…',error:'No se confirmó la acción',done:'Guardado',pr:'URL de GitHub PR',confirmed:'Verificadas',unknown:'No medido',coverage:'Cobertura parcial',noLive:'LIVE no verificado; falta prueba funcional independiente',manual:'PR enlazado por propietario; el estado se verifica aparte',needsEvidence:'Marcada completa sin comprobante independiente',watchdogOnly:'Watchdog es un despachador, no un agente de código. Commit y LIVE sin verificar',sourceProof:'Prueba firmada de código',sourceVerified:'Nuevo commit verificado en GitHub',sourceNotPublished:'No se publicó ningún cambio de código',runnerOnly:'Runner verificado; arreglo no demostrado',sourceUnconfirmed:'Sin prueba independiente'}
};
const safeTime=value=>{try{return value?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';}catch{return '—';}};
export default function ProjectManagementClient({lang='ru',initialSnapshot=null}){
 const t=words[lang]||words.ru;
 const [snap,setSnap]=useState(initialSnapshot),[open,setOpen]=useState(null),[create,setCreate]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[proofs,setProofs]=useState({});
 const [execPrep,setExecPrep]=useState({}),[execStatus,setExecStatus]=useState({});
 const [executors,setExecutors]=useState({});
 const [draft,setDraft]=useState({projectId:'',title:'',problem:'',outcome:'',priority:'2'}),[prDraft,setPrDraft]=useState({});
 const refresh=useCallback(async()=>{
  const res=await fetch('/api/admin/project-management',{credentials:'same-origin',cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();if(data.schema!=='hh-project-management-v1')throw Error('INVALID_RESPONSE');
  setSnap(data);return data;
 },[]);
 const send=async(action,payload)=>{
  if(busy)return null;setBusy(true);setMessage('');
  try{
   const res=await fetch('/api/admin/project-management',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action,requestId:crypto.randomUUID(),...payload})});
   const data=await res.json();if(!res.ok||data?.error)throw Error(data?.error||'HTTP '+res.status);
   if(action==='inspect_pr')setProofs(prev=>({...prev,[payload.taskId]:data.proof}));
   else if(action==='prepare_execution'||action==='prepare_chatgpt_handoff')
    setExecPrep(prev=>({...prev,[payload.taskId]:data}));
   else if(action==='execution_status'||action==='launch_execution'||
           action==='retry_execution'||action==='cancel_future_attempts')
    setExecStatus(prev=>({...prev,[payload.taskId]:data}));
   else await refresh();
   setMessage(t.done);return data;
  }catch(e){setMessage(t.error+' · '+String(e.message||e).slice(0,85));return null;}
  finally{setBusy(false);}
 };
 const createEpic=async event=>{event.preventDefault();
  const result=await send('create_epic',{...draft,priority:Number(draft.priority)});
  if(result?.epicId){setOpen(result.epicId);setCreate(false);setDraft({...draft,title:'',problem:'',outcome:''});}
 };
 const epics=snap?.epics||[],tasks=snap?.tasks||[],opts=snap?.options||[],prs=snap?.prLinks||[];
 const linked=task=>prs.filter(x=>x.task_id===task.id);
 const launch=async(task,retry=false)=>{
  const prepared=execPrep[task.id];
  if(!prepared?.admission?.ok||!prepared?.headSha){
   setMessage(lang==='ru'?'Сначала проверьте исполнение':lang==='es'?'Primero verifica la ejecución':'Prepare execution first');
   return;
  }
  const ok=window.confirm(lang==='ru'?
   'Подтвердить реальный запуск GitHub Repair для PR #'+prepared.prNumber+
   ' на HEAD '+prepared.headSha.slice(0,12)+'? Возможны расходы существующей квоты GitHub Actions.':
   lang==='es'?'¿Confirmar ejecución real de GitHub Repair para PR #'+prepared.prNumber+'?':
   'Confirm real GitHub Repair execution for PR #'+prepared.prNumber+'?');
  if(!ok)return;
  await send(retry?'retry_execution':'launch_execution',{
   taskId:task.id,executor:'auto_free_repair',expectedSha:prepared.headSha,confirmed:true});
 };
 const prepareHandoff=async task=>{
  const result=await send('prepare_chatgpt_handoff',{taskId:task.id});
  if(result?.handoff&&navigator.clipboard?.writeText){
   try{await navigator.clipboard.writeText(result.handoff);}
   catch{/* Display handoff text as fallback. */}
  }
 };
 const statuses={};for(const task of tasks)statuses[task.id]=proofs[task.id]?deliveryLabel(proofs[task.id]):null;
 return <main className={styles.page} lang={lang}>
  <header className={styles.hero}>
   <div className={styles.brand}>HOLISTIC HOUSE <span>COMMAND CENTER</span></div>
   <nav className={styles.tabs} aria-label="Project Management navigation">
    <a href="https://holistic-house-pr-monitor.vercel.app/" className={styles.tab}>{t.monitor}</a>
    <span className={[styles.tab,styles.active].join(' ')} aria-current="page">Project Management</span>
   </nav>
   <h1>{t.title}</h1><p>{t.subtitle}</p>
   <div className={styles.meta}><Link href="/admin/command-center">{t.center}</Link>
    <span>{snap?.observedAt?safeTime(snap.observedAt):t.unknown}</span></div>
  </header>
  <section className={styles.content}>
   {!snap?<p className={styles.warning} role="status">{t.noBackend}</p>:<>
    <div className={styles.stats}>
     <div><strong>{epics.length}</strong><small>{t.projects} / Epic</small></div>
     <div><strong>{projectProgress(tasks).verified}</strong><small>{t.confirmed}</small></div>
     <div><strong>{tasks.length}</strong><small>{t.steps}</small></div>
    </div>
    {!snap.coverage?.complete&&<p className={styles.warning}>{t.coverage}</p>}
    <ProjectReports lang={lang} snapshot={snap} proofs={proofs} busy={busy} onInspect={taskId=>send('inspect_pr',{taskId})}/>
    <div className={styles.toolbar}>
     <h2>{t.projects}</h2><button type="button" disabled={busy||!snap.projects.length} onClick={()=>setCreate(v=>!v)}>{create?t.cancel:t.new}</button>
     <button type="button" className={styles.secondary} disabled={busy} onClick={()=>refresh().catch(()=>setMessage(t.error))}>{t.refresh}</button>
    </div>
    {!snap.projects.length&&<p className={styles.muted}>{t.noProjects} <Link href="/admin/command-center">{t.center}</Link></p>}
    {create&&<form className={styles.composer} onSubmit={createEpic}>
      <label>{t.selectProject}<select required value={draft.projectId} onChange={e=>setDraft(v=>({...v,projectId:e.target.value}))}>
       <option value="">—</option>{snap.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
      </select></label>
      <label>{t.name}<input required minLength={6} maxLength={120} value={draft.title} onChange={e=>setDraft(v=>({...v,title:e.target.value}))}/></label>
      <label>{t.problem}<textarea required minLength={12} maxLength={700} value={draft.problem} onChange={e=>setDraft(v=>({...v,problem:e.target.value}))}/></label>
      <label>{t.result}<textarea required minLength={12} maxLength={700} value={draft.outcome} onChange={e=>setDraft(v=>({...v,outcome:e.target.value}))}/></label>
      <label>{t.priority}<select value={draft.priority} onChange={e=>setDraft(v=>({...v,priority:e.target.value}))}>
       {[1,2,3,4,5].map(p=><option key={p} value={p}>P{p}</option>)}
      </select></label><button disabled={busy}>{busy?t.loading:t.create}</button>
     </form>}
    {!epics.length?<p className={styles.empty}>{t.none}</p>:epics.map(epic=>{
     const epicTasks=tasks.filter(task=>task.epic_id===epic.id),progress=projectProgress(epicTasks);
     const show=open===epic.id,options=opts.filter(opt=>opt.epic_id===epic.id);
     return <article key={epic.id} className={styles.epic}>
      <button className={styles.epicHead} type="button" aria-expanded={show} onClick={()=>setOpen(show?null:epic.id)}>
       <span><small>{snap.projects.find(p=>p.id===epic.project_id)?.title||t.projects} · P{epic.priority}</small><strong>{epic.title}</strong>
        <em>{epic.outcome}</em></span><span className={styles.arrow}>{show?'−':'+'}</span>
      </button>
      <div className={styles.progress}><span>{progress.verified} / {progress.total} {t.confirmed}</span>
       <progress className={styles.track} aria-label={t.confirmed} max={progress.total||1} value={progress.verified}/></div>
      {show&&<div className={styles.epicBody}>
       <p className={styles.muted}>{epic.problem}</p>
       <h3>{t.plans}</h3>
       {!options.length&&<><p className={styles.muted}>{t.engine}</p><button type="button" disabled={busy} onClick={()=>send('propose_options',{epicId:epic.id})}>{t.propose}</button></>}
       {options.map(opt=><div key={opt.id} className={[styles.option,opt.state==='selected'?styles.picked:''].join(' ')}>
        <div className={styles.optionTitle}><strong>{opt.title}</strong><span>{opt.state==='selected'?t.selected:opt.state==='rejected'?'—':''}</span></div>
        <p>{opt.approach}</p><p className={styles.muted}>+ {opt.benefit}</p><p className={styles.muted}>! {opt.risk}</p>
        <ol>{(Array.isArray(opt.steps)?opt.steps:[]).map((step,i)=><li key={i}>{step.title}</li>)}</ol>
        {opt.state==='proposed'&&!epic.selected_option_id&&<button type="button" disabled={busy} onClick={()=>send('select_option',{epicId:epic.id,optionId:opt.id})}>{t.approve}</button>}
       </div>)}
       {!!epicTasks.length&&<h3>{t.steps}</h3>}
       {epicTasks.map((task,i)=>{
        const existing=linked(task),proof=proofs[task.id],status=statuses[task.id];
        return <div className={styles.task} key={task.id}>
         <div className={styles.taskTitle}><span>{i+1}.</span><strong>{task.title}</strong></div>
         <p className={styles.muted}>{task.acceptance}</p>
         <div className={styles.taskMeta}><span>{task.state==='completed_verified'&&!task.has_evidence?t.needsEvidence:task.state}</span><span className={status?.code==='CI_FAILED'?styles.error:styles.state}>{status?.label||(existing.length?'PR linked · '+t.unknown:t.noPR)}</span></div>
         {existing.map(link=><a key={link.pr_number} className={styles.prLink} target="_blank" rel="noopener noreferrer"
          href={'https://github.com/andylitvinov-design/books/pull/'+link.pr_number}>PR #{link.pr_number}</a>)}
         <div className={styles.taskTools}>
          <label className={styles.prField}><span>{t.pr}</span><input type="url" placeholder="https://github.com/andylitvinov-design/books/pull/123"
            value={prDraft[task.id]||''} onChange={e=>setPrDraft(v=>({...v,[task.id]:e.target.value}))}/></label>
          <button type="button" disabled={busy||!prDraft[task.id]} className={styles.secondary} onClick={()=>send('link_pr',{taskId:task.id,prUrl:prDraft[task.id]})}>{t.link}</button>
          {(task.source_ref||existing.length>0)&&<button type="button" disabled={busy} onClick={()=>send('inspect_pr',{taskId:task.id})}>{t.inspect}</button>}
         </div>
         {task.kind==='code_change'&&<section className={styles.execution} aria-label="Execution">
          <h4>{lang==='ru'?'Исполнение':lang==='es'?'Ejecución':'Execution'}</h4>
          <label>{lang==='ru'?'AI-исполнитель':lang==='es'?'Agente IA':'AI executor'}
           <select value={executors[task.id]||'auto_free_repair'}
            onChange={e=>setExecutors(v=>({...v,[task.id]:e.target.value}))}>
            <option value="auto_free_repair">Auto Free Repair</option>
            <option value="chatgpt_work">ChatGPT Work · handoff</option>
            <option value="codex_host">Codex Host · not connected</option>
           </select>
          </label>
          {(executors[task.id]||'auto_free_repair')==='auto_free_repair'?<>
           <div className={styles.taskTools}>
            <button type="button" disabled={busy||!existing.length}
             onClick={()=>send('prepare_execution',{taskId:task.id,executor:'auto_free_repair'})}>
             {lang==='ru'?'Проверить запуск':lang==='es'?'Verificar ejecución':'Check readiness'}</button>
            <button type="button" disabled={busy||!execPrep[task.id]?.admission?.ok||
              execPrep[task.id]?.executorAvailability?.auto_free_repair!=='ACTIONS_WRITE_UNVERIFIED_UNTIL_DISPATCH'}
             onClick={()=>launch(task)}>
             {lang==='ru'?'Запустить исправление':lang==='es'?'Iniciar reparación':'Launch repair'}</button>
            <button type="button" className={styles.secondary} disabled={busy}
             onClick={()=>send('execution_status',{taskId:task.id})}>
             {lang==='ru'?'Журнал / статус':lang==='es'?'Historial / estado':'Execution log'}</button>
            <button type="button" className={styles.secondary} disabled={busy||!execStatus[task.id]?.history?.length}
             onClick={()=>launch(task,true)}>
             {lang==='ru'?'Повторить при новой ошибке':lang==='es'?'Reintentar con nuevo error':'Retry on new failure'}</button>
            <button type="button" className={styles.secondary} disabled={busy}
             onClick={()=>window.confirm(lang==='ru'?'Остановить будущие попытки? Текущий CI не будет отменён.':'Stop future attempts? Running CI will not be cancelled.')&&
              send('cancel_future_attempts',{taskId:task.id,confirmed:true})}>
             {lang==='ru'?'Остановить будущие попытки':lang==='es'?'Detener intentos futuros':'Stop future attempts'}</button>
           </div>
           {execPrep[task.id]&&<div className={styles.proof}>
            <p>HEAD: {execPrep[task.id].headSha?.slice(0,12)||'—'} · {execPrep[task.id].admission?.reason}</p>
            <p>{execPrep[task.id].executorAvailability?.auto_free_repair}</p>
            {execPrep[task.id].admission?.evidence?.checkUrl&&
             <a target="_blank" rel="noopener noreferrer" href={execPrep[task.id].admission.evidence.checkUrl}>Core failure evidence</a>}
           </div>}
          </>: (executors[task.id]==='chatgpt_work'?<>
           <button type="button" disabled={busy||!existing.length} onClick={()=>prepareHandoff(task)}>
            {lang==='ru'?'Подготовить и скопировать задание':lang==='es'?'Preparar y copiar tarea':'Prepare and copy handoff'}</button>
           {execPrep[task.id]?.handoff&&<>
            <textarea readOnly aria-label="ChatGPT handoff" value={execPrep[task.id].handoff}/>
            <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">
             {lang==='ru'?'Открыть ChatGPT и выбрать Work':lang==='es'?'Abrir ChatGPT y elegir Work':'Open ChatGPT and choose Work'}</a>
            <p className={styles.muted}>HANDOFF_PREPARED_NOT_LAUNCHED</p>
           </>}
          </>:<p className={styles.muted}>OAUTH_RUNTIME_NOT_VERIFIED · No automatic execution</p>)}
          {execStatus[task.id]&&<div className={styles.proof}>
           <p>{execStatus[task.id].status} · {execStatus[task.id].run?.stage||'WATCHDOG_NOT_VERIFIED'}</p>
           <p className={styles.muted}>{t.watchdogOnly}</p>
           {execStatus[task.id].run?.url&&<a href={execStatus[task.id].run.url} target="_blank" rel="noopener noreferrer">GitHub Actions #{execStatus[task.id].run.id}</a>}
           {execStatus[task.id].sourceReceipt&&<div className={styles.sourceProof} role="status">
            <strong>{t.sourceProof}</strong>
            <p>{execStatus[task.id].sourceReceipt.status==='SOURCE_COMMIT_VERIFIED'?t.sourceVerified:
             execStatus[task.id].sourceReceipt.status==='READ_ONLY_PREFLIGHT_NO_SOURCE'?t.sourceNotPublished:
             execStatus[task.id].sourceReceipt.status==='RUNNER_CONFIRMED_NO_SOURCE'?t.runnerOnly:t.sourceUnconfirmed}</p>
            {execStatus[task.id].sourceReceipt.workerUrl&&<a href={execStatus[task.id].sourceReceipt.workerUrl}
             target="_blank" rel="noopener noreferrer">GitHub Worker #{execStatus[task.id].sourceReceipt.workerRun}</a>}
            {execStatus[task.id].sourceReceipt.commitUrl&&<a href={execStatus[task.id].sourceReceipt.commitUrl}
             target="_blank" rel="noopener noreferrer">Commit {execStatus[task.id].sourceReceipt.commitSha?.slice(0,12)}</a>}
           </div>}
           {(execStatus[task.id].history||[]).map((ev,j)=><p key={j}>
            {safeTime(ev.created_at)} · {ev.result?.status} · HEAD {ev.result?.headSha?.slice(0,10)||'—'}
           </p>)}
          </div>}
         </section>}
         {proof&&<div className={styles.proof}><small>GitHub · {safeTime(proof.observedAt)} · HEAD {proof.headSha?.slice(0,9)||'—'}</small>
           <p>PR: {proof.prState} · CI: {proof.ci} · Merge: {proof.mergedSha?.slice(0,9)||'—'} · production: {proof.codeOnProduction?'yes':'unverified'}</p>
           <p>{proof.functionalAccepted?status?.label:t.noLive}</p></div>}
        </div>;
       })}
      </div>}
     </article>;
    })}
   </>}
   <p role="status" aria-live="polite" className={styles.notice}>{message}</p>
  </section>
 </main>;
}