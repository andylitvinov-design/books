'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {reportPreviewRows} from '@/lib/personal-coaching/report-preview.mjs'
import {makeReportSaveIntent} from '@/lib/personal-coaching/report-save-intent.mjs'
import styles from './coaching-report-preview.module.css'

const copy={
  en:{title:'Private report preview',note:'This partial draft uses your saved answers. It is not saved as a report; previewing it does not add actions to your plan.',open:'Preview report',loading:'Preparing preview…',empty:'There are no reportable answers yet.',actions:'Possible actions',failed:'The preview could not be loaded. Try again.',conflict:'Your session changed. Refresh it before previewing again.',safety:'If you are in immediate danger, contact local emergency services. Reach out to someone you trust or a qualified crisis service in your area.'},
  ru:{title:'Предпросмотр личного отчёта',note:'Этот неполный черновик использует ваши сохранённые ответы. Он ещё не сохранён как отчёт; просмотр не добавляет действия в ваш план.',open:'Предпросмотр отчёта',loading:'Подготавливаем предпросмотр…',empty:'Пока нет ответов для отчёта.',actions:'Возможные действия',failed:'Не удалось загрузить предпросмотр. Попробуйте снова.',conflict:'Сессия изменилась. Обновите её перед повторным просмотром.',safety:'Если вам угрожает непосредственная опасность, обратитесь в местную экстренную службу. Свяжитесь с человеком, которому доверяете, или с квалифицированной кризисной службой в вашем регионе.'},
  es:{title:'Vista previa privada del informe',note:'Este borrador parcial usa tus respuestas guardadas. Aún no se guarda como informe; verlo no añade acciones a tu plan.',open:'Vista previa del informe',loading:'Preparando vista previa…',empty:'Todavía no hay respuestas para el informe.',actions:'Posibles acciones',failed:'No se pudo cargar la vista previa. Inténtalo de nuevo.',conflict:'La sesión cambió. Actualízala antes de volver a verla.',safety:'Si estás en peligro inmediato, llama a los servicios de emergencia locales. Contacta con alguien de confianza o un servicio de crisis de tu zona.'},
}
const saveCopy={
  en:{review:'Review each action',choose:'Choose an option',accepted:'Accept',deferred:'Defer',declined:'Decline',consent:'I agree to save this reviewed report privately in my account.',save:'Save report',saving:'Saving…',retry:'Retry saving',saved:'Your reviewed report is saved. No actions were added to your plan.',error:'The save could not be confirmed. Retry to use the same request.',locked:'Your choices are locked while this save is unresolved.',openPlan:'Open My Coaching Plan'},
  ru:{review:'Рассмотрите каждое действие',choose:'Выберите вариант',accepted:'Принять',deferred:'Отложить',declined:'Отклонить',consent:'Я согласен сохранить этот проверенный отчёт в личном аккаунте.',save:'Сохранить отчёт',saving:'Сохраняем…',retry:'Повторить сохранение',saved:'Проверенный отчёт сохранён. Действия в план не добавлены.',error:'Не удалось подтвердить сохранение. Повторите тот же запрос.',locked:'До подтверждения сохранения выбранные решения зафиксированы.',openPlan:'Перейти в My Coaching Plan'},
  es:{review:'Revisa cada acción',choose:'Elige una opción',accepted:'Aceptar',deferred:'Posponer',declined:'Rechazar',consent:'Acepto guardar este informe revisado de forma privada en mi cuenta.',save:'Guardar informe',saving:'Guardando…',retry:'Reintentar guardado',saved:'Tu informe revisado está guardado. No se añadieron acciones a tu plan.',error:'No se pudo confirmar el guardado. Reintenta la misma solicitud.',locked:'Tus decisiones quedan fijadas mientras se resuelve el guardado.',openPlan:'Abrir My Coaching Plan'},
}
const archiveCopy={
  en:{view:'View saved report',all:'View saved reports',title:'Saved reports',pick:'Choose a report',empty:'No saved report for this session.',emptyAll:'No saved reports.',exists:'A report for this session is already saved.',confirm:'Delete this saved report. Your coaching session will remain.',remove:'Delete saved report',deleted:'Saved report deleted.',failed:'Could not load or delete the saved report. Try again.'},
  ru:{view:'Открыть сохранённый отчёт',all:'Открыть сохранённые отчёты',title:'Сохранённые отчёты',pick:'Выберите отчёт',empty:'Для этой сессии нет сохранённого отчёта.',emptyAll:'Сохранённых отчётов нет.',exists:'Отчёт для этой сессии уже сохранён.',confirm:'Удалить этот сохранённый отчёт. Коучинговая сессия останется.',remove:'Удалить сохранённый отчёт',deleted:'Сохранённый отчёт удалён.',failed:'Не удалось загрузить или удалить отчёт. Попробуйте снова.'},
  es:{view:'Ver informe guardado',all:'Ver informes guardados',title:'Informes guardados',pick:'Elige un informe',empty:'No hay informe guardado para esta sesión.',emptyAll:'No hay informes guardados.',exists:'Ya hay un informe guardado para esta sesión.',confirm:'Eliminar este informe guardado. Tu sesión de coaching permanecerá.',remove:'Eliminar informe guardado',deleted:'Informe guardado eliminado.',failed:'No se pudo cargar o eliminar el informe. Inténtalo de nuevo.'},
}
const saveFailureCopy={
  en:{legacy:'This older session can be previewed, but cannot yet be saved as a report.',exists:'A report for this session already exists. Open the saved report below.'},
  ru:{legacy:'Старую сессию можно просмотреть, но сохранить её как отчёт пока нельзя.',exists:'Отчёт для этой сессии уже существует. Откройте его ниже.'},
  es:{legacy:'Esta sesión anterior se puede previsualizar, pero aún no se puede guardar como informe.',exists:'Ya existe un informe para esta sesión. Ábrelo abajo.'},
}
export function CoachingReportPreviewResult({rows,locale='en'}){
  const t=copy[locale]||copy.en
  return <div data-report-result className={styles.result}>
    {rows.sections.map(item=><div key={item.key}><strong>{item.label}</strong><p>{item.text}</p></div>)}
    {rows.actions.length>0&&<div><strong>{t.actions}</strong><ul>{rows.actions.map(item=><li key={item.id}>{item.text} <small>({item.statusLabel})</small></li>)}</ul></div>}
    {!rows.sections.length&&!rows.actions.length&&<p>{t.empty}</p>}
  </div>
}
export default function CoachingReportPreview({accountId,sessionId,revision,locale='en',archiveOnly=false}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const key=JSON.stringify([accountId,sessionId,revision,lang,archiveOnly])
  const controller=useRef(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const pending=useRef(false),locked=useRef(null)
  const [choices,setChoices]=useState({}),[consent,setConsent]=useState(false),[intent,setIntent]=useState(null),[saved,setSaved]=useState(false),[saveError,setSaveError]=useState(false)
  const [archiveState,setArchive]=useState(null),[deleteConfirmed,setDeleteConfirmed]=useState(false),[archiveError,setArchiveError]=useState(false)
  const archive=archiveState?.key===key?archiveState:null
  const st=saveCopy[lang],at=archiveCopy[lang]
  useEffect(()=>{
    controller.current?.abort();controller.current=null;setResult(null);setBusy(false);setError('')
    pending.current=false;locked.current=null;setChoices({});setConsent(false);setIntent(null);setSaved(false);setSaveError(false)
    setArchive(null);setDeleteConfirmed(false);setArchiveError(false)
    return()=>{controller.current?.abort();controller.current=null}
  },[key])
  async function load(){
    if(busy||!accountId||!sessionId||!Number.isSafeInteger(revision))return
    const active=new AbortController();controller.current=active;setBusy(true);setError('');setResult(null)
    try{
      const response=await appFetch('personal-coaching-report',{sessionId,revision,locale:lang},'POST',{accountId,signal:active.signal})
      if(active.signal.aborted)return
      if(response?.revision!==revision||response?.report?.sessionId!==sessionId)throw new Error('COACHING_REPORT_SOURCE_CHANGED')
      setResult({key,rows:reportPreviewRows(response.report,lang)})
    }catch(e){
      if(!active.signal.aborted)setError(e?.code==='PERSONAL_COACH_SAFETY_HOLD'?'safety':e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?'conflict':'failed')
    }finally{if(controller.current===active){controller.current=null;setBusy(false)}}
  }
  async function save(){
    if(pending.current||saved||!rows||(!locked.current&&archive?.rows))return
    let request=locked.current
    if(!request){
      try{request=makeReportSaveIntent({sessionId,revision,locale:lang},rows.actions,choices,consent,crypto.randomUUID())}
      catch{return}
      locked.current=request;setIntent(request)
    }
    const active=new AbortController();controller.current=active;pending.current=true;setBusy(true);setSaveError(false)
    try{
      const response=await appFetch('personal-coaching-reports',request,'POST',{accountId,signal:active.signal})
      if(active.signal.aborted)return
      if(!response?.saved||!response?.id||response.revision!==1)throw new Error('COACHING_REPORT_SAVE_UNCONFIRMED')
      setSaved(true)
    }catch(e){
      if(!active.signal.aborted){
        if(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'||e?.code==='COACHING_REPORT_SESSION_NOT_FOUND'||e?.code==='PERSONAL_COACH_SAFETY_HOLD'){
          locked.current=null;setIntent(null);setResult(null);setError(e.code==='PERSONAL_COACH_SAFETY_HOLD'?'safety':'conflict')
        }else if(e?.code==='COACHING_REPORT_SOURCE_UNVERSIONED'||e?.code==='COACHING_REPORT_ALREADY_SAVED'){
          locked.current=null;setIntent(null);setSaveError(e.code==='COACHING_REPORT_SOURCE_UNVERSIONED'?'legacy':'exists')
        }else setSaveError('unconfirmed')
      }
    }
    finally{if(controller.current===active){controller.current=null;pending.current=false;setBusy(false)}}
  }
  async function viewSaved(){
    if(pending.current||!accountId||(!archiveOnly&&!sessionId))return
    const active=new AbortController();controller.current=active;pending.current=true;setBusy(true);setArchiveError(false)
    try{
      const response=await appFetch('personal-coaching-reports',undefined,'GET',{accountId,signal:active.signal})
      if(active.signal.aborted)return
      if(!Array.isArray(response?.reports))throw new Error('COACHING_REPORT_ARCHIVE_INVALID')
      const matches=archiveOnly?response.reports:response.reports.filter(item=>item.sessionId===sessionId)
      if(matches.length>128||(!archiveOnly&&matches.length>1))throw new Error('COACHING_REPORT_ARCHIVE_INVALID')
      const seen=new Set()
      const items=matches.map(item=>{
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)||seen.has(item.id)||item.report?.sessionId!==item.sessionId||!Number.isFinite(Date.parse(item.createdAt)))throw new Error('COACHING_REPORT_ARCHIVE_INVALID')
        seen.add(item.id)
        return {id:item.id,createdAt:item.createdAt,rows:reportPreviewRows(item.report,lang)}
      })
      setArchive(items.length?{...items[0],items,key}:{empty:true,key})
      setDeleteConfirmed(false)
    }catch{if(!active.signal.aborted)setArchiveError(true)}
    finally{if(controller.current===active){controller.current=null;pending.current=false;setBusy(false)}}
  }
  async function deleteSaved(){
    if(pending.current||!archive?.id||!deleteConfirmed)return
    const active=new AbortController();controller.current=active;pending.current=true;setBusy(true);setArchiveError(false)
    try{
      const response=await appFetch(`personal-coaching-reports/${archive.id}/delete`,{confirmed:true},'POST',{accountId,signal:active.signal})
      if(active.signal.aborted)return
      if(response?.deleted!==true)throw new Error('COACHING_REPORT_DELETE_UNCONFIRMED')
      const remaining=archive.items.filter(item=>item.id!==archive.id)
      setArchive(archiveOnly&&remaining.length?{...remaining[0],items:remaining,key}:{deleted:true,key});setDeleteConfirmed(false);setSaved(false);setIntent(null);locked.current=null;setChoices({});setConsent(false)
    }catch{if(!active.signal.aborted)setArchiveError(true)}
    finally{if(controller.current===active){controller.current=null;pending.current=false;setBusy(false)}}
  }
  const rows=result?.key===key?result.rows:null
  return <section className={styles.card} data-coaching-report-preview aria-label={archiveOnly?at.title:t.title}>
    <h2>{archiveOnly?at.title:t.title}</h2>{!archiveOnly&&<><p>{saved?st.saved:t.note}</p>
    {saved&&<Link className={styles.button} href={`/${lang}/app/my-coaching-plan?tab=reports`}>{st.openPlan}</Link>}
    <button type="button" className={styles.button} disabled={busy||!!intent} onClick={load}>{busy&&!intent?t.loading:t.open}</button>
    {error&&<p role="alert" className={styles.error}>{t[error]}</p>}
    {rows&&<CoachingReportPreviewResult rows={rows} locale={lang}/>}
    {rows&&!saved&&<div className={styles.review}>
      {rows.actions.length>0&&<strong>{st.review}</strong>}
      {rows.actions.map(item=><label key={item.id}>{item.text}
        <select value={choices[item.id]||''} disabled={!!intent||busy} onChange={event=>setChoices(previous=>({...previous,[item.id]:event.target.value}))}>
          <option value="">{st.choose}</option><option value="accepted">{st.accepted}</option><option value="deferred">{st.deferred}</option><option value="declined">{st.declined}</option>
        </select>
      </label>)}
      <label><input type="checkbox" checked={consent} disabled={!!intent||busy} onChange={event=>setConsent(event.target.checked)}/> {st.consent}</label>
      {intent&&<p>{st.locked}</p>}
      {saveError&&<p role="alert" className={styles.error}>{saveError==='unconfirmed'?st.error:saveFailureCopy[lang][saveError]}</p>}
      {archive?.rows&&!intent&&<p>{at.exists}</p>}
      <button type="button" className={styles.button} disabled={busy||(!intent&&(!!archive?.rows||saveError==='legacy'||saveError==='exists'||!consent||rows.actions.some(item=>!choices[item.id])))} onClick={save}>{busy?st.saving:intent?st.retry:st.save}</button>
    </div>}</>}
    <button type="button" className={styles.button} disabled={busy} onClick={viewSaved}>{archiveOnly?at.all:at.view}</button>
    {archiveError&&<p role="alert" className={styles.error}>{at.failed}</p>}
    {archive?.empty&&<p>{archiveOnly?at.emptyAll:at.empty}</p>}{archive?.deleted&&<p>{at.deleted}</p>}
    {archive?.rows&&<div className={styles.review}>
      {archiveOnly&&<label>{at.pick}<select value={archive.id} disabled={busy} onChange={event=>{const selected=archive.items.find(item=>item.id===event.target.value);if(selected){setArchive({...selected,items:archive.items,key});setDeleteConfirmed(false)}}}>{archive.items.map((item,index)=><option key={item.id} value={item.id}>{index+1} · {new Date(item.createdAt).toLocaleDateString(lang)}</option>)}</select></label>}
      <CoachingReportPreviewResult rows={archive.rows} locale={lang}/>
      <Link className={styles.button} href={`/${lang}/app/my-coaching-plan?tab=reports`}>{st.openPlan}</Link>
      <label><input type="checkbox" checked={deleteConfirmed} disabled={busy} onChange={event=>setDeleteConfirmed(event.target.checked)}/> {at.confirm}</label>
      <button type="button" className={styles.button} disabled={busy||!deleteConfirmed} onClick={deleteSaved}>{at.remove}</button>
    </div>}
  </section>
}
