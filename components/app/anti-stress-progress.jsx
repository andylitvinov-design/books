'use client'
import {antiStressProgressProjection} from '@/lib/coaching/anti-stress-progress.mjs'
import styles from './anti-stress-progress.module.css'
const copy={
 en:{title:'Session checkpoints',time:'Verified active minutes',confirmed:'Confirmed',skipped:'Skipped',needs_confirmation:'Needs confirmation',not_explored:'Not explored',unavailable:'Not loaded',loading:'Verified protocol not loaded yet.',stale:'The last saved protocol is shown; refreshing failed.',contact:'Session start consent has not been verified yet.',contactConfirmed:'Session start consent was recorded by the server.',verified:'Verified',question:'Question'},
 ru:{title:'Контрольные точки сеанса',time:'Подтверждённые активные минуты',confirmed:'Подтверждено',skipped:'Пропущено',needs_confirmation:'Требует подтверждения',not_explored:'Не исследовано',unavailable:'Не загружено',loading:'Подтверждённый протокол ещё не загружен.',stale:'Показан последний сохранённый протокол; обновить его не удалось.',contact:'Согласие на начало пока не подтверждено.',contactConfirmed:'Согласие на начало сеанса зафиксировано сервером.',verified:'Проверено',question:'Вопрос'},
 es:{title:'Puntos de la sesión',time:'Minutos activos verificados',confirmed:'Confirmado',skipped:'Omitido',needs_confirmation:'Requiere confirmación',not_explored:'Sin explorar',unavailable:'Sin cargar',loading:'Todavía no se ha cargado el protocolo verificado.',stale:'Se muestra el último protocolo guardado; no se pudo actualizar.',contact:'Aún no se ha verificado el consentimiento de inicio.',contactConfirmed:'El servidor registró el consentimiento de inicio.',verified:'Verificado',question:'Pregunta'}
}
export default function AntiStressProgress({selection,locale='en',data=null,elapsedMs=0,stale=false,expanded=false}){
 const t=copy[locale]||copy.en
 const view=antiStressProgressProjection({selection,locale,data,elapsedMs})
 if(!view)return <p role="status">{t.loading}</p>
 return <details className={styles.root} data-anti-stress-progress open={expanded||undefined}>
  <summary>
   <span>{t.title}</span>
   <span className={styles.segments}>{view.groups.map(g=><i key={g.id} data-stage-id={g.id} data-stage-tone={g.tone} aria-label={g.label+': '+g.confirmed+'/'+g.total}/>)}</span>
   <span className={styles.minutes} role="progressbar" aria-label={t.time} aria-valuemin={0} aria-valuemax={view.minuteDots} aria-valuenow={view.elapsedMinutes}>{Array.from({length:view.minuteDots},(_,i)=><i key={i} data-elapsed={i<view.elapsedMinutes}/>)}</span>
  </summary>
  {!view.available?<p role="status">{t.loading}</p>:stale?<p role="status">{t.stale}</p>:null}
  {view.groups.map(g=><section key={g.id} data-anti-stress-stage={g.id} data-stage-tone={g.tone}><h4>{g.label} · {t.verified} {g.confirmed}/{g.total}</h4>
   {g.id==='contact'?<p>{g.contactConfirmed?t.contactConfirmed:t.contact}</p>:g.children.map(row=><div key={row.fieldId} data-field-id={row.fieldId} data-field-status={row.status}><strong>{row.label}</strong><small>{t.question}: {row.question}</small><small>{t[row.status]}</small>{row.status==='confirmed'&&<p>{String(row.value)}</p>}</div>)}
  </section>)}
 </details>
}
