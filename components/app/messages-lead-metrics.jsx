'use client'
import {useEffect,useMemo,useState} from 'react'
import {summarizeLoadedCrmEnquiries} from '@/lib/app/crm-intake-summary.mjs'
import styles from './messages-lead-metrics.module.css'

const TEXT={
  ru:{heading:'Статистика загруженных заявок',headingAll:'Статистика всех заявок сайта',unlinkedExact:'С контактом, но без привязки Telegram',caveatAll:'Все разрешённые заявки сайта за выбранный период. Другие виды обращений считаются отдельно.',error:'Полная статистика недоступна; показана только загруженная выборка.',loading:'Загружаем статистику CRM…',period:'Период',day:'24 часа',week:'7 дней',month:'30 дней',
    total:'Заявки',awaiting:'Ожидают первого ответа',unlinked:'Без подтверждённого мессенджера',
    sources:'Источники',services:'Услуги',none:'За выбранный период в загруженной выборке обращений нет.',
    unknown:'Неизвестно (нет согласованной атрибуции)',firstReply:'Время первого ответа: данных пока нет',
    caveat:'Учтены только обращения, загруженные в этот раздел. Это не полная статистика всей CRM.'},
  en:{heading:'Loaded enquiries summary',headingAll:'All website enquiries',unlinkedExact:'Contact without linked Telegram',caveatAll:'All owner-authorized website service enquiries for this period. Other request types are separate.',error:'Complete CRM stats are unavailable; showing loaded rows only.',loading:'Loading CRM analytics…',period:'Period',day:'24 hours',week:'7 days',month:'30 days',
    total:'Enquiries',awaiting:'Awaiting first action',unlinked:'Without verified messenger',
    sources:'Sources',services:'Services',none:'No requests in the loaded sample for this period.',
    unknown:'Unknown (no consented attribution)',firstReply:'First-response time: not measured yet',
    caveat:'Only requests loaded into this inbox are counted, not the complete CRM history.'},
  es:{heading:'Resumen de solicitudes cargadas',headingAll:'Todas las solicitudes web',unlinkedExact:'Contacto sin Telegram vinculado',caveatAll:'Todas las solicitudes web autorizadas durante este período. Otros tipos se cuentan aparte.',error:'No hay estadísticas completas; solo se muestran las solicitudes cargadas.',loading:'Cargando estadísticas CRM…',period:'Periodo',day:'24 horas',week:'7 días',month:'30 días',
    total:'Solicitudes',awaiting:'Esperando primera respuesta',unlinked:'Sin mensajería verificada',
    sources:'Fuentes',services:'Servicios',none:'No hay solicitudes en la muestra cargada para este período.',
    unknown:'Desconocido (sin atribución consentida)',firstReply:'Tiempo de primera respuesta: sin medir',
    caveat:'Solo se cuentan las solicitudes cargadas en esta bandeja, no todo el historial CRM.'},
}
export default function MessagesLeadMetrics({locale='en',accountId='',requests=[],businessEnquiries=[]}){
  const [period,setPeriod]=useState('week')
  const [opened,setOpened]=useState(false)
  const [remote,setRemote]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(false)
  const t=TEXT[locale]||TEXT.en
  const loaded=useMemo(()=>summarizeLoadedCrmEnquiries({requests,businessEnquiries},period),
    [requests,businessEnquiries,period])
  const key=accountId+':'+period
  const exact=remote?.key===key&&remote?.data?.scope==='all_authorized_public_service_enquiries'
  const summary=exact?{
    count:remote.data.total,
    awaitingFirstAction:remote.data.awaitingFirstAction,
    withoutVerifiedMessenger:remote.data.contactWithoutLinkedTelegram,
    bySource:remote.data.bySource,byService:remote.data.byService,
  }:loaded
  useEffect(()=>{
    if(!opened||!accountId)return
    const controller=new AbortController()
    setLoading(true);setError(false)
    fetch('/api/app/crm/enquiry-analytics?period='+encodeURIComponent(period),{
      method:'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok)throw Error('CRM_ANALYTICS_UNAVAILABLE')
      const data=await response.json()
      if(data?.scope!=='all_authorized_public_service_enquiries'||
         data.period!==period||!Number.isInteger(data.total)||
         !Array.isArray(data.bySource)||!Array.isArray(data.byService))
        throw Error('INVALID_CRM_ANALYTICS')
      if(!controller.signal.aborted)setRemote({key,data})
    }).catch(()=>{if(!controller.signal.aborted)setError(true)})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return ()=>controller.abort()
  },[opened,accountId,period,key])
  return <details className={styles.root} data-crm-loaded-intake-summary
    onToggle={event=>setOpened(event.currentTarget.open)}>
    <summary>{exact?t.headingAll:t.heading} · {summary.count}</summary>
    <div className={styles.content}>
      <label>{t.period}{' '}<select aria-label={t.period} value={period}
        onChange={event=>setPeriod(event.target.value)}>
        {['day','week','month'].map(key=><option key={key} value={key}>{t[key]}</option>)}
      </select></label>
      <div className={styles.counts}>
        <div><strong>{summary.count}</strong><span>{t.total}</span></div>
        <div><strong>{summary.awaitingFirstAction}</strong><span>{t.awaiting}</span></div>
        <div><strong>{summary.withoutVerifiedMessenger}</strong><span>{exact?t.unlinkedExact:t.unlinked}</span></div>
      </div>
      {summary.count>0?<div className={styles.groups}>
        <div><strong>{t.sources}</strong>{summary.bySource.slice(0,5).map(row=>
          <p key={row.name}><span>{row.name==='unknown'?t.unknown:row.name}</span><b>{row.count}</b></p>)}</div>
        <div><strong>{t.services}</strong>{summary.byService.slice(0,5).map(row=>
          <p key={row.name}><span>{row.name}</span><b>{row.count}</b></p>)}</div>
      </div>:<p className={styles.note}>{t.none}</p>}
      {loading&&<p className={styles.note} role="status">{t.loading}</p>}
      {error&&!exact&&<p className={styles.note} role="status">{t.error}</p>}
      <p className={styles.note}>{t.firstReply}</p>
      <p className={styles.note}>{exact?t.caveatAll:t.caveat}</p>
    </div>
  </details>
}
