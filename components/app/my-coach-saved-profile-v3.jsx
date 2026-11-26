'use client'
import {coachSavedProfileV3} from '@/lib/coaching/coach-profile-report-v3.mjs'
import styles from './my-coaching-plan.module.css'
export default function MyCoachSavedProfileV3({protocol,locale='en'}){
 const p=coachSavedProfileV3(protocol,locale)
 if(!p)return null
 const field=v=>v.value===null?v.label:v.value
 return <section className={styles.reportSection} data-my-coach-saved-profile-v3={p.track}>
  <b>{p.title} · {p.statusLabel}</b>
  <p>{p.currentLabel} / {p.desiredLabel}</p>
  {p.rows.map(row=><p key={row.id} data-axis-id={row.id} data-current-status={row.current.status} data-desired-status={row.desired.status}>
   {row.priority?'★ ':''}{row.label}: {field(row.current)} / {field(row.desired)}
  </p>)}
 </section>
}
