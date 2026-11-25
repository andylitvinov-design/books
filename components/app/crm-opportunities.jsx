'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {CRM_OPPORTUNITY_SERVICES,CRM_OPPORTUNITY_STAGES,
  CRM_OPPORTUNITY_NEXT} from '../../lib/crm/opportunity-contract.mjs'
import styles from './crm-opportunities.module.css'

const COPY={
 en:{
  title:'Deals & services',intro:'Track each business request independently from the contact. Every stage here is owner-entered, not a verified booking or payment.',
  total:'Total deals',active:'In progress',requested:'Booking requested',
  contact:'Business contact',choose:'Choose a contact',service:'Service',create:'Create deal',
  newDeal:'New deal',stageFilterLabel:'Filter loaded deals',all:'All stages',open:'Open contact',
  noContacts:'Add a business contact first in Contacts.',empty:'No deals yet.',history:'Stage history',noHistory:'No history yet.',historyError:'Cannot read stage history.',
  loading:'Loading…',more:'Load earlier deals',refresh:'Refresh',
  partial:'Showing the latest deals. Load more to see older items; the totals count all owner deals.',
  error:'Unable to load or save. Please retry.',conflict:'Another tab changed the deal. Refresh and retry.',
  unavailable:'Contact is archived, suppressed or unavailable.',
  created:'Deal created. No message was sent or appointment/payment confirmed.',
  updated:'Stage saved manually. No booking or payment was verified.',
  taskPlanned:'Internal booking task added to Today. Nothing was sent to the client.',
  taskFull:'Stage saved. The contact has 20 open tasks: please manage the task list manually.',
  manual:'Only manual business stages. No external messages, clinical records or financial confirmations.',
  services:{consultation:'Consultation',business:'Business consulting',reiki:'Reiki course / initiation',video_therapy:'Video therapy',other:'Other service'},
  stages:{new:'New',qualified:'Qualified',offered:'Offer sent (manual)',booking_requested:'Booking requested',
    booked_manual:'Booked (manual, unverified)',delivered_manual:'Completed (manual, unverified)',
    lost:'Lost',canceled:'Canceled'},
 },
 ru:{
  title:'Сделки и услуги',intro:'Каждый деловой запрос отдельно от статуса клиента. Этапы отмечены вручную и не подтверждают запись или оплату.',
  total:'Всего сделок',active:'В работе',requested:'Запрос записи',
  contact:'Деловой контакт',choose:'Выберите контакт',service:'Услуга',create:'Создать сделку',
  newDeal:'Новая сделка',stageFilterLabel:'Фильтр загруженных сделок',all:'Все этапы',open:'Открыть контакт',
  noContacts:'Сначала добавьте деловой контакт в разделе «Контакты».',empty:'Сделок пока нет.',history:'История этапов',noHistory:'История пока пустая.',historyError:'Не удалось прочитать историю.',
  loading:'Загрузка…',more:'Загрузить старые сделки',refresh:'Обновить',
  partial:'Показаны последние сделки. Более ранние доступны через «Загрузить». Общие счётчики полные.',
  error:'Не удалось сохранить или загрузить. Повторите.',conflict:'Сделка изменена в другой вкладке. Обновите список.',
  unavailable:'Контакт архивирован, заблокирован или недоступен.',
  created:'Сделка создана. Ничего не отправлено; запись и оплата не подтверждены.',
  updated:'Этап отмечен вручную. Запись и оплата не подтверждены.',
  taskPlanned:'Создана внутренняя задача по записи на сегодня. Клиенту ничего не отправлено.',
  taskFull:'Этап сохранён. У контакта уже 20 задач — проверьте список вручную.',
  manual:'Только деловые этапы вручную. Без внешней отправки, клинических данных и фиктивных оплат.',
  services:{consultation:'Консультация',business:'Бизнес-консалтинг',reiki:'Курс / инициация Reiki',video_therapy:'Видеотерапия',other:'Другая услуга'},
  stages:{new:'Новая',qualified:'Запрос уточнён',offered:'Предложение сделано (вручную)',booking_requested:'Запрошена запись',
    booked_manual:'Запись отмечена вручную',delivered_manual:'Услуга отмечена оказанной',
    lost:'Отказ',canceled:'Отмена'},
 },
 es:{
  title:'Oportunidades y servicios',intro:'Cada solicitud empresarial se gestiona aparte del contacto. Las etapas son manuales; no verifican reservas ni pagos.',
  total:'Total',active:'En curso',requested:'Reserva solicitada',
  contact:'Contacto profesional',choose:'Elige un contacto',service:'Servicio',create:'Crear oportunidad',
  newDeal:'Nueva oportunidad',stageFilterLabel:'Filtrar oportunidades cargadas',all:'Todas las etapas',open:'Abrir contacto',
  noContacts:'Añade un contacto profesional en Contactos.',empty:'Todavía no hay oportunidades.',history:'Historial de etapas',noHistory:'Todavía no hay historial.',historyError:'No se pudo leer el historial.',
  loading:'Cargando…',more:'Cargar oportunidades anteriores',refresh:'Actualizar',
  partial:'Se muestran las más recientes. Carga más para ver las anteriores; los totales son completos.',
  error:'No se pudo guardar o cargar. Vuelve a intentarlo.',conflict:'Otra pestaña modificó la oportunidad. Actualiza.',
  unavailable:'El contacto está archivado, bloqueado o no disponible.',
  created:'Oportunidad creada. No se envió un mensaje ni se confirmó reserva/pago.',
  updated:'Etapa guardada manualmente. Reserva y pago sin verificar.',
  taskPlanned:'Se añadió una tarea interna de reserva para hoy. No se envió nada al cliente.',
  taskFull:'Etapa guardada. El contacto ya tiene 20 tareas; revísalas manualmente.',
  manual:'Solo etapas comerciales manuales; sin envíos, datos clínicos ni cobros ficticios.',
  services:{consultation:'Consulta',business:'Consultoría de negocios',reiki:'Curso / iniciación Reiki',video_therapy:'Videoterapia',other:'Otro servicio'},
  stages:{new:'Nueva',qualified:'Cualificada',offered:'Oferta enviada (manual)',booking_requested:'Reserva solicitada',
    booked_manual:'Reserva anotada manualmente',delivered_manual:'Servicio anotado como realizado',
    lost:'Perdida',canceled:'Cancelada'},
 },
}
async function command(accountId,action,payload,signal){
  const response=await fetch('/api/app/crm/opportunities',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal,
    headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
    body:JSON.stringify({action,payload}),
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(result.error||'OPPORTUNITIES_UNAVAILABLE')
  return result
}
const getDate=(value,locale)=>{
  const ms=Date.parse(value||'')
  return Number.isFinite(ms)?new Intl.DateTimeFormat(
    locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',
    {dateStyle:'medium',timeZone:'America/Toronto'}
  ).format(new Date(ms)):''
}
export default function CrmOpportunities({
  accountId,locale='en',contacts=[],onOpenContact,onCrmChange,initialContactId='',
}){
  const t=COPY[locale]||COPY.en
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [contactId,setContactId]=useState(initialContactId)
  const [service,setService]=useState('consultation')
  const [stageFilter,setStageFilter]=useState('all')
  const [histories,setHistories]=useState({})
  const [historyBusy,setHistoryBusy]=useState('')
  const listAbort=useRef(null)
  const sendAbort=useRef(null)
  const accountRef=useRef(accountId)
  const operation=useRef(null)
  const load=useCallback(async(cursor=null)=>{
    if(!accountId)return
    listAbort.current?.abort()
    const controller=new AbortController()
    listAbort.current=controller
    setLoading(true)
    try{
      const response=await command(accountId,'list',{cursor},controller.signal)
      if(!Array.isArray(response.opportunities)||response.opportunities.length>50||
         !Number.isSafeInteger(response.total)||response.total<0||
         (response.nextCursor!==null&&typeof response.nextCursor!=='string')||
         response.manualOnly!==true)throw new Error('INVALID_OPPORTUNITY_PAGE')
      if(controller.signal.aborted||accountRef.current!==accountId)return
      setData(old=>{
        if(!cursor)return response
        const ids=new Set(old?.opportunities.map(item=>item.id)||[])
        return {...response,opportunities:[
          ...(old?.opportunities||[]),
          ...response.opportunities.filter(item=>!ids.has(item.id)),
        ]}
      })
      setError('')
    }catch(e){
      if(!controller.signal.aborted&&accountRef.current===accountId)
        setError(t.error)
    }finally{
      if(!controller.signal.aborted&&accountRef.current===accountId)setLoading(false)
    }
  },[accountId,t.error])
  useEffect(()=>{
    accountRef.current=accountId
    setData(null);setError('');setNotice('');setContactId(initialContactId)
    setStageFilter('all');setService('consultation');setHistories({});setHistoryBusy('')
    operation.current=null
    void load(null)
    return ()=>{listAbort.current?.abort();sendAbort.current?.abort()}
  },[accountId,load,initialContactId])
  const available=contacts.filter(contact=>contact&&!contact.suppressed&&contact.lifecycle!=='archived')
  async function create(){
    if(!contactId||busy||loading||!available.some(contact=>contact.id===contactId))return
    const key=contactId+':'+service
    if(operation.current?.key!==key)
      operation.current={key,operationId:crypto.randomUUID()}
    const payload={contactId,service,operationId:operation.current.operationId}
    const controller=new AbortController();sendAbort.current=controller
    setBusy(true);setError('');setNotice('')
    try{
      await command(accountId,'create',payload,controller.signal)
      if(controller.signal.aborted||accountRef.current!==accountId)return
      operation.current=null
      setHistories({})
      setNotice(t.created)
      await load(null)
    }catch(e){
      if(!controller.signal.aborted&&accountRef.current===accountId)
        setError(e.message==='OPPORTUNITY_CONTACT_UNAVAILABLE'?t.unavailable:t.error)
    }finally{
      if(!controller.signal.aborted&&accountRef.current===accountId)setBusy(false)
    }
  }
  async function change(item,stage){
    if(busy||loading||!CRM_OPPORTUNITY_NEXT[item.stage]?.includes(stage))return
    const controller=new AbortController();sendAbort.current=controller
    setBusy(true);setError('');setNotice('')
    try{
      const result=await command(accountId,'change',{id:item.id,expectedRevision:item.revision,stage},controller.signal)
      if(controller.signal.aborted||accountRef.current!==accountId)return
      setHistories({})
      if(result.taskPlanned===true)onCrmChange?.()
      setNotice(result.taskPlanned===true?t.taskPlanned:result.taskSkipped==='capacity'?t.taskFull:t.updated)
      await load(null)
    }catch(e){
      if(!controller.signal.aborted&&accountRef.current===accountId)
        setError(e.message==='OPPORTUNITY_REVISION_CONFLICT'?t.conflict:t.error)
    }finally{
      if(!controller.signal.aborted&&accountRef.current===accountId)setBusy(false)
    }
  }
  async function loadHistory(item){
    if(historyBusy||histories[item.id]||busy)return
    const controller=new AbortController()
    setHistoryBusy(item.id)
    try{
      const response=await command(accountId,'history',{id:item.id},controller.signal)
      if(response.id!==item.id||!Array.isArray(response.events)||
         response.events.length>100||response.manualOnly!==true)
        throw new Error('INVALID_OPPORTUNITY_HISTORY')
      if(!controller.signal.aborted&&accountRef.current===accountId)
        setHistories(old=>({...old,[item.id]:response.events}))
    }catch{
      if(!controller.signal.aborted&&accountRef.current===accountId)setError(t.historyError)
    }finally{if(accountRef.current===accountId)setHistoryBusy('')}
  }
  const items=(data?.opportunities||[]).filter(item=>stageFilter==='all'||item.stage===stageFilter)
  const counts=data?.counts||{}
  const active=['new','qualified','offered','booking_requested','booked_manual'].reduce((sum,stage)=>sum+(counts[stage]||0),0)
  return <section className={styles.panel} aria-labelledby="crm-deals-title">
    <header className={styles.head}>
      <div><h3 id="crm-deals-title">{t.title}</h3><p>{t.intro}</p></div>
      <button className={styles.button+' '+styles.secondary} type="button"
        disabled={loading||busy} onClick={()=>load(null)}>{t.refresh}</button>
    </header>
    <div className={styles.stats}>
      {[[t.total,data?.total??'—'],[t.active,data?active:'—'],
        [t.requested,data?counts.booking_requested||0:'—']].map(([label,value])=>
        <div className={styles.stat} key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
    <form className={styles.form} onSubmit={event=>{event.preventDefault();void create()}}>
      <label className={styles.field}>{t.contact}
        <select value={contactId} disabled={busy} onChange={event=>{
          setContactId(event.target.value);operation.current=null
        }} required>
          <option value="">{t.choose}</option>
          {available.map(contact=><option key={contact.id} value={contact.id}>{contact.displayName}</option>)}
        </select>
      </label>
      <label className={styles.field}>{t.service}
        <select value={service} disabled={busy} onChange={event=>{
          setService(event.target.value);operation.current=null
        }}>
          {CRM_OPPORTUNITY_SERVICES.map(id=><option key={id} value={id}>{t.services[id]}</option>)}
        </select>
      </label>
      <button type="submit" className={styles.button}
        disabled={!contactId||busy||loading||!available.length}>{busy?t.loading:t.create}</button>
    </form>
    {!available.length&&<p className={styles.empty}>{t.noContacts}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    <div className={styles.controls}>
      <label className={styles.field}>{t.stageFilterLabel}
        <select className={styles.filter} value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
          <option value="all">{t.all}</option>
          {CRM_OPPORTUNITY_STAGES.map(id=><option key={id} value={id}>{t.stages[id]}</option>)}
        </select>
      </label>
      {loading&&<span role="status">{t.loading}</span>}
    </div>
    {data&&!items.length&&!loading&&<p className={styles.empty}>{t.empty}</p>}
    <ul className={styles.list}>
      {items.map(item=><li className={styles.item} key={item.id}>
        <div className={styles.detail}>
          <strong>{item.contactName}</strong>
          <small>{t.services[item.service]} · {getDate(item.createdAt,locale)}</small>
          <button type="button" onClick={()=>onOpenContact?.(item.contactId)}>{t.open}</button>
          <details className={styles.history} onToggle={event=>{
            if(event.currentTarget.open)void loadHistory(item)
          }}>
            <summary>{t.history}</summary>
            {historyBusy===item.id&&<span role="status">{t.loading}</span>}
            {histories[item.id]&&<ol>{histories[item.id].map(entry=><li key={entry.revision}>
              <span>{entry.from_stage?t.stages[entry.from_stage]+' → ':''}{t.stages[entry.to_stage]}</span>
              <small>{getDate(entry.occurred_at,locale)}</small>
            </li>)}</ol>}
            {histories[item.id]?.length===0&&<small>{t.noHistory}</small>}
          </details>
        </div>
        <label className={styles.stage}>{t.stages[item.stage]}
          <select value={item.stage} disabled={busy||loading||
              CRM_OPPORTUNITY_NEXT[item.stage]?.length===0}
            aria-label={t.stages[item.stage]+' — '+item.contactName}
            onChange={e=>void change(item,e.target.value)}>
            <option value={item.stage}>{t.stages[item.stage]}</option>
            {CRM_OPPORTUNITY_NEXT[item.stage]?.map(next=><option key={next} value={next}>{t.stages[next]}</option>)}
          </select>
        </label>
      </li>)}
    </ul>
    {data?.nextCursor&&<button type="button" className={styles.button+' '+styles.secondary}
      disabled={loading||busy} onClick={()=>load(data.nextCursor)}>{t.more}</button>}
    {data?.nextCursor&&<p className={styles.note}>{t.partial}</p>}
    <p className={styles.note}>{t.manual}</p>
  </section>
}
