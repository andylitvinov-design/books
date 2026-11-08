'use client';
import {useState} from 'react';
import styles from './command-center-mobile.module.css';

const copy={
 ru:{
  title:'Agent Commander · сопровождение PR',hint:'Агент отслеживает только назначенные ему задачи. GitHub — источник фактов; код и CI он не изменяет.',
  assign:'Добавить PR на контроль',choose:'Выберите задачу с привязанным PR',activate:'Начать наблюдение',
  limit:'Максимум 3 активных задачи; до 2 PR за фоновый цикл.',watching:'Под наблюдением',
  noAssigned:'Пока нет PR под наблюдением. Назначьте задачу из списка.',
  interval:'Повторная проверка — не чаще чем раз в 15 минут на задачу. Фактический запуск зависит от существующего фонового цикла.',
  now:'Проверить сейчас',pause:'Остановить наблюдение',resume:'Возобновить',
  last:'Последняя реальная проверка',next:'Плановая следующая',history:'Лента изменений',
  unknown:'Нет подтверждённых данных',stage_unknown:'Статус не подтверждён',
  stage_in_progress:'PR в доработке',stage_ci_running:'CI выполняется',
  stage_needs_fix:'Требует исправления CI',stage_ready_for_merge:'CI зелёный · ожидается merge',
  stage_closed_without_merge:'Закрыт без слияния',stage_merged_waiting_live:'Смержен · ожидает LIVE',
  stage_merged_control:'Смержен в управляющую ветку',stage_on_live_unverified:'Код на LIVE · нужна проверка функции',
  assigned:'Наблюдение назначено',paused:'Наблюдение остановлено',status_changed:'Обновился статус PR',
  never:'Ещё не проводилась',proof:'Данные GitHub подтверждены',unavailable:'Мониторинг пока не подключён к серверу',
  noTasks:'Нет задач, связанных с PR',source:'Открыть PR',off:'Приостановлено',monitored:'Активно',
  noFinal:'Ни один из статусов не подтверждает функциональную приёмку LIVE.',
  allAssigned:'Все доступные слоты заняты', checkFailed:'Проверка не подтвердилась; данные не заменены выдуманным успехом'
 },
 en:{
  title:'Agent Commander · PR tracking',hint:'Only assigned tasks are monitored. GitHub is the source of truth; this observer does not edit code or CI.',
  assign:'Assign a PR to monitor',choose:'Select a task with a linked PR',activate:'Start monitoring',
  limit:'Up to 3 active tasks; up to 2 PRs per background cycle.',watching:'Monitored tasks',
  noAssigned:'No PRs monitored yet. Assign a task below.',
  interval:'At most once per 15 minutes per task. Actual checks depend on the existing background scheduler.',
  now:'Check now',pause:'Stop monitoring',resume:'Resume',
  last:'Last actual check',next:'Next scheduled',history:'Changes',
  unknown:'No verified data',stage_unknown:'Status unconfirmed',
  stage_in_progress:'PR being refined',stage_ci_running:'CI running',
  stage_needs_fix:'CI needs repair',stage_ready_for_merge:'CI green · awaiting merge',
  stage_closed_without_merge:'Closed without merge',stage_merged_waiting_live:'Merged · awaiting LIVE',
  stage_merged_control:'Merged to control branch',stage_on_live_unverified:'Code served · functional acceptance pending',
  assigned:'Monitoring assigned',paused:'Monitoring paused',status_changed:'PR status changed',
  never:'Never checked',proof:'GitHub evidence available',unavailable:'Monitoring service not yet available',
  noTasks:'No tasks with linked PRs',source:'Open PR',off:'Paused',monitored:'Active',
  noFinal:'These statuses are not proof of functional LIVE acceptance.',
  allAssigned:'All slots are occupied',checkFailed:'Could not confirm the check; success was not inferred'
 },
 es:{
  title:'Agent Commander · seguimiento de PR',hint:'Solo se supervisan tareas asignadas. GitHub es la fuente de verdad; no modifica el código ni CI.',
  assign:'Asignar PR al seguimiento',choose:'Elige una tarea con PR vinculado',activate:'Iniciar seguimiento',
  limit:'Hasta 3 tareas activas y 2 PR por ciclo.',watching:'Tareas supervisadas',
  noAssigned:'No hay PR en seguimiento. Asigna una tarea.',
  interval:'No más de una revisión cada 15 minutos por tarea. La frecuencia real depende del programador existente.',
  now:'Comprobar ahora',pause:'Detener seguimiento',resume:'Reanudar',
  last:'Última revisión real',next:'Próxima revisión',history:'Historial',
  unknown:'Sin datos verificados',stage_unknown:'Estado no verificado',
  stage_in_progress:'PR en corrección',stage_ci_running:'CI en curso',
  stage_needs_fix:'CI requiere corrección',stage_ready_for_merge:'CI correcto · pendiente de integrar',
  stage_closed_without_merge:'Cerrado sin integrar',stage_merged_waiting_live:'Integrado · espera LIVE',
  stage_merged_control:'Integrado en rama de control',stage_on_live_unverified:'Código en LIVE · prueba funcional pendiente',
  assigned:'Seguimiento asignado',paused:'Seguimiento detenido',status_changed:'Cambio de estado',
  never:'Sin revisar',proof:'Evidencia GitHub disponible',unavailable:'Servicio de seguimiento no disponible',
  noTasks:'No hay tareas con PR',source:'Abrir PR',off:'Pausado',monitored:'Activo',
  noFinal:'Estos estados no demuestran la aceptación funcional en LIVE.',
  allAssigned:'Todas las plazas están ocupadas',checkFailed:'No se pudo confirmar la revisión.'
 }
};
const PR=/^https:\/\/github\.com\/andylitvinov-design\/books\/pull\/[1-9]\d{0,7}$/;
const formatDate=(value,lang)=>{
 if(!value||!Number.isFinite(Date.parse(value)))return '—';
 try{return new Date(value).toLocaleString(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-US',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
 catch{return '—';}
};
/** @param {{lang?:string,tasks?:any[],watch?:any,busy?:boolean,available?:boolean,onSet?:(taskId:string,enabled:boolean)=>Promise<any>,onCheck?:(taskId:string)=>Promise<any>}} props */
export default function CommandCenterPrWatch({lang='ru',tasks=[],watch,busy=false,available=false,onSet,onCheck}){
 const t=copy[lang]||copy.ru;
 const [choice,setChoice]=useState('');
 const [notice,setNotice]=useState('');
 const entries=Array.isArray(watch?.items)?watch.items:[];
 const eligible=tasks.filter(task=>PR.test(task.source_ref||'')&&task.state!=='canceled'&&
  !entries.some(w=>w.task_id===task.id&&w.enabled));
 const active=entries.filter(w=>w.enabled);
 const disabled=busy||!available||!watch||watch.available===false;
 const action=async(fn)=>{
  if(disabled||typeof fn!=='function')return;
  setNotice('');
  try{
   const r=await fn();
   if(!r||!['watching','paused','unchanged','observed'].includes(r.status)){
    if(r?.status==='no_due_or_busy')setNotice(t.interval);
    else if(r?.status==='capacity_reached')setNotice(t.allAssigned);
    else setNotice(t.checkFailed);
   }else if(r.status==='observed'&&Array.isArray(r.results)&&r.results.some(x=>x.status!=='observed')){
    setNotice(t.checkFailed);
   }else if(r.status==='observed'&&r.checked===0)setNotice(t.interval);
  }catch{setNotice(t.checkFailed);}
 };
 const canAssign=active.length<(watch?.maxActive||3);
 return <section className={styles.prWatchPanel} aria-label={t.title} data-cc-pr-watch>
  <div className={styles.prWatchTop}><div><h2>{t.title}</h2><p className={styles.muted}>{t.hint}</p></div>
   <strong>{active.length} / {watch?.maxActive||3}</strong></div>
  <p className={styles.prWatchPolicy}>{t.interval}</p>
  {!watch||watch.available===false?<p className={styles.muted} role="status">{t.unavailable}</p>:<>
   <h3>{t.watching}</h3>
   {!entries.length&&<p className={styles.muted}>{t.noAssigned}</p>}
   <div className={styles.prWatchList}>{entries.map(w=>{
    const task=tasks.find(x=>x.id===w.task_id);
    const text=t['stage_'+w.stage]||t.stage_unknown;
    return <article key={w.task_id} className={styles.prWatchRow}>
     <div className={styles.prWatchLine}><strong>{task?.title||w.title||'#'+w.pr_number}</strong>
      <span className={w.enabled?styles.prWatchEnabled:styles.prWatchDisabled}>{w.enabled?t.monitored:t.off}</span></div>
     <div className={styles.prWatchLine}><span className={w.stage==='needs_fix'||w.stage==='closed_without_merge'?styles.bad:w.stage==='on_live_unverified'?styles.good:styles.purple}>
      {text}</span><a href={'https://github.com/andylitvinov-design/books/pull/'+w.pr_number} target="_blank" rel="noopener noreferrer">PR #{w.pr_number}</a></div>
     <p className={styles.prWatchTiming}>{t.last}: {w.last_checked_at?formatDate(w.last_checked_at,lang):t.never}
      {w.enabled&&w.next_check_at?' · '+t.next+': '+formatDate(w.next_check_at,lang):''}</p>
     {w.last_error&&<p className={styles.bad}>{t.unknown} · {w.last_error}</p>}
     <div className={styles.prWatchActions}>
      {w.enabled&&<button type="button" className={styles.secondary} disabled={disabled}
       onClick={()=>action(()=>onCheck?.(w.task_id))}>{t.now}</button>}
      <button type="button" className={styles.secondary} disabled={disabled||(!w.enabled&&!canAssign)}
       onClick={()=>action(()=>onSet?.(w.task_id,!w.enabled))}>{w.enabled?t.pause:t.resume}</button>
     </div>
    </article>;
   })}</div>
   {canAssign&&eligible.length>0&&<div className={styles.prWatchAssign}>
     <h3>{t.assign}</h3>
     <label className={styles.muted} htmlFor="cc-pr-watch-choice">{t.choose}</label>
     <select id="cc-pr-watch-choice" value={choice} disabled={disabled}
      onChange={e=>setChoice(e.target.value)}>
      <option value="">—</option>{eligible.map(x=><option value={x.id} key={x.id}>{x.title.slice(0,65)}</option>)}
     </select>
     <button type="button" className={styles.primary} disabled={disabled||!choice}
      onClick={()=>action(async()=>{const r=await onSet?.(choice,true);if(r?.status==='watching')setChoice('');return r;})}>{t.activate}</button>
    </div>}
   {!eligible.length&&!entries.length&&<p className={styles.muted}>{t.noTasks}</p>}
   {!!watch.history?.length&&<details className={styles.prWatchHistory}>
    <summary>{t.history} ({watch.history.length})</summary>
    {watch.history.slice(0,15).map((h,i)=><p key={h.task_id+'-'+h.observed_at+'-'+i}>
     {formatDate(h.observed_at,lang)} · PR #{h.pr_number} · {t[h.event_type]||h.event_type} · {t['stage_'+h.stage]||t.unknown}
    </p>)}
   </details>}
   <p className={styles.muted}>{t.limit}</p><p className={styles.muted}>{t.noFinal}</p>
  </>}
  {notice&&<p role="status" className={styles.prWatchNotice}>{notice}</p>}
 </section>;
}
