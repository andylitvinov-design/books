'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {BarChart3,Heart,MessageCircleQuestion,Sparkles,Target} from 'lucide-react'
import {SiteNavigation} from '@/components/site-navigation'
import {useSearchParams} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {collectJournalExport} from '@/lib/app/daybook-journal-export.mjs'
import DaybookGoalContext from './daybook-goal-context'
import {createJournalSessionGuard} from '@/lib/app/daybook-session-guard.mjs'
import {createGoalWorkspaceMemory} from '@/lib/app/daybook-goal-editor-session.mjs'
import {advanceDaybookRouteIntent,daybookRouteOptions} from '@/lib/app/daybook-route-intent.mjs'
import styles from './daybook-journal.module.css'
import DaybookStages from './daybook-stages'
import DiscoverPractice from './discover-practice'
const AntiStressDaybook=dynamic(()=>import('./anti-stress-daybook'))
import GoalJourneyPlanner from './goal-journey-planner'
import { ClarityDaybook, ClarityStartButton, ProgramStartLink } from './clarity-program'
import clarityStyles from './clarity-program.module.css'
import {programOnboardingPath} from '@/lib/app/program-daybook-entry.mjs'
import { clarityOnboardingPath } from '@/lib/app/clarity-program.mjs'
import {stageReadable,parseStageEntry} from '@/lib/app/daybook-stages.mjs'
import {GUIDE_WEEKS,guideReadable,parseGuideEntry} from '@/lib/app/daybook-guide.mjs'
const DaybookPersonalGoals=dynamic(()=>import('./daybook-personal-goals'))
const DaybookToday=dynamic(()=>import('./daybook-today'))
const DaybookWeekly=dynamic(()=>import('./daybook-weekly'))
const DaybookGrowth=dynamic(()=>import('./my-inner-balance-preview'))
const DaybookCoachLink=dynamic(()=>import('./daybook-coach-link'))

const copy={
 en:{title:'Coaching Daybook',home:'My Space',today:'Today',journal:'Journal',goals:'Goals',growth:'My growth',intro:'A private place for your thoughts and voluntary reflections.',loading:'Opening your private journal…',login:'Sign in to your cabinet',error:'Could not load your journal.',retry:'Try again',new:'New entry',note:'A thought',morning:'Morning reflection',evening:'Evening reflection',text:'Your private entry',tags:'Tags, separated by commas',date:'Local date',save:'Save',saving:'Saving…',saved:'Saved and verified',failed:'Save not confirmed. Your draft remains here. Retry before editing.',empty:'No entries yet.',edit:'Edit',remove:'Delete permanently',confirm:'Permanently delete this entry?',more:'Load more',search:'Search loaded entries by text or tag',cancel:'Discard draft',discard:'Discard this unsaved draft?',privacy:'Drafts stay only in this page’s memory. Leaving or signing out clears them. Nothing is shared with a coach automatically.',plan:'Open my goals and actions',vectors:'Open my development vectors',deleteError:'Deletion not confirmed. Reload your journal before trying again.'},
 ru:{title:'Коучинговый дневник',home:'Моё пространство',today:'Сегодня',journal:'Дневник',goals:'Цели',growth:'Мой рост',intro:'Личное место для мыслей и добровольной рефлексии.',loading:'Открываем личный дневник…',login:'Войти в кабинет',error:'Не удалось загрузить дневник.',retry:'Повторить',new:'Новая запись',note:'Мысль',morning:'Утренняя рефлексия',evening:'Вечерняя рефлексия',text:'Ваша личная запись',tags:'Теги через запятую',date:'Местная дата',save:'Сохранить',saving:'Сохранение…',saved:'Сохранено и проверено',failed:'Сохранение не подтверждено. Черновик остаётся здесь. Повторите перед редактированием.',empty:'Записей пока нет.',edit:'Изменить',remove:'Удалить навсегда',confirm:'Безвозвратно удалить эту запись?',more:'Загрузить ещё',search:'Поиск по тексту и тегам загруженных записей',cancel:'Удалить черновик',discard:'Удалить несохранённый черновик?',privacy:'Черновик хранится только в памяти страницы и очищается при выходе. Записи не передаются коучу автоматически.',plan:'Открыть мои цели и действия',vectors:'Открыть мои векторы развития',deleteError:'Удаление не подтверждено. Обновите дневник перед повторной попыткой.'},
 es:{title:'Diario de coaching',home:'Mi espacio',today:'Hoy',journal:'Diario',goals:'Objetivos',growth:'Mi crecimiento',intro:'Un espacio privado para tus pensamientos y reflexiones voluntarias.',loading:'Abriendo tu diario privado…',login:'Iniciar sesión en mi espacio',error:'No se pudo cargar el diario.',retry:'Reintentar',new:'Nueva entrada',note:'Un pensamiento',morning:'Reflexión de la mañana',evening:'Reflexión de la noche',text:'Tu entrada privada',tags:'Etiquetas separadas por comas',date:'Fecha local',save:'Guardar',saving:'Guardando…',saved:'Guardado y verificado',failed:'Guardado sin confirmar. El borrador sigue aquí. Reintenta antes de editar.',empty:'Aún no hay entradas.',edit:'Editar',remove:'Eliminar permanentemente',confirm:'¿Eliminar esta entrada permanentemente?',more:'Cargar más',search:'Buscar texto o etiquetas en las entradas cargadas',cancel:'Descartar borrador',discard:'¿Descartar este borrador sin guardar?',privacy:'Los borradores solo permanecen en la memoria de esta página. Salir o cerrar sesión los borra. No se comparten automáticamente con un coach.',plan:'Abrir mis objetivos y acciones',vectors:'Abrir mis vectores de desarrollo',deleteError:'Eliminación sin confirmar. Recarga el diario antes de reintentar.'},
}
const exportCopy={
 en:{download:'Export saved entries (JSON)',all:'Load all entries for search',working:'Reading all saved entries…',failed:'Could not finish. No partial file was downloaded. Try again.',large:'The export exceeds the current 32 MiB browser limit. No partial file was downloaded.',done:'Export file prepared. Unsaved drafts are not included.'},
 ru:{download:'Экспорт сохранённых записей (JSON)',all:'Загрузить все записи для поиска',working:'Чтение всех сохранённых записей…',failed:'Не удалось завершить. Неполный файл не скачан. Повторите попытку.',large:'Экспорт превышает текущий лимит браузера 32 МиБ. Неполный файл не скачан.',done:'Файл экспорта подготовлен. Несохранённые черновики не включены.'},
 es:{download:'Exportar entradas guardadas (JSON)',all:'Cargar todas las entradas para buscar',working:'Leyendo todas las entradas guardadas…',failed:'No se pudo completar. No se descargó un archivo parcial. Reintenta.',large:'La exportación supera el límite actual de 32 MiB del navegador. No se descargó un archivo parcial.',done:'Archivo de exportación preparado. No incluye borradores sin guardar.'},
}
// Passing Next's internal history state bypasses its useSearchParams update.
// Keep same-page controls synchronous so an older router.replace cannot later
// overwrite a newly selected goal, week or step.
function replaceDaybookURL(url){window.history.replaceState(null,'',url)}
export default function DaybookJournal({locale,...serverRoute}){
 const searchParams=useSearchParams()
 const clarityMode=searchParams ? searchParams.get('program')==='clarity' : serverRoute.initialProgram==='clarity'
 const antiStressMode=searchParams ? searchParams.get('program')==='anti-stress' : serverRoute.initialProgram==='anti-stress'
 const {autoStartVector=false,initialTab='stages',initialStage=1,initialLevel=1,initialStep=1,initialGoalId=null}=searchParams?daybookRouteOptions(Object.fromEntries(searchParams.entries())):serverRoute
 const c=copy[locale],root='/'+locale+'/app'
 const vectorDone=useCallback(()=>replaceDaybookURL(root+'/daybook?tab=goals'),[root])
 const [account,setAccount]=useState(null),[entries,setEntries]=useState([]),[next,setNext]=useState(null)
 const [phase,setPhase]=useState('loading'),[tab,setTab]=useState(autoStartVector?'goals':initialTab),[draft,setDraft]=useState(null),[status,setStatus]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false)
 const [stageNumber,setStageNumber]=useState(initialStage)
 const [guideLocked,setGuideLocked]=useState(false)
 const [guideEntryRequest,setGuideEntryRequest]=useState(null)
 const stageLabel={en:'Coaching guide',ru:'Коучинг-гид',es:'Guía de coaching'}[locale]
 useEffect(()=>{if(!guideLocked)setStageNumber(initialStage)},[initialStage,guideLocked])
 function selectStage(n){setStageNumber(n);const url=new URL(window.location.href);url.searchParams.set('stage',String(n));url.searchParams.set('step','1');url.searchParams.set('tab','stages');url.searchParams.delete('start');replaceDaybookURL(url)}
 function selectPosition({level,step,goalId}){const url=new URL(window.location.href);url.searchParams.set('level',String(level));url.searchParams.set('step',String(step));if(goalId)url.searchParams.set('goal',goalId);else url.searchParams.delete('goal');replaceDaybookURL(url)}
 function selectTab(key){if(guideLocked)return;if(key==='goals')setGoalsVisited(true);setTab(key);routeIntent.current=advanceDaybookRouteIntent(routeIntent.current,{autoStartVector:false,initialTab:key});const url=new URL(window.location.href);url.searchParams.set('tab',key);url.searchParams.delete('start');replaceDaybookURL(url)}
 const [exportStatus,setExportStatus]=useState('')
 const [goalsVisited,setGoalsVisited]=useState(false),[weeklyVisited,setWeeklyVisited]=useState(false)
 const routeIntent=useRef(advanceDaybookRouteIntent(null,{autoStartVector,initialTab}))
 const [vectorStartRequest,setVectorStartRequest]=useState(routeIntent.current.vectorStartRequest)
 useEffect(()=>{
  if(guideLocked)return
  const nextIntent=advanceDaybookRouteIntent(routeIntent.current,{autoStartVector,initialTab})
  if(nextIntent===routeIntent.current)return
  routeIntent.current=nextIntent
  setTab(nextIntent.tab);setVectorStartRequest(nextIntent.vectorStartRequest)
  if(nextIntent.tab==='goals')setGoalsVisited(true)
 },[autoStartVector,initialTab,initialStage,initialLevel,initialStep,initialGoalId,guideLocked])
 const epoch=useRef(0),owner=useRef(null),saver=useRef(null),saving=useRef(false)
 const sessionGuard=useRef(null)
 const journalField=useRef(null)
 useEffect(()=>{if(draft?.id)journalField.current?.focus()},[draft?.id])
 const goalMemory=useRef(null)
 const todayMemory=useRef(null),weeklyMemory=useRef(null)
 if(!goalMemory.current)goalMemory.current=createGoalWorkspaceMemory()
 if(!todayMemory.current)todayMemory.current=createGoalWorkspaceMemory()
 if(!weeklyMemory.current)weeklyMemory.current=createGoalWorkspaceMemory()
 const invalidate=useCallback(()=>{epoch.current++;saver.current?.discard()},[])
 const wipe=useCallback(()=>{invalidate();goalMemory.current?.clear();todayMemory.current?.clear();weeklyMemory.current?.clear();sessionGuard.current?.dispose();owner.current=null;saver.current=null;setAccount(null);setEntries([]);setDraft(null);setNext(null);setQuery('');setStatus('');setExportStatus('');setGoalsVisited(false);setWeeklyVisited(false);setBusy(false);setGuideLocked(false);setGuideEntryRequest(null);saving.current=false},[invalidate])
 const sessionLost=useCallback(()=>{wipe();setPhase('signed-out')},[wipe])
 const load=useCallback(async()=>{
  wipe();setPhase('loading');const token=epoch.current
  try{
   const boot=await appFetch('bootstrap?view=portrait')
   if(token!==epoch.current)return
   if(clarityMode&&boot.account.onboardingState!=='active'){window.location.replace(clarityOnboardingPath(locale));return}
   if(autoStartVector&&boot.account.onboardingState!=='active'){window.location.replace(programOnboardingPath(locale,'goal'));return}
   const id=boot.account.id
   const result=await appFetch('daybook-journal',undefined,'GET',{accountId:id})
   if(token!==epoch.current)return
   owner.current=id;saver.current=createJournalSaver(appFetch,id);setAccount(id);setEntries(result.entries);setNext(result.nextCursor);setPhase('ready')
  }catch(error){if(token===epoch.current)setPhase(error.status===401?'signed-out':'error')}
 },[wipe,clarityMode,antiStressMode,locale,autoStartVector])
 useEffect(()=>{
  void load()
  let channel
  try{channel=new BroadcastChannel('hh-app-session');channel.onmessage=e=>{if(e.data==='signed-out'){wipe();setPhase('signed-out')}}}catch{}
  const hide=()=>{wipe();setPhase('loading')},show=e=>{if(e.persisted)void load()}
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show)
  return ()=>{invalidate();goalMemory.current?.clear();todayMemory.current?.clear();weeklyMemory.current?.clear();channel?.close();window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show)}
 },[load,wipe,invalidate])
 useEffect(()=>{
  if(!account)return
  const guard=createJournalSessionGuard(appFetch,account,{
   lock:()=>setPhase('checking'),ready:()=>setPhase('ready'),
   invalid:()=>{wipe();setPhase('signed-out')},unavailable:()=>setPhase('locked-error'),
  })
  sessionGuard.current=guard
  const visibility=()=>{if(document.visibilityState==='hidden')guard.suspend();else void guard.verify()}
  const focus=()=>{if(document.visibilityState==='visible')void guard.verify()}
  document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',focus)
  return ()=>{guard.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus)}
 },[account,wipe])
 function open(entry){
  if(draft&&status!=='saved'&&!window.confirm(c.discard))return
  saver.current?.discard();saver.current=createJournalSaver(appFetch,account)
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
  setDraft(entry?{...entry,tags:[...entry.tags]}:{id:crypto.randomUUID(),revision:0,text:'',tags:[],kind:'note',locale,timezone,localDay:localJournalDay(new Date().toISOString(),timezone),goalId:null})
  setStatus('')
 }
 const save=useCallback(async()=>{
  if(saving.current||!draft||phase!=='ready')return
  saving.current=true;setBusy(true);setStatus('saving');const token=epoch.current
  try{
   const input={id:draft.id,revision:draft.revision,text:draft.text,tags:draft.tags.filter(tag=>tag.trim()),kind:draft.kind,locale:draft.locale,timezone:draft.timezone,localDay:draft.localDay,goalId:draft.goalId}
   const entry=await saver.current.save(input)
   if(token!==epoch.current)return
   setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)]);setDraft(entry);setStatus('saved')
  }catch(error){
   if(token!==epoch.current)return
   if(error.status===401||error.code==='ACCOUNT_CHANGED'){wipe();setPhase('signed-out')}
   else setStatus('failed')
  }finally{if(token===epoch.current){saving.current=false;setBusy(false)}}
 },[draft,phase,wipe])
 useEffect(()=>{
  if(!draft?.text.trim()||status!==''||busy||phase!=='ready')return
  const timer=setTimeout(()=>void save(),1200)
  return ()=>clearTimeout(timer)
 },[draft,status,busy,phase,save])
 function change(field,value){setDraft(old=>({...old,[field]:value}));setStatus('')}
 async function remove(entry){
  if(busy||!window.confirm(c.confirm))return
  const token=epoch.current;setBusy(true)
  try{
   await appFetch('daybook-journal',{id:entry.id,revision:entry.revision,operationId:crypto.randomUUID()},'DELETE',{accountId:account})
   if(token!==epoch.current)return
   setEntries(old=>old.filter(item=>item.id!==entry.id));if(draft?.id===entry.id)setDraft(null)
  }catch(error){if(token===epoch.current){if(error.status===401||error.code==='ACCOUNT_CHANGED'){wipe();setPhase('signed-out')}else setStatus('deleteError')}}
  finally{if(token===epoch.current)setBusy(false)}
 }
 async function more(){
  if(busy||!next)return
  setBusy(true);const token=epoch.current
  try{const result=await appFetch('daybook-journal?before='+encodeURIComponent(next),undefined,'GET',{accountId:account});if(token===epoch.current){setEntries(old=>[...old,...result.entries.filter(item=>!old.some(x=>x.id===item.id))]);setNext(result.nextCursor)}}catch{if(token===epoch.current)setStatus('error')}finally{if(token===epoch.current)setBusy(false)}
 }
 async function collect(download){
  if(busy)return
  setBusy(true);setExportStatus('working');const token=epoch.current
  try{
   const data=await collectJournalExport(appFetch,account,()=>token===epoch.current&&owner.current===account)
   if(token!==epoch.current)return
   if(download){
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='holistic-house-daybook-'+data.exportedAt.slice(0,10)+'.json';link.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExportStatus('done')
   }else{setEntries(data.entries);setNext(null);setExportStatus('')}
  }catch(error){if(token===epoch.current){if(error.status===401||error.code==='ACCOUNT_CHANGED'){wipe();setPhase('signed-out')}else setExportStatus(error.code==='JOURNAL_EXPORT_TOO_LARGE'?'large':'failed')}}
  finally{if(token===epoch.current)setBusy(false)}
 }
 const today=localJournalDay(new Date().toISOString(),Intl.DateTimeFormat().resolvedOptions().timeZone)
 const visible=entries.filter(entry=>(tab!=='today'||entry.localDay===today)&&(!query||[guideReadable(entry,locale)??stageReadable(entry,locale)??entry.text,...entry.tags].join(' ').toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))))
 function entryHref(entry){
  const guide=parseGuideEntry(entry),legacy=parseStageEntry(entry)
  const week=GUIDE_WEEKS.find(item=>item.id===(guide?.week||legacy?.stage))
  const q=new URLSearchParams({tab:'stages',stage:String(guide?.week==='review'?8:week?.number||1)})
  if(guide){q.set('level',String(guide.level));q.set('step',String(Math.max(1,(week?.steps.findIndex(item=>item.id===guide.step)??0)+1)))}
  if(entry.goalId)q.set('goal',entry.goalId)
  return root+'/daybook?'+q.toString()
 }
 function openGuideEntry(event,entry){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
  event.preventDefault()
  if(guideLocked)return
  const url=new URL(entryHref(entry),window.location.origin)
  const target=daybookRouteOptions(Object.fromEntries(url.searchParams.entries()))
  setStageNumber(target.initialStage);setTab('stages')
  setGuideEntryRequest({goalId:target.initialGoalId,level:target.initialLevel,step:target.initialStep})
  routeIntent.current=advanceDaybookRouteIntent(routeIntent.current,{autoStartVector:false,initialTab:'stages'})
  replaceDaybookURL(url)
 }
 if(antiStressMode)return <main className={phase==='ready'&&account?clarityStyles.coursePage:styles.page} data-daybook-view="anti-stress" data-cabinet-theme="daybook" data-daybook-page data-clarity-golden={phase==='ready'&&account?true:undefined}>
  {phase==='ready'&&account?<AntiStressDaybook key={account} locale={locale} accountId={account} entries={entries} hasMore={!!next} loadingAll={busy} onLoadAll={()=>void collect(false)} loadError={['failed','large'].includes(exportStatus)} onSessionLost={sessionLost} onSaved={entry=>{if(owner.current===account)setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)])}}/>:<>
   <header className={styles.masthead}><Link className={styles.brand} href={'/'+locale+'/my-page'}><Sparkles size={25}/><span>Holistic House</span></Link><SiteNavigation locale={locale} compact/></header>
   <section aria-live="polite"><p>{['loading','checking'].includes(phase)?c.loading:phase==='signed-out'?c.login:c.error}</p>{phase==='signed-out'?<Link href={'/'+locale+'/my-page'}>{c.login}</Link>:phase==='error'||phase==='locked-error'?<button onClick={()=>void(phase==='locked-error'?sessionGuard.current?.verify():load())}>{c.retry}</button>:null}</section>
  </>}
 </main>
 if(clarityMode)return <main className={phase==='ready'&&account?clarityStyles.coursePage:styles.page} data-daybook-view="clarity" data-cabinet-theme="daybook" data-daybook-page data-clarity-golden={phase==='ready'&&account?true:undefined}>
  {!(phase==='ready'&&account)&&<header className={styles.masthead}><Link className={styles.brand} href={root+'/portrait'}><Sparkles size={25} aria-hidden="true"/><span>Holistic House</span></Link><SiteNavigation locale={locale} compact/></header>}
  {phase==='ready'&&account?<ClarityDaybook key={account} locale={locale} accountId={account} entries={entries} hasMore={!!next} loadingAll={busy} onLoadAll={()=>void collect(false)} loadError={['failed','large'].includes(exportStatus)} onSessionLost={sessionLost} onSaved={entry=>{if(owner.current===account)setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)])}}><details><summary>{({en:'Optional: seven independent practices',ru:'Дополнительно: семь самостоятельных практик',es:'Opcional: siete prácticas autónomas'})[locale]||'Optional: seven independent practices'}</summary><DiscoverPractice key={'discover:'+account} locale={locale} accountId={account} entries={entries} hasMore={!!next} loadingAll={busy} loadError={['failed','large'].includes(exportStatus)} onLoadAll={()=>void collect(false)} onSessionLost={sessionLost} onSaved={entry=>{if(owner.current===account)setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)])}}/></details></ClarityDaybook>:
  <section aria-live="polite"><p>{['loading','checking'].includes(phase)?c.loading:phase==='signed-out'?c.login:c.error}</p>{phase==='signed-out'?<ClarityStartButton locale={locale}/>:phase==='error'||phase==='locked-error'?<button onClick={()=>void(phase==='locked-error'?sessionGuard.current?.verify():load())}>{c.retry}</button>:null}</section>}
 </main>
 return <main className={styles.page} data-daybook-view={tab} data-cabinet-theme="daybook" data-daybook-page>
  <header className={styles.masthead}><Link className={styles.brand} href={root+'/portrait'} aria-label={c.home}><Sparkles size={25} aria-hidden="true"/><span>Holistic House</span></Link><button type="button" className={styles.inlineHelp} data-daybook-inline-help aria-label={({en:'Open iHelp',ru:'Открыть iHelp',es:'Abrir iHelp'})[locale]} aria-haspopup="dialog" title="iHelp" onClick={()=>window.dispatchEvent(new Event('hh:open-ihelp'))}><MessageCircleQuestion size={19} aria-hidden="true"/></button><SiteNavigation locale={locale} compact/></header>
  <nav className={styles.destinations} aria-label={c.home}>
   <button type="button" aria-pressed={tab==='goals'} disabled={guideLocked} onClick={()=>selectTab('goals')}><Target size={21} aria-hidden="true"/>{({en:'My goals',ru:'Мои цели',es:'Mis metas'})[locale]}</button>
   <Link href={root+'/tests'}><BarChart3 size={21} aria-hidden="true"/>{({en:'Tests',ru:'Тесты',es:'Tests'})[locale]}</Link>
   <Link href={'/'+locale+'/holistic-support'}><Heart size={21} aria-hidden="true"/>{({en:'Support',ru:'Поддержка',es:'Apoyo'})[locale]}</Link>
  </nav>
  {tab!=='stages'&&<><h1>{c.title}</h1><p>{c.intro}</p></>}
  {phase!=='ready'?<section aria-live="polite"><p>{['loading','checking'].includes(phase)?c.loading:phase==='signed-out'?c.login:c.error}</p>{phase==='signed-out'?(autoStartVector?<ProgramStartLink locale={locale} program="goal">{c.login}</ProgramStartLink>:<Link href={root+'/portrait'}>{c.login}</Link>):phase==='error'||phase==='locked-error'?<button onClick={()=>void(phase==='locked-error'?sessionGuard.current?.verify():load())}>{c.retry}</button>:null}</section>:<>
   <Link href={root+'/daybook?program=anti-stress'} prefetch={false}>{({en:'Anti-Stress · 3 days of practices',ru:'Антистресс · 3 дня практик',es:'Antiestrés · 3 días de prácticas'})[locale]}</Link>
   {tab!=='stages'&&<nav data-daybook-workspace-nav className={styles.workspaceNav} aria-label={c.title}>{['stages','today','journal','growth'].map(key=><button key={key} disabled={guideLocked} aria-current={tab===key?'page':undefined} aria-label={key==='stages'?stageLabel:undefined} onClick={()=>selectTab(key)}>{key==='stages'?({en:'Guide',ru:'Гид',es:'Guía'})[locale]:c[key]}</button>)}</nav>}
   {tab==='today'&&<button onClick={()=>open(null)} disabled={busy||status==='failed'}>{c.new}</button>}
   {tab==='today'&&<DaybookToday key={account} accountId={account} locale={locale} initialDay={today} memory={todayMemory.current} onSessionLost={sessionLost}/>}
   {tab==='today'&&<details onToggle={event=>{if(event.currentTarget.open)setWeeklyVisited(true)}}><summary>{({en:'My weekly review',ru:'Мой недельный обзор',es:'Mi revisión semanal'})[locale]}</summary>{weeklyVisited&&<DaybookWeekly key={account} accountId={account} locale={locale} initialDay={today} memory={weeklyMemory.current} onSessionLost={sessionLost}/>}</details>}
   {(goalsVisited||tab==='goals')&&<div hidden={tab!=='goals'}><DaybookPersonalGoals key={account} accountId={account} locale={locale} onSessionLost={sessionLost} memory={goalMemory.current} autoStartVector={autoStartVector} vectorStartRequest={vectorStartRequest} onVectorDone={vectorDone}/><Link href={root+'/my-coaching-plan'}>{c.plan}</Link></div>}
   {tab==='goals'||tab==='stages'?null:tab==='growth'?<section><h2>{c.growth}</h2><DaybookGrowth accountId={account} locale={locale} onSessionLost={sessionLost}/></section>:<>
    {tab!=='today'&&<button onClick={()=>open(null)} disabled={busy||status==='failed'}>{c.new}</button>}
    {draft&&<section><label>{c.note}<select value={draft.kind} disabled={busy||status==='failed'} onChange={e=>change('kind',e.target.value)}>{['note','morning','evening'].map(kind=><option key={kind} value={kind}>{c[kind]}</option>)}</select></label>
     <DaybookGoalContext key={account} accountId={account} locale={locale} selectedId={draft.goalId} disabled={busy||status==='failed'} onChange={goalId=>change('goalId',goalId)} onSessionLost={sessionLost}/>
     <label>{c.text}<textarea ref={journalField} rows={7} maxLength={20000} value={draft.text} disabled={busy||status==='failed'} onChange={e=>change('text',e.target.value)}/></label>
     <label>{c.tags}<input value={draft.tags.join(',')} disabled={busy||status==='failed'} onChange={e=>change('tags',e.target.value.split(','))}/></label>
     <label>{c.date}<input type="date" value={draft.localDay} disabled={busy||status==='failed'} onChange={e=>change('localDay',e.target.value)}/></label>
     <p>{c.privacy}</p><button disabled={busy||!draft.text.trim()} onClick={()=>void save()}>{status==='failed'?c.retry:c.save}</button>
     <button disabled={busy} onClick={()=>{if(window.confirm(c.discard)){saver.current?.discard();saver.current=createJournalSaver(appFetch,account);setDraft(null);setStatus('')}}}>{c.cancel}</button>
    </section>}
    <p role="status">{c[status]||''}</p>
    <label>{c.search}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <button disabled={busy} onClick={()=>void collect(true)}>{exportCopy[locale].download}</button>
    {next&&<button disabled={busy} onClick={()=>void collect(false)}>{exportCopy[locale].all}</button>}
    <p role="status">{exportCopy[locale][exportStatus]||''}</p>
    {!visible.length&&<p>{c.empty}</p>}
    {visible.map(entry=><article key={entry.id}><time dateTime={entry.localDay}>{entry.localDay}</time><h2>{c[entry.kind]}</h2><p className={styles.entry}>{guideReadable(entry,locale)??stageReadable(entry,locale)??entry.text}</p><p>{entry.tags.join(' · ')}</p>{parseStageEntry(entry)||parseGuideEntry(entry)?<Link href={entryHref(entry)} prefetch={false} onClick={event=>openGuideEntry(event,entry)}>{stageLabel}</Link>:<button disabled={busy||status==='failed'} onClick={()=>open(entry)}>{c.edit}</button>}<button disabled={busy||status==='failed'} onClick={()=>void remove(entry)}>{c.remove}</button><DaybookCoachLink accountId={account} locale={locale} kind="journal" itemId={entry.id} revision={entry.revision} disabled={busy||status==='failed'} onSessionLost={sessionLost}/></article>)}
    {next&&<button disabled={busy} onClick={()=>void more()}>{c.more}</button>}
   </>}
  </>}
  {account&&<div className={styles.guide} hidden={phase!=='ready'||tab!=='stages'}><DaybookStages key={account} accountId={account} locale={locale} stageNumber={stageNumber} initialLevel={initialLevel} initialStep={initialStep} initialGoalId={initialGoalId} entryRequest={guideEntryRequest} onStage={selectStage} onPositionChange={selectPosition} entries={entries} hasMore={!!next} loadingAll={busy} loadError={['failed','large'].includes(exportStatus)} onLoadAll={()=>void collect(false)} onSaved={entry=>{if(owner.current===account)setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)])}} onSessionLost={sessionLost} onReload={()=>void load()} onTab={selectTab} onLockChange={setGuideLocked} ready={phase==='ready'&&tab==='stages'}>{account&&phase==='ready'&&tab==='stages'&&<GoalJourneyPlanner key={'journey:'+account} accountId={account} locale={locale} today={today} entries={entries} hasMore={!!next} loadingAll={busy} loadError={['failed','large'].includes(exportStatus)} onLoadAll={()=>void collect(false)} disabled={guideLocked} onTab={selectTab} onSessionLost={sessionLost} onSaved={entry=>{if(owner.current===account)setEntries(old=>[entry,...old.filter(item=>item.id!==entry.id)])}}/>}</DaybookStages></div>}
 </main>
}
