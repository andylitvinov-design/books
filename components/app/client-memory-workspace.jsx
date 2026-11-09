'use client'
import {useEffect,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import ClientAboutMe from './client-about-me'
import styles from './client-memory-workspace.module.css'

const I18N={
 en:{title:'My memory & practices',subtitle:'You decide what the assistant can remember. Your personal notes are private.',
   memory:'My memory',tasks:'My practices',enable:'Use saved memory in conversations',sensitive:'Allow sensitive information (optional)',
   share:'Allow sharing individual entries with an approved practitioner',reminders:'Allow neutral practice reminders',
   disabled:'This feature is not enabled for your account yet.',signIn:'Sign in to My House to manage private memory.',
   new:'Remember something',category:'Type',value:'What would you like to remember?',
   save:'Save this memory',delete:'Forget',edit:'Edit',pin:'Pin',unpin:'Unpin',
   empty:'Nothing saved yet. The bot does not save personal facts automatically.',
   cancel:'Cancel',done:'Save changes',export:'Export my memory',eraseAll:'Forget all',
   confirmAll:'Forget all saved AI memory? Other records, tests and courses remain unchanged.',
   goals:'Goal',preferences:'Preference',resources:'Resource',boundaries:'Boundary',commitments:'Commitment',
   feedback:'Practice feedback',states:'My state',normal:'General',private:'Sensitive',
   noTasks:'No practices yet.',taskTitle:'Practice',taskDetails:'Instructions',due:'Due date',
   ownTask:'Create my practice',accept:'Accept',decline:'Decline',start:'Start',report:'I did it',review:'Review',
   pause:'Pause',archive:'Archive',note:'Optional feedback',send:'Submit',master:'Offer a practice to this client',
   offer:'Offer to client',invalid:'Could not save. Refresh and try again.',conflict:'Data changed. Reloaded current version.',
   saved:'Saved.',consent:'Privacy preferences updated.',
   notePrivate:'No automatic messages or clinical conclusions. A practitioner only sees separately authorized material.'},
 ru:{title:'Моя память и практики',subtitle:'Вы сами решаете, что помощник может помнить. Личные записи защищены.',
   memory:'Моя память',tasks:'Мои практики',enable:'Использовать память в диалогах',sensitive:'Разрешить чувствительную информацию (необязательно)',
   share:'Разрешить показывать выбранные записи подтверждённому мастеру',reminders:'Разрешить нейтральные напоминания',
   disabled:'Функция ещё не включена для этого кабинета.',signIn:'Войдите в «Мой дом», чтобы управлять памятью.',
   new:'Что запомнить?',category:'Тип записи',value:'Какую информацию сохранить?',
   save:'Сохранить в память',delete:'Забыть',edit:'Изменить',pin:'Закрепить',unpin:'Открепить',
   empty:'Пока ничего не сохранено. Бот не записывает личные факты автоматически.',
   cancel:'Отменить',done:'Сохранить изменения',export:'Экспорт памяти',eraseAll:'Забыть всё',
   confirmAll:'Удалить всю память AI? Другие отчёты, тесты и курсы останутся.',
   goals:'Цель',preferences:'Предпочтение',resources:'Ресурс',boundaries:'Граница',commitments:'Договорённость',
   feedback:'Отзыв о практике',states:'Состояние',normal:'Обычная',private:'Чувствительная',
   noTasks:'Пока нет практик.',taskTitle:'Практика',taskDetails:'Инструкция',due:'До даты',
   ownTask:'Создать свою практику',accept:'Принять',decline:'Отказаться',start:'Начать',report:'Я выполнил',review:'Отзыв мастера',
   pause:'Пауза',archive:'Архивировать',request_revision:'Попросить уточнение',cancel:'Отменить',note:'Необязательный отзыв',send:'Отправить',master:'Предложить практику клиенту',
   offer:'Предложить клиенту',invalid:'Не удалось сохранить. Обновите страницу и повторите.',conflict:'Данные изменились. Актуальная версия загружена.',
   saved:'Сохранено.',consent:'Настройки приватности обновлены.',
   notePrivate:'Нет автоматических сообщений и диагнозов. Мастер получает доступ только к отдельно разрешённой информации.'},
 es:{title:'Mi memoria y prácticas',subtitle:'Tú decides lo que el asistente puede recordar. Los datos personales son privados.',
   memory:'Mi memoria',tasks:'Mis prácticas',enable:'Usar memoria guardada en conversaciones',sensitive:'Permitir datos sensibles (opcional)',
   share:'Permitir compartir entradas seleccionadas con un profesional autorizado',reminders:'Permitir recordatorios neutrales',
   disabled:'Esta función todavía no está activada.',signIn:'Inicia sesión en Mi Casa para gestionar tu memoria.',
   new:'Recordar algo',category:'Tipo',value:'¿Qué quieres recordar?',
   save:'Guardar memoria',delete:'Olvidar',edit:'Editar',pin:'Fijar',unpin:'Desfijar',
   empty:'No hay memorias guardadas. El bot no guarda datos personales automáticamente.',
   cancel:'Cancelar',done:'Guardar cambios',export:'Exportar mi memoria',eraseAll:'Olvidar todo',
   confirmAll:'¿Eliminar toda la memoria AI? Los informes y cursos permanecen.',
   goals:'Objetivo',preferences:'Preferencia',resources:'Recurso',boundaries:'Límite',commitments:'Compromiso',
   feedback:'Comentarios sobre práctica',states:'Estado',normal:'General',private:'Sensible',
   noTasks:'Todavía no hay prácticas.',taskTitle:'Práctica',taskDetails:'Instrucciones',due:'Fecha',
   ownTask:'Crear mi práctica',accept:'Aceptar',decline:'Rechazar',start:'Empezar',report:'Hecho',review:'Revisión',
   pause:'Pausar',archive:'Archivar',request_revision:'Pedir revisión',cancel:'Cancelar',note:'Comentario opcional',send:'Enviar',master:'Proponer práctica al cliente',
   offer:'Proponer al cliente',invalid:'No se pudo guardar. Actualiza e inténtalo de nuevo.',conflict:'Los datos cambiaron. Se cargó la versión actual.',
   saved:'Guardado.',consent:'Preferencias de privacidad actualizadas.',
   notePrivate:'Sin mensajes automáticos ni diagnósticos. Solo compartes lo que autorices.'},
}
const CATEGORIES=[['goal','goals'],['resource','resources'],
  ['boundary','boundaries'],['commitment','commitments'],['practice_feedback','feedback'],['current_desired_state','states']]
const uuid=()=>crypto.randomUUID()

export default function ClientMemoryWorkspace({locale='en',masterRequestId=null}){
 const t=I18N[locale]||I18N.en
 const [data,setData]=useState(null),[tasks,setTasks]=useState(null)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const [category,setCategory]=useState('goal'),[value,setValue]=useState(''),[sensitive,setSensitive]=useState(false)
 const [editing,setEditing]=useState(null),[taskTitle,setTaskTitle]=useState(''),[instructions,setInstructions]=useState('')
 const [type,setType]=useState('practice'),[dueOn,setDueOn]=useState(''),[notes,setNotes]=useState({})
 async function refresh(){
   const [m,c]=await Promise.all([
     masterRequestId?Promise.resolve(null):appFetch('client-memory'),
     appFetch('client-care-tasks'+(masterRequestId?'?requestId='+encodeURIComponent(masterRequestId):'')),
   ])
   setData(m);setTasks(c)
 }
 useEffect(()=>{let active=true
   Promise.all([masterRequestId?Promise.resolve(null):appFetch('client-memory'),appFetch('client-care-tasks'+(masterRequestId?'?requestId='+encodeURIComponent(masterRequestId):''))])
    .then(([m,c])=>{if(active){setData(m);setTasks(c)}})
    .catch(e=>{if(active)setError(e.code||'SERVICE_UNAVAILABLE')})
   return ()=>{active=false}
 },[masterRequestId])
 async function write(path,body){
   if(busy)return false
   setBusy(true);setError('');setNotice('')
   try{await appFetch(path,body,'POST');await refresh();setNotice(t.saved);return true}
   catch(e){setError(e.status===409?t.conflict:e.status===503?t.disabled:t.invalid);if(e.status===409)await refresh().catch(()=>{});return false}
   finally{setBusy(false)}
 }
 async function consent(key,checked){
   const state=data?.settings;if(!state)return
   const success=await write('client-memory',{action:'consent',values:{[key]:checked},
     expectedRevision:state.revision,operationId:uuid()})
   if(success)setNotice(t.consent)
 }
 async function save(){
   if(!value.trim())return
   const ok=await write('client-memory',{action:'confirm',id:uuid(),operationId:uuid(),
     category,scope:'coaching',privacyClass:sensitive?'sensitive':'general',value:value.trim(),userConfirmed:true})
   if(ok){setValue('');setSensitive(false)}
 }
 async function saveAboutMe(question,answer){
   return write('client-memory',{action:'confirm',id:uuid(),operationId:uuid(),
     questionKey:question.key,category:question.category,scope:'support',
     privacyClass:question.sensitive?'sensitive':'general',value:answer,userConfirmed:true})
 }
 async function editAboutMe(item,answer){
   return write('client-memory',{action:'edit',id:item.id,expectedRevision:item.revision,
     value:answer,pinned:item.pinned,operationId:uuid()})
 }
 async function forgetAboutMe(item){
   return write('client-memory',{action:'forget',id:item.id,operationId:uuid()})
 }
 async function change(item){
   if(!editing?.value?.trim())return
   const ok=await write('client-memory',{action:'edit',id:item.id,
     expectedRevision:item.revision,value:editing.value.trim(),pinned:editing.pinned,operationId:uuid()})
   if(ok)setEditing(null)
 }
 async function taskAction(task,action){
   const operationId=uuid()
   const ok=await write('client-care-tasks',{action,taskId:task.id,
     expectedRevision:task.revision,operationId,note:(notes[task.id]||'').trim()||undefined})
   if(ok)setNotes(prev=>({...prev,[task.id]:''}))
 }
 async function createTask(){
   if(!taskTitle.trim()||!instructions.trim())return
   const master=Boolean(masterRequestId)
   const ok=await write('client-care-tasks',{action:master?'offer':'client-create',
     taskId:uuid(),requestId:master?masterRequestId:undefined,
     userConfirmed:!master,operationId:uuid(),type,title:taskTitle.trim(),
     instructions:instructions.trim(),dueOn:dueOn||null})
   if(ok){setTaskTitle('');setInstructions('');setDueOn('')}
 }
 function exportMemory(){
   if(!data?.items)return
   const json=JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:data.items},null,2)
   const blob=new Blob([json],{type:'application/json;charset=utf-8'})
   const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url
   link.download='my-holistic-memory.json';link.click();URL.revokeObjectURL(url)
 }
 return <main className={styles.page}>
  <header><a href={`/${locale}/app/progress`}>← {locale==='ru'?'Мой дом':locale==='es'?'Mi Casa':'My House'}</a>
    <h1>{t.title}</h1><p>{t.subtitle}</p></header>
  {error&&<p role="alert" className={styles.error}>{error==='CLIENT_MEMORY_DISABLED'?t.disabled:
    error==='SIGN_IN_REQUIRED'?t.signIn:error}</p>}
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}
  {data&&!masterRequestId&&<section className={styles.panel} aria-label={t.memory}>
   <h2>{t.memory}</h2>
   {[["memory_enabled",'enable'],['sensitive_enabled','sensitive'],['reminders_enabled','reminders']].map(([field,label])=><label key={field} className={styles.check}>
     <input type="checkbox" checked={Boolean(data.settings?.[field])} disabled={busy||
       (field!=='memory_enabled'&&!data.settings?.memory_enabled)}
       onChange={e=>consent(field,e.target.checked)}/>{t[label]}</label>)}
   <ClientAboutMe locale={locale} items={data.items||[]} busy={busy}
     memoryEnabled={Boolean(data.settings?.memory_enabled)}
     sensitiveEnabled={Boolean(data.settings?.sensitive_enabled)}
     onConfirm={saveAboutMe} onEdit={editAboutMe} onForget={forgetAboutMe}/>
   {data.settings?.memory_enabled&&<div className={styles.form}>
     <h3>{t.new}</h3><label>{t.category}<select value={category} onChange={e=>setCategory(e.target.value)}>
       {CATEGORIES.map(([id,label])=><option key={id} value={id}>{t[label]}</option>)}</select></label>
     <label>{t.value}<textarea value={value} maxLength={300} onChange={e=>setValue(e.target.value)}/></label>
     {data.settings?.sensitive_enabled&&<label className={styles.check}><input type="checkbox" checked={sensitive}
       onChange={e=>setSensitive(e.target.checked)}/>{t.private}</label>}
     <button type="button" disabled={busy||!value.trim()} onClick={save}>{t.save}</button>
   </div>}
   {!data.items?.length&&<p>{t.empty}</p>}
   {(data.items||[]).map(item=><article className={styles.item} key={item.id}>
      <div className={styles.itemHeading}><strong>{t[CATEGORIES.find(x=>x[0]===item.category)?.[1]]||item.category}</strong>
       <small>{item.privacyClass==='sensitive'?t.private:t.normal}</small></div>
      {editing?.id===item.id? <div className={styles.form}><textarea value={editing.value}
        maxLength={300} onChange={e=>setEditing({...editing,value:e.target.value})}/>
        <label className={styles.check}><input type="checkbox" checked={editing.pinned}
          onChange={e=>setEditing({...editing,pinned:e.target.checked})}/>{t.pin}</label>
        <div className={styles.actions}><button disabled={busy} onClick={()=>change(item)}>{t.done}</button>
        <button type="button" onClick={()=>setEditing(null)}>{t.cancel}</button></div></div>
      :<><p>{item.value}</p><div className={styles.actions}>
        <button type="button" disabled={busy} onClick={()=>setEditing({id:item.id,value:item.value,pinned:item.pinned})}>{t.edit}</button>
        <button type="button" disabled={busy} onClick={()=>write('client-memory',{
          action:'forget',id:item.id,operationId:uuid()})}>{t.delete}</button></div></>}
    </article>)}
   <div className={styles.actions}><button type="button" onClick={exportMemory} disabled={!data.items?.length}>{t.export}</button>
     <button type="button" className={styles.danger} disabled={busy||!data.items?.length}
       onClick={()=>{if(window.confirm(t.confirmAll))write('client-memory',{
         action:'forget-all',all:true,operationId:uuid()})}}>{t.eraseAll}</button></div>
  </section>}
  {tasks&&<section className={styles.panel} aria-label={t.tasks}><h2>{t.tasks}</h2>
    {!tasks.tasks?.length&&<p>{t.noTasks}</p>}
    {(tasks.tasks||[]).map(task=><article className={styles.item} key={task.id}>
      <div className={styles.itemHeading}><strong>{task.title}</strong><small>{task.status}</small></div>
      <p>{task.instructions}</p>{task.dueOn&&<small>{t.due}: {task.dueOn}</small>}
      {((!masterRequestId&&['accepted','in_progress','self_reported'].includes(task.status))||
          (masterRequestId&&task.status==='self_reported'))&&
        <label>{t.note}<textarea maxLength={1200} value={notes[task.id]||''} onChange={e=>setNotes(prev=>({...prev,[task.id]:e.target.value}))}/></label>}
      <div className={styles.actions}>{[
       ...(!masterRequestId&&(task.status==='offered'||task.status==='proposed')?['accept','decline']:[]),
       ...(!masterRequestId&&task.status==='accepted'?['start','self_report','pause']:[]),
       ...(!masterRequestId&&task.status==='in_progress'?['self_report','pause']:[]),
       ...(!masterRequestId&&task.status==='self_reported'&&task.practitionerAccountId===null?['archive']:[]),
       ...(!masterRequestId&&['reviewed','declined','cancelled'].includes(task.status)?['archive']:[]),
       ...(masterRequestId&&task.status==='self_reported'?['review','request_revision']:[]),
       ...(masterRequestId&&['offered','accepted','in_progress','paused'].includes(task.status)?['cancel']:[]),
      ].map(action=><button type="button" key={action} disabled={busy}
       onClick={()=>taskAction(task,action)}>{t[action]||action}</button>)}</div>
    </article>)}
    <div className={styles.form}><h3>{masterRequestId?t.master:t.ownTask}</h3>
      <label>{t.taskTitle}<input value={taskTitle} maxLength={140}
        onChange={e=>setTaskTitle(e.target.value)}/></label>
      <label>{t.taskDetails}<textarea value={instructions} maxLength={1500}
        onChange={e=>setInstructions(e.target.value)}/></label>
      <label>{t.due}<input type="date" value={dueOn} onChange={e=>setDueOn(e.target.value)}/></label>
      <button type="button" disabled={busy||!taskTitle.trim()||!instructions.trim()}
        onClick={createTask}>{masterRequestId?t.offer:t.ownTask}</button>
    </div>
   </section>}
   <footer>{t.notePrivate}</footer>
 </main>
}
