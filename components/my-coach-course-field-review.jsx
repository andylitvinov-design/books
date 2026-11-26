'use client'
import {coachCourseProtocolRows,coachCourseReviewQuotes,appendCoachCourseFieldReview} from '@/lib/coaching/coach-course-protocol-schema.mjs'
const copy={
 en:{title:'Review session checkpoints (optional)',hint:'Choose your own statement only when it answers this point. Automatically detected statements remain provisional until selected. Unanswered points may stay open.',unreviewed:'Not reviewed yet',open:'Leave open / unconfirmed',skip:'Skip this point',confirmed:'Your reviewed statement',candidate:'Possible answer — not confirmed',source:'Your turn',limit:'Review limit reached. Keep the current selection.'},
 ru:{title:'Сверка контрольных пунктов (необязательно)',hint:'Выберите свою реплику, только если она отвечает на этот пункт. Автоматически найденные ответы предварительные до вашего выбора. Необсуждённое можно оставить открытым.',unreviewed:'Ещё не проверено',open:'Оставить открытым / не подтверждать',skip:'Пропустить пункт',confirmed:'Проверенная вами реплика',candidate:'Возможный ответ — не подтверждён',source:'Ваша реплика',limit:'Достигнут предел правок. Сохраните текущий выбор.'},
 es:{title:'Revisar puntos de la sesión (opcional)',hint:'Elige tus propias palabras solo si responden a este punto. Las respuestas detectadas son provisionales hasta que las elijas. Puedes dejar puntos abiertos.',unreviewed:'Aún no revisado',open:'Dejar abierto / sin confirmar',skip:'Omitir este punto',confirmed:'Tu declaración revisada',candidate:'Respuesta posible — sin confirmar',source:'Tu turno',limit:'Límite de revisiones alcanzado. Conserva la selección actual.'}
}
export default function MyCoachCourseFieldReview({courseSessionId,turns,locale='en',value,onChange,disabled=false,expanded=false}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const review=value?.courseSessionId===courseSessionId?value:null
 let rows
 try{rows=coachCourseProtocolRows(courseSessionId,turns,review,lang)}catch{return null}
 if(!rows.length)return null
 const quotes=coachCourseReviewQuotes(turns)
 const full=(review?.events.length||0)>=64
 return <section data-coach-course-field-review>
  <details open={expanded||undefined}><summary>{t.title}</summary><p>{t.hint}</p>
  {rows.map(row=>{
   const selection=row.status==='confirmed'?'turn:'+row.turnIndex:row.status==='skipped_by_client'?'skip':row.source==='client_selected_open'?'open':'unreviewed'
   return <div key={row.id} style={{margin:'12px 0'}}>
    <label style={{display:'grid',gap:6}}><strong>{row.label}</strong>
     {row.quote&&<small style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.status==='confirmed'?t.confirmed:t.candidate}: {row.quote}</small>}
     <select value={selection} disabled={disabled||full} onChange={e=>onChange(appendCoachCourseFieldReview(review,courseSessionId,turns,row.id,e.target.value))}>
      <option value="unreviewed" disabled>{t.unreviewed}</option><option value="open">{t.open}</option><option value="skip">{t.skip}</option>
      {quotes.map(q=><option key={q.turnIndex} value={'turn:'+q.turnIndex}>{t.source} {q.turnIndex+1}: {q.quote.slice(0,180)}</option>)}
     </select>
    </label>
   </div>
  })}
  {full&&<small>{t.limit}</small>}
  </details>
 </section>
}
