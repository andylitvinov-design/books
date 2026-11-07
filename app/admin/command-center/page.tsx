import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig} from '@/lib/app/config';
import {transaction,closeDatabase} from '@/lib/app/database';
import {readCommandSnapshot} from '@/lib/command-center/store.mjs';
import {CC_AGENT_REGISTRY} from '@/lib/command-center/contracts.mjs';
import {uiLocaleCookie} from '@/lib/ui-locale';
import CommandCenterActions from './command-center-actions';
import styles from './command-center.module.css';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Command Center · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'};
type Lang='ru'|'en'|'es';
type Snap={status:string;observedAt:string;settings:{enabled:boolean;max_runs_per_day:number}|null;
  objectives:Array<{id:string;title:string;summary:string;state:string}>;
  projects:Array<{id:string;title:string;summary:string;state:string}>;
  tasks:Array<{id:string;title:string;description:string;kind:string;state:string;priority:number;
    source_ref:string|null;attempt_count:number;auto_allowed:boolean}>;
  runs:Array<{id:string;worker_id:string;state:string;error_code:string|null;started_at:string}>;
  evidence:Array<{task_id:string;run_id:string;source_url:string;created_at:string;evidence_kind:string}>;
  slots:Array<{slot_utc:string;state:string}>;
  brief:{total:number;verified:number;active:number;blocked:number;focus:Array<{id:string;title:string;state:string}>};
  partial:boolean;dailyReport:{date_utc:string}|null;};
const copy={
  ru:{title:'Центр управления',sub:'Стратегия → задачи → агенты → проверенный результат',back:'Автоматизации',
    goals:'Цели',projects:'Проекты',tasks:'Задачи',active:'В работе',verified:'Подтверждено',
    blocked:'Требуют решения',empty:'Данных пока нет. Создайте первую цель или задачу.',
    unavailable:'База Command Center не подключена или миграция ещё не применена. Статусы неизвестны.',
    latest:'Приоритетные задачи',portfolio:'Стратегический портфель',queue:'Доска задач',agents:'Исполнители и доступность',
    history:'Последние исполнения',evidence:'Независимые подтверждения',paused:'Пауза',on:'Активирован',
    gate:'Запуск AI-кодирования пока не разрешён. Первый исполнитель только читает публичные GitHub PR/Issues.',
    proof:'Подтверждение метаданных GitHub ≠ готовый релиз или работающий сайт.',
    notConnected:'Не подключён',manual:'Ручная передача',available:'Доступен после активации',
    unknown:'Нет подтверждённых запусков',scout:'Video Scout',report:'Ежедневный брифинг'},
  en:{title:'Command Center',sub:'Strategy → tasks → agents → independently verified results',back:'Automations',
    goals:'Objectives',projects:'Projects',tasks:'Tasks',active:'Running',verified:'Verified',
    blocked:'Needs decision',empty:'No records yet. Create a goal or a task.',
    unavailable:'Command Center database is unavailable or its migration is pending. Statuses are unknown.',
    latest:'Top priorities',portfolio:'Strategic portfolio',queue:'Task board',agents:'Agents and readiness',
    history:'Recent runs',evidence:'Independent evidence',paused:'Paused',on:'Activated',
    gate:'AI coding launch is not approved. The first agent only reads public GitHub PRs and issues.',
    proof:'GitHub metadata readback does not prove a release or functional acceptance.',
    notConnected:'Not connected',manual:'Manual handoff',available:'Available after activation',
    unknown:'No verified runs',scout:'Video Scout',report:'Daily briefing'},
  es:{title:'Centro de mando',sub:'Estrategia → tareas → agentes → resultados verificados',back:'Automatizaciones',
    goals:'Objetivos',projects:'Proyectos',tasks:'Tareas',active:'En curso',verified:'Verificadas',
    blocked:'Requieren decisión',empty:'Aún no hay datos. Cree un objetivo o una tarea.',
    unavailable:'Base de datos pendiente o inaccesible. Se desconocen los estados.',
    latest:'Prioridades',portfolio:'Cartera estratégica',queue:'Tablero',agents:'Agentes y disponibilidad',
    history:'Ejecuciones recientes',evidence:'Evidencia independiente',paused:'Pausado',on:'Activado',
    gate:'La codificación IA no está habilitada. Solo se permiten lecturas públicas de GitHub.',
    proof:'Leer metadatos de GitHub no prueba un lanzamiento o aceptación funcional.',
    notConnected:'Sin conexión',manual:'Transferencia manual',available:'Disponible tras activación',
    unknown:'No hay ejecuciones verificadas',scout:'Video Scout',report:'Resumen diario'}
} as const;
function formatTime(value:string|undefined){
  if(!value)return '—';
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
  catch{return '—';}
}
export default async function CommandCenterPage(){
  if(!await requireAdminRequest())redirect('/admin/login');
  const raw=(await cookies()).get(uiLocaleCookie)?.value;
  const lang:Lang=raw==='es'?'es':raw==='en'?'en':'ru';
  const c=copy[lang];let snapshot:Snap|null=null;
  try{snapshot=await transaction(getAppConfig(),null,(db: unknown)=>readCommandSnapshot(db),{server:true}) as Snap;}
  catch{snapshot=null;}finally{await closeDatabase();}
  const envReady=process.env.VERCEL_ENV==='production'&&process.env.HH_CC_TICK_ENABLED==='true';
  const enabled=Boolean(snapshot?.settings?.enabled&&envReady);
  const board=[{id:'ready',label:lang==='ru'?'Готово к запуску':lang==='es'?'Listo':'Ready',states:['ready','retry_wait']},
    {id:'working',label:lang==='ru'?'Выполняется':lang==='es'?'En proceso':'Working',states:['running','awaiting_evidence']},
    {id:'blocked',label:lang==='ru'?'Ожидание решения':lang==='es'?'Bloqueado':'Blocked',states:['blocked_approval','blocked_budget','blocked_external','blocked_no_runner','blocked_dependency','dead_letter','needs_spec','paused']},
    {id:'done',label:lang==='ru'?'Проверено':lang==='es'?'Verificado':'Verified',states:['completed_verified','completed_live']}];
  return <main className={styles.page} lang={lang} data-hh-design="holistic-light">
    <PrescriptionAdminHeader title={{ru:copy.ru.title,en:copy.en.title}} description={{ru:copy.ru.sub,en:copy.en.sub}}/>
    <div className={styles.content}>
      <nav className={styles.links} aria-label="Command Center"><Link href="/admin/command-center/mobile">Agent Studio · Mobile</Link><Link href="/admin/automations">{c.back}</Link><Link href="/admin">Admin</Link></nav>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>HOLISTIC HOUSE · STRATEGY OS</p>
          <h1>{c.title}</h1><p>{c.sub}</p></div>
        <span className={enabled?styles.live:styles.off}>
          {snapshot?(enabled?c.on:c.paused):'UNKNOWN'}
        </span>
      </header>
      {!snapshot&&<p className={styles.warning} role="status">{c.unavailable}</p>}
      <div className={styles.metrics}>
        {[
          {n:snapshot?.objectives.length??'—',label:c.goals},
          {n:snapshot?.projects.length??'—',label:c.projects},
          {n:snapshot?.brief.total??'—',label:c.tasks},
          {n:snapshot?.brief.active??'—',label:c.active},
          {n:snapshot?.brief.verified??'—',label:c.verified},
          {n:snapshot?.brief.blocked??'—',label:c.blocked}
        ].map(item=><div className={styles.metric} key={item.label}>
          <strong>{item.n}</strong><span>{item.label}</span></div>)}
      </div>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{c.latest}</h2><small>{snapshot?.observedAt?formatTime(snapshot.observedAt):'—'}</small></div>
        {snapshot?.brief.focus.length?snapshot.brief.focus.map(t=><div key={t.id} className={styles.focus}>
          <span className={styles.dot}/><strong>{t.title}</strong><small>{t.state}</small>
        </div>):<p className={styles.muted}>{c.empty}</p>}
        <CommandCenterActions lang={lang} enabled={enabled} envReady={envReady} available={Boolean(snapshot)} projects={snapshot?.projects||[]}/>
        <p className={styles.caution}>{c.gate}</p>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{c.portfolio}</h2><small>{c.projects}</small></div>
        {snapshot?.projects.length?<div className={styles.projectGrid}>{snapshot.projects.map(p=><article key={p.id} className={styles.project}>
          <h3>{p.title}</h3><p>{p.summary}</p><small>{p.state}</small>
        </article>)}</div>:<p className={styles.muted}>{c.empty}</p>}
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{c.queue}</h2><small>{snapshot?.partial?'50+':'—'}</small></div>
        <div className={styles.board}>{board.map(column=><div key={column.id} className={styles.lane}>
          <h3>{column.label}</h3>
          {snapshot?.tasks.filter(t=>column.states.includes(t.state)).map(task=><article className={styles.task} key={task.id}>
            <p className={styles.taskTitle}>{task.title}</p>
            <small>{task.kind} · P{task.priority} · {task.state}</small>
            <p>{task.description}</p>
            {task.source_ref&&<a href={task.source_ref} target="_blank" rel="noopener noreferrer">GitHub evidence source</a>}
            {task.attempt_count>0&&<small>{task.attempt_count} attempts</small>}
          </article>)}
          {!snapshot?.tasks.some(t=>column.states.includes(t.state))&&<p className={styles.muted}>—</p>}
        </div>)}</div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{c.agents}</h2><small>{CC_AGENT_REGISTRY.length}</small></div>
        <div className={styles.agents}>{CC_AGENT_REGISTRY.map(a=><article key={a.id} className={styles.agent}>
          <h3>{a.id}</h3><span>{a.role}</span><small>{a.status==='not_connected'?c.notConnected:a.status==='manual_only'?c.manual:c.available}</small>
          <small>{a.runtime} · {a.expense}</small>
        </article>)}</div>
      </section>
      <div className={styles.bottomGrid}>
        <section className={styles.panel}><h2>{c.history}</h2>
          {snapshot?.runs.length?snapshot.runs.map(run=><div key={run.id} className={styles.historyItem}>
            <strong>{run.worker_id}</strong><span>{run.state}</span>
            <small>{formatTime(run.started_at)} {run.error_code||''}</small></div>):<p className={styles.muted}>{c.unknown}</p>}
        </section>
        <section className={styles.panel}><h2>{c.evidence}</h2>
          {snapshot?.evidence.length?snapshot.evidence.map(e=><div key={e.run_id+e.evidence_kind} className={styles.historyItem}>
            <a href={e.source_url} target="_blank" rel="noopener noreferrer">{e.evidence_kind}</a>
            <small>{formatTime(e.created_at)}</small></div>):<p className={styles.muted}>{c.unknown}</p>}
          <p className={styles.caution}>{c.proof}</p>
          <h3>{c.report}</h3><p className={styles.muted}>{snapshot?.dailyReport?.date_utc||c.unknown}</p>
        </section>
      </div>
      <div className={styles.footer}><Link href="/admin/automations">{c.scout}</Link><span>CC Policy v1 · {snapshot?'Database readback':'Not activated'}</span></div>
    </div>
  </main>;
}
