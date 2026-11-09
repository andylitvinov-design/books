'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {reportPreviewRows} from '@/lib/personal-coaching/report-preview.mjs'
import styles from './coaching-report-preview.module.css'

const copy={
  en:{title:'Private report preview',note:'This partial draft uses your saved answers. It is not saved as a report; previewing it does not add actions to your plan.',open:'Preview report',loading:'Preparing preview…',empty:'There are no reportable answers yet.',actions:'Possible actions',failed:'The preview could not be loaded. Try again.',conflict:'Your session changed. Refresh it before previewing again.',safety:'If you are in immediate danger, contact local emergency services. Reach out to someone you trust or a qualified crisis service in your area.'},
  ru:{title:'Предпросмотр личного отчёта',note:'Этот неполный черновик использует ваши сохранённые ответы. Он ещё не сохранён как отчёт; просмотр не добавляет действия в ваш план.',open:'Предпросмотр отчёта',loading:'Подготавливаем предпросмотр…',empty:'Пока нет ответов для отчёта.',actions:'Возможные действия',failed:'Не удалось загрузить предпросмотр. Попробуйте снова.',conflict:'Сессия изменилась. Обновите её перед повторным просмотром.',safety:'Если вам угрожает непосредственная опасность, обратитесь в местную экстренную службу. Свяжитесь с человеком, которому доверяете, или с квалифицированной кризисной службой в вашем регионе.'},
  es:{title:'Vista previa privada del informe',note:'Este borrador parcial usa tus respuestas guardadas. Aún no se guarda como informe; verlo no añade acciones a tu plan.',open:'Vista previa del informe',loading:'Preparando vista previa…',empty:'Todavía no hay respuestas para el informe.',actions:'Posibles acciones',failed:'No se pudo cargar la vista previa. Inténtalo de nuevo.',conflict:'La sesión cambió. Actualízala antes de volver a verla.',safety:'Si estás en peligro inmediato, llama a los servicios de emergencia locales. Contacta con alguien de confianza o un servicio de crisis de tu zona.'},
}
export function CoachingReportPreviewResult({rows,locale='en'}){
  const t=copy[locale]||copy.en
  return <div data-report-result className={styles.result}>
    {rows.sections.map(item=><div key={item.key}><strong>{item.label}</strong><p>{item.text}</p></div>)}
    {rows.actions.length>0&&<div><strong>{t.actions}</strong><ul>{rows.actions.map(item=><li key={item.id}>{item.text} <small>({item.statusLabel})</small></li>)}</ul></div>}
    {!rows.sections.length&&!rows.actions.length&&<p>{t.empty}</p>}
  </div>
}
export default function CoachingReportPreview({accountId,sessionId,revision,locale='en'}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const key=JSON.stringify([accountId,sessionId,revision,lang])
  const controller=useRef(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    controller.current?.abort();controller.current=null;setResult(null);setBusy(false);setError('')
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
  const rows=result?.key===key?result.rows:null
  return <section className={styles.card} data-coaching-report-preview aria-label={t.title}>
    <h2>{t.title}</h2><p>{t.note}</p>
    <button type="button" className={styles.button} disabled={busy} onClick={load}>{busy?t.loading:t.open}</button>
    {error&&<p role="alert" className={styles.error}>{t[error]}</p>}
    {rows&&<CoachingReportPreviewResult rows={rows} locale={lang}/>}
  </section>
}
