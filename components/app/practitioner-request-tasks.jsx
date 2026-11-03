'use client'
import {useEffect,useRef,useState} from 'react'
import {torontoToday,PRACTITIONER_TASK_KINDS} from '@/lib/practitioners/task-policy'
import styles from './practitioner-request-tasks.module.css'

const COPY={
  en:{title:'Next actions',date:'Due date',type:'Action',create:'Create task',
    reply:'Reply to client',call:'Call client',booking:'Discuss appointment',
    check_in:'Check in',general:'Follow up',complete:'Complete',reopen:'Reopen',
    reschedule:'Change date',saveDate:'Save date',cancel:'Cancel',
    empty:'No follow-up tasks yet.',done:'Completed',open:'Open',loading:'Loading tasks…',
    error:'Could not save task. Refresh and try again.',conflict:'Task changed. Refreshed data; please try again.',
    limit:'Open task limit reached for this request.',created:'Task created.',changed:'Task updated.',
    private:'Private to you as the assigned practitioner. Tasks do not send messages automatically.',
    today:'Today',overdue:'Overdue'},
  ru:{title:'Следующие действия',date:'Дата выполнения',type:'Действие',create:'Создать задачу',
    reply:'Ответить клиенту',call:'Позвонить клиенту',booking:'Уточнить запись',
    check_in:'Связаться повторно',general:'Другой контакт',complete:'Выполнено',reopen:'Открыть снова',
    reschedule:'Перенести дату',saveDate:'Сохранить дату',cancel:'Отмена',
    empty:'Пока нет задач по этой заявке.',done:'Выполнено',open:'Открыто',loading:'Загружаю задачи…',
    error:'Не удалось сохранить задачу. Обновите и повторите.',conflict:'Задача изменилась. Данные обновлены.',
    limit:'Достигнут лимит открытых задач по заявке.',created:'Задача создана.',changed:'Задача обновлена.',
    private:'Задачи видит только назначенный мастер. Клиенту ничего автоматически не отправляется.',
    today:'Сегодня',overdue:'Просрочено'},
  es:{title:'Próximas acciones',date:'Fecha límite',type:'Acción',create:'Crear tarea',
    reply:'Responder',call:'Llamar al cliente',booking:'Confirmar cita',check_in:'Seguimiento',
    general:'Otra gestión',complete:'Completar',reopen:'Reabrir',reschedule:'Cambiar fecha',
    saveDate:'Guardar fecha',cancel:'Cancelar',empty:'No hay tareas aún.',done:'Completado',
    open:'Pendiente',loading:'Cargando tareas…',error:'No se pudo guardar la tarea.',
    conflict:'La tarea cambió. Actualiza los datos.',limit:'Se alcanzó el límite de tareas.',
    created:'Tarea creada.',changed:'Tarea actualizada.',
    private:'Solo visible para el profesional asignado. No envía mensajes automáticamente.',
    today:'Hoy',overdue:'Atrasado'},
}
export default function PractitionerRequestTasks({requestId,accountId,locale='en',onChanged,focusTaskId='',focusToken=0}){
  const t=COPY[locale]||COPY.en
  const [open,setOpen]=useState(false),[tasks,setTasks]=useState([])
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false)
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const [kind,setKind]=useState('reply'),[dueOn,setDueOn]=useState(
    ()=>torontoToday(new Date(Date.now()+86400000)))
  const [edit,setEdit]=useState(null)
  const session=useRef(null),pendingCreation=useRef(null),working=useRef(false)
  const taskAnchors=useRef(new Map()),focusedTask=useRef(''),panelAnchor=useRef(null)
  useEffect(()=>{
    const controller=new AbortController()
    session.current={requestId,controller}
    pendingCreation.current=null;working.current=false
    focusedTask.current='';taskAnchors.current.clear()
    setTasks([]);setNotice('');setError('');setOpen(false);setEdit(null);setBusy(false);setLoading(false)
    return()=>{controller.abort();if(session.current?.controller===controller)session.current=null}
  },[requestId,accountId])
  async function reload(){
    const original=session.current
    if(!original||original.requestId!==requestId)return
    setLoading(true)
    try{
      const result=await fetch('/api/app/practitioner-request-tasks?requestId='+encodeURIComponent(requestId),{
        credentials:'same-origin',cache:'no-store',signal:original.controller.signal,
        headers:{'X-HH-Account-Id':accountId},
      })
      const data=await result.json().catch(()=>({}))
      if(!result.ok)throw new Error(data.error||'REQUEST_FAILED')
      if(session.current!==original)return
      setTasks(Array.isArray(data.tasks)?data.tasks:[])
      setError('')
    }catch(e){
      if(session.current===original&&!original.controller.signal.aborted)setError(t.error)
    }finally{if(session.current===original)setLoading(false)}
  }
  useEffect(()=>{
    if(!focusTaskId){focusedTask.current='';return}
    setOpen(true)
    // The request itself is reachable even while its task list is loading.
    panelAnchor.current?.focus({preventScroll:true})
    panelAnchor.current?.scrollIntoView({block:'nearest',behavior:'auto'})
    void reload()
  },[requestId,accountId,focusTaskId,focusToken])
  useEffect(()=>{
    if(!focusTaskId||!open||loading)return
    const key=accountId+':'+requestId+':'+focusTaskId+':'+focusToken
    const anchor=taskAnchors.current.get(focusTaskId)
    if(!anchor||focusedTask.current===key)return
    focusedTask.current=key
    anchor.focus({preventScroll:true})
    anchor.scrollIntoView({block:'center',behavior:
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
  },[requestId,accountId,focusTaskId,focusToken,tasks,open,loading])
  async function submit(action,payload){
    if(working.current||!session.current)return
    const original=session.current
    working.current=true
    setBusy(true);setNotice('');setError('')
    try{
      const response=await fetch('/api/app/practitioner-request-tasks',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify({action,requestId,...payload}),
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||'REQUEST_FAILED')
      if(session.current!==original)return
      setEdit(null)
      if(action==='create')pendingCreation.current=null
      setNotice(action==='create'?t.created:t.changed)
      await reload()
      if(session.current!==original)return
      onChanged?.()
    }catch(e){
      if(session.current!==original)return
      setError(e.message==='TASK_OPEN_LIMIT'?t.limit:
        e.message==='CONFLICT'?t.conflict:t.error)
      if(e.message==='CONFLICT')void reload()
    }finally{
      if(session.current===original){setBusy(false);working.current=false}
    }
  }
  function createTask(){
    if(!dueOn||busy||working.current)return
    // A lost HTTP response must not create a second task on Retry.
    const old=pendingCreation.current
    const task=old&&old.requestId===requestId&&old.kind===kind&&old.dueOn===dueOn
      ?old:{requestId,taskId:crypto.randomUUID(),kind,dueOn}
    pendingCreation.current=task
    void submit('create',task)
  }
  const now=torontoToday()
  return <section ref={panelAnchor} tabIndex={-1} className={styles.panel} aria-label={t.title}>
    <button type="button" className={styles.toggle} aria-expanded={open}
      onClick={()=>{setOpen(v=>!v);if(!open)void reload()}}>
      {t.title} {tasks.filter(x=>x.status==='open').length>0?
        '('+tasks.filter(x=>x.status==='open').length+')':''} <span aria-hidden="true">{open?'−':'+'}</span>
    </button>
    {open&&<div className={styles.content}>
      <p className={styles.privacy}>{t.private}</p>
      {loading&&<p role="status">{t.loading}</p>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {notice&&<p role="status" className={styles.notice}>{notice}</p>}
      <form className={styles.form} onSubmit={event=>{event.preventDefault();createTask()}}>
        <label>{t.type}<select value={kind} disabled={busy} onChange={e=>{
          pendingCreation.current=null;setKind(e.target.value)
        }}>
          {PRACTITIONER_TASK_KINDS.map(x=><option key={x} value={x}>{t[x]}</option>)}
        </select></label>
        <label>{t.date}<input type="date" value={dueOn} disabled={busy}
          min={now} onChange={e=>{pendingCreation.current=null;setDueOn(e.target.value)}} required/></label>
        <button disabled={busy||!dueOn} type="submit">{t.create}</button>
      </form>
      {!tasks.length&&!loading&&<p className={styles.empty}>{t.empty}</p>}
      {tasks.map(task=><article key={task.id} tabIndex={-1} aria-label={(t[task.kind]||t.general)+' · '+task.dueOn}
        ref={node=>{if(node)taskAnchors.current.set(task.id,node);else taskAnchors.current.delete(task.id)}}
        className={focusTaskId===task.id?`${styles.task} ${styles.focusedTask}`:styles.task}>
        <div><strong>{t[task.kind]||t.general}</strong>
          <small>{task.dueOn}
            {' · '}{task.status==='done'?t.done:task.dueOn<now?t.overdue:
              task.dueOn===now?t.today:t.open}</small>
        </div>
        <div className={styles.actions}>
          {task.status==='open'?<>
            <button type="button" disabled={busy} onClick={()=>
              submit('complete',{taskId:task.id,expectedRevision:task.revision})}>{t.complete}</button>
            <button type="button" disabled={busy} onClick={()=>
              setEdit({id:task.id,dueOn:task.dueOn})}>{t.reschedule}</button>
          </>:<button type="button" disabled={busy} onClick={()=>
              submit('reopen',{taskId:task.id,expectedRevision:task.revision})}>{t.reopen}</button>}
        </div>
        {edit?.id===task.id&&<form className={styles.reschedule} onSubmit={event=>{
          event.preventDefault()
          void submit('reschedule',{taskId:task.id,
            expectedRevision:task.revision,dueOn:edit.dueOn})
        }}>
          <label>{t.date}<input type="date" min={now} value={edit.dueOn}
            disabled={busy} onChange={e=>setEdit({...edit,dueOn:e.target.value})}/></label>
          <button type="submit" disabled={busy||!edit.dueOn}>{t.saveDate}</button>
          <button type="button" disabled={busy} onClick={()=>setEdit(null)}>{t.cancel}</button>
        </form>}
      </article>)}
    </div>}
  </section>
}
