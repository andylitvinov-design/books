'use client'
import {normalizeVectorSelection,vectorCombinationLabel,VECTOR_SELECTION_LEGACY_VERSION,VECTOR_SPHERES,VECTOR_FOCUSES,VECTOR_AXES} from '@/lib/app/daybook-vector-selection.mjs'
import css from './daybook-vector-start.module.css'
const COPY={
 en:{title:'Chosen at stage 0',ratings:'View all my original self-ratings',sphere:'Life sphere',axis:'Meaning axis',now:'Now',desired:'Desired',original:'Original goal'},
 ru:{title:'Выбрано на этапе 0',ratings:'Все мои исходные самооценки',sphere:'Сфера жизни',axis:'Смысловая ось',now:'Сейчас',desired:'Хочу',original:'Исходная цель'},
 es:{title:'Elegido en la etapa 0',ratings:'Ver todas mis valoraciones originales',sphere:'Ámbito de vida',axis:'Eje de sentido',now:'Ahora',desired:'Deseado',original:'Meta original'},
}
export function VectorSelectedRatings({value,locale='en'}){
 const lang=COPY[locale]?locale:'en',c=COPY[lang]
 const sphere=VECTOR_SPHERES.find(item=>item.id===value?.sphereId),axis=VECTOR_AXES.find(item=>item.id===value?.axisId)
 const focus=VECTOR_FOCUSES.find(item=>item.id===value?.focusId&&item.sphereId===value?.sphereId)
 if(!sphere||!axis||!value.spheres?.[sphere.id]||!value.axes?.[axis.id])return null
 const rows=[{id:sphere.id,title:sphere.name[lang]+(focus?' · '+focus.name[lang]:''),pair:value.spheres[sphere.id]},
  {id:axis.id,title:axis.name[lang],pair:value.axes[axis.id]}]
 return <dl className={css.selectedScores} data-vector-selected-ratings>{rows.map(row=><div key={row.id}>
  <dt>{row.title}</dt><dd><span>{c.now} <strong>{row.pair.current}/10</strong></span><span aria-hidden="true">→</span><span>{c.desired} <strong>{row.pair.desired}/10</strong></span></dd>
 </div>)}</dl>
}
export default function DaybookVectorSummary({value,locale='en'}){
 const saved=normalizeVectorSelection(value),lang=COPY[locale]?locale:'en',c=COPY[lang]
 if(!saved)return null
 return <section className={css.summary} data-vector-origin>
  <h3>{c.title}</h3><p className={css.intersection} data-vector-combination>{vectorCombinationLabel(saved,lang)}</p>
  <VectorSelectedRatings value={saved} locale={lang}/>
  <p><strong>{c.original}: </strong>{saved.statement}</p>
  {saved.version===VECTOR_SELECTION_LEGACY_VERSION&&<details><summary>{c.ratings}</summary>
   {[['spheres',VECTOR_SPHERES,c.sphere],['axes',VECTOR_AXES,c.axis]].map(([track,items,label])=><table key={track}>
    <caption>{label}</caption><thead><tr><th scope="col">{label}</th><th scope="col">{c.now}</th><th scope="col">{c.desired}</th></tr></thead>
    <tbody>{items.map(item=><tr key={item.id}><th scope="row">{item.name[lang]}</th><td>{saved[track][item.id].current}/10</td><td>{saved[track][item.id].desired}/10</td></tr>)}</tbody>
   </table>)}
  </details>}
 </section>
}
