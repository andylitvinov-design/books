'use client'
import {useEffect,useMemo,useState} from 'react'
import PracticeRequestConversation from './practice-request-conversation'
import PublicEnquiryContact from './public-enquiry-contact'
import {groupVerifiedPractitionerClients} from '@/lib/practitioners/client-profile-groups'
import styles from './practitioner-client-profiles.module.css'

const CLIENTS_PAGE_SIZE=5

const COPY={
  en:{title:'My clients',intro:'Your latest clients appear automatically, ordered by their most recent enquiry.',
    count:'Clients',requests:'Enquiries',pending:'Need attention',latest:'Last enquiry',
    search:'Search clients',all:'All',open:'Need attention',closed:'Closed',
    openProfile:'View client profile',closeProfile:'Close profile',history:'Request and conversation history',
    service:'Service',status:'Request status',contact:'Contact provided for this enquiry',
    requested:'New request',contacted:'Contacted',closedStatus:'Closed',cancelled:'Withdrawn',
    markContacted:'Mark contacted',markClosed:'Close request',none:'No clients yet.',
    filtered:'No clients match the filters.',noNotes:'No initial text provided.',
    privacy:'Only enquiries to your services. Anonymous contacts are not verified; private tests and records stay hidden.',
    noPortal:'Reply inside Holistic House or use the contact details the client shared. Telegram/WhatsApp history is not connected.',
    historySummary:'Original request and secure in-app replies',messageCount:'Conversation entries',
    recent:'Recent clients',awaiting:'Awaiting my reply',newMessages:'New messages',lastActivity:'Recent activity',refresh:'Refresh clients',tip:'Tap a client to see their requests and conversation.',
    emptyHelp:'When someone enquires about your service, they will appear here automatically. You can add a service or share your practitioner profile to invite enquiries.',
    more:'Show {count} more clients',less:'Show latest 5',showing:'Showing {visible} of {total}'},
  ru:{title:'Мои клиенты',intro:'Последние клиенты появляются здесь автоматически — по дате последнего обращения.',
    count:'Клиентов',requests:'Обращений',pending:'Требуют внимания',latest:'Последнее обращение',
    search:'Поиск клиентов',all:'Все',open:'Требуют внимания',closed:'Закрытые',
    openProfile:'Открыть профиль клиента',closeProfile:'Закрыть профиль',history:'История заявок и переписки',
    service:'Услуга',status:'Статус заявки',contact:'Контакт, указанный при обращении',
    requested:'Новая заявка',contacted:'Связались',closedStatus:'Закрыта',cancelled:'Отозвана',
    markContacted:'Отметить связь',markClosed:'Закрыть заявку',none:'Клиентов пока нет.',
    filtered:'По выбранному фильтру клиентов нет.',noNotes:'Первоначальное сообщение не указано.',
    privacy:'Здесь только обращения к вам. Анонимные контакты не подтверждены; личные тесты и чужие заявки недоступны.',
    noPortal:'Можно ответить внутри Holistic House или по указанному контакту. История Telegram/WhatsApp пока не подключена.',
    historySummary:'Первое обращение и ответы внутри сайта',messageCount:'Записей переписки',
    recent:'Последние клиенты',awaiting:'Ждут моего ответа',newMessages:'Новые сообщения',lastActivity:'Недавняя активность',refresh:'Обновить клиентов',tip:'Нажмите на клиента, чтобы увидеть его заявки и переписку.',
    emptyHelp:'После обращения по вашей услуге клиент появится здесь автоматически. Для первых заявок можно разместить услугу или поделиться профилем.',
    more:'Показать ещё {count}',less:'Показать последние 5',showing:'Показано {visible} из {total}'},
  es:{title:'Mis clientes',intro:'Tus clientes recientes aparecen automáticamente, ordenados por su última solicitud.',
    count:'Clientes',requests:'Solicitudes',pending:'Requieren atención',latest:'Última solicitud',
    search:'Buscar clientes',all:'Todos',open:'Pendientes',closed:'Cerrados',
    openProfile:'Ver perfil del cliente',closeProfile:'Cerrar perfil',history:'Solicitudes y mensajes',
    service:'Servicio',status:'Estado de solicitud',contact:'Contacto proporcionado',
    requested:'Nueva solicitud',contacted:'Contactado',closedStatus:'Cerrado',cancelled:'Retirado',
    markContacted:'Marcar contactado',markClosed:'Cerrar solicitud',none:'Todavía no hay clientes.',
    filtered:'No hay coincidencias.',noNotes:'Sin mensaje inicial.',
    privacy:'Solo solicitudes a tus servicios. Los contactos anónimos no están verificados; sin datos privados de terceros.',
    noPortal:'Puedes responder dentro de Holistic House. El historial de Telegram/WhatsApp no está conectado.',
    historySummary:'Solicitud original y respuestas privadas',messageCount:'Mensajes guardados',
    recent:'Clientes recientes',awaiting:'Esperan mi respuesta',newMessages:'Mensajes nuevos',lastActivity:'Actividad reciente',refresh:'Actualizar clientes',tip:'Elige un cliente para ver sus solicitudes y mensajes.',
    emptyHelp:'Los clientes aparecerán aquí cuando soliciten tus servicios. Puedes publicar un servicio o compartir tu perfil.',
    more:'Mostrar {count} clientes más',less:'Mostrar los últimos 5',showing:'Mostrando {visible} de {total}'},
}

const MANUAL_COPY={
  en:{intro:'Saved clients and service enquiries, including manually created people without email.',title:'Saved client records',hint:'Open a card to see previous consultations and reports.',source:'Manual record',count:'Saved',all:'Open full client database',missing:'No saved clients match your search.',loading:'Loading saved clients…',failed:'Old client records could not be loaded.',retry:'Retry',more:'Show 5 more',archived:'Archived',enquiries:'Service enquiries',emptyEnquiries:'No service enquiries yet.',privacy:'Manual clinical records are owner-only. Enquiries stay linked to verified accounts; matching names or phone numbers never merge people.'},
  ru:{intro:'Сохранённые вручную клиенты и обращения по услугам, включая карточки без email.',title:'Сохранённые клиенты',hint:'Откройте карточку, чтобы найти прежние консультации и отчёты.',source:'Создан вручную',count:'Сохранено',all:'Открыть всю базу клиентов',missing:'Сохранённые клиенты не найдены.',loading:'Загружаем сохранённых клиентов…',failed:'Не удалось загрузить старую базу клиентов.',retry:'Повторить',more:'Показать ещё 5',archived:'В архиве',enquiries:'Обращения по услугам',emptyEnquiries:'Обращений пока нет.',privacy:'Клинические карточки доступны только владельцу. Заявки привязаны к подтверждённым аккаунтам; совпадения имени или телефона не объединяют людей.'},
  es:{intro:'Clientes guardados y solicitudes, incluidos contactos manuales sin email.',title:'Clientes guardados',hint:'Abre una ficha para ver consultas e informes anteriores.',source:'Ficha manual',count:'Guardados',all:'Abrir toda la base',missing:'No se encontraron clientes guardados.',loading:'Cargando clientes…',failed:'No se pudo cargar la base anterior.',retry:'Reintentar',more:'Mostrar 5 más',archived:'Archivado',enquiries:'Solicitudes de servicios',emptyEnquiries:'Aún no hay solicitudes.',privacy:'Solo el propietario puede abrir fichas clínicas. Las solicitudes son de cuentas verificadas; no se fusionan por nombre o teléfono.'},
}
const labelDate=(value,locale)=>value?new Intl.DateTimeFormat(locale,{
  dateStyle:'medium',timeZone:'America/Toronto',
}).format(new Date(value)):''
export default function PractitionerClientProfiles({items=[],services=[],accountId,locale='en',busy=false,onStatus,onSaveContact,onRefresh,isOwner=false,onOpenLegacy}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang],u=MANUAL_COPY[lang]
  const groups=useMemo(()=>groupVerifiedPractitionerClients(items,lang),[items,lang])
  const [selectedKey,setSelectedKey]=useState(''),[filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [visibleCount,setVisibleCount]=useState(CLIENTS_PAGE_SIZE)
  const [manualClients,setManualClients]=useState([])
  const [manualCount,setManualCount]=useState(CLIENTS_PAGE_SIZE)
  const [manualLoading,setManualLoading]=useState(isOwner)
  const [manualError,setManualError]=useState(false)
  const [manualRetry,setManualRetry]=useState(0)
  useEffect(()=>{
    if(!isOwner||!accountId)return
    const abort=new AbortController()
    setManualLoading(true);setManualError(false)
    fetch('/api/app/practitioner/legacy-clients',{
      credentials:'same-origin',cache:'no-store',signal:abort.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response=>{
      if(!response.ok)throw new Error('CLIENT_DIRECTORY_UNAVAILABLE')
      const data=await response.json()
      if(!Array.isArray(data.clients))throw new Error('CLIENT_DIRECTORY_UNAVAILABLE')
      return data.clients
    }).then(clients=>{if(!abort.signal.aborted)setManualClients(clients)})
      .catch(()=>{if(!abort.signal.aborted)setManualError(true)})
      .finally(()=>{if(!abort.signal.aborted)setManualLoading(false)})
    return ()=>abort.abort()
  },[isOwner,accountId,manualRetry])
  const selected=groups.find(item=>item.key===selectedKey)
  const filtered=groups.filter(group=>
    (!search.trim()||(group.name+' '+group.contact).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    &&(filter==='all'||(filter==='reply'?group.awaiting>0:filter==='open'?group.open>0:group.open===0)))
  const activeCount=groups.filter(g=>g.open>0).length
  const awaitingCount=groups.filter(g=>g.awaiting>0).length
  const newMessagesCount=groups.reduce((total,g)=>total+g.newMessages,0)
  const visible=filtered.slice(0,visibleCount)
  const remaining=Math.max(0,filtered.length-visibleCount)
  const term=search.trim().toLocaleLowerCase()
  const matchingManual=isOwner?manualClients.filter(item=>
    !term||(item.name+' '+item.email+' '+item.phone).toLocaleLowerCase().includes(term)):[]
  const visibleManual=matchingManual.slice(0,manualCount)
  return <section className={styles.panel} aria-label={t.title}>
    <header className={styles.head}>
      <div><h3>{t.title}</h3><p>{isOwner?u.intro:t.intro}</p></div>
      <div className={styles.metrics}>
        <span>{isOwner&&manualLoading?'…':groups.length+(isOwner?manualClients.length:0)} {t.count}</span>
        {isOwner&&<span>{manualLoading?'…':manualClients.length} {u.count}</span>}
        <span>{items.length} {t.requests}</span><span>{activeCount} {t.pending}</span>
        <span>{awaitingCount} {t.awaiting}</span>
        {newMessagesCount>0&&<span className={styles.newCount} role="status">
          {newMessagesCount} {t.newMessages}</span>
        {onRefresh&&<button type="button" className={styles.refresh} disabled={busy}
          onClick={()=>onRefresh()}>{t.refresh}</button>}
      </div>
    </header>
    {isOwner?<details className={styles.privacy}><summary>{u.source} · {u.enquiries}</summary><p>{u.privacy}</p></details>
      :<p className={styles.privacy}>{t.privacy}</p>}
    <label className={styles.searchLabel}>{t.search}
      <input type="search" value={search}
        onChange={event=>{setSearch(event.target.value);setVisibleCount(CLIENTS_PAGE_SIZE);setSelectedKey('');setManualCount(CLIENTS_PAGE_SIZE)}}
        placeholder={t.search}/>
    </label>
    {isOwner&&<section className={styles.manual} aria-label={u.title}>
      <div className={styles.manualHead}>
        <div><h4>{u.title}</h4><p>{u.hint}</p></div>
        <button type="button" onClick={()=>onOpenLegacy?.()}>{u.all} ↗</button>
      </div>
      {manualLoading&&<p className={styles.empty} role="status">{u.loading}</p>}
      {!manualLoading&&manualError&&<div className={styles.manualError} role="alert">
        <span>{u.failed}</span>
        <button type="button" onClick={()=>setManualRetry(value=>value+1)}>{u.retry}</button>
        <button type="button" onClick={()=>onOpenLegacy?.()}>{u.all}</button>
      </div>}
      {!manualLoading&&!manualError&&matchingManual.length===0&&<p className={styles.empty}>{u.missing}</p>}
      {!manualLoading&&!manualError&&<div className={styles.manualList}>
        {visibleManual.map(client=><button type="button" className={styles.manualClient} key={client.id}
          onClick={()=>onOpenLegacy?.(client.id)}>
          <span className={styles.avatar} aria-hidden="true">{client.name.slice(0,1).toUpperCase()}</span>
          <span className={styles.summary}><strong>{client.name}</strong>
            <small>{u.source}{client.status==='archived'?' · '+u.archived:''}
              {client.phone?' · '+client.phone:''}
              {client.email?' · '+client.email:''}
            </small></span><span aria-hidden="true">→</span>
        </button>)}
        {matchingManual.length>manualCount&&<button type="button" className={styles.manualMore}
          onClick={()=>setManualCount(count=>count+CLIENTS_PAGE_SIZE)}>
          {u.more} ({matchingManual.length-manualCount})
        </button>}
      </div>}
    </section>}
    <div className={selected?`${styles.layout} ${styles.withProfile}`:styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.recentLead}>
          <strong>{isOwner?u.enquiries:t.recent}</strong>
          {groups.length>0&&<span>{t.tip}</span>}
        </div>
        {groups.length===0
          ? <div className={styles.noClients} role="status">
              <strong>{isOwner?u.emptyEnquiries:t.none}</strong>
              <p>{isOwner?u.emptyEnquiries:t.emptyHelp}</p>
            </div>
          : <>
            <div className={styles.filters} role="group" aria-label={t.title}>
              {[[ 'all',t.all ],['reply',t.awaiting],['open',t.open],['closed',t.closed]].map(([id,label])=>
                <button type="button" key={id} aria-pressed={filter===id}
                  onClick={()=>{setFilter(id);setVisibleCount(CLIENTS_PAGE_SIZE);setSelectedKey('')}}>{label}</button>)}
            </div>
            {filtered.length===0&&<p className={styles.empty}>{t.filtered}</p>}
            {visible.map(group=><button type="button" key={group.key}
              className={selectedKey===group.key?styles.activeClient:styles.client}
              aria-pressed={selectedKey===group.key} onClick={()=>setSelectedKey(group.key)}>
              <span className={styles.avatar} aria-hidden="true">{group.name.slice(0,1).toUpperCase()}</span>
              <span className={styles.summary}><strong>{group.name}</strong>
                <small>{t.requests}: {group.items.length} · {t.lastActivity}: {labelDate(group.lastActivityAt,lang)}</small>
                {group.awaiting>0&&<small className={styles.awaiting}>{t.awaiting}: {group.awaiting}</small>}
                {group.newMessages>0&&<small className={styles.unseen}>
                  {t.newMessages}: {group.newMessages}</small>}
              </span>
              {group.open>0&&<span className={styles.count}>{group.open}</span>}
            </button>)}
            {filtered.length>CLIENTS_PAGE_SIZE&&<div className={styles.paging}>
              <span>{t.showing.replace('{visible}',String(visible.length)).replace('{total}',String(filtered.length))}</span>
              {remaining>0
                ? <button type="button" className={styles.moreLink}
                    onClick={()=>setVisibleCount(count=>count+CLIENTS_PAGE_SIZE)}>
                    {t.more.replace('{count}',String(Math.min(CLIENTS_PAGE_SIZE,remaining)))} <span aria-hidden="true">↓</span>
                  </button>
                : <button type="button" className={styles.moreLink}
                    onClick={()=>setVisibleCount(CLIENTS_PAGE_SIZE)}>
                    {t.less} <span aria-hidden="true">↑</span>
                  </button>}
            </div>}
          </>}
      </aside>
      {selected&&<div className={styles.profile}>
        <>
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
              const name=service?.localizedCopy?.[lang]?.title||service?.copy?.title||request.serviceTitle||t.service
              return <article className={styles.request} key={request.id}>
                <div className={styles.requestHead}>
                  <strong>{name}</strong>
                  <small>{labelDate(request.createdAt,lang)} · {
                    request.status==='requested'?t.requested:
                    request.status==='contacted'?t.contacted:
                    request.status==='closed'?t.closedStatus:t.cancelled
                  }{request.messageCount>0?' · '+t.messageCount+': '+request.messageCount:''}
                  {request.needsReply?' · '+t.awaiting:''}
                  {request.newMessageCount>0?' · '+t.newMessages+': '+request.newMessageCount:''}</small>
                </div>
                {request.message&&<p className={styles.original}>{request.message}</p>}
                {['requested','contacted'].includes(request.status)&&<div className={styles.actions}>
                  {request.status==='requested'&&<button type="button" disabled={busy}
                    onClick={()=>onStatus?.(request,'contacted')}>{t.markContacted}</button>}
                  <button type="button" disabled={busy} onClick={()=>onStatus?.(request,'closed')}>{t.markClosed}</button>
                </div>}
                {request.requestKind==='public'
                  ? <PublicEnquiryContact request={request} locale={lang} busy={busy} onSave={onSaveContact}/>
                  : <PracticeRequestConversation key={request.id} requestId={request.id}
                      accountId={accountId} locale={lang} initialMessage={typeof request.message==='string'?request.message:''}
                      createdAt={request.createdAt} onSaved={()=>onRefresh?.()} onViewed={()=>onRefresh?.()}/>}
              </article>
            })}
          </div>
        </>
      </div>}
    </div>
  </section>
}
