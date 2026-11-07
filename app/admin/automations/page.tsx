import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig} from '@/lib/app/config';
import {transaction,closeDatabase} from '@/lib/app/database';
import {readAutomationSnapshot} from '@/lib/automations/scout-db.mjs';
import {readClassifierAnnotations} from '@/lib/automations/classifier-store.mjs';
import {readCouncilProposals} from '@/lib/automations/weekly-council-store.mjs';
import CouncilProposalActions from '@/components/council-proposal-actions';
import AutomationControlActions from '@/components/automation-control-actions';
import {uiLocaleCookie} from '@/lib/ui-locale';
import styles from './automations.module.css';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'AI Council · Automations — Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'};
type Locale='ru'|'en'|'es';
type DbSnapshot={status:string;observedAt:string;tasks:Array<{
  task_id:string;description:string;enabled:boolean;schedule_cron:string}>;
  runs:Array<{run_id:string;slot_utc:string;state:string;
    candidates_inserted:number;duplicates:number;source_calls:number;error_code:string|null}>;
  candidates:Array<{candidate_id:string;source_page:string;title:string;
    creator:string;category:string;mime:string;review_state:string;rights_state:string}>;
  counts:{research_total:number;pending_review:number}|null;
  slots:Array<{slotUtc:string;state:string}>};
const copy={
  ru:{title:'Центр автоматизаций',subtitle:'Совет мудрецов · проверенные задачи и реальные результаты',
    back:'К видеобиблиотеке',task:'Автоматизации',runs:'Последние запуски',candidates:'Найденные видео — кандидаты',
    total:'Кандидатов в базе',pending:'Ожидают проверки',slots:'Часовых слотов за сутки',
    new:'Добавлено',duplicates:'Повторы',calls:'Запросы',model:'AI: 0 запросов для почасового поиска',
    rights:'Кандидаты не являются лицензированными MP4 и не доступны для генерации.',
    unavailable:'База автоматизаций ещё не доступна или миграция не применена. Статус и количество неизвестны.',
    paused:'Не активирована',enabled:'Работает по расписанию',inactive:'Не подключена',
    none:'В базе пока нет кандидатов',source:'Перейти к оригиналу',
    unknown:'Нет подтверждённых результатов',format:'Формат',schedule:'Расписание (UTC)',
    history:'История слотов',note:'Источник — Wikimedia Commons. Правовой и редакторский допуск выполняется отдельно.'},
  en:{title:'Automation Control Tower',subtitle:'AI Council · verified tasks and real results',
    back:'Video library',task:'Automations',runs:'Recent runs',candidates:'Discovered video candidates',
    total:'Research candidates',pending:'Awaiting review',slots:'Hourly slots (24h)',
    new:'Inserted',duplicates:'Duplicates',calls:'Calls',model:'AI: 0 calls for hourly search',
    rights:'Research candidates are not licensed MP4s and cannot be rendered.',
    unavailable:'Automation database unavailable or migration pending. Counts are unknown.',
    paused:'Not enabled',enabled:'Scheduled',inactive:'Not connected',
    none:'No candidates yet',source:'Open source',unknown:'No verified results',format:'Format',schedule:'Schedule (UTC)',
    history:'Slot history',note:'Source: Wikimedia Commons. Rights and editorial admission are separate.'},
  es:{title:'Centro de automatizaciones',subtitle:'Consejo de IA · tareas y resultados verificables',
    back:'Videoteca',task:'Automatizaciones',runs:'Ejecuciones recientes',candidates:'Vídeos candidatos',
    total:'Candidatos',pending:'Pendientes de revisión',slots:'Horas (24h)',
    new:'Añadidos',duplicates:'Duplicados',calls:'Consultas',model:'IA: 0 consultas para búsqueda horaria',
    rights:'Los candidatos no son vídeos MP4 aprobados para el generador.',
    unavailable:'Base de datos de automatizaciones no disponible. Cifras desconocidas.',
    paused:'Desactivada',enabled:'Programada',inactive:'Sin conectar',
    none:'Aún no hay candidatos',source:'Abrir original',unknown:'No hay resultados verificados',
    format:'Formato',schedule:'Horario (UTC)',history:'Historial horario',
    note:'Fuente: Wikimedia Commons. Los derechos y la revisión editorial son independientes.'},
} as const;
const stamp=(value:string,locale:Locale)=>{
  try{return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-US',{
    dateStyle:'short',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(value))}
  catch{return '—'};
};
const safeNumber=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0?value:'—';

export default async function AutomationsPage(){
  if(!await requireAdminRequest())redirect('/admin/login');
  const raw=(await cookies()).get(uiLocaleCookie)?.value;
  const locale:Locale=raw==='en'?'en':raw==='es'?'es':'ru';
  const t=copy[locale];
  let snapshot:DbSnapshot|null=null;
  try{
    snapshot=await transaction(getAppConfig(),null,
      (db: unknown)=>readAutomationSnapshot(db),{server:true}) as DbSnapshot;
  }catch{ /* Unknown database state is not an empty/successful report. */ }
  finally{await closeDatabase();}
  type AnnotationRow={candidate_id:string;title:string;summary:string;confidence:string;
    model_id:string;goals:string[];review_required:boolean};
  let annotations:AnnotationRow[]|null=null;
  if(snapshot) {
    try {annotations=await transaction(getAppConfig(),null,
      (db: unknown)=>readClassifierAnnotations(db),{server:true}) as AnnotationRow[];}
    catch { /* AI annotations remain unknown until actual private DB readback. */ }
    finally {await closeDatabase();}
  }
  type ProposalRow={proposal_id:string;state:string;created_at:string;
    proposal:{answer:string;actions:Array<{step:string;why:string;check:string}>;ownerApprovalRequired:boolean}};
  let proposals:ProposalRow[]|null=null;
  if(snapshot){
    try {proposals=await transaction(getAppConfig(),null,
      (db: unknown)=>readCouncilProposals(db),{server:true}) as ProposalRow[];}
    catch { /* Weekly Council schema is not yet verified. */ }
    finally {await closeDatabase();}
  }
  const scout=snapshot?.tasks.find(task=>task.task_id==='video-scout-hourly');
  const classifier=snapshot?.tasks.find(task=>task.task_id==='video-classifier-batch');
  const weekly=snapshot?.tasks.find(task=>task.task_id==='council-video-review-weekly');
  return <main className={styles.page} data-hh-design="holistic-light" lang={locale}>
    <PrescriptionAdminHeader title={{en:copy.en.title,ru:copy.ru.title}}
      description={{en:copy.en.subtitle,ru:copy.ru.subtitle}}/>
    <div className={styles.content}>
      <nav className={styles.links}><Link href="/admin/video-library">{t.back}</Link></nav>
      {!snapshot&&<p className={styles.warning} role="status">{t.unavailable}</p>}
      <section className={styles.metrics} aria-label={t.task}>
        <div className={styles.metric}><strong>{snapshot?safeNumber(snapshot.counts?.research_total):'—'}</strong><span>{t.total}</span></div>
        <div className={styles.metric}><strong>{snapshot?safeNumber(snapshot.counts?.pending_review):'—'}</strong><span>{t.pending}</span></div>
        <div className={styles.metric}><strong>{snapshot?'24':'—'}</strong><span>{t.slots}</span></div>
      </section>
      <section className={styles.section}>
        <h1>{t.task}</h1>
        {(snapshot?.tasks||[]).map(task=><div key={task.task_id} className={styles.task}>
          <div><h2>{task.task_id}</h2><p>{task.description}</p>
            <small>{t.schedule}: {task.schedule_cron}</small></div>
          <span className={styles.tag}>{task.task_id==='video-scout-hourly'?
            (task.enabled?t.enabled:t.paused):t.inactive}</span>
        </div>)}
        {scout&&<AutomationControlActions locale={locale} enabled={scout.enabled}/>}
        {classifier&&<AutomationControlActions locale={locale} taskId="video-classifier-batch" enabled={classifier.enabled}/>}
        {weekly&&<AutomationControlActions locale={locale} taskId="council-video-review-weekly" enabled={weekly.enabled}/>}
        <p className={styles.note}>{t.model}</p>
      </section>
      <section className={styles.section}>
        <h2>{t.runs}</h2>
        {snapshot?.runs.length?<div className={styles.runList}>
          {snapshot.runs.map(run=><div key={run.run_id} className={styles.run}>
            <strong>{stamp(run.slot_utc,locale)}</strong><span>{run.state}</span>
            <small>{t.new}: {safeNumber(run.candidates_inserted)} · {t.duplicates}: {safeNumber(run.duplicates)} · {t.calls}: {safeNumber(run.source_calls)}</small>
            {run.error_code&&<small>{run.error_code}</small>}
          </div>)}
        </div>:<p className={styles.note}>{t.unknown}</p>}
        <details className={styles.history}><summary>{t.history}</summary>
          <div className={styles.slots}>{snapshot?.slots.map(slot=><div key={slot.slotUtc}>
            <time dateTime={slot.slotUtc}>{stamp(slot.slotUtc,locale)}</time>
            <span>{slot.state}</span></div>)}</div>
        </details>
      </section>
      <section className={styles.section}>
        <h2>{locale==='ru'?'Совет мудрецов · предложения':
          locale==='es'?'Consejo de IA · propuestas':'AI Council · research proposals'}</h2>
        <p className={styles.note}>{locale==='ru'?
          'Каждое предложение требует решения владельца. Принятие не меняет расписание, бюджет и права на видео.':
          locale==='es'? 'Aceptar una propuesta no ejecuta tareas ni aprueba licencias.':
            'Acceptance records a planning decision; it does not run tasks or approve licenses.'}</p>
        {proposals===null?<p className={styles.note}>{t.inactive}</p>:
          proposals.length?<div className={styles.candidates}>{proposals.map(item=>
            <article key={item.proposal_id} className={styles.candidate}>
              <h3>{stamp(item.created_at,locale)} · {item.state}</h3>
              <p>{item.proposal.answer}</p>
              {(item.proposal.actions||[]).slice(0,3).map((action,i)=><div key={i}>
                <strong>{action.step}</strong><p>{action.why}</p><small>{action.check}</small>
              </div>)}
              {item.state==='pending_owner_review'&&item.proposal.ownerApprovalRequired&&
                <CouncilProposalActions proposalId={item.proposal_id} locale={locale}/>}
            </article>)}</div>:<p className={styles.note}>{t.none}</p>}
      </section>
      <section className={styles.section}>
        <h2>{locale==='ru'?'AI-классификация · только предложения':
          locale==='es'?'Clasificación IA · sugerencias':'AI classification · suggestions only'}</h2>
        {annotations===null?<p className={styles.note}>{t.inactive}</p>:
          annotations.length?<div className={styles.candidates}>{annotations.map(item=>
            <article key={item.candidate_id} className={styles.candidate}>
              <h3>{item.title}</h3><p>{item.summary}</p>
              <small>{item.goals.join(', ')} · {item.confidence} · {item.model_id}</small>
              <small>{t.rights}</small>
            </article>)}</div>:<p className={styles.note}>{t.none}</p>}
      </section>
      <section className={styles.section}>
        <h2>{t.candidates}</h2>
        <p className={styles.warning}>{t.rights}</p>
        <div className={styles.candidates}>{snapshot?.candidates.map(item=><article key={item.candidate_id} className={styles.candidate}>
          <h3>{item.title}</h3><p>{item.creator||'Wikimedia Commons'}</p>
          <small>{item.category} · {item.mime} · {item.rights_state}</small>
          <a href={item.source_page} target="_blank" rel="noopener noreferrer nofollow">{t.source}</a>
        </article>)}</div>
        {!snapshot?.candidates.length&&<p className={styles.note}>{t.none}</p>}
        <p className={styles.note}>{t.note}</p>
      </section>
    </div>
  </main>;
}
