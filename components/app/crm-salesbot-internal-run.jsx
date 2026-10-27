'use client'
import {useEffect,useRef,useState} from 'react'
import {SALESBOT_TOPICS} from '../../lib/crm/salesbot-flow.mjs'
import styles from './crm-salesbot-drafts.module.css'

const COPY={
  en:{title:'Run approved scenario on a CRM lead',note:'Owner-only internal action. Reads one existing consented lead; no message is sent to Telegram or any client.',
    thread:'Choose a real CRM conversation',topic:'Scenario topic',start:'Start internal run',loading:'Loading consented CRM threads…',
    empty:'No eligible incoming CRM leads. A real customer message and consent are required.',
    waiting:'Choose a simulation answer to continue the saved run:',completed:'Internal run complete.',
    task:'Existing owner reply task scheduled or reused.',failed:'This action was not confirmed. You can safely retry.',
    history:'Recent owner runs',unavailable:'CRM channel unavailable. No new contacts or messages were created.',
    awaiting:'Waiting for a choice',run:'Run',noSend:'Provider delivery: OFF · Human review only'},
  ru:{title:'Запустить сценарий для существующего лида CRM',note:'Только внутреннее действие владельца. Использует один подтверждённый входящий диалог; сообщения клиенту или в Telegram не отправляются.',
    thread:'Выберите реальный диалог CRM',topic:'Тема сценария',start:'Запустить внутренний сценарий',loading:'Загружаем согласованные CRM-диалоги…',
    empty:'Пока нет подходящих входящих лидов. Нужно настоящее обращение клиента с согласием.',
    waiting:'Выберите ответ для продолжения сохранённого сценария:',completed:'Внутренний сценарий завершён.',
    task:'Задача ответа мастеру создана или переиспользована.',failed:'Действие не подтверждено. Можно безопасно повторить.',
    history:'Последние запуски владельца',unavailable:'Канал CRM недоступен. Новых контактов и сообщений нет.',
    awaiting:'Ожидает выбора',run:'Запуск',noSend:'Отправка клиентам: ВЫКЛ · Только мастер'},
  es:{title:'Ejecutar escenario con un contacto CRM',note:'Acción interna del propietario. Usa una conversación consentida existente; no envía mensajes a Telegram ni al cliente.',
    thread:'Elige conversación CRM real',topic:'Tema del escenario',start:'Iniciar ejecución interna',loading:'Cargando conversaciones CRM…',
    empty:'No hay consultas CRM admisibles. Se requiere un mensaje real con consentimiento.',
    waiting:'Selecciona la respuesta para continuar:',completed:'Ejecución interna terminada.',
    task:'Tarea de respuesta asignada o reutilizada.',failed:'Acción sin confirmar. Puedes reintentar.',
    history:'Ejecuciones recientes',unavailable:'El canal CRM no está disponible. No se crearon contactos ni mensajes.',
    awaiting:'Esperando opción',run:'Ejecutar',noSend:'Entrega externa: DESACTIVADA · Solo revisión humana'},
}
const ELIGIBLE=thread=>thread.lifecycle==='lead'&&!thread.suppressed&&Boolean(thread.lastInboundAt)
export default function CrmSalesbotInternalRun({accountId,locale='en',flowId}){
  const t=COPY[locale]||COPY.en
  const [threads,setThreads]=useState([])
  const [threadId,setThreadId]=useState('')
  const [topic,setTopic]=useState('direction')
  const [runs,setRuns]=useState([])
  const [active,setActive]=useState(null)
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState('')
  const sessionRef=useRef(null)
  const pendingId=useRef(null)
  useEffect(()=>{
    if(!accountId||!flowId)return
    const session={accountId,flowId,controller:new AbortController()}
    sessionRef.current=session
    setThreads([]);setRuns([]);setThreadId('');setActive(null);setNotice('');setLoading(true)
    pendingId.current=null
    const headers={'X-HH-Account-Id':accountId}
    Promise.all([
      fetch('/api/app/crm/messenger',{credentials:'same-origin',cache:'no-store',headers,
        signal:session.controller.signal}).then(async r=>{
        if(!r.ok)throw new Error('CRM_UNAVAILABLE');return r.json()}),
      fetch('/api/app/crm/salesbot/runs?flowId='+encodeURIComponent(flowId),{
        credentials:'same-origin',cache:'no-store',headers,
        signal:session.controller.signal}).then(async r=>{
        if(!r.ok)throw new Error('RUNS_UNAVAILABLE');return r.json()}),
    ]).then(([inbox,history])=>{
      if(session!==sessionRef.current||session.controller.signal.aborted)return
      const possible=(inbox.threads||[]).filter(ELIGIBLE)
      setThreads(possible);setThreadId(possible[0]?.id||'')
      setRuns(history.items||[])
    }).catch(error=>{
      if(session===sessionRef.current&&error.name!=='AbortError')setNotice(t.unavailable)
    }).finally(()=>{
      if(session===sessionRef.current&&!session.controller.signal.aborted)setLoading(false)
    })
    return()=>{
      session.controller.abort()
      if(sessionRef.current===session)sessionRef.current=null
    }
  },[accountId,flowId,t.unavailable])
  async function execute(action,payload){
    const session=sessionRef.current
    if(!session||busy||session.accountId!==accountId||session.flowId!==flowId)return
    setBusy(true);setNotice('')
    try{
      const response=await fetch('/api/app/crm/salesbot/runs',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json','X-HH-Account-Id':accountId},
        signal:session.controller.signal,body:JSON.stringify({action,payload})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||data.mode!=='owner_crm_run'||data.sendsEnabled!==false||!data.id)
        throw new Error('RUN_UNCONFIRMED')
      if(session!==sessionRef.current||session.controller.signal.aborted)return
      setActive(data);setRuns(old=>[data,...old.filter(x=>x.id!==data.id)].slice(0,20))
      pendingId.current=null
      setNotice(data.taskId?t.task:data.status==='completed'?t.completed:t.waiting)
    }catch(error){
      if(session===sessionRef.current&&!session.controller.signal.aborted)setNotice(t.failed)
    }finally{
      if(session===sessionRef.current&&!session.controller.signal.aborted)setBusy(false)
    }
  }
  function start(){
    if(!threadId||!threads.some(x=>x.id===threadId)||busy)return
    if(!pendingId.current)pendingId.current=crypto.randomUUID()
    void execute('start',{flowId,threadId,operationId:pendingId.current,locale,topic})
  }
  function resume(choiceId){
    if(!active||active.status!=='waiting_for_choice'||busy)return
    void execute('resume',{runId:active.id,expectedRevision:active.revision,choiceId})
  }
  return <section className={styles.panel} aria-label={t.title}>
    <h4>{t.title}</h4>
    <p className={styles.note}>{t.note}</p>
    <p className={styles.note}>{t.noSend}</p>
    {loading?<p role="status" className={styles.note}>{t.loading}</p>:
      threads.length===0?<p className={styles.note}>{t.empty}</p>:<>
        <label>{t.thread}
          <select disabled={busy} value={threadId} onChange={e=>{
            setThreadId(e.target.value);setActive(null);pendingId.current=null}}>
            {threads.map(x=><option key={x.id} value={x.id}>
              {x.name} · {x.channel} · {x.unreadCount||0}
            </option>)}
          </select>
        </label>
        <label>{t.topic}
          <select disabled={busy} value={topic} onChange={e=>{
            setTopic(e.target.value);pendingId.current=null}}>
            {SALESBOT_TOPICS.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <button type="button" disabled={busy||!threadId}
            onClick={start}>{busy?'…':t.start}</button>
        </div>
      </>}
    {active&&<div className={styles.note} role="status">
      <strong>{active.status==='completed'?t.completed:t.awaiting}</strong>
      <ol>{(active.trace||[]).map((item,i)=><li key={item.nodeId+'-'+i}>
        {item.text||item.kind}</li>)}</ol>
      {active.waiting&&<div className={styles.actions}>
        {(active.waiting.options||[]).map(option=><button type="button" key={option.id}
          disabled={busy} onClick={()=>resume(option.id)}>{option.text}</button>)}
      </div>}
    </div>}
    {runs.length>0&&<details><summary>{t.history} · {runs.length}</summary>
      <ul>{runs.map(run=><li key={run.id}>
        {run.status=== 'completed'?t.completed:t.awaiting} · v{run.version}
      </li>)}</ul>
    </details>}
    {notice&&<p className={styles.note} role="status">{notice}</p>}
  </section>
}
