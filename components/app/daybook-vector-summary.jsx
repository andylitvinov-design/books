'use client'
import {normalizeVectorSelection,VECTOR_SPHERES,VECTOR_AXES} from '@/lib/app/daybook-vector-selection.mjs'
import css from './daybook-vector-start.module.css'
const COPY={
 en:{title:'Chosen at stage 0',ratings:'View my original self-ratings',sphere:'Life sphere',axis:'Meaning axis',now:'Now',desired:'Desired',original:'Original direction'},
 ru:{title:'Выбрано на этапе 0',ratings:'Мои исходные самооценки',sphere:'Сфера жизни',axis:'Смысловая ось',now:'Сейчас',desired:'Хочу',original:'Исходное направление'},
 es:{title:'Elegido en la etapa 0',ratings:'Ver mis valoraciones originales',sphere:'Ámbito de vida',axis:'Eje de sentido',now:'Ahora',desired:'Deseado',original:'Dirección original'},
}
export default function DaybookVectorSummary({value,locale='en'}){
 const saved=normalizeVectorSelection(value),lang=COPY[locale]?locale:'en',c=COPY[lang]
 if(!saved)return null
 const sphere=VECTOR_SPHERES.find(item=>item.id===saved.sphereId),axis=VECTOR_AXES.find(item=>item.id===saved.axisId)
 return <section className={css.summary} data-vector-origin>
  <h3>{c.title}</h3><p className={css.intersection}>{sphere.name[lang]} <span aria-hidden="true">×</span> {axis.name[lang]}</p>
  <p><strong>{c.original}: </strong>{saved.statement}</p>
  <details><summary>{c.ratings}</summary>
   {[['spheres',VECTOR_SPHERES,c.sphere],['axes',VECTOR_AXES,c.axis]].map(([track,items,label])=><table key={track}>
    <caption>{label}</caption><thead><tr><th scope="col">{label}</th><th scope="col">{c.now}</th><th scope="col">{c.desired}</th></tr></thead>
    <tbody>{items.map(item=><tr key={item.id}><th scope="row">{item.name[lang]}</th><td>{saved[track][item.id].current}/10</td><td>{saved[track][item.id].desired}/10</td></tr>)}</tbody>
   </table>)}
  </details>
 </section>
}
