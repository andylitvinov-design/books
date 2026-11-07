'use client';
import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import styles from './agent-studio.module.css';
type Lang='ru'|'en'|'es';
type Tab='home'|'tasks'|'agents'|'proof';
type Kind='repo_pr_audit'|'code_change'|'product_spec'|'research';
type Snapshot={
 observedAt:string;settings:{enabled:boolean;maxRuns:number}|null;
 projects:Array<{id:string;title:string;state:string}>;
 tasks:Array<{id:string;title:string;description:string;kind:string;state:string;priority:number;sourceRef:string|null;autoAllowed:boolean;attemptCount:number}>;
 runs:Array<{id:string;worker:string;state:string;errorCode:string|null;startedAt:string}>;
 evidence:Array<{id:string;kind:string;source:string;createdAt:string}>;
 slots:Array<{time:string;state:string;error:string|null}>;
 brief:{total:number;active:number;verified:number;blocked:number};
 reportDate:string|null;partial:boolean;
};
type Agent={id:string;role:string;status:string;runtime:string;capabilities:string[];maxConcurrency:number};
const words={
ru:{brand:'Agent Studio',tag:'Мобильный центр агентов',back:'Стратегия',home:'Обзор',tasks:'Задачи',agents:'Агенты',proof:'Результаты',welcome:'Какую задачу выполнить?',placeholder:'Например, проверь PR 3796 или разработай новую функцию для Holistic House…',kind:'Формат работы',audit:'Проверить GitHub · только чтение',code:'Изменения кода · очередь',spec:'Концепт / техническое задание',research:'Исследование · очередь',source:'Точная ссылка на GitHub PR или Issue',project:'Проект',noProject:'Все проекты',priority:'Приоритет',submit:'Создать задачу',waiting:'Записываю…',voice:'Диктовать',stop:'Остановить',voiceFallback:'Можно диктовать с клавиатуры iPhone',unknown:'База недоступна или миграция ещё не включена; данные неизвестны.',paused:'Пауза',enabled:'Безопасный мониторинг',total:'Всего',active:'В работе',verified:'Подтверждено',blocked:'Заблокировано',focus:'Приоритеты',empty:'Пока нет задач.',all:'Доска задач',attempts:'Попыток',replay:'Вернуть',pauseTask:'Пауза',manual:'Ожидает исполнителя',readOnly:'Чтение GitHub',agentsTitle:'Исполнители и доступ',available:'Читатель доступен',notConnected:'Не подключён',manualOnly:'Только вручную',controls:'Управление',pauseAll:'Остановить',resumeAll:'Включить безопасный мониторинг',runNow:'Проверить очередь',proofTitle:'Подтверждения',runs:'Запуски',schedule:'Циклы диспетчера',brief:'Ежедневный брифинг',refresh:'Обновить',saved:'Задача сохранена',error:'Не подтверждено',tooShort:'Опишите задачу (от 10 до 800 символов)',badUrl:'Нужна точная ссылка на PR или Issue проекта books',notCode:'AI-кодирование, merge и отправка в production пока не подключены.',notLive:'Проверка GitHub не доказывает выпуск на live.',limited:'Показаны не все задачи',unavailable:'Недоступно до подключения базы',notice:'Другие AI-агенты показаны только как возможные интеграции; автоматический запуск отсутствует.'},
en:{brand:'Agent Studio',tag:'Mobile agent control',back:'Strategy',home:'Overview',tasks:'Tasks',agents:'Agents',proof:'Results',welcome:'What should we work on?',placeholder:'For example, inspect PR 3796 or plan the next Holistic House feature…',kind:'Task type',audit:'Check GitHub · read only',code:'Code change · queued',spec:'Concept / technical specification',research:'Research · queued',source:'Exact GitHub PR or Issue URL',project:'Project',noProject:'All projects',priority:'Priority',submit:'Create task',waiting:'Saving…',voice:'Dictate',stop:'Stop',voiceFallback:'Use iPhone keyboard dictation',unknown:'Database or migration is unavailable. Status is unknown.',paused:'Paused',enabled:'Safe monitoring',total:'Total',active:'Active',verified:'Verified',blocked:'Blocked',focus:'Priorities',empty:'No tasks yet.',all:'Task board',attempts:'Attempts',replay:'Resume',pauseTask:'Pause',manual:'Waiting for runner',readOnly:'GitHub read-only',agentsTitle:'Agent connectivity',available:'Reader available',notConnected:'Not connected',manualOnly:'Manual only',controls:'Controls',pauseAll:'Pause all',resumeAll:'Enable safe monitoring',runNow:'Check queue',proofTitle:'Evidence',runs:'Executions',schedule:'Scheduler slots',brief:'Daily briefing',refresh:'Refresh',saved:'Task saved',error:'Unconfirmed',tooShort:'Describe the task in 10–800 characters',badUrl:'Exact books GitHub PR or Issue URL required',notCode:'Autonomous coding, merge and production deploy are not yet connected.',notLive:'GitHub verification is not production proof.',limited:'Only part of the task list is shown',unavailable:'Unavailable without the database',notice:'Other AI agents are integration placeholders, not live workers.'},
es:{brand:'Agent Studio',tag:'Control móvil de agentes',back:'Estrategia',home:'Resumen',tasks:'Tareas',agents:'Agentes',proof:'Resultados',welcome:'¿Qué tarea hacemos?',placeholder:'Por ejemplo, revisar PR 3796 o planificar una función de Holistic House…',kind:'Tipo de tarea',audit:'Revisar GitHub · solo lectura',code:'Cambiar código · en cola',spec:'Concepto / especificación',research:'Investigación · en cola',source:'Enlace exacto de GitHub PR o Issue',project:'Proyecto',noProject:'Todos los proyectos',priority:'Prioridad',submit:'Crear tarea',waiting:'Guardando…',voice:'Dictar',stop:'Detener',voiceFallback:'Usa el dictado del teclado iPhone',unknown:'La base de datos no está disponible. Estado desconocido.',paused:'Pausado',enabled:'Monitoreo seguro',total:'Total',active:'Activo',verified:'Verificado',blocked:'Bloqueado',focus:'Prioridades',empty:'Todavía no hay tareas.',all:'Tablero de tareas',attempts:'Intentos',replay:'Reanudar',pauseTask:'Pausar',manual:'Sin ejecutor',readOnly:'GitHub lectura',agentsTitle:'Agentes disponibles',available:'Lector disponible',notConnected:'No conectado',manualOnly:'Solo manual',controls:'Control',pauseAll:'Pausar todo',resumeAll:'Activar monitoreo seguro',runNow:'Revisar cola',proofTitle:'Evidencias',runs:'Ejecuciones',schedule:'Ciclos programados',brief:'Resumen diario',refresh:'Actualizar',saved:'Tarea guardada',error:'No confirmado',tooShort:'Describe la tarea en 10–800 caracteres',badUrl:'Se requiere un enlace GitHub PR o Issue de books',notCode:'Codificación autónoma, merge y despliegue aún no están conectados.',notLive:'Leer GitHub no verifica producción.',limited:'Hay más tareas',unavailable:'No disponible sin base de datos',notice:'Otros agentes AI son integraciones futuras, no ejecutores activos.'}
} as const;
const github=/^https:\/\/github\.com\/andylitvinov-design\/books\/(pull|issues)\/([1-9]\d{0,7})$/;
const validLink=(x:string)=>github.test(x)?x:null;
function stamp(value:string|undefined,lang:Lang){
 if(!value)return '—';
 try{return new Intl.DateTimeFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-CA',{dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(value));}
 catch{return '—';}
}
function tone(state:string){
 if(['completed_verified','completed_live','succeeded'].includes(state))return styles.good;
 if(state==='running')return styles.working;
 if(state.startsWith('blocked_')||state==='dead_letter'||state==='failed')return styles.bad;
 return styles.neutral;
}
type SpeechEvent={results:ArrayLike<ArrayLike<{transcript:string}>>};
type SpeechAPI={lang:string;interimResults:boolean;onresult:((e:SpeechEvent)=>void)|null;onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>SpeechAPI;webkitSpeechRecognition?:new()=>SpeechAPI};
export default function AgentStudio({lang,snapshot,agents,runtimeReady}:{lang:Lang;snapshot:Snapshot|null;agents:Agent[];runtimeReady:boolean}){
 const t=words[lang];const router=useRouter();
 const [tab,setTab]=useState<Tab>('home'),[kind,setKind]=useState<Kind>('product_spec');
 const [prompt,setPrompt]=useState(''),[source,setSource]=useState(''),[project,setProject]=useState(''),[priority,setPriority]=useState(50);
 const [feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[canVoice,setCanVoice]=useState(false),[recording,setRecording]=useState(false);
 const speech=useRef<SpeechAPI|null>(null);
 const enabled=Boolean(snapshot?.settings?.enabled&&runtimeReady);
 useEffect(()=>{
  const w=window as SpeechWindow;
  setCanVoice(Boolean(w.SpeechRecognition||w.webkitSpeechRecognition));
  return()=>{try{speech.current?.stop();}catch{ /* absent */ }};
 },[]);
 function dictate(){
  if(recording){speech.current?.stop();return;}
  const w=window as SpeechWindow;const Cls=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Cls)return;
  try{
   const r=new Cls();speech.current=r;r.lang=lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-US';r.interimResults=false;
   r.onresult=(event)=>{const x=Array.from(event.results).map(row=>row[0]?.transcript||'').join(' ').trim();if(x)setPrompt(v=>(v?v+' ':'')+x);};
   r.onend=()=>setRecording(false);r.onerror=()=>setRecording(false);r.start();setRecording(true);
  }catch{setRecording(false);}
 }
 async function issue(action:string,extra:Record<string,unknown>={}){
  if(busy||!snapshot)return null;
  setBusy(true);setFeedback('');
  try{
   const response=await fetch('/api/admin/command-center',{
    method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,requestId:crypto.randomUUID(),...extra})
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data||data.error||['unconfirmed','stale_unconfirmed','transition_denied'].includes(data.status))
    throw Error(String(data?.error||data?.status||response.status));
   router.refresh();return data;
  }catch(err){setFeedback(t.error+': '+(err instanceof Error?err.message:'UNKNOWN'));return null;}
  finally{setBusy(false);}
 }
 async function add(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const text=prompt.trim().replace(/\s+/g,' ');
  if(text.length<10||text.length>800){setFeedback(t.tooShort);return;}
  const src=kind==='repo_pr_audit'?validLink(source.trim()):null;
  if(kind==='repo_pr_audit'&&!src){setFeedback(t.badUrl);return;}
  const effectiveKind=src&&src.includes('/issues/')?'repo_issue_audit':kind;
  const result=await issue('create_task',{
   title:(src?'GitHub #'+src.split('/').at(-1)+': ':'')+text.slice(0,100),
   description:text,kind:effectiveKind,priority,projectId:project||null,sourceRef:src
  });
  if(result){setFeedback(t.saved+': '+String(result.task?.state||result.status));setPrompt('');setSource('');setTab('tasks');}
 }
 const nav:Array<[Tab,string,string]>=[['home','⌂',t.home],['tasks','☷',t.tasks],['agents','◈',t.agents],['proof','✓',t.proof]];
 return <main className={styles.root} lang={lang} data-hh-design="holistic-light">
  <div className={styles.wrap}>
   <header className={styles.hero}>
    <div className={styles.topline}><span className={styles.mark}>HH <span>✦</span></span><Link href="/admin/command-center">{t.back} ↗</Link></div>
    <span className={styles.eyebrow}>HOLISTIC HOUSE · {t.tag}</span>
    <h1>{t.brand}</h1>
    <p className={styles.sub}>{snapshot?(enabled?t.enabled:t.paused):t.unknown}</p>
   </header>
   <div className={styles.toolbar}><span>{snapshot?stamp(snapshot.observedAt,lang):'—'}</span>
    <button type="button" onClick={()=>router.refresh()}>{t.refresh} ↻</button></div>
   {tab==='home'&&<section className={styles.screen} aria-label={t.home}>
    <div className={styles.metrics}>{[
     [t.total,snapshot?.brief.total],[t.active,snapshot?.brief.active],[t.verified,snapshot?.brief.verified],[t.blocked,snapshot?.brief.blocked]
    ].map(([label,n])=><div className={styles.metric} key={label}><strong>{n??'—'}</strong><small>{label}</small></div>)}</div>
    <section className={styles.panel}><h2>{t.welcome}</h2>
     <form className={styles.form} onSubmit={add}>
      <label htmlFor="agent-prompt">{t.welcome}</label>
      <textarea id="agent-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4}
       placeholder={t.placeholder} minLength={10} maxLength={800} required disabled={busy||!snapshot}/>
      <div className={styles.voiceRow}><small>{prompt.length}/800</small>
       {canVoice?<button type="button" disabled={busy||!snapshot} aria-pressed={recording} onClick={dictate}>
        {recording?'■ '+t.stop:'◉ '+t.voice}</button>:<small>{t.voiceFallback}</small>}
      </div>
      <label htmlFor="agent-kind">{t.kind}</label>
      <select id="agent-kind" value={kind} onChange={e=>setKind(e.target.value as Kind)} disabled={busy||!snapshot}>
       <option value="product_spec">{t.spec}</option><option value="code_change">{t.code}</option>
       <option value="repo_pr_audit">{t.audit}</option><option value="research">{t.research}</option>
      </select>
      {kind==='repo_pr_audit'&&<><label htmlFor="agent-source">{t.source}</label>
       <input id="agent-source" type="url" value={source} onChange={e=>setSource(e.target.value)}
        maxLength={180} placeholder="https://github.com/andylitvinov-design/books/pull/3796"
        required disabled={busy||!snapshot}/></>}
      {Boolean(snapshot?.projects.length)&&<><label htmlFor="agent-project">{t.project}</label>
       <select id="agent-project" value={project} onChange={e=>setProject(e.target.value)} disabled={busy||!snapshot}>
        <option value="">{t.noProject}</option>{snapshot?.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
       </select></>}
      <label htmlFor="agent-priority">{t.priority}: {priority}</label>
      <input id="agent-priority" type="range" min="0" max="100" step="10" value={priority}
       onChange={e=>setPriority(Number(e.target.value))} disabled={busy||!snapshot}/>
      <p className={styles.hint}>{t.notCode}</p>
      <button className={styles.primary} type="submit" disabled={busy||!snapshot||prompt.trim().length<10}>
       {busy?t.waiting:t.submit} <span aria-hidden="true">→</span></button>
     </form>
    </section>
    <section className={styles.panel}><h2>{t.focus}</h2>
     {snapshot?.tasks.length?snapshot.tasks.slice(0,4).map(x=><article className={styles.row} key={x.id}>
       <span className={[styles.dot,tone(x.state)].join(' ')}/><div><strong>{x.title}</strong><small>{x.state}</small></div>
     </article>):<p className={styles.hint}>{t.empty}</p>}
     {snapshot?.partial&&<p className={styles.hint}>{t.limited}</p>}
    </section>
   </section>}
   {tab==='tasks'&&<section className={styles.screen} aria-label={t.tasks}>
    <section className={styles.panel}><h2>{t.all}</h2>
     {snapshot?.tasks.length?snapshot.tasks.map(x=><article className={styles.task} key={x.id}>
      <div className={styles.row}><span className={[styles.dot,tone(x.state)].join(' ')}/><div><strong>{x.title}</strong><small>{x.kind} · P{x.priority}</small></div></div>
      <p>{x.description}</p><div className={styles.tags}><span>{x.state}</span><span>{x.autoAllowed?t.readOnly:t.manual}</span><span>{t.attempts}: {x.attemptCount}</span></div>
      {x.sourceRef&&validLink(x.sourceRef)&&<a href={x.sourceRef} rel="noopener noreferrer" target="_blank">GitHub ↗</a>}
      {['ready','retry_wait'].includes(x.state)&&<button type="button" disabled={busy||!snapshot} onClick={()=>void issue('task_pause',{taskId:x.id})}>{t.pauseTask}</button>}
      {x.state==='paused'&&<button type="button" disabled={busy||!snapshot} onClick={()=>void issue('task_ready',{taskId:x.id})}>{t.replay}</button>}
     </article>):<p className={styles.hint}>{t.empty}</p>}
    </section>
   </section>}
   {tab==='agents'&&<section className={styles.screen} aria-label={t.agents}>
    <section className={styles.panel}><h2>{t.agentsTitle}</h2><p className={styles.hint}>{t.notice}</p>
     {agents.map(a=><div className={styles.row} key={a.id}>
      <span className={styles.avatar} aria-hidden="true">✧</span><div><strong>{a.id}</strong><small>{a.runtime} · {a.role}</small></div>
      <small className={a.status==='available_when_enabled'&&enabled?styles.ready:styles.offline}>
       {a.status==='available_when_enabled'?(enabled?t.available:t.paused):a.status==='manual_only'?t.manualOnly:t.notConnected}
      </small>
     </div>)}
    </section>
    <section className={styles.panel}><h2>{t.controls}</h2><div className={styles.controls}>
     <button type="button" disabled={!enabled||busy} onClick={()=>void issue('pause_all')}>{t.pauseAll}</button>
     <button type="button" disabled={busy||!snapshot||enabled||!runtimeReady} onClick={()=>void issue('resume_safe')}>{t.resumeAll}</button>
     <button type="button" className={styles.primary} disabled={!enabled||busy} onClick={()=>void issue('run_now')}>{t.runNow}</button>
    </div><p className={styles.hint}>{t.notCode}</p></section>
   </section>}
   {tab==='proof'&&<section className={styles.screen} aria-label={t.proof}>
    <section className={styles.panel}><h2>{t.proofTitle}</h2><p className={styles.hint}>{t.notLive}</p>
     {snapshot?.evidence.length?snapshot.evidence.map(e=><div className={styles.row} key={e.id+e.kind}>
      <div><strong>{e.kind}</strong><small>{stamp(e.createdAt,lang)}</small></div>
      {validLink(e.source)?<a href={e.source} rel="noopener noreferrer" target="_blank">GitHub ↗</a>:<span>—</span>}
     </div>):<p className={styles.hint}>{t.empty}</p>}
    </section>
    <section className={styles.panel}><h2>{t.runs}</h2>
     {snapshot?.runs.map(r=><div className={styles.row} key={r.id}><div><strong>{r.worker}</strong><small>{stamp(r.startedAt,lang)}</small></div><span>{r.errorCode||r.state}</span></div>)}
     {!snapshot?.runs.length&&<p className={styles.hint}>{t.empty}</p>}
    </section>
    <section className={styles.panel}><h2>{t.schedule}</h2>
     {snapshot?.slots.map(s=><div className={styles.row} key={s.time}><span>{stamp(s.time,lang)}</span><span>{s.error||s.state}</span></div>)}
     {!snapshot?.slots.length&&<p className={styles.hint}>{t.empty}</p>}
     <h3>{t.brief}</h3><p>{snapshot?.reportDate||'—'}</p>
    </section>
   </section>}
   <p className={styles.feedback} role="status" aria-live="polite">{feedback||(!snapshot?t.unavailable:'')}</p>
   <nav className={styles.dock} aria-label={t.tag}>{nav.map(([id,glyph,label])=>
    <button type="button" key={id} aria-pressed={tab===id} className={tab===id?styles.selected:undefined}
      onClick={()=>{setTab(id);setFeedback('');}}><span aria-hidden="true">{glyph}</span><small>{label}</small></button>)}</nav>
  </div>
 </main>;
}
