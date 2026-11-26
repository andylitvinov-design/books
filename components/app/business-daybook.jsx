'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ArrowRight,BriefcaseBusiness,CheckCircle2,ChevronDown,LockKeyhole,NotebookPen,Save} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {collectJournalExport} from '@/lib/app/daybook-journal-export.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {createJournalSessionGuard} from '@/lib/app/daybook-session-guard.mjs'
import {BUSINESS_SYLLABUS,BUSINESS_SESSION_COUNT,businessTag,savedBusinessTask,businessProgress,legacyBusinessTasks} from '@/lib/app/business-daybook.mjs'
import {ProgramStartLink} from './clarity-program'
import {programOnboardingPath} from '@/lib/app/program-daybook-entry.mjs'
import css from './business-daybook.module.css'
import DaybookWeekReports from './daybook-week-reports'
const COPY={
 ru:{title:'Дневник роста бизнеса',intro:'8 сессий: стратегическое проектирование и практическая трансформация.',back:'В профиль',week:'Сессия',tasks:'3 практики сессии',completed:'Выполнено',open:'Открыть',save:'Сохранить и завершить',retry:'Повторить сохранение',saving:'Сохраняем…',saved:'Сохранено и проверено',loading:'Загружаем личный дневник…',failed:'Не удалось подтвердить сохранение. Повторите попытку; черновик остаётся здесь.',loadError:'Не удалось загрузить записи. Повторите попытку.',login:'Войти в личный кабинет',load:'Повторить',answer:'Мой ответ и результат',progress:'Прогресс самостоятельной работы',next:'Продолжить',done:'Все 24 практики завершены',private:'Записи приватны; они не передаются автоматически. Самостоятельные задания не означают оплаченную или проведённую консультацию.',offer:'Обсудить с бизнес-консультантом',offerHint:'Формат, стоимость и время согласуются отдельно.',discard:'Есть несохранённые ответы. Выйти и удалить черновики?'},
 en:{title:'Business Growth Daybook',intro:'8 sessions: strategic design and practical transformation.',back:'Back to profile',week:'Session',tasks:'3 session practices',completed:'Completed',open:'Open',save:'Save and complete',retry:'Retry save',saving:'Saving…',saved:'Saved and verified',loading:'Loading your private daybook…',failed:'Save not confirmed. Retry; your draft remains here.',loadError:'Could not load your entries. Try again.',login:'Sign in to your cabinet',load:'Retry',answer:'My answer and result',progress:'Self-guided progress',next:'Continue',done:'All 24 practices completed',private:'Entries stay private and are not shared automatically. Self-guided tasks do not mean a paid or delivered consultation.',offer:'Discuss with a business consultant',offerHint:'Format, price and time are agreed separately.',discard:'Unsaved answers remain. Leave and discard drafts?'},
 es:{title:'Diario de crecimiento empresarial',intro:'8 sesiones: diseño estratégico y transformación práctica.',back:'Volver al perfil',week:'Sesión',tasks:'3 prácticas de la sesión',completed:'Completado',open:'Abrir',save:'Guardar y completar',retry:'Reintentar guardado',saving:'Guardando…',saved:'Guardado y verificado',loading:'Cargando tu diario privado…',failed:'Guardado sin confirmar. Reintenta; se conserva el borrador.',loadError:'No se pudieron cargar las entradas. Reintenta.',login:'Iniciar sesión en tu espacio',load:'Reintentar',answer:'Mi respuesta y resultado',progress:'Progreso autónomo',next:'Continuar',done:'Las 24 prácticas están completas',private:'Las entradas son privadas y no se comparten automáticamente. Las prácticas no significan una consulta pagada ni realizada.',offer:'Hablar con un consultor empresarial',offerHint:'El formato, precio y horario se acuerdan por separado.',discard:'Hay respuestas sin guardar. ¿Salir y descartar los borradores?'}
}
const ARCHIVE_COPY={ru:'Архив предыдущей программы (4 сессии)',en:'Previous programme archive (4 sessions)',es:'Archivo del programa anterior (4 sesiones)'}
export default function BusinessDaybook({locale='en',initialWeek=null}){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang],syllabus=BUSINESS_SYLLABUS[lang],root='/'+lang
 const [account,setAccount]=useState(null),[phase,setPhase]=useState('loading'),[entries,setEntries]=useState([]),[week,setWeek]=useState(1),[step,setStep]=useState(null)
 const [drafts,setDrafts]=useState({}),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[saved,setSaved]=useState('')
 const owner=useRef(null),generation=useRef(0),saver=useRef(null),flight=useRef(false),guardRef=useRef(null)
 const wipe=useCallback((nextPhase='loading')=>{generation.current++;saver.current?.discard();saver.current=null;guardRef.current?.dispose();owner.current=null;flight.current=false;setAccount(null);setEntries([]);setDrafts({});setPending(null);setBusy(false);setFailed(false);setSaved('');setPhase(nextPhase)},[])
 const load=useCallback(async()=>{
  wipe();const token=generation.current
  try{
   const boot=await appFetch('bootstrap?view=portrait')
   if(token!==generation.current)return
   if(boot.account.onboardingState!=='active'){window.location.replace(programOnboardingPath(lang,'business'));return}
   const id=boot.account.id
   const data=await collectJournalExport(appFetch,id,()=>token===generation.current)
   if(token!==generation.current)return
   owner.current=id;saver.current=createJournalSaver(appFetch,id);setAccount(id);setEntries(data.entries)
   const next=businessProgress(data.entries).next;setWeek(Number.isInteger(initialWeek)&&initialWeek>=1&&initialWeek<=BUSINESS_SESSION_COUNT?initialWeek:(next?.week||BUSINESS_SESSION_COUNT));setStep(null);setPhase('ready')
  }catch(error){if(token===generation.current)setPhase(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'?'signed-out':'error')}
 },[wipe,lang,initialWeek])
 useEffect(()=>{
  void load();let channel
  try{channel=new BroadcastChannel('hh-app-session');channel.onmessage=e=>{if(e.data==='signed-out')wipe('signed-out')}}catch{}
  const hide=()=>wipe(),show=e=>{if(e.persisted)void load()}
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show)
  return()=>{generation.current++;saver.current?.discard();guardRef.current?.dispose();channel?.close();window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show)}
 },[load,wipe])
 useEffect(()=>{
  if(!account)return
  const guard=createJournalSessionGuard(appFetch,account,{lock:()=>setPhase('checking'),ready:()=>setPhase('ready'),invalid:()=>wipe('signed-out'),unavailable:()=>setPhase('locked-error')})
  guardRef.current=guard
  const visibility=()=>{if(document.visibilityState==='hidden')guard.suspend();else void guard.verify()}
  const focus=()=>{if(document.visibilityState==='visible')void guard.verify()}
  document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',focus)
  return()=>{guard.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus)}
 },[account,wipe])
 const hasDrafts=Object.keys(drafts).length>0,locked=!!pending||busy
 useEffect(()=>{
  if(!hasDrafts&&!pending)return
  const protect=e=>{e.preventDefault();e.returnValue=''}
  const click=e=>{const link=e.target instanceof Element?e.target.closest('a[href]'):null;if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.target==='_blank')return;if(pending||!window.confirm(t.discard)){e.preventDefault();e.stopPropagation()}}
  window.addEventListener('beforeunload',protect);document.addEventListener('click',click,true)
  return()=>{window.removeEventListener('beforeunload',protect);document.removeEventListener('click',click,true)}
 },[hasDrafts,pending,t.discard])
 const progress=businessProgress(entries),archive=legacyBusinessTasks(entries,lang)
 function selectWeek(n){if(locked||phase!=='ready')return;setWeek(n);setStep(null);setSaved('')}
 function selectStep(n){if(locked||phase!=='ready')return;setStep(old=>old===n?null:n);setSaved('')}
 async function saveTask(n){
  if(phase!=='ready'||flight.current||!saver.current||owner.current!==account)return
  const tag=businessTag(week,n),entry=savedBusinessTask(entries,week,n),answer=(drafts[tag]??entry?.text??'').trim()
  if(!answer)return
  let input=pending?.input
  if(pending&&pending.tag!==tag)return
  if(!input){const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;input={id:entry?.id||crypto.randomUUID(),revision:entry?.revision||0,kind:'note',goalId:null,tags:[tag],text:answer,locale:lang,timezone,localDay:localJournalDay(new Date().toISOString(),timezone)}}
  const token=generation.current;flight.current=true;setPending({tag,input});setBusy(true);setFailed(false)
  try{
   const result=await saver.current.save(input)
   if(token!==generation.current||owner.current!==account)return
   setEntries(old=>[result,...old.filter(e=>e.id!==result.id)]);setDrafts(old=>{const next={...old};delete next[tag];return next});setPending(null);setSaved(tag)
  }catch(error){
   if(token!==generation.current)return
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')wipe('signed-out')
   else setFailed(true)
  }finally{if(token===generation.current){flight.current=false;setBusy(false)}}
 }
 return <main className={css.page} data-cabinet-theme="daybook" data-business-daybook>
  <header className={css.brand}><Link href={root+'/app/portrait'}><ArrowLeft size={20} aria-hidden="true"/>{t.back}</Link><span>Holistic House</span></header>
  <section className={css.hero}><span><BriefcaseBusiness size={18} aria-hidden="true"/> BUSINESS · DAYBOOK</span><h1>{t.title}</h1><p>{t.intro}</p></section>
  {phase!=='ready'?<section className={css.canvas} aria-live="polite"><p>{phase==='signed-out'?t.login:phase==='error'||phase==='locked-error'?t.loadError:t.loading}</p>{phase==='signed-out'?<ProgramStartLink locale={lang} program="business" className={css.action}>{t.login}</ProgramStartLink>:phase==='error'||phase==='locked-error'?<button className={css.action} type="button" onClick={()=>void(phase==='locked-error'?guardRef.current?.verify():load())}>{t.load}</button>:null}</section>:<>
   <section className={css.summary}><div><strong>{t.progress}</strong><p>{progress.completed} / {progress.total}</p><progress max={progress.total} value={progress.completed} aria-label={t.progress}/></div><div className={css.ring} aria-label={t.progress+': '+progress.percent+'%'} role="img"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#e8d1a8" strokeWidth="7"/>{progress.percent>0&&<circle cx="32" cy="32" r="26" fill="none" stroke="#087652" strokeWidth="7" pathLength="100" strokeDasharray={progress.percent+' 100'} transform="rotate(-90 32 32)"/>}</svg><b>{progress.percent}%</b></div></section>
   <nav className={css.weeks} aria-label={t.week}>{syllabus.map((item,i)=><button key={item[0]} type="button" aria-pressed={week===i+1} disabled={locked} onClick={()=>selectWeek(i+1)}><span>{t.week} {i+1}</span><span className={css.weekTitle}>{item[0]}</span><small>{progress.weeks[i]===3?<CheckCircle2 size={17} aria-label={t.completed}/>:progress.weeks[i]+' / 3'}</small></button>)}</nav>
   <section className={css.canvas}><h2>{syllabus[week-1][0]}</h2><p>{syllabus[week-1][1]}</p>
    <Link className={css.premium} href={root+'/services/business-consulting#request-session'}><BriefcaseBusiness size={22} aria-hidden="true"/><span><strong>{t.offer}</strong><small>{t.offerHint}</small></span><ArrowRight size={18} aria-hidden="true"/></Link>
    <h3>{t.tasks} <span>{progress.weeks[week-1]} / 3</span></h3>
    {syllabus[week-1][2].map(([title,description],i)=>{
     const n=i+1,tag=businessTag(week,n),entry=savedBusinessTask(entries,week,n),answer=drafts[tag]??entry?.text??'',open=step===n
     return <article className={css.practice} key={tag} data-business-practice={tag}><button type="button" aria-expanded={open} disabled={locked} onClick={()=>selectStep(n)}><span className={css.number}>{n}</span><strong>{title}</strong>{entry?<CheckCircle2 size={23} aria-label={t.completed}/>:<ChevronDown size={21} aria-label={t.open}/>}</button>
      {open&&<div className={css.form}><p>{description}</p><label>{t.answer}<textarea rows={4} maxLength={1200} value={answer} disabled={locked} onChange={e=>{setDrafts(old=>({...old,[tag]:e.target.value}));setSaved('')}}/></label>
       {failed&&pending?.tag===tag&&<p role="alert">{t.failed}</p>}{saved===tag&&<p role="status">{t.saved}</p>}
       <button className={css.action} type="button" disabled={busy||!answer.trim()||!!pending&&pending.tag!==tag} onClick={()=>void saveTask(n)}><Save size={18} aria-hidden="true"/>{busy?t.saving:failed?t.retry:t.save}</button>
      </div>}
     </article>
    })}
    {progress.next?<button className={css.action} type="button" disabled={locked} onClick={()=>{setWeek(progress.next.week);setStep(progress.next.step);setSaved('')}}>{t.next} — {t.week} {progress.next.week}<ArrowRight size={19} aria-hidden="true"/></button>:<p className={css.finished}><CheckCircle2 size={21}/>{t.done}</p>}
    <DaybookWeekReports key={account+':business'} locale={lang} accountId={account} program="business" week={week}/>
    <p className={css.privacy}><LockKeyhole size={16} aria-hidden="true"/>{t.private}</p>
   </section>
   {archive.length>0&&<details className={css.archive} data-business-legacy-archive><summary>{ARCHIVE_COPY[lang]} · {archive.length}</summary>
     {archive.map(item=><article key={item.tag}><strong>{item.title} — {item.task}</strong><p>{item.text}</p></article>)}
   </details>}
  </>}
 </main>
}
