'use client'
import {useMemo,useState} from 'react'
import PracticeRequestConversation from './practice-request-conversation'
import PublicEnquiryContact from './public-enquiry-contact'
import {groupVerifiedPractitionerClients} from '@/lib/practitioners/client-profile-groups'
import styles from './practitioner-client-profiles.module.css'

const CLIENTS_PAGE_SIZE=5

const COPY={
  en:{title:'My clients',intro:'Your latest clients appear automatically, ordered by their most recent enquiry. Anonymous requests remain separate until contact is established.',
    count:'Clients',requests:'Enquiries',pending:'Need attention',latest:'Last enquiry',
    search:'Search clients',all:'All',open:'Need attention',closed:'Closed',
    openProfile:'View client profile',closeProfile:'Close profile',history:'Request and conversation history',
    service:'Service',status:'Request status',contact:'Contact provided for this enquiry',
    requested:'New request',contacted:'Contacted',closedStatus:'Closed',cancelled:'Withdrawn',
    markContacted:'Mark contacted',markClosed:'Close request',none:'No clients yet.',
    filtered:'No clients match the filters.',noNotes:'No initial text provided.',
    privacy:'Only enquiries to your own services. Anonymous leads remain unverified; private tests, other practitioners’ requests and medical records stay hidden.',
    noPortal:'Reply inside Holistic House or use the contact details the client shared. Telegram/WhatsApp history is not connected.',
    historySummary:'Original request and secure in-app replies',messageCount:'Conversation entries',
    recent:'Recent clients',tip:'Tap a client to see their requests and conversation.',
    emptyHelp:'When someone enquires about your service, they will appear here automatically. You can add a service or share your practitioner profile to invite enquiries.',
    more:'Show {count} more clients',less:'Show latest 5',showing:'Showing {visible} of {total}'},
  ru:{title:'Мои клиенты',intro:'Последние клиенты появляются здесь автоматически — по дате последнего обращения. Анонимные заявки показываются отдельно до установления контакта.',
    count:'Клиентов',requests:'Обращений',pending:'Требуют внимания',latest:'Последнее обращение',
    search:'Поиск клиентов',all:'Все',open:'Требуют внимания',closed:'Закрытые',
    openProfile:'Открыть профиль клиента',closeProfile:'Закрыть профиль',history:'История заявок и переписки',
    service:'Услуга',status:'Статус заявки',contact:'Контакт, указанный при обращении',
    requested:'Новая заявка',contacted:'Связались',closedStatus:'Закрыта',cancelled:'Отозвана',
    markContacted:'Отметить связь',markClosed:'Закрыть заявку',none:'Клиентов пока нет.',
    filtered:'По выбранному фильтру клиентов нет.',noNotes:'Первоначальное сообщение не указано.',
    privacy:'Здесь только обращения к вашим услугам. Анонимные лиды не считаются подтверждёнными клиентами. Личные тесты, медицинские записи и чужие заявки недоступны.',
    noPortal:'Можно ответить внутри Holistic House или по указанному контакту. История Telegram/WhatsApp пока не подключена.',
    historySummary:'Первое обращение и ответы внутри сайта',messageCount:'Записей переписки',
    recent:'Последние клиенты',tip:'Нажмите на клиента, чтобы увидеть его заявки и переписку.',
    emptyHelp:'После обращения по вашей услуге клиент появится здесь автоматически. Для первых заявок можно разместить услугу или поделиться профилем.',
    more:'Показать ещё {count}',less:'Показать последние 5',showing:'Показано {visible} из {total}'},
  es:{title:'Mis clientes',intro:'Tus clientes recientes aparecen automáticamente, ordenados por su última solicitud. Las solicitudes anónimas se mantienen separadas.',
    count:'Clientes',requests:'Solicitudes',pending:'Requieren atención',latest:'Última solicitud',
    search:'Buscar clientes',all:'Todos',open:'Pendientes',closed:'Cerrados',
    openProfile:'Ver perfil del cliente',closeProfile:'Cerrar perfil',history:'Solicitudes y mensajes',
    service:'Servicio',status:'Estado de solicitud',contact:'Contacto proporcionado',
    requested:'Nueva solicitud',contacted:'Contactado',closedStatus:'Cerrado',cancelled:'Retirado',
    markContacted:'Marcar contactado',markClosed:'Cerrar solicitud',none:'Todavía no hay clientes.',
    filtered:'No hay coincidencias.',noNotes:'Sin mensaje inicial.',
    privacy:'Solo consultas a tus servicios. Los contactos anónimos aún no están verificados; sin pruebas privadas, historiales ni solicitudes de otros profesionales.',
    noPortal:'Puedes responder dentro de Holistic House. El historial de Telegram/WhatsApp no está conectado.',
    historySummary:'Solicitud original y respuestas privadas',messageCount:'Mensajes guardados',
    recent:'Clientes recientes',tip:'Elige un cliente para ver sus solicitudes y mensajes.',
    emptyHelp:'Los clientes aparecerán aquí cuando soliciten tus servicios. Puedes publicar un servicio o compartir tu perfil.',
    more:'Mostrar {count} clientes más',less:'Mostrar los últimos 5',showing:'Mostrando {visible} de {total}'},
}
const labelDate=(value,locale)=>value?new Intl.DateTimeFormat(locale,{
  dateStyle:'medium',timeZone:'America/Toronto',
}).format(new Date(value)):''
export default function PractitionerClientProfiles({items=[],services=[],accountId,locale='en',busy=false,onStatus,onSaveContact}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const groups=useMemo(()=>groupVerifiedPractitionerClients(items,lang),[items,lang])
  const [selectedKey,setSelectedKey]=useState(''),[filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [visibleCount,setVisibleCount]=useState(CLIENTS_PAGE_SIZE)
  const selected=groups.find(item=>item.key===selectedKey)
  const filtered=groups.filter(group=>
    (!search.trim()||(group.name+' '+group.contact).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    &&(filter==='all'||(filter==='open'?group.open>0:group.open===0)))
  const activeCount=groups.filter(g=>g.open>0).length
  const visible=filtered.slice(0,visibleCount)
  const remaining=Math.max(0,filtered.length-visibleCount)
  return <section className={styles.panel} aria-label={t.title}>
    <header className={styles.head}>
      <div><h3>{t.title}</h3><p>{t.intro}</p></div>
      <div className={styles.metrics}><span>{groups.length} {t.count}</span>
        <span>{items.length} {t.requests}</span><span>{activeCount} {t.pending}</span></div>
    </header>
    <p className={styles.privacy}>{t.privacy}</p>
    <div className={selected?`${styles.layout} ${styles.withProfile}`:styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.recentLead}>
          <strong>{t.recent}</strong>
          {groups.length>0&&<span>{t.tip}</span>}
        </div>
        {groups.length===0
          ? <div className={styles.noClients} role="status">
              <strong>{t.none}</strong>
              <p>{t.emptyHelp}</p>
            </div>
          : <>
            <label className={styles.searchLabel}>{t.search}
              <input type="search" value={search}
                onChange={event=>{setSearch(event.target.value);setVisibleCount(CLIENTS_PAGE_SIZE);setSelectedKey('')}}
                placeholder={t.search}/>
            </label>
            <div className={styles.filters} role="group" aria-label={t.title}>
              {[[ 'all',t.all ],['open',t.open],['closed',t.closed]].map(([id,label])=>
                <button type="button" key={id} aria-pressed={filter===id}
                  onClick={()=>{setFilter(id);setVisibleCount(CLIENTS_PAGE_SIZE);setSelectedKey('')}}>{label}</button>)}
            </div>
            {filtered.length===0&&<p className={styles.empty}>{t.filtered}</p>}
            {visible.map(group=><button type="button" key={group.key}
              className={selectedKey===group.key?styles.activeClient:styles.client}
              aria-pressed={selectedKey===group.key} onClick={()=>setSelectedKey(group.key)}>
              <span className={styles.avatar} aria-hidden="true">{group.name.slice(0,1).toUpperCase()}</span>
              <span className={styles.summary}><strong>{group.name}</strong>
                <small>{t.requests}: {group.items.length} · {t.latest}: {labelDate(group.latest.createdAt,lang)}</small></span>
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
                  }{request.messageCount>0?' · '+t.messageCount+': '+request.messageCount:''}</small>
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
                      createdAt={request.createdAt}/>}
              </article>
            })}
          </div>
        </>
      </div>}
    </div>
  </section>
}
