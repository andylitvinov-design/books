'use client'
import {useState} from 'react'
import DevelopmentVectorWheel from './development-vector-wheel'
import {vectorHistoryRows,vectorHistoryRange} from '@/lib/profile/self-discovery-vector-history.mjs'
import styles from './self-discovery.module.css'
const COPY={
 en:{title:'Measurements over time',from:'From',to:'To',empty:'No measurements in this period',first:'First in period',latest:'Latest in period',difference:'Change',now:'Current',desired:'Desired',self:'Self-rating',coach:'Imported from coaching',compare:'Compare with a saved snapshot',none:'Choose a previous snapshot',saved:'Saved snapshot',note:'Dates before history was enabled may be missing. Only actual saved values are shown.',more:'Show earlier measurements'},
 ru:{title:'Динамика измерений',from:'С',to:'По',empty:'Нет измерений за этот период',first:'Первое за период',latest:'Последнее за период',difference:'Изменение',now:'Сейчас',desired:'Желаемое',self:'Самооценка',coach:'Из сохранённой оценки коучинга',compare:'Сравнить с сохранённым снимком',none:'Выбрать предыдущий снимок',saved:'Снимок сохранён',note:'До включения истории некоторые измерения могли не сохраниться. Здесь только реальные данные.',more:'Показать предыдущие измерения'},
 es:{title:'Mediciones en el tiempo',from:'Desde',to:'Hasta',empty:'Sin mediciones en este periodo',first:'Primera del periodo',latest:'Última del periodo',difference:'Cambio',now:'Actual',desired:'Deseado',self:'Autoevaluación',coach:'Importado del coaching',compare:'Comparar con una instantánea guardada',none:'Elegir una instantánea anterior',saved:'Instantánea guardada',note:'Pueden faltar mediciones anteriores a la activación del historial. Solo se muestran datos reales.',more:'Mostrar mediciones anteriores'}
}
const date=(x,l)=>new Intl.DateTimeFormat(l,{dateStyle:'medium',timeStyle:'short'}).format(new Date(x))
function AxisHistory({item,rows,locale,t}){
 const [limit,setLimit]=useState(10)
 const a=rows[0],b=rows.at(-1)
 if(!a)return <p>{item.name[locale]||item.name.en}: {t.empty}</p>
 const span=Math.max(1,Date.parse(b.recordedAt)-Date.parse(a.recordedAt))
 const pts=rows.map((r,i)=>[(Date.parse(r.recordedAt)-Date.parse(a.recordedAt))/span*274+13,95-r.current*8,i])
 return <details className={styles.axisHistory}><summary>{item.name[locale]||item.name.en} · {b.current}/10 · {rows.length}</summary>
  <p>{t.first}: {a.current}/10 · {t.latest}: {b.current}/10{rows.length>1?' · '+t.difference+': '+(b.current-a.current>0?'+':'')+(b.current-a.current):''}</p>
  {rows.length>1&&<svg viewBox="0 0 300 108" className={styles.trend} role="img" aria-label={rows.map(r=>date(r.recordedAt,locale)+': '+r.current).join('; ')}>
   {[0,5,10].map(n=><line key={n} x1="13" x2="287" y1={95-n*8} y2={95-n*8} stroke="#d6c39e"/>)}
   <polyline points={pts.map(p=>p[0]+','+p[1]).join(' ')} fill="none" stroke="#176d4e" strokeWidth="2"/>
   {pts.map(p=><circle key={p[2]} cx={p[0]} cy={p[1]} r="3" fill="#176d4e"/>)}
  </svg>}
  <ul className={styles.dates}>{rows.slice().reverse().slice(0,limit).map((r,i)=><li key={r.revision+':'+i}><span><time dateTime={r.recordedAt}>{date(r.recordedAt,locale)}</time><br/><small>{t[r.source]}</small></span><span>{t.now}: {r.current}/10<br/><small>{t.desired}: {r.desired}/10</small></span></li>)}</ul>
  {limit<rows.length&&<button onClick={()=>setLimit(n=>n+10)}>{t.more}</button>}
 </details>
}
export default function SelfDiscoveryVectorHistory({snapshots,items,track,locale='en'}){
 const t=COPY[locale]||COPY.en
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[revision,setRevision]=useState('')
 const choices=snapshots.slice(0,-1).filter(s=>Object.keys(s.vectors[track].ratings).length).reverse()
 const selected=choices.find(s=>String(s.revision)===revision)
 return <section data-vector-history={track}>
  <h3>{t.title}</h3><p className={styles.note}>{t.note}</p>
  <div className={styles.dateFilters}><label>{t.from}<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{t.to}<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
  {items.map(item=><AxisHistory key={item.id} item={item} rows={vectorHistoryRange(vectorHistoryRows(snapshots,track,item.id),from,to)} locale={locale} t={t}/>)}
  {choices.length>0&&<label className={styles.snapshot}>{t.compare}<select value={revision} onChange={e=>setRevision(e.target.value)}><option value="">{t.none}</option>{choices.map(s=><option key={s.revision} value={s.revision}>{date(s.savedAt,locale)} · #{s.revision}</option>)}</select></label>}
  {selected&&<><p>{t.saved}: {date(selected.savedAt,locale)}</p><DevelopmentVectorWheel items={items} ratings={selected.vectors[track].ratings} focusId={selected.vectors[track].focusId} locale={locale} track={track}/></>}
 </section>
}
