'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {createJournalSaver} from '@/lib/app/daybook-journal-save.mjs'
import {localJournalDay} from '@/lib/app/daybook-journal-contract.mjs'
import {journalGoalContext} from '@/lib/app/daybook-goal-context.mjs'
import {COURSE_REVIEW_TAG,archiveReviewPrograms,archiveReviewRows,archiveReviewOutput} from '@/lib/app/course-archive-review.mjs'
import {downloadCoachingSessionPdf,openCoachingSessionPdf} from '@/lib/personal-coaching/session-pdf'
import styles from './my-coaching-plan.module.css'

const copy={
 en:{title:'My course review',intro:'Select saved reports that belong to the same personal journey. Nothing is selected automatically. This review does not certify course completion or payment.',program:'Course topics',select:'Select a saved report',none:'Not selected',unavailable:'No saved report in the loaded archive',selected:'Selected reports',more:'Earlier reports may be available below.',takeaway:'My takeaway',step:'My next step',focus:'My focus',missing:'Not recorded',followup:'My plan for the next 30 days (optional)',goal:'Link review to my goal (optional)',noGoal:'No linked goal',save:'Save review in private Daybook',edit:'Update saved review',cancel:'Clear selection',saved:'Review note saved and verified. It contains references and your plan, not copied reports.',working:'Saving…',retry:'Retry same save',error:'Could not verify the save. Retry the same draft before editing.',pdf:'Download review PDF',open:'Open PDF',pdfError:'Could not create the local PDF.',journal:'Open private journal',note:'The selected original reports remain in this archive. The PDF is generated on your device; saving the review note never shares it with a coach.'},
 ru:{title:'Мой итог курса',intro:'Выберите сохранённые отчёты, относящиеся к одному личному пути. Ничего не выбирается автоматически. Обзор не подтверждает прохождение курса или оплату.',program:'Темы курса',select:'Выберите сохранённый отчёт',none:'Не выбран',unavailable:'В загруженном архиве нет отчёта',selected:'Выбранные отчёты',more:'Более ранние отчёты можно загрузить ниже.',takeaway:'Мой итог',step:'Мой следующий шаг',focus:'Мой фокус',missing:'Не зафиксировано',followup:'Мой план на следующие 30 дней (необязательно)',goal:'Связать обзор с моей целью (необязательно)',noGoal:'Без связанной цели',save:'Сохранить обзор в личный Daybook',edit:'Обновить сохранённый обзор',cancel:'Очистить выбор',saved:'Запись обзора сохранена и проверена. В ней ссылки на источники и ваш план, а не копии отчётов.',working:'Сохраняем…',retry:'Повторить то же сохранение',error:'Не удалось подтвердить сохранение. Повторите тот же черновик перед редактированием.',pdf:'Скачать PDF обзора',open:'Открыть PDF',pdfError:'Не удалось создать PDF на устройстве.',journal:'Открыть личный дневник',note:'Исходные отчёты остаются в архиве. PDF создаётся на устройстве, запись обзора не передаётся коучу автоматически.'},
 es:{title:'Mi revisión del curso',intro:'Elige informes guardados del mismo recorrido personal. Nada se selecciona automáticamente. Esta revisión no certifica la finalización ni el pago.',program:'Temas del curso',select:'Selecciona un informe guardado',none:'Sin seleccionar',unavailable:'No hay informe guardado en el archivo cargado',selected:'Informes seleccionados',more:'Puedes cargar informes anteriores más abajo.',takeaway:'Mi conclusión',step:'Mi próximo paso',focus:'Mi enfoque',missing:'No registrado',followup:'Mi plan para los próximos 30 días (opcional)',goal:'Vincular revisión a mi meta (opcional)',noGoal:'Sin meta vinculada',save:'Guardar revisión en mi Daybook privado',edit:'Actualizar revisión guardada',cancel:'Borrar selección',saved:'Nota guardada y verificada. Contiene referencias y tu plan, no copias de informes.',working:'Guardando…',retry:'Reintentar el mismo guardado',error:'No se confirmó el guardado. Reintenta el mismo borrador antes de editar.',pdf:'Descargar PDF de revisión',open:'Abrir PDF',pdfError:'No se pudo crear el PDF local.',journal:'Abrir diario privado',note:'Los informes originales siguen en el archivo. El PDF se genera en tu dispositivo; la nota no se comparte automáticamente con un coach.'}
}
function OwnerReview({accountId,locale,protocols,hasMore,plan}){
 const t=copy[locale],programs=archiveReviewPrograms(locale)
 const [program,setProgram]=useState('journey'),[selection,setSelection]=useState({}),[followup,setFollowup]=useState(''),[goalId,setGoalId]=useState(null)
 const [saved,setSaved]=useState(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[pdfError,setPdfError]=useState(false)
 const saver=useRef(null),pending=useRef(null),alive=useRef(false),inFlight=useRef(false)
 useEffect(()=>{alive.current=true;const instance=createJournalSaver(appFetch,accountId);saver.current=instance;return()=>{alive.current=false;instance.discard();saver.current=null;pending.current=null}},[accountId])
 const rows=archiveReviewRows(program,protocols,selection,locale)
 const count=rows.filter(row=>row.selected).length
 const {goals,selected:goal}=journalGoalContext(plan,goalId)
 const locked=busy||failed
 let output=null
 if(count)output=archiveReviewOutput(program,protocols,selection,followup,locale)
 const changed=!!output&&(!saved||saved.text!==output.journalText||saved.goalId!==goalId)
 function reset(nextProgram=program){
  if(locked)return
  setProgram(nextProgram);setSelection({});setFollowup('');setGoalId(null);setSaved(null);setPdfError(false)
 }
 async function save(){
  if(inFlight.current||!saver.current||(!failed&&(!output||!changed||(goalId&&!goal))))return
  if(failed&&!pending.current)return
  inFlight.current=true;setBusy(true)
  try{
   if(!pending.current){
    const timezone=saved?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone
    pending.current={id:saved?.id||crypto.randomUUID(),revision:saved?.revision||0,text:output.journalText,
      tags:saved?.tags||[COURSE_REVIEW_TAG],kind:'note',locale:saved?.locale||locale,timezone,
      localDay:saved?.localDay||localJournalDay(new Date().toISOString(),timezone),goalId}
   }
   const result=await saver.current.save(pending.current)
   if(!alive.current)return
   pending.current=null;setSaved(result);setFailed(false)
  }catch(error){
   if(!alive.current)return
   // A revoked/changed account must not keep the private review visible.
   if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED'){
    pending.current=null;saver.current?.discard();setSaved(null);setSelection({});setFollowup('');setGoalId(null)
    setFailed(false);window.location.reload()
   }else setFailed(true)
  }finally{inFlight.current=false;if(alive.current)setBusy(false)}
 }
 function pdf(open){
  if(!output||locked)return
  try{
   const options={locale,title:output.title,slug:'personal-course-review',sessionDate:new Date().toISOString(),
    entryKind:'protocol',entries:[],protocolOverview:output.protocolOverview,protocolNote:output.protocolNote,clientNextStep:output.clientNextStep}
   if(open)openCoachingSessionPdf(options);else downloadCoachingSessionPdf(options)
   setPdfError(false)
  }catch{setPdfError(true)}
 }
 const date=instant=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(instant))
 return <details className={styles.reportCard} data-course-archive-review>
  <summary>{t.title}</summary><p>{t.intro}</p>
  <label>{t.program}<select value={program} disabled={locked} onChange={event=>reset(event.target.value)}>
   {programs.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
  </select></label>
  <p role="status">{t.selected}: {count} / {rows.length}</p>
  {hasMore&&<p>{t.more}</p>}
  {rows.map(row=><div key={row.id} className={styles.reportSection}>
   <h3>{row.number}. {row.title}</h3>
   {row.available.length?<label>{t.select}<select value={row.selected?.id||''} disabled={locked} onChange={event=>setSelection(old=>({...old,[row.id]:event.target.value}))}>
    <option value="">{t.none}</option>{row.available.map(item=><option key={item.id} value={item.id}>{date(item.date)} · {item.persona||t.missing}</option>)}
   </select></label>:<p>{t.unavailable}</p>}
   {row.selected&&<><p><b>{t.focus}: </b>{row.selected.focus||t.missing}</p><p><b>{t.takeaway}: </b>{row.selected.takeaway||t.missing}</p><p><b>{t.step}: </b>{row.selected.nextStep||t.missing}</p></>}
  </div>)}
  <div className={styles.reportSection}>
   <label>{t.followup}<textarea rows={4} maxLength={1000} value={followup} disabled={locked} onChange={event=>setFollowup(event.target.value)}/></label>
   <label>{t.goal}<select value={goalId||''} disabled={locked} onChange={event=>setGoalId(event.target.value||null)}><option value="">{t.noGoal}</option>
    {goalId&&!goal&&<option value={goalId} disabled>{t.missing}</option>}
    {goals.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
   </select></label>
   {saved&&!changed&&!failed&&<p role="status">{t.saved}</p>}
   {failed&&<p role="alert">{t.error}</p>}{pdfError&&<p role="alert">{t.pdfError}</p>}
   <div className={styles.importPanel}>
    <button type="button" className={styles.saveButton} disabled={busy||(!failed&&(!output||!changed||(goalId&&!goal)))} onClick={()=>void save()}>{busy?t.working:failed?t.retry:saved?t.edit:t.save}</button>
    <button type="button" disabled={!output||locked} onClick={()=>pdf(false)}>{t.pdf}</button>
    <button type="button" disabled={!output||locked} onClick={()=>pdf(true)}>{t.open}</button>
    <button type="button" disabled={locked} onClick={()=>reset()}>{t.cancel}</button>
   </div>
   <p>{t.note}</p><Link href={'/'+locale+'/app/daybook?tab=journal'} prefetch={false}>{t.journal}</Link>
  </div>
 </details>
}
export default function CourseArchiveReview(props){
 const locale=Object.hasOwn(copy,props.locale)?props.locale:'en'
 if(!props.accountId||!Array.isArray(props.protocols))return null
 return <OwnerReview key={props.accountId} {...props} locale={locale}/>
}
