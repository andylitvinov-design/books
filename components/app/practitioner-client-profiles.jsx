'use client'
import {useEffect,useMemo,useState} from 'react'
import PracticeRequestConversation from './practice-request-conversation'
import {groupVerifiedPractitionerClients} from '@/lib/practitioners/client-profile-groups'
import styles from './practitioner-client-profiles.module.css'

const COPY={
  en:{title:'My clients',intro:'People who enquired about your services. Requests are linked only to their verified account.',introOwner:'All your client records: manually created contacts and verified service enquiries. No email required for manual contacts.',
    count:'Clients',requests:'Enquiries',pending:'Need attention',latest:'Last enquiry',
    search:'Search clients',all:'All',open:'Need attention',closed:'Closed',
    openProfile:'View client profile',closeProfile:'Close profile',history:'Request and conversation history',
    service:'Service',status:'Request status',contact:'Contact provided for this enquiry',
    requested:'New request',contacted:'Contacted',closedStatus:'Closed',cancelled:'Withdrawn',
    markContacted:'Mark contacted',markClosed:'Close request',none:'No clients yet.',
    filtered:'No clients match the filters.',noNotes:'No initial text provided.',
    privacy:'Client profile shows only information the person shared with you through your services. Private tests, other practitioners’ requests and personal medical records are not available.',privacyOwner:'Manually created clinical records are visible only to the owner. Service enquiries remain account-bound and separate; matching names or phone numbers never combines records.',
    noPortal:'Reply inside Holistic House or use the contact details the client shared. Telegram/WhatsApp history is not connected.',
    historySummary:'Original request and secure in-app replies',messageCount:'Conversation entries',
    manual:'Created manually',manualTitle:'My saved clients',manualHint:'Open a card to view its old reports, prescriptions and document history.',manualEmpty:'No saved manual clients match your search.',manualLoading:'Loading saved clients…',manualError:'The old client directory could not be loaded.',retry:'Retry',openDirectory:'Open full client database',
    enquiriesTitle:'Service enquiries',enquiriesEmpty:'No service enquiries yet.',showMore:'Show 5 more',allRecords:'Client entries',privacyTitle:'Privacy and record matching',openReports:'Open reports and client profile',archived:'Archived',updated:'Updated'},
  ru:{title:'Мои клиенты',intro:'Клиенты, обращавшиеся к вам за услугами. Заявки объединяются только по подтверждённому аккаунту.',introOwner:'Ваши клиенты: созданные вручную карточки и обращения по услугам. Для ручных карточек email не нужен.',
    count:'Клиентов',requests:'Обращений',pending:'Требуют внимания',latest:'Последнее обращение',
    search:'Поиск клиентов',all:'Все',open:'Требуют внимания',closed:'Закрытые',
    openProfile:'Открыть профиль клиента',closeProfile:'Закрыть профиль',history:'История заявок и переписки',
    service:'Услуга',status:'Статус заявки',contact:'Контакт, указанный при обращении',
    requested:'Новая заявка',contacted:'Связались',closedStatus:'Закрыта',cancelled:'Отозвана',
    markContacted:'Отметить связь',markClosed:'Закрыть заявку',none:'Клиентов пока нет.',
    filtered:'По выбранному фильтру клиентов нет.',noNotes:'Первоначальное сообщение не указано.',
    privacy:'Мастер видит только сведения, которыми клиент поделился при обращении к нему. Чужие заявки, личные тесты и медицинские записи недоступны.',privacyOwner:'Созданные вручную медицинские карточки доступны только владельцу практики. Заявки по услугам хранятся отдельно по подтверждённым аккаунтам; совпадения имён и телефонов не объединяют людей.',
    noPortal:'Можно ответить внутри Holistic House или по указанному контакту. История Telegram/WhatsApp пока не подключена.',
    historySummary:'Первое обращение и ответы внутри сайта',messageCount:'Записей переписки',
    manual:'Создан вручную',manualTitle:'Сохранённые клиенты',manualHint:'Откройте карточку, чтобы найти старые отчёты, назначения и историю документов.',manualEmpty:'По поиску ручных карточек нет.',manualLoading:'Загружаем старых клиентов…',manualError:'Не удалось загрузить старую базу клиентов.',retry:'Повторить',openDirectory:'Открыть всю базу клиентов',
    enquiriesTitle:'Обращения по услугам',enquiriesEmpty:'Обращений по услугам пока нет.',showMore:'Показать ещё 5',allRecords:'Карточек клиентов',privacyTitle:'Конфиденциальность и привязка записей',openReports:'Открыть отчёты и карточку',archived:'В архиве',updated:'Обновлён'},
  es:{title:'Mis clientes',intro:'Clientes que solicitaron tus servicios, agrupados solo por cuenta verificada.',introOwner:'Tus clientes: contactos creados manualmente y solicitudes. No se requiere email para los contactos manuales.',
    count:'Clientes',requests:'Solicitudes',pending:'Requieren atención',latest:'Última solicitud',
    search:'Buscar clientes',all:'Todos',open:'Pendientes',closed:'Cerrados',
    openProfile:'Ver perfil del cliente',closeProfile:'Cerrar perfil',history:'Solicitudes y mensajes',
    service:'Servicio',status:'Estado de solicitud',contact:'Contacto proporcionado',
    requested:'Nueva solicitud',contacted:'Contactado',closedStatus:'Cerrado',cancelled:'Retirado',
    markContacted:'Marcar contactado',markClosed:'Cerrar solicitud',none:'Todavía no hay clientes.',
    filtered:'No hay coincidencias.',noNotes:'Sin mensaje inicial.',
    privacy:'Solo los datos compartidos contigo en las solicitudes. No se muestran pruebas privadas ni expedientes médicos.',privacyOwner:'Las fichas clínicas manuales son privadas del propietario. Las solicitudes permanecen vinculadas a cuentas verificadas, sin fusionar registros por nombre o teléfono.',
    noPortal:'Puedes responder dentro de Holistic House. El historial de Telegram/WhatsApp no está conectado.',
    historySummary:'Solicitud original y respuestas privadas',messageCount:'Mensajes guardados',
    manual:'Creado manualmente',manualTitle:'Clientes guardados',manualHint:'Abre una ficha para consultar informes y documentos anteriores.',manualEmpty:'No hay contactos manuales que coincidan.',manualLoading:'Cargando clientes guardados…',manualError:'No se pudo cargar la base anterior.',retry:'Reintentar',openDirectory:'Abrir toda la base de clientes',
    enquiriesTitle:'Solicitudes de servicios',enquiriesEmpty:'Todavía no hay solicitudes.',showMore:'Mostrar 5 más',allRecords:'Fichas de clientes',privacyTitle:'Privacidad y vinculación de registros',openReports:'Abrir informes y ficha',archived:'Archivado',updated:'Actualizado'},
}
const labelDate=(value,locale)=>value?new Intl.DateTimeFormat(locale,{
  dateStyle:'medium',timeZone:'America/Toronto',
}).format(new Date(value)):''
export default function PractitionerClientProfiles({items=[],services=[],accountId,locale='en',busy=false,onStatus,isOwner=false,onOpenLegacy}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const groups=useMemo(()=>groupVerifiedPractitionerClients(items,lang),[items,lang])
  const [selectedKey,setSelectedKey]=useState(''),[filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [manualClients,setManualClients]=useState([])
  const [manualLoading,setManualLoading]=useState(isOwner)
  const [manualError,setManualError]=useState('')
  const [refreshManual,setRefreshManual]=useState(0)
  const [manualVisible,setManualVisible]=useState(5)
  const [enquiryVisible,setEnquiryVisible]=useState(5)
  useEffect(()=>{
    if(!isOwner||!accountId)return
    const controller=new AbortController()
    setManualLoading(true)
    setManualError('')
    fetch('/api/app/practitioner/legacy-clients',{
      credentials:'same-origin',cache:'no-store',
      headers:{'X-HH-Account-Id':accountId},signal:controller.signal,
    }).then(async response=>{
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||'UNAVAILABLE')
      if(!Array.isArray(data.clients))throw new Error('UNAVAILABLE')
      return data.clients
    }).then(clients=>{if(!controller.signal.aborted)setManualClients(clients)})
      .catch(error=>{if(!controller.signal.aborted)setManualError(error.message||'UNAVAILABLE')})
      .finally(()=>{if(!controller.signal.aborted)setManualLoading(false)})
    return ()=>controller.abort()
  },[isOwner,accountId,refreshManual])
  const selected=groups.find(item=>item.key===selectedKey)
  const term=search.trim().toLocaleLowerCase()
  const filtered=groups.filter(group=>
    (!term||(group.name+' '+group.contact).toLocaleLowerCase().includes(term))
    &&(filter==='all'||(filter==='open'?group.open>0:group.open===0)))
  const matchingManual=isOwner?manualClients.filter(client=>
    !term||(client.name+' '+client.phone+' '+client.email).toLocaleLowerCase().includes(term)):[]
  const activeCount=groups.filter(group=>group.open>0).length
  const resetSearch=value=>{setSearch(value);setManualVisible(5);setEnquiryVisible(5)}
  return <section className={styles.panel} aria-label={t.title}>
    <header className={styles.head}>
      <div><h3>{t.title}</h3><p>{isOwner?t.introOwner:t.intro}</p></div>
      <div className={styles.metrics}>
        <span>{isOwner&&manualLoading?'…':groups.length+manualClients.length} {isOwner?t.allRecords:t.count}</span>
        {isOwner&&<span>{manualLoading?'…':manualClients.length} {t.manual}</span>}
        <span>{items.length} {t.requests}</span><span>{activeCount} {t.pending}</span>
      </div>
    </header>
    <details className={styles.privacy}><summary>{t.privacyTitle}</summary><p>{isOwner?t.privacyOwner:t.privacy}</p></details>
    <label className={styles.searchLabel}>{t.search}
      <input type="search" value={search} onChange={event=>resetSearch(event.target.value)}
        placeholder={t.search}/>
    </label>
    {isOwner&&<section className={styles.manual} aria-label={t.manualTitle}>
      <div className={styles.sectionHead}><div><h4>{t.manualTitle}</h4><p>{t.manualHint}</p></div>
        <button type="button" onClick={()=>onOpenLegacy?.()}>{t.openDirectory} ↗</button>
      </div>
      {manualLoading&&<p className={styles.empty} role="status">{t.manualLoading}</p>}
      {!manualLoading&&manualError&&<div className={styles.manualError} role="alert">
        <span>{t.manualError}</span>
        <button type="button" onClick={()=>setRefreshManual(value=>value+1)}>{t.retry}</button>
        <button type="button" onClick={()=>onOpenLegacy?.()}>{t.openDirectory}</button>
      </div>}
      {!manualLoading&&!manualError&&matchingManual.length===0&&<p className={styles.empty}>{t.manualEmpty}</p>}
      {!manualLoading&&!manualError&&<div className={styles.manualList}>
        {matchingManual.slice(0,manualVisible).map(client=><button className={styles.manualClient} type="button" key={client.id}
          onClick={()=>onOpenLegacy?.(client.id)}>
          <span className={styles.avatar} aria-hidden="true">{client.name.slice(0,1).toUpperCase()}</span>
          <span className={styles.summary}><strong>{client.name}</strong>
            <small>{t.manual}{client.status==='archived'?' · '+t.archived:''}
              {client.phone?' · '+client.phone:''}
              {client.updatedAt||client.createdAt?' · '+t.updated+': '+labelDate(client.updatedAt||client.createdAt,lang):''}
            </small></span><span aria-hidden="true">→</span>
        </button>)}
        {matchingManual.length>manualVisible&&<button className={styles.more} type="button"
          onClick={()=>setManualVisible(count=>count+5)}>{t.showMore} ({matchingManual.length-manualVisible})</button>}
      </div>}
    </section>}
    <section className={styles.enquirySection} aria-label={t.enquiriesTitle}>
      <h4>{t.enquiriesTitle} ({groups.length})</h4>
      {groups.length===0?<p className={styles.empty}>{isOwner?t.enquiriesEmpty:t.none}</p>:
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.filters} role="group" aria-label={t.enquiriesTitle}>
          {[[ 'all',t.all ],['open',t.open],['closed',t.closed]].map(([id,label])=>
            <button type="button" key={id} aria-pressed={filter===id}
              onClick={()=>{setFilter(id);setEnquiryVisible(5)}}>{label}</button>)}
        </div>
        {filtered.length===0&&<p className={styles.empty}>{t.filtered}</p>}
        {filtered.slice(0,enquiryVisible).map(group=><button type="button" key={group.key}
          className={selectedKey===group.key?styles.activeClient:styles.client}
          aria-pressed={selectedKey===group.key} onClick={()=>setSelectedKey(group.key)}>
          <span className={styles.avatar} aria-hidden="true">{group.name.slice(0,1).toUpperCase()}</span>
          <span className={styles.summary}><strong>{group.name}</strong>
            <small>{t.requests}: {group.items.length} · {t.latest}: {labelDate(group.latest.createdAt,lang)}</small></span>
          {group.open>0&&<span className={styles.count}>{group.open}</span>}
        </button>)}
        {filtered.length>enquiryVisible&&<button className={styles.more} type="button" onClick={()=>setEnquiryVisible(count=>count+5)}>{t.showMore} ({filtered.length-enquiryVisible})</button>}
      </aside>
      <div className={styles.profile}>
        {!selected?<p className={styles.empty}>{t.openProfile}</p>:<>
          <div className={styles.profileHead}>
            <h3>{selected.name}</h3>
            <button type="button" onClick={()=>setSelectedKey('')}>{t.closeProfile}</button>
          </div>
          <dl className={styles.facts}>
            <div><dt>{t.contact}</dt><dd>{selected.contact}</dd></div>
            <div><dt>{t.requests}</dt><dd>{selected.items.length}</dd></div>
            <div><dt>{t.pending}</dt><dd>{selected.open}</dd></div>
          </dl>
          <p className={styles.hint}>{t.noPortal}</p>
          <h4>{t.history}</h4>
          <div className={styles.history}>
            {selected.items.map(request=>{
              const service=services.find(item=>item.id===request.serviceId)
              const name=service?.localizedCopy?.[lang]?.title||service?.copy?.title||t.service
              return <article className={styles.request} key={request.id}>
                <div className={styles.requestHead}>
                  <strong>{name}</strong>
                  <small>{labelDate(request.createdAt,lang)} · {
                    request.status==='requested'?t.requested:
                    request.status==='contacted'?t.contacted:
                    request.status==='closed'?t.closedStatus:t.cancelled
                  }{request.messageCount>0?' · '+t.messageCount+': '+request.messageCount:''}</small>
                </div>
                {request.message&&<p className={styles.original}>{request.message}</p>}
                {['requested','contacted'].includes(request.status)&&<div className={styles.actions}>
                  {request.status==='requested'&&<button type="button" disabled={busy}
                    onClick={()=>onStatus?.(request,'contacted')}>{t.markContacted}</button>}
                  <button type="button" disabled={busy} onClick={()=>onStatus?.(request,'closed')}>{t.markClosed}</button>
                </div>}
                <PracticeRequestConversation key={request.id} requestId={request.id}
                  accountId={accountId} locale={lang} initialMessage={typeof request.message==='string'?request.message:''}
                  createdAt={request.createdAt}/>
              </article>
            })}
          </div>
        </>}
      </div>
    </div>}
    </section>
  </section>
}
