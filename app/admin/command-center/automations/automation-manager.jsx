'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import styles from './automation-manager.module.css';
const L={
 ru:{back:'‹ Agent Commander',title:'Автоматизации',subtitle:'Cron Jobs · задачи, инструкции и навыки',my:'Мои задания',system:'Системные',new:'Новая автоматизация',create:'Создать черновик',save:'Сохранить изменения',edit:'Изменить',cancel:'Отмена',open:'Читать и редактировать',name:'Название',prompt:'Инструкция для агента',schedule:'Когда выполнять',skills:'Навыки агента',brain:'Мозг и память',agent:'Роль агента',none:'Нет автоматизаций',loading:'Загрузка…',readonly:'Системная автоматизация управляется кодом GitHub; редактирование здесь недоступно.',unknown:'Не подтверждено',details:'Полный текст автоматизации',pick:'Подобрать навыки',notice:'Изменения сохранены.',blocked:'Ожидает AI-исполнителя',builtin:'SQL-навык · активный исполнитель',note:'Для системного SQL-навыка редактируемый текст — инструкция-намерение, а алгоритм выполнения зафиксирован в коде.',draft:'Новые задания сохраняются как черновики: запуск не включается без проверенного исполнителя и разрешений.',brainNote:'Выбор памяти и роли прикрепляет контекст к заданию; сам по себе не запускает модель.',error:'Не удалось подтвердить изменения',limit:'Не более 8 навыков',empty:'Запишите, что нужно выполнить, и задайте периодичность.',active:'Включено',paused:'Пауза',runs:'Последние исполнения',request:'Связь с защищённым реестром',every10:'Каждые 10 минут',every30:'Каждые 30 минут',hourly:'Каждый час',daily:'Ежедневно в 09:00 (Торонто)',weekly:'Понедельник в 09:00 (Торонто)',rec:'Система предложила расписание по тексту',check:'Перечитайте инструкцию перед сохранением',builtins:'Работает только фиксированный безопасный алгоритм'},
 en:{back:'‹ Agent Commander',title:'Automations',subtitle:'Cron Jobs · tasks, instructions and skills',my:'My jobs',system:'System',new:'New automation',create:'Save draft',save:'Save changes',edit:'Edit',cancel:'Cancel',open:'Read and edit',name:'Title',prompt:'Instructions for agent',schedule:'When to run',skills:'Agent skills',brain:'Brain and memory',agent:'Agent role',none:'No automations',loading:'Loading…',readonly:'System automation is owned by GitHub code and cannot be edited here.',unknown:'Unverified',details:'Full automation text',pick:'Suggest skills',notice:'Saved',blocked:'Awaiting AI executor',builtin:'Fixed SQL executor',note:'For fixed SQL jobs, editable text documents intent but does not alter the underlying algorithm.',draft:'New tasks are drafts until an approved execution runtime is connected.',brainNote:'Brain and role selection attach context; they do not themselves run a model.',error:'Change not verified',limit:'Up to 8 skills',empty:'Describe what to do and when.',active:'Enabled',paused:'Paused',runs:'Recent executions',request:'Protected job registry',every10:'Every 10 minutes',every30:'Every 30 minutes',hourly:'Hourly',daily:'Daily 09:00 Toronto',weekly:'Monday 09:00 Toronto',rec:'Schedule suggested from text',check:'Review instructions before saving',builtins:'Only the fixed safe algorithm runs'},
 es:{back:'‹ Agent Commander',title:'Automatizaciones',subtitle:'Cron Jobs · tareas, instrucciones y habilidades',my:'Mis tareas',system:'Sistema',new:'Nueva automatización',create:'Guardar borrador',save:'Guardar cambios',edit:'Editar',cancel:'Cancelar',open:'Leer y editar',name:'Título',prompt:'Instrucciones del agente',schedule:'Cuándo ejecutar',skills:'Habilidades',brain:'Memoria y cerebro',agent:'Rol',none:'Sin automatizaciones',loading:'Cargando…',readonly:'Esta tarea pertenece al sistema GitHub y no se puede editar aquí.',unknown:'Sin confirmar',details:'Texto completo',pick:'Sugerir habilidades',notice:'Guardado',blocked:'Sin ejecutor IA',builtin:'Ejecutor SQL fijo',note:'El texto describe el objetivo, no cambia el algoritmo SQL.',draft:'Las nuevas tareas permanecen como borradores sin ejecutor aprobado.',brainNote:'La memoria y el rol sólo asignan contexto.',error:'Cambio no confirmado',limit:'Máximo 8 habilidades',empty:'Describe qué hacer y cuándo.',active:'Activo',paused:'Pausado',runs:'Ejecuciones recientes',request:'Registro protegido',every10:'Cada 10 minutos',every30:'Cada 30 minutos',hourly:'Cada hora',daily:'Diario 09:00 Toronto',weekly:'Lunes 09:00 Toronto',rec:'Horario sugerido',check:'Revisa las instrucciones',builtins:'Sólo se ejecuta el algoritmo fijo'}
};
const OPTIONS=[['10m','every10'],['30m','every30'],['hourly','hourly'],['daily_9','daily'],['weekly_mon_9','weekly']];
const roles=['commander','analyst','engineering','marketing','education'];
const PICK={
 ru:{choose:'Выбрать агента',assign:'Назначить агента',cancel:'Отмена',assigned:'Агент назначен',fixed:'Задачу выполняет штатный SQL-исполнитель. Выбранная роль не меняет исходный код.',blocked:'AI-исполнитель пока не подключён. Выбор роли не запускает задание.',queue:'▶ Запросить выполнение',queued:'Поставлено в очередь. Фактическое выполнение проверьте по журналу.',enable:'Сначала включите штатное задание.'},
 en:{choose:'Choose agent',assign:'Assign agent',cancel:'Cancel',assigned:'Agent assigned',fixed:'The job runs on the existing SQL worker; the role does not alter its algorithm.',blocked:'AI runner not connected. Choosing a profile does not start the job.',queue:'▶ Request run',queued:'Queued. Check actual execution in run history.',enable:'Enable this builtin job first.'},
 es:{choose:'Elegir agente',assign:'Asignar agente',cancel:'Cancelar',assigned:'Agente asignado',fixed:'El trabajo usa el ejecutor SQL y no cambia su algoritmo.',blocked:'Ejecutor de IA sin conectar. Elegir un rol no ejecuta la tarea.',queue:'▶ Solicitar ejecución',queued:'En cola. Verifique la ejecución en el historial.',enable:'Primero active el trabajo fijo.'}
};
const empty=()=>({title:'',instruction:'',schedule:'daily_9',brainScope:'ai-projects-brain',agentRole:'commander',skillIds:[],enabled:false});
const labelSkill=(s,lang)=>lang==='ru'?s.titleRu:lang==='es'?s.titleEs:s.titleEn;
function inferSchedule(text){
 const s=(text||'').toLowerCase();
 if(/10\s*(мин|min)/.test(s))return '10m';
 if(/30\s*(мин|min)/.test(s))return '30m';
 if(/час|hour/.test(s))return 'hourly';
 if(/понедельник|monday/.test(s))return 'weekly_mon_9';
 if(/кажд|ежедн|daily|every day/.test(s))return 'daily_9';
 return null;
}
function suggest(text,catalog){
 const s=(text||'').toLowerCase(),keywords=[[/pr|пиар|github|мерж/,['pr.queue-reconcile','task.stall-watchdog']],[/ci|тест|ошибк/,['ci.exact-head-diagnose']],[/лимит|бюджет|cost/,['cost.budget-guard']],[/отчёт|бриф|сводк/,['report.morning-brief']],[/seo|маркетинг|клиент/,['seo.opportunities','marketing.advisor']]];
 const possible=[...new Set(keywords.flatMap(([k,v])=>k.test(s)?v:[]))];return possible.filter(id=>catalog.some(c=>c.id===id)).slice(0,8);
}
function fmt(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Toronto'});}
export default function AutomationManager({lang='ru'}){
 const t=L[lang]||L.ru,ap=PICK[lang]||PICK.ru;
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
 const [mode,setMode]=useState('my'),[editing,setEditing]=useState(null),[draft,setDraft]=useState(empty());
  const [assigning,setAssigning]=useState(null),[assignedRole,setAssignedRole]=useState('commander');
 const load=useCallback(async()=>{try{
  const res=await fetch('/api/admin/command-center/skills',{credentials:'same-origin',cache:'no-store'});
  if(!res.ok)throw Error('api');const json=await res.json();
  if(!Array.isArray(json.jobs)||!Array.isArray(json.catalog))throw Error('schema');setData(json);setError('');
 }catch{setError(t.error);}},[t.error]);
 useEffect(()=>{load();},[load]);
 const active=data?.jobs||[],catalog=data?.catalog||[],system=data?.systemJobs||[];
 const skillMap=useMemo(()=>new Map(catalog.map(s=>[s.id,s])),[catalog]);
 const set=(k,v)=>setDraft(old=>({...old,[k]:v}));
 function start(job){setAssigning(null);setEditing(job?job.id:'new');setDraft(job?
  {title:job.title||job.skill_id,instruction:job.instruction||'',schedule:job.schedule,
  brainScope:job.brain_scope||'none',agentRole:job.agent_role||'commander',skillIds:job.skill_ids||[],
  enabled:job.enabled}:empty());setError('');setOk('');}
 async function save(){
  if(busy||draft.title.trim().length<6||draft.instruction.trim().length<20){setError(t.empty);return;}
  setBusy(true);setError('');setOk('');
  try{
   const job=active.find(j=>j.id===editing),body=job?
    {action:'update_job',jobId:job.id,expectedRevision:job.revision,...draft}:
    {action:'create_custom_job',...draft,enabled:false};
   const r=await fetch('/api/admin/command-center/skills',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,requestId:crypto.randomUUID()})});
   const out=await r.json();
   if(!r.ok||!['updated','created_draft'].includes(out.status))throw Error(out.status||'api');
   await load();setEditing(null);setOk(t.notice);
  }catch(e){setError(t.error+' · '+String(e?.message||'unknown'));}
  finally{setBusy(false);}
 }
 function chooseAgent(job){setEditing(null);setAssigning(job.id);setAssignedRole(job.agent_role||'commander');setError('');setOk('');}
  async function agentAction(body,okMessage,success){
   if(busy)return;setBusy(true);setError('');setOk('');
   try{
    const res=await fetch('/api/admin/command-center/skills',{method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({...body,requestId:crypto.randomUUID()})});
    const out=await res.json();
    if(!res.ok||!success.includes(out.status))throw Error(out.status||'api');
    setAssigning(null);await load();setOk(okMessage);
   }catch(e){setError(t.error+' · '+String(e?.message||'unknown'));}
   finally{setBusy(false);}
  }
  const assignAgent=job=>agentAction({action:'assign_agent',jobId:job.id,
   expectedRevision:job.revision,agentRole:assignedRole},ap.assigned,['agent_assigned','unchanged']);
  const queueJob=job=>agentAction({action:'control_job',jobId:job.id,mode:'queue_now'},ap.queued,['queued']);
  function instructionChange(v){set('instruction',v);if(editing==='new'){const schedule=inferSchedule(v);if(schedule)setDraft(old=>({...old,instruction:v,schedule}));}}
 function toggleSkill(id){setDraft(old=>{const have=old.skillIds.includes(id),arr=have?old.skillIds.filter(x=>x!==id):old.skillIds.length<8?[...old.skillIds,id]:old.skillIds;return {...old,skillIds:arr};});}
 const current=active.find(j=>j.id===editing);
  const profiles=Array.isArray(data?.agentProfiles)?data.agentProfiles:roles.map(id=>({id,name:id}));
  const agentName=id=>profiles.find(x=>x.id===id)?.name||id||'Commander';
 return <div className={styles.root}><header className={styles.header}><a href="/admin/command-center">‹</a><strong>{t.title}</strong><button type="button" onClick={()=>start(null)}>＋</button></header>
  <main className={styles.main}>
   <div className={styles.hero}><small>AGENT COMMANDER · CRON JOBS</small><h1>{t.title}</h1><p>{t.subtitle}</p></div>
   {error&&<p className={styles.error} role="alert">{error}</p>}{ok&&<p className={styles.ok} role="status">{ok}</p>}
   <div className={styles.metrics}><div><b>{active.length}</b><span>{t.my}</span></div><div><b>{active.filter(x=>x.enabled).length}</b><span>{t.active}</span></div><div><b>{active.filter(x=>x.execution_mode==='blocked_no_runner').length}</b><span>{t.blocked}</span></div></div>
   {editing!==null?<section className={styles.editor}><div className={styles.editorHead}><h2>{editing==='new'?t.new:t.edit}</h2><button type="button" onClick={()=>setEditing(null)}>×</button></div>
    <label>{t.name}<input maxLength={120} value={draft.title} onChange={e=>set('title',e.target.value)} placeholder={t.name}/></label>
    <label>{t.prompt}<textarea rows={7} maxLength={6000} value={draft.instruction} onChange={e=>instructionChange(e.target.value)} placeholder={t.empty}/></label>
    <label>{t.schedule}<select value={draft.schedule} onChange={e=>set('schedule',e.target.value)}>{OPTIONS.map(([id,key])=><option key={id} value={id}>{t[key]}</option>)}</select></label>
    <div className={styles.line}><strong>{t.skills}</strong><button type="button" className={styles.link} onClick={()=>set('skillIds',suggest(draft.instruction,catalog))}>{t.pick}</button></div>
    <div className={styles.chips}>{catalog.map(skill=><label key={skill.id} className={styles.chip}><input type="checkbox" checked={draft.skillIds.includes(skill.id)} onChange={()=>toggleSkill(skill.id)}/>{labelSkill(skill,lang)}{!skill.runnable&&' ◌'}</label>)}</div>
    <small className={styles.muted}>{t.limit}</small>
    <label>{t.brain}<select value={draft.brainScope} onChange={e=>set('brainScope',e.target.value)}>{(data?.brainSources||[{id:'none',name:'Без памяти'},{id:'ai-projects-brain',name:'AI Projects Brain'},{id:'agent-council',name:'AI Council'}]).map(b=><option key={b.id} value={b.id}>{b.name}{b.available===false?' (offline)':''}</option>)}</select></label>
    <label>{t.agent}<select value={draft.agentRole} onChange={e=>set('agentRole',e.target.value)}>{roles.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
    <p className={styles.muted}>{t.brainNote}</p>
    <p className={styles.muted}>{current?.execution_mode==='builtin'?t.note:t.draft}</p>
    {current?.execution_mode==='builtin'&&<label className={styles.toggle}><input type="checkbox" checked={Boolean(draft.enabled)} onChange={e=>set('enabled',e.target.checked)}/>{t.active}</label>}
    <button className={styles.primary} disabled={busy} onClick={save} type="button">{busy?t.loading:editing==='new'?t.create:t.save}</button>
    <button className={styles.secondary} type="button" onClick={()=>setEditing(null)}>{t.cancel}</button>
   </section>:<>
    <div className={styles.tabs}><button type="button" aria-pressed={mode==='my'} onClick={()=>setMode('my')} className={mode==='my'?styles.current:''}>{t.my}</button><button aria-pressed={mode==='system'} type="button" onClick={()=>setMode('system')} className={mode==='system'?styles.current:''}>{t.system}</button></div>
    {mode==='my'?<>{active.length===0&&<p>{t.none}</p>}{active.map(job=><div key={job.id} className={styles.agentGroup}>
      <div className={styles.agentRow}>
       <button className={styles.job} onClick={()=>start(job)} type="button"><div><strong>{job.title||job.skill_id}</strong><span>{OPTIONS.find(x=>x[0]===job.schedule)?.[1]?t[OPTIONS.find(x=>x[0]===job.schedule)[1]]:job.schedule} · {job.last_state||t.unknown}</span><small>{(job.instruction||'').slice(0,150)}</small></div><span className={styles.pill}>{job.execution_mode==='builtin'?(job.enabled?t.active:t.paused):t.blocked}</span></button>
       <button type="button" className={styles.agentButton} aria-label={ap.choose+' · '+(job.title||job.skill_id)} aria-expanded={assigning===job.id} onClick={()=>chooseAgent(job)}>🤖<small>{agentName(job.agent_role)}</small></button>
      </div>
      {assigning===job.id&&<section className={styles.agentPicker}>
       <strong>🤖 {ap.choose}</strong>
       <select aria-label={ap.choose} value={assignedRole} onChange={e=>setAssignedRole(e.target.value)}>
        {profiles.filter(x=>roles.includes(x.id)).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
       </select>
       <p>{job.execution_mode==='builtin'?ap.fixed:ap.blocked}</p>
       <div className={styles.agentActions}>
        <button type="button" className={styles.primary} disabled={busy} onClick={()=>assignAgent(job)}>{busy?t.loading:ap.assign}</button>
        <button type="button" className={styles.secondary} onClick={()=>setAssigning(null)}>{ap.cancel}</button>
       </div>
       {job.execution_mode==='builtin'&&<>
        <button type="button" className={styles.secondary} disabled={busy||!job.enabled} onClick={()=>queueJob(job)}>{ap.queue}</button>
        {!job.enabled&&<small>{ap.enable}</small>}
       </>}
      </section>}
     </div>)}</>:
    system.map(job=><div key={job.id} className={styles.job}><div><strong>{job.title}</strong><span>{job.schedule}</span><small>{job.description}</small></div><span className={styles.pill}>🤖 SYSTEM</span></div>)}
    <button type="button" onClick={()=>start(null)} className={styles.primary}>＋ {t.new}</button>
    <section className={styles.history}><h2>{t.runs}</h2>{(data?.runs||[]).slice(0,7).map(r=><p key={r.id}>{r.skill_id} · {r.state} · {fmt(r.started_at)}</p>)}</section>
   </>}
  </main></div>;
}
