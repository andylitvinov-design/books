'use client'
import {useEffect,useRef,useState} from 'react'
import {ARCHIVE_REVIEW_SCOPE} from '@/lib/personal-coaching/coach-archive-quality.mjs'
import styles from './my-coaching-plan.module.css'
const copy={
 en:{title:'Session Quality Report',choose:'Select a saved session',none:'Choose a session',load:'Open private audit',loading:'Checking…',error:'Could not verify the private report.',note:'Evidence audit, not a grade of you or your progress. Empathy, safety and overall quality have not been independently scored.',evidence:'Question-bound answers',semantic:'Independently reviewed fields',review:'Check this answer',revoke:'Erase review / revoke',confirm:'Allow one separate Groq AI review of this exact saved question and your literal answer? No full transcript or profile is sent. The result is advisory and does not change your protocol.',revokeConfirm:'Revoke this field review and erase its saved assessment? An already transmitted request cannot be recalled.',disabled:'Independent AI review is not enabled. The local evidence audit is available.',statuses:{not_performed:'Not assessed',MATCH:'Matches question',PARTIAL:'Partly answers',MISMATCH:'Different topic',AMBIGUOUS:'Unclear',CONTRADICTION:'Possible conflict',revoked:'Revoked',pending:'Pending',unavailable:'Unavailable',question_bound_reviewed:'Question-bound client review',client_reviewed:'Client reviewed',needs_confirmation:'Needs clarification',not_explored:'Not explored',skipped_by_client:'Skipped by client'}},
 ru:{title:'Отчёт качества сессии',choose:'Выберите сохранённую сессию',none:'Выберите сессию',load:'Открыть личный аудит',loading:'Проверяем…',error:'Не удалось проверить личный отчёт.',note:'Аудит доказательств, а не оценка вас или вашего прогресса. Эмпатия, безопасность и общее качество пока не получили независимой оценки.',evidence:'Ответы с привязкой к вопросу',semantic:'Независимо проверенные поля',review:'Проверить этот ответ',revoke:'Удалить проверку / отозвать',confirm:'Разрешить одну отдельную AI-проверку через Groq именно этого сохранённого вопроса и вашего дословного ответа? Полная стенограмма и профиль не передаются. Оценка рекомендательная и не изменяет протокол.',revokeConfirm:'Отозвать проверку поля и удалить её результат? Уже переданный запрос невозможно отозвать у провайдера.',disabled:'Независимая AI-проверка пока не включена. Доступен аудит доказательств.',statuses:{not_performed:'Не оценено',MATCH:'Ответ по вопросу',PARTIAL:'Частичный ответ',MISMATCH:'Другая тема',AMBIGUOUS:'Неоднозначно',CONTRADICTION:'Возможное противоречие',revoked:'Отозвано',pending:'Ожидает',unavailable:'Недоступно',question_bound_reviewed:'Подтверждено с привязкой к вопросу',client_reviewed:'Проверено клиентом',needs_confirmation:'Требуется уточнение',not_explored:'Не исследовано',skipped_by_client:'Пропущено клиентом'}},
 es:{title:'Informe de calidad de sesión',choose:'Selecciona una sesión guardada',none:'Elige una sesión',load:'Abrir auditoría privada',loading:'Comprobando…',error:'No se pudo verificar el informe privado.',note:'Auditoría de evidencia, no una nota sobre ti o tu progreso. La empatía, seguridad y calidad general aún no tienen evaluación independiente.',evidence:'Respuestas vinculadas a preguntas',semantic:'Campos revisados independientemente',review:'Revisar esta respuesta',revoke:'Borrar revisión / revocar',confirm:'¿Autorizas una revisión separada de IA de Groq de esta pregunta guardada y tu respuesta literal? No se envía la transcripción completa ni el perfil. No modifica tu protocolo.',revokeConfirm:'¿Revocar esta revisión y borrar su evaluación? Una solicitud ya enviada al proveedor no se puede retirar.',disabled:'La revisión independiente de IA no está activada. La auditoría de evidencia está disponible.',statuses:{not_performed:'Sin evaluar',MATCH:'Responde a la pregunta',PARTIAL:'Respuesta parcial',MISMATCH:'Otro tema',AMBIGUOUS:'Ambiguo',CONTRADICTION:'Posible contradicción',revoked:'Revocado',pending:'Pendiente',unavailable:'No disponible',question_bound_reviewed:'Revisado y vinculado a la pregunta',client_reviewed:'Revisado por el cliente',needs_confirmation:'Requiere aclaración',not_explored:'Sin explorar',skipped_by_client:'Omitido por el cliente'}}
}
function OwnerQuality({accountId,protocols,locale}){
 const t=copy[locale]||copy.en
 const [id,setId]=useState(''),[report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(false)
 const generation=useRef(0),abort=useRef(null)
 const selected=protocols.find(p=>p.id===id)
 useEffect(()=>{return()=>{generation.current++;abort.current?.abort()}},[])
 useEffect(()=>{generation.current++;abort.current?.abort();setReport(null);setError(false);setBusy(false)},[id])
 const valid=selected&&report?.protocolId===id?report:null
 async function request(action,fieldId){
  if(!selected||busy)return
  if(action&&!window.confirm(action==='review'?t.confirm:t.revokeConfirm))return
  const n=++generation.current,controller=new AbortController()
  abort.current?.abort();abort.current=controller;setBusy(true);setError(false)
  const headers={'x-hh-account-id':accountId}
  try{
   if(action){
    const r=await fetch('/api/app/my-coach/quality',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action,protocolId:id,fieldId,scope:ARCHIVE_REVIEW_SCOPE,confirmed:true})})
    if(!r.ok)throw Error()
   }
   const r=await fetch('/api/app/my-coach/quality?protocolId='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers})
   if(!r.ok)throw Error()
   const value=await r.json()
   if(value.protocolId!==id||!Array.isArray(value.fields))throw Error()
   if(n===generation.current)setReport(value)
  }catch{if(n===generation.current){setReport(null);setError(true)}}
  finally{if(n===generation.current)setBusy(false)}
 }
 return <details className={styles.reportCard} data-coach-archive-quality><summary>{t.title}</summary>
  <label>{t.choose}<select value={selected?id:''} onChange={e=>setId(e.target.value)}><option value="">{t.none}</option>{protocols.map(p=><option key={p.id} value={p.id}>{p.personaId} · {new Date(p.completedAt).toLocaleDateString(locale)}</option>)}</select></label>
  <button type="button" disabled={!selected||busy} onClick={()=>void request()}>{busy?t.loading:t.load}</button>
  {error&&<p role="alert">{t.error}</p>}
  {valid&&<div><p>{t.note}</p><p>{t.evidence}: {valid.evidenceCounts?valid.evidenceCounts.questionBound+' / '+valid.evidenceCounts.total:'—'}</p><p>{t.semantic}: {valid.semanticReviewed} / {valid.semanticEligible}</p>{!valid.reviewEnabled&&<p>{t.disabled}</p>}
   {valid.fields.map(f=><div className={styles.reportSection} key={f.fieldId}><b>{f.label}</b><p>{t.statuses[f.evidenceStatus]} · {t.statuses[f.semanticStatus]}</p>
    {valid.reviewEnabled&&f.eligible&&f.semanticStatus==='not_performed'&&<button type="button" disabled={busy} onClick={()=>void request('review',f.fieldId)}>{t.review}</button>}
    {f.eligible&&!['not_performed','revoked'].includes(f.semanticStatus)&&<button type="button" disabled={busy} onClick={()=>void request('revoke',f.fieldId)}>{t.revoke}</button>}
   </div>)}</div>}
 </details>
}
export default function CoachArchiveQuality(props){
 if(!props.accountId||!Array.isArray(props.protocols)||!props.protocols.length)return null
 return <OwnerQuality key={props.accountId} {...props}/>
}
