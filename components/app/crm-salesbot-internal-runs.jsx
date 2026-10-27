'use client'
import {useEffect,useRef,useState} from 'react'
import styles from './crm-salesbot-drafts.module.css'
const COPY={
  en:{title:'Internal CRM workflow runs',hint:'Only verified incoming Telegram events. Review the approved script or create an existing CRM task; NO customer messages are sent.',loading:'Loading private run history…',none:'No internal runs yet. Save, approve and activate one scenario first.',error:'Unable to load or update internal runs.',refresh:'Refresh runs',wait:'Waiting for your choice',review:'Needs personal follow-up',done:'Completed internally',continue:'Continue internally',followup:'Create reply task',saved:'Internal action saved. No message sent.'},
  ru:{title:'Внутренние запуски CRM',hint:'Только подтверждённые входящие события Telegram. Можно выбрать шаг или создать задачу мастеру. Сообщения клиентам НЕ отправляются.',loading:'Загружаем историю сценариев…',none:'Пока нет запусков. Сохраните, утвердите и включите один сценарий.',error:'Не удалось загрузить или обновить запуски.',refresh:'Обновить',wait:'Ожидает вашего выбора',review:'Нужен ответ мастера',done:'Завершён внутри CRM',continue:'Продолжить внутри CRM',followup:'Создать задачу ответа',saved:'Внутреннее действие сохранено. Клиенту ничего не отправлялось.'},
  es:{title:'Ejecuciones internas del CRM',hint:'Solo eventos entrantes verificados de Telegram. Revisa el paso o crea una tarea; NO se envían mensajes a los clientes.',loading:'Cargando historial privado…',none:'Sin ejecuciones. Guarda, aprueba y activa un escenario.',error:'No se pudo cargar o actualizar.',refresh:'Actualizar',wait:'Esperando tu elección',review:'Necesita respuesta del profesional',done:'Completado internamente',continue:'Continuar internamente',followup:'Crear tarea de respuesta',saved:'Acción interna guardada. No se enviaron mensajes.'},
}
export default function CrmSalesbotInternalRuns({accountId,locale='en'}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [chosen,setChosen]=useState({})
  const sessionRef=useRef(null)
  async function load(session){
    setLoading(true)
    try{
      const response=await fetch('/api/app/crm/salesbot/runs',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        signal:session.controller.signal,headers:{'X-HH-Account-Id':session.accountId}})
      const data=await response.json()
      if(session!==sessionRef.current||session.controller.signal.aborted)return
      if(!response.ok||data.mode!=='internal_only'||data.sendsEnabled!==false||
        !Array.isArray(data.items))throw new Error('UNAVAILABLE')
      setItems(data.items)
      setNotice('')
    }catch{
      if(session===sessionRef.current&&!session.controller.signal.aborted){
        setItems([]);setNotice(t.error)
      }
    }finally{
      if(session===sessionRef.current&&!session.controller.signal.aborted)
        setLoading(false)
    }
  }
  useEffect(()=>{
    const session={accountId,controller:new AbortController()}
    sessionRef.current=session;setItems([]);setChosen({});setNotice('')
    void load(session)
    return()=>{session.controller.abort();if(sessionRef.current===session)sessionRef.current=null}
  },[accountId])
  async function act(row,action){
    const session=sessionRef.current
    if(!session||session.accountId!==accountId||busy)return
    const choiceId=chosen[row.id]||row.waiting?.options?.[0]?.id
    if(action==='resume'&&!choiceId)return
    setBusy(true);setNotice('')
    try{
      const payload=action==='resume'
        ?{action,id:row.id,expectedRevision:row.revision,choiceId}
        :{action,id:row.id}
      const response=await fetch('/api/app/crm/salesbot/runs',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        signal:session.controller.signal,
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify(payload),
      })
      const data=await response.json()
      if(session!==sessionRef.current||session.controller.signal.aborted)return
      if(!response.ok||data.sendsEnabled!==false)throw new Error('UNAVAILABLE')
      await load(session);setNotice(t.saved)
    }catch{
      if(session===sessionRef.current&&!session.controller.signal.aborted)setNotice(t.error)
    }finally{
      if(session===sessionRef.current&&!session.controller.signal.aborted)setBusy(false)
    }
  }
  const statuses={waiting_owner:t.wait,review:t.review,completed:t.done}
  return <section className={styles.panel} aria-label={t.title} data-salesbot-internal-only>
    <div className={styles.head}>
      <div><h4>{t.title}</h4><p>{t.hint}</p></div>
      <button type="button" className={styles.secondary} disabled={loading||busy}
        onClick={()=>{const s=sessionRef.current;if(s)void load(s)}}>{t.refresh}</button>
    </div>
    {loading&&<p role="status" className={styles.note}>{t.loading}</p>}
    {!loading&&!items.length&&<p className={styles.note}>{t.none}</p>}
    {items.slice(0,12).map(row=><div key={row.id} style={{padding:'10px 0',borderTop:'1px solid #eee0d2'}}>
      <strong>{statuses[row.status]||row.status}</strong>
      <p className={styles.note}>v{row.version} · {new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.createdAt))}</p>
      {row.status==='waiting_owner'&&Array.isArray(row.waiting?.options)&&
        <div className={styles.actions}>
          <select aria-label={t.wait} disabled={busy}
            value={chosen[row.id]||row.waiting.options[0]?.id||''}
            onChange={e=>setChosen(previous=>({...previous,[row.id]:e.target.value}))}>
            {row.waiting.options.map(opt=><option key={opt.id} value={opt.id}>{opt.text}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={()=>void act(row,'resume')}>{t.continue}</button>
        </div>}
      {row.status==='review'&&<div className={styles.actions}>
        <button type="button" disabled={busy}
          onClick={()=>void act(row,'create_owner_followup')}>{t.followup}</button>
      </div>}
    </div>)}
    {notice&&<p role="status" className={styles.note}>{notice}</p>}
  </section>
}
