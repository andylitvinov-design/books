'use client'
import {vectorWheelRows,vectorWheelPoint,vectorWheelPolygon,vectorWheelSegments} from '@/lib/profile/development-vector-wheel.mjs'
import styles from './development-vector-wheel.module.css'

const COPY={
 en:{inner:'My inner balance',outer:'My life balance',now:'Now',want:'Desired',
  focus:'Chosen focus',empty:'Add your own now and desired ratings below to build this wheel.',
  pending:'Unsaved preview',saved:'Your personal ratings',rated:'rated of 8',notRated:'Not rated'},
 ru:{inner:'Мой внутренний баланс',outer:'Баланс жизненных сфер',now:'Сейчас',want:'Хочу',
  focus:'Выбранный фокус',empty:'Оцените своё состояние сейчас и желаемое ниже — колесо отобразит ваши ответы.',
  pending:'Изменения не сохранены',saved:'Ваши личные оценки',rated:'из 8 оценено',notRated:'Не оценено'},
 es:{inner:'Mi equilibrio interior',outer:'Mi equilibrio de vida',now:'Ahora',want:'Deseado',
  focus:'Enfoque elegido',empty:'Indica tu valoración actual y deseada abajo para crear la rueda.',
  pending:'Vista sin guardar',saved:'Tus valoraciones personales',rated:'de 8 evaluados',notRated:'Sin evaluar'}
}
const ring=(value)=>Array.from({length:8},(_,i)=>{
 const p=vectorWheelPoint(i,value);return p.x+','+p.y
}).join(' ')
export default function DevelopmentVectorWheel({items,ratings,focusId,locale='en',track='inner',pending=false}){
 const language=COPY[locale]?locale:'en',t=COPY[language]
 const rows=vectorWheelRows(items,ratings)
 const count=rows.filter(row=>row.current!==null).length
 const currentPolygon=vectorWheelPolygon(rows,'current')
 const desiredPolygon=vectorWheelPolygon(rows,'desired')
 const label=track==='outer'?t.outer:t.inner
 const fmt=(row)=>row.current===null?t.notRated:
   t.now+' '+row.current+'/10 · '+t.want+' '+row.desired+'/10 · Δ '+(row.gap>0?'+':'')+row.gap
 return <section className={styles.panel} aria-label={label} data-development-vector-wheel data-track={track}>
  <div className={styles.heading}><div><h2>{label}</h2><p>{pending?t.pending:t.saved}</p></div>
   <span className={styles.count}>{count} {t.rated}</span></div>
  <div className={styles.keys}><span><i className={styles.nowKey}/>{t.now}</span>
   <span><i className={styles.wantKey}/>{t.want}</span></div>
  <svg className={styles.chart} viewBox="0 0 340 320" role="img"
   aria-label={label+'. '+count+' '+t.rated+'. '+t.now+' / '+t.want}>
   {[2,4,6,8,10].map(value=><polygon key={value} points={ring(value)}
     className={styles.ring}/>)}
   {rows.map((row,i)=>{const p=vectorWheelPoint(i,10)
    return <line key={row.id} x1="170" y1="158" x2={p.x} y2={p.y} className={styles.spoke}/>})}
   {desiredPolygon?<polygon points={desiredPolygon} className={styles.wantArea}/>:
    vectorWheelSegments(rows,'desired').map(segment=><line key={segment.key}
     x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y}
     className={styles.wantLine}/>)}
   {currentPolygon?<polygon points={currentPolygon} className={styles.nowArea}/>:
    vectorWheelSegments(rows,'current').map(segment=><line key={segment.key}
     x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y}
     className={styles.nowLine}/>)}
   {rows.filter(row=>row.current!==null).map(row=>{
    const now=vectorWheelPoint(row.index,row.current)
    const want=vectorWheelPoint(row.index,row.desired)
    return <g key={row.id}><circle cx={want.x} cy={want.y} r="4" className={styles.wantDot}/>
      <circle cx={now.x} cy={now.y} r="4" className={styles.nowDot}/></g>
   })}
   {rows.map((row,i)=>{const p=vectorWheelPoint(i,12.05)
    return <g key={row.id} transform={'translate('+p.x+' '+p.y+')'}>
     <circle r="12.5" className={row.id===focusId?styles.focusCircle:styles.numberCircle}/>
     <text textAnchor="middle" dominantBaseline="central" className={styles.numberText}>{i+1}</text>
    </g>})}
  </svg>
  {count===0&&<p className={styles.empty}>{t.empty}</p>}
  <ol className={styles.axisList}>{rows.map((row,i)=><li key={row.id}>
   <span className={styles.axisNumber}>{i+1}</span>
   <span><strong>{row.name?.[language]||row.id}</strong>
    <small>{fmt(row)}{row.id===focusId?' · ★ '+t.focus:''}</small></span>
  </li>)}</ol>
 </section>
}
