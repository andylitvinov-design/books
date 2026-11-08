'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import styles from './cron-skills-panel.module.css';
const I18N={
 ru:{back:'‹ Агенты',title:'Cron Skills',subtitle:'Навыки по расписанию · существующий защищённый планировщик',total:'В каталоге',ready:'Исполняемые',active:'Включены',history:'Журнал',add:'Включить',pause:'Пауза',resume:'Продолжить',queue:'В очередь сейчас',save:'Изменить',loading:'Загрузка…',unavailable:'Не удалось получить подтверждённые данные. Расписания не изменены.',notConnected:'Нет подтверждённого исполнителя — доступно описание, но не запуск.',eventOnly:'Срабатывает от события, без отдельного Cron.',noRuns:'Запусков ещё нет',next:'Следующий запуск',last:'Последний результат',readOnly:'Доступные сейчас навыки выполняют только агрегирующие SQL-запросы — без AI-вызовов, GitHub push и merge.',cost:'Единый дневной бюджет и защищённая кнопка Pause all в Command Center.',delivery:'Разработка и PR',operations:'Надёжность',product:'Продукт и маркетинг',governance:'Управление',schedule:'Расписание',s10:'Каждые 10 мин',s30:'Каждые 30 мин',s60:'Каждый час',sDay:'Каждый день 09:00 Toronto',sWeek:'Пн 09:00 Toronto',queued:'Поставлено в очередь: выполнение при ближайшем разрешённом tick',changed:'Настройка сохранена',error:'Операция не подтверждена',refresh:'Обновить',unknown:'Нет подтверждения',live:'Не является проверкой LIVE',record:'История фактических исполнений'},
 en:{back:'‹ Agents',title:'Cron Skills',subtitle:'Scheduled skills · existing protected scheduler',total:'Catalog',ready:'Executable',active:'Enabled',history:'History',add:'Enable',pause:'Pause',resume:'Resume',queue:'Queue now',save:'Update',loading:'Loading…',unavailable:'Verified data unavailable. No schedules were changed.',notConnected:'No verified executor; catalog only.',eventOnly:'Event-driven, not a separate cron.',noRuns:'No runs yet',next:'Next run',last:'Last result',readOnly:'Executable skills use database-only aggregate reads; no AI calls, GitHub pushes or merges.',cost:'Shared daily limit and owner Pause all in Command Center.',delivery:'Development & PR',operations:'Reliability',product:'Product & growth',governance:'Management',schedule:'Schedule',s10:'Every 10 min',s30:'Every 30 min',s60:'Hourly',sDay:'Daily at 09:00 Toronto',sWeek:'Monday 09:00 Toronto',queued:'Queued for the next permitted tick',changed:'Saved',error:'Operation unconfirmed',refresh:'Refresh',unknown:'Unknown',live:'Not a LIVE verification',record:'Verified run history'},
 es:{back:'‹ Agentes',title:'Cron Skills',subtitle:'Habilidades programadas · planificador protegido',total:'Catálogo',ready:'Ejecutables',active:'Activados',history:'Historial',add:'Activar',pause:'Pausar',resume:'Reanudar',queue:'En cola ahora',save:'Cambiar',loading:'Cargando…',unavailable:'Datos no disponibles. No se modificaron tareas.',notConnected:'Sin ejecutor verificado; sólo catálogo.',eventOnly:'Se activa por evento, no por cron.',noRuns:'Sin ejecuciones',next:'Próxima ejecución',last:'Último resultado',readOnly:'Las habilidades disponibles sólo leen datos agregados; sin IA ni cambios GitHub.',cost:'Límite diario compartido y pausa global.',delivery:'Desarrollo y PR',operations:'Fiabilidad',product:'Producto y marketing',governance:'Gestión',schedule:'Horario',s10:'Cada 10 min',s30:'Cada 30 min',s60:'Cada hora',sDay:'Diario 09:00 Toronto',sWeek:'Lunes 09:00 Toronto',queued:'En cola para el próximo ciclo permitido',changed:'Guardado',error:'Acción no confirmada',refresh:'Actualizar',unknown:'Desconocido',live:'No es verificación LIVE',record:'Historial verificado'}
};
const SCHEDULES=[['10m','s10'],['30m','s30'],['hourly','s60'],['daily_9','sDay'],['weekly_mon_9','sWeek']];
const categories=['delivery','operations','product','governance'];
const api='/api/admin/command-center/skills';
const when=(s,lang)=>{if(!s)return '—';const date=new Date(s);return Number.isFinite(date.getTime())?date.toLocaleString(lang==='ru'?'ru-CA':lang==='es'?'es-CA':'en-CA',{timeZone:'America/Toronto',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'};
export default function CronSkillsPanel({lang='ru'}){
 const t=I18N[lang]||I18N.ru;
 const [data,setData]=useState(null),[loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [chosen,setChosen]=useState({});
 const load=useCallback(async()=>{
  try{
   const res=await fetch(api,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!res.ok)throw Error('fetch');
   const json=await res.json();
   if(!Array.isArray(json.catalog)||!Array.isArray(json.jobs)||!Array.isArray(json.runs))throw Error('schema');
   setData(json);setError('');
  }catch{setError(t.unavailable);}
  finally{setLoading(false);}
 },[t.unavailable]);
 useEffect(()=>{load();},[load]);
 const jobs=data?.jobs||[],catalog=data?.catalog||[],runs=data?.runs||[];
 const jobBySkill=useMemo(()=>new Map(jobs.map(j=>[j.skill_id,j])),[jobs]);
 const actual=catalog.filter(sk=>sk.runnable).length;
 async function action(payload){
  if(working)return;setWorking(true);setNotice('');setError('');
  try{
   const res=await fetch(api,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({...payload,requestId:crypto.randomUUID()})});
   const output=await res.json();
   if(!res.ok||!['configured','queued','already_recorded'].includes(output.status))throw Error('not saved');
   setNotice(output.status==='queued'?t.queued:t.changed);
   await load();
  }catch{setError(t.error);}
  finally{setWorking(false);}
 }
 return <div className={styles.app}>
  <header className={styles.header}><a className={styles.back} href="/admin/command-center">{t.back}</a><button type="button" onClick={load} disabled={loading||working}>{t.refresh}</button></header>
  <main className={styles.main}>
   <div className={styles.hero}><span>AGENT COMMANDER</span><h1>⏱ {t.title}</h1><p>{t.subtitle}</p></div>
   <div className={styles.metrics}><div><b>{catalog.length||'—'}</b><small>{t.total}</small></div><div><b>{catalog.length?actual:'—'}</b><small>{t.ready}</small></div><div><b>{jobs.filter(j=>j.enabled).length}</b><small>{t.active}</small></div></div>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {notice&&<p className={styles.notice} role="status">{notice}</p>}
   {loading&&!data&&<p className={styles.info}>{t.loading}</p>}
   <section className={styles.note}><p>{t.readOnly}</p><p>{t.cost}</p></section>
   {categories.map(category=><section key={category} className={styles.group}>
    <h2>{t[category]}</h2>
    {catalog.filter(sk=>sk.category===category).map(skill=>{
     const job=jobBySkill.get(skill.id),selected=chosen[skill.id]||job?.schedule||skill.defaultSchedule;
     const title=lang==='ru'?skill.titleRu:lang==='es'?skill.titleEs:skill.titleEn;
     return <div key={skill.id} className={styles.skill}>
      <div className={styles.skillTitle}><div><strong>{title}</strong><small>{skill.id}</small></div><span className={skill.runnable?styles.ready:styles.blocked}>{skill.runnable?t.ready:skill.executor==='event'?'EVENT':'ADAPTER'}</span></div>
      {skill.runnable?<div className={styles.controls}>
       <label>{t.schedule}<select aria-label={title+' '+t.schedule} value={selected} disabled={working} onChange={e=>setChosen(prev=>({...prev,[skill.id]:e.target.value}))}>
        {SCHEDULES.map(([value,label])=><option value={value} key={value}>{t[label]}</option>)}</select></label>
       <div className={styles.actions}>
        {!job?<button type="button" disabled={working} onClick={()=>action({action:'save_job',skillId:skill.id,schedule:selected,enabled:true})}>{t.add}</button>:
        <><button type="button" disabled={working} onClick={()=>action({action:'control_job',jobId:job.id,mode:job.enabled?'pause':'resume'})}>{job.enabled?t.pause:t.resume}</button>
        <button type="button" disabled={working||!job.enabled} onClick={()=>action({action:'control_job',jobId:job.id,mode:'queue_now'})}>{t.queue}</button>
        {selected!==job.schedule&&<button type="button" disabled={working} onClick={()=>action({action:'save_job',skillId:skill.id,schedule:selected,enabled:job.enabled})}>{t.save}</button>}</>}
       </div>
       {job&&<small className={styles.state}>{t.next}: {job.enabled?when(job.next_due_at,lang):'—'} · {t.last}: {job.last_state||t.unknown}</small>}
      </div>:<p className={styles.unavailable}>{skill.executor==='event'?t.eventOnly:t.notConnected}</p>}
     </div>;
    })}
   </section>)}
   <section className={styles.group}><h2>{t.history}</h2><p className={styles.info}>{t.record}</p>
    {!runs.length&&<p className={styles.info}>{t.noRuns}</p>}
    {runs.map(run=><div key={run.id} className={styles.run}><b>{run.skill_id}</b><span>{run.state} · {when(run.finished_at||run.started_at,lang)}</span>
      {run.receipt?.values&&<small>{Object.entries(run.receipt.values).map(([k,v])=>k+': '+v).join(' · ')}</small>}</div>)}
    <p className={styles.info}>{t.live}</p>
   </section>
  </main>
 </div>;
}
