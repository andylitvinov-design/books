import {speechTranscriptDisplayRows} from '@/lib/personal-coaching/speech-amendments.mjs'
import styles from './my-coaching-plan.module.css'

const copy={
 ru:{correction:'Подтверждённое уточнение расшифровки',original:'Первоначальное распознавание',interrupted:'Ответ перебит (мог быть услышан не полностью)',unavailable:'Уточнения не удалось отобразить. Исходный диалог сохранён.'},
 en:{correction:'Client-confirmed transcription correction',original:'Original recognition',interrupted:'Reply interrupted; may not have been fully heard',unavailable:'Corrections could not be displayed. The original dialogue is preserved.'},
 es:{correction:'Corrección de transcripción confirmada',original:'Reconocimiento original',interrupted:'Respuesta interrumpida',unavailable:'No se pudieron mostrar las correcciones. El diálogo original se conserva.'}
}
export default function CoachArchiveTranscript({protocol,locale='en',you,coach}){
 const t=copy[locale]||copy.en
 const {rows,correctionsUnavailable}=speechTranscriptDisplayRows(protocol)
 return <div data-coach-archive-transcript>
  {correctionsUnavailable&&<p role="status">{t.unavailable}</p>}
  {rows.map(row=>row.kind==='correction'?
   <div className={styles.reportSection} key={row.key} data-coach-archive-correction={row.correction.id}>
    <b>{t.correction}</b>
    <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.correction.text}</p>
    <details><summary>{t.original}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.correction.raw}</p></details>
   </div>:
   <div className={styles.reportSection} key={row.key}>
    <b>{row.turn.role==='user'?you:coach}</b>
    <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.turn.content}</p>
    {row.turn.interrupted===true&&<small>{t.interrupted}</small>}
   </div>)}
 </div>
}
