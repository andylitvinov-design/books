'use client'
import {useMemo,useState} from 'react'
import {summarizeLoadedCrmEnquiries} from '@/lib/app/crm-intake-summary.mjs'
import styles from './messages-lead-metrics.module.css'

const TEXT={
  ru:{heading:'Статистика загруженных заявок',period:'Период',day:'24 часа',week:'7 дней',month:'30 дней',
    total:'Заявки',awaiting:'Ожидают первого ответа',unlinked:'Без подтверждённого мессенджера',
    sources:'Источники',services:'Услуги',none:'За выбранный период в загруженной выборке обращений нет.',
    unknown:'Неизвестно (нет согласованной атрибуции)',firstReply:'Время первого ответа: данных пока нет',
    caveat:'Учтены только обращения, загруженные в этот раздел. Это не полная статистика всей CRM.'},
  en:{heading:'Loaded enquiries summary',period:'Period',day:'24 hours',week:'7 days',month:'30 days',
    total:'Enquiries',awaiting:'Awaiting first action',unlinked:'Without verified messenger',
    sources:'Sources',services:'Services',none:'No requests in the loaded sample for this period.',
    unknown:'Unknown (no consented attribution)',firstReply:'First-response time: not measured yet',
    caveat:'Only requests loaded into this inbox are counted, not the complete CRM history.'},
  es:{heading:'Resumen de solicitudes cargadas',period:'Periodo',day:'24 horas',week:'7 días',month:'30 días',
    total:'Solicitudes',awaiting:'Esperando primera respuesta',unlinked:'Sin mensajería verificada',
    sources:'Fuentes',services:'Servicios',none:'No hay solicitudes en la muestra cargada para este período.',
    unknown:'Desconocido (sin atribución consentida)',firstReply:'Tiempo de primera respuesta: sin medir',
    caveat:'Solo se cuentan las solicitudes cargadas en esta bandeja, no todo el historial CRM.'},
}
export default function MessagesLeadMetrics({locale='en',requests=[],businessEnquiries=[]}){
  const [period,setPeriod]=useState('week')
  const t=TEXT[locale]||TEXT.en
  const summary=useMemo(()=>summarizeLoadedCrmEnquiries({requests,businessEnquiries},period),
    [requests,businessEnquiries,period])
  return <details className={styles.root} data-crm-loaded-intake-summary>
    <summary>{t.heading} · {summary.count}</summary>
    <div className={styles.content}>
      <label>{t.period}{' '}<select aria-label={t.period} value={period}
        onChange={event=>setPeriod(event.target.value)}>
        {['day','week','month'].map(key=><option key={key} value={key}>{t[key]}</option>)}
      </select></label>
      <div className={styles.counts}>
        <div><strong>{summary.count}</strong><span>{t.total}</span></div>
        <div><strong>{summary.awaitingFirstAction}</strong><span>{t.awaiting}</span></div>
        <div><strong>{summary.withoutVerifiedMessenger}</strong><span>{t.unlinked}</span></div>
      </div>
      {summary.count>0?<div className={styles.groups}>
        <div><strong>{t.sources}</strong>{summary.bySource.slice(0,5).map(row=>
          <p key={row.name}><span>{row.name==='unknown'?t.unknown:row.name}</span><b>{row.count}</b></p>)}</div>
        <div><strong>{t.services}</strong>{summary.byService.slice(0,5).map(row=>
          <p key={row.name}><span>{row.name}</span><b>{row.count}</b></p>)}</div>
      </div>:<p className={styles.note}>{t.none}</p>}
      <p className={styles.note}>{t.firstReply}</p>
      <p className={styles.note}>{t.caveat}</p>
    </div>
  </details>
}
