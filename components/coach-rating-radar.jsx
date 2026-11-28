import {buildCoachRatingRadar} from '@/lib/coaching/coach-rating-radar.mjs'
const copy={
 en:{current:'Current',desired:'Desired',empty:'No saved ratings yet.',partial:'Only recorded ratings are shown. Missing ratings leave gaps.',scale:'Scale: 0–10'},
 ru:{current:'Сейчас',desired:'Желаемое',empty:'Сохранённых оценок пока нет.',partial:'Показаны только записанные оценки. Пропуски остаются незаполненными.',scale:'Шкала: 0–10'},
 es:{current:'Actual',desired:'Deseado',empty:'Aún no hay valoraciones guardadas.',partial:'Solo se muestran los valores guardados. Los datos ausentes dejan huecos.',scale:'Escala: 0–10'}
}
const colors={current:'#28765f',desired:'#93642a'}
const points=list=>list.map(p=>p.join(',')).join(' ')
export default function CoachRatingRadar({axes,title,locale='en',labels}){
 const t=copy[locale]||copy.en,model=buildCoachRatingRadar(axes)
 if(!model)return null
 if(!model.hasData)return <p data-coach-rating-empty role="status" style={{margin:'8px 0'}}>{t.empty}</p>
 const series=model.series.filter(s=>s.count>0),name=key=>labels?.[key]||t[key]
 const accessible=[title,...series.map(s=>name(s.key)+' '+s.count+'/'+model.rows.length),t.scale].filter(Boolean).join(' · ')
 return <figure data-coach-rating-radar style={{margin:'8px 0',minWidth:0}}>
  <svg viewBox="0 0 220 220" role="img" aria-label={accessible} style={{width:'100%',maxWidth:320,height:'auto',display:'block',margin:'0 auto'}}>
   {model.grid.map(g=><polygon key={g.value} points={points(g.points)} fill="none" stroke="currentColor" opacity=".2"/>)}
   {model.spokes.map((s,i)=><g key={s.id}><line x1="110" y1="110" x2={s.end[0]} y2={s.end[1]} stroke="currentColor" opacity=".25"/><text x={s.label[0]} y={s.label[1]+4} textAnchor="middle" fontSize="12" fill="currentColor">{i+1}</text></g>)}
   {[...series].reverse().map(s=><g key={s.key} data-coach-rating-series={s.key}>
    {s.complete&&<polygon points={points(s.points)} stroke={colors[s.key]} strokeWidth="2" strokeDasharray={s.key==='desired'?'5 3':undefined} fill={colors[s.key]} fillOpacity=".1"/>}
    {s.segments.map((segment,i)=><polyline key={i} points={points(segment)} stroke={colors[s.key]} strokeWidth="2" strokeDasharray={s.key==='desired'?'5 3':undefined} fill="none"/>)}
    {s.points.map((p,i)=>p!==null&&<circle key={model.rows[i].id} cx={p[0]} cy={p[1]} r={s.key==='current'?3.5:5.5} stroke={colors[s.key]} strokeWidth="1.5" fill={s.key==='current'?colors[s.key]:'none'}/>)}
   </g>)}
  </svg>
  <figcaption style={{display:'grid',gap:4}}>
   <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
    {series.map(s=><span key={s.key} style={{display:'inline-flex',alignItems:'center',gap:5,color:colors[s.key],fontSize:13}}><span aria-hidden="true">{s.key==='current'?'●':'◇'}</span>{name(s.key)} ({s.count}/{model.rows.length})</span>)}
   </div>
   <small>{t.scale}</small>
   {series.some(s=>!s.complete)&&<small>{t.partial}</small>}
  </figcaption>
 </figure>
}
