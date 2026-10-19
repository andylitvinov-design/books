'use client'
import {useMemo,useState} from 'react'
import PracticeRequestConversation from './practice-request-conversation'
import {groupVerifiedPractitionerClients} from '@/lib/practitioners/client-profile-groups'
import styles from './practitioner-client-profiles.module.css'

const COPY={
  en:{title:'My clients',intro:'Only people who sent enquiries to your own services. Requests are grouped by a verified account, not by matching names or phone numbers.',
    count:'Clients',requests:'Enquiries',pending:'Need attention',latest:'Last enquiry',
    search:'Search clients',all:'All',open:'Need attention',closed:'Closed',
    openProfile:'View client profile',closeProfile:'Close profile',history:'Request and conversation history',
    service:'Service',status:'Request status',contact:'Contact provided for this enquiry',
    requested:'New request',contacted:'Contacted',closedStatus:'Closed',cancelled:'Withdrawn',
    markContacted:'Mark contacted',markClosed:'Close request',none:'No clients yet.',
    filtered:'No clients match the filters.',noNotes:'No initial text provided.',
    privacy:'Client profile shows only information the person shared with you through your services. Private tests, other practitioners’ requests and personal medical records are not available.',
    noPortal:'Reply inside Holistic House or use the contact details the client shared. Telegram/WhatsApp history is not connected.',
    historySummary:'Original request and secure in-app replies'},
  ru:{title:'Мои клиенты',intro:'Только люди, которые обращались к вам за вашими услугами. Обращения объединяются по подтверждённому аккаунту, а не по совпадению имён или телефонов.',
    count:'Клиентов',requests:'Обращений',pending:'Требуют внимания',latest:'Последнее обращение',
    search:'Поиск клиентов',all:'Все',open:'Требуют внимания',closed:'Закрытые',
    openProfile:'Открыть профиль клиента',closeProfile:'Закрыть профиль',history:'История заявок и переписки',
    service:'Услуга',status:'Статус заявки',contact:'Контакт, указанный при обращении',
    requested:'Новая заявка',contacted:'Связались',closedStatus:'Закрыта',cancelled:'Отозвана',
    markContacted:'Отметить связь',markClosed:'Закрыть заявку',none:'Клиентов пока нет.',
    filtered:'По выбранному фильтру клиентов нет.',noNotes:'Первоначальное сообщение не указано.',
    privacy:'Мастер видит только сведения, которыми клиент поделился при обращении к нему. Чужие заявки, личные тесты и медицинские записи недоступны.',
    noPortal:'Можно ответить внутри Holistic House или по указанному контакту. История Telegram/WhatsApp пока не подключена.',
    historySummary:'Первое обращение и ответы внутри сайта'},
  es:{title:'Mis clientes',intro:'Solo personas que solicitaron tus servicios. Las solicitudes se agrupan por cuenta verificada, no por nombres.',
    count:'Clientes',requests:'Solicitudes',pending:'Requieren atención',latest:'Última solicitud',
    search:'Buscar clientes',all:'Todos',open:'Pendientes',closed:'Cerrados',
    openProfile:'Ver perfil del cliente',closeProfile:'Cerrar perfil',history:'Solicitudes y mensajes',
    service:'Servicio',status:'Estado de solicitud',contact:'Contacto proporcionado',
    requested:'Nueva solicitud',contacted:'Contactado',closedStatus:'Cerrado',cancelled:'Retirado',
    markContacted:'Marcar contactado',markClosed:'Cerrar solicitud',none:'Todavía no hay clientes.',
    filtered:'No hay coincidencias.',noNotes:'Sin mensaje inicial.',
    privacy:'Solo los datos compartidos contigo en las solicitudes. No se muestran pruebas privadas ni expedientes médicos.',
    noPortal:'Puedes responder dentro de Holistic House. El historial de Telegram/WhatsApp no está conectado.',
    historySummary:'Solicitud original y respuestas privadas'},
}
const labelDate=(value,locale)=>value?new Intl.DateTimeFormat(locale,{
  dateStyle:'medium',timeZone:'America/Toronto',
}).format(new Date(value)):''
export default function PractitionerClientProfiles({items=[],services=[],accountId,locale='en',busy=false,onStatus}){
  const lang=COPY[locale]?locale:'en',t=COPY[lang]
  const groups=useMemo(()=>groupVerifiedPractitionerClients(items,lang),[items,lang])
  const [selectedKey,setSelectedKey]=useState(''),[filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const selected=groups.find(item=>item.key===selectedKey)
  const filtered=groups.filter(group=>
    (!search.trim()||(group.name+' '+group.contact).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    &&(filter==='all'||(filter==='open'?group.open>0:group.open===0)))
  const activeCount=groups.filter(g=>g.open>0).length
  return <section className={styles.panel} aria-label={t.title}>
    <header className={styles.head}>
      <div><h3>{t.title}</h3><p>{t.intro}</p></div>
      <div className={styles.metrics}><span>{groups.length} {t.count}</span>
        <span>{items.length} {t.requests}</span><span>{activeCount} {t.pending}</span></div>
    </header>
    <p className={styles.privacy}>{t.privacy}</p>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <label className={styles.searchLabel}>{t.search}
          <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
            placeholder={t.search}/>
        </label>
        <div className={styles.filters} role="group" aria-label={t.title}>
          {[[ 'all',t.all ],['open',t.open],['closed',t.closed]].map(([id,label])=>
            <button type="button" key={id} aria-pressed={filter===id}
              onClick={()=>setFilter(id)}>{label}</button>)}
        </div>
        {groups.length===0&&<p className={styles.empty}>{t.none}</p>}
        {groups.length>0&&filtered.length===0&&<p className={styles.empty}>{t.filtered}</p>}
        {filtered.map(group=><button type="button" key={group.key}
          className={selectedKey===group.key?styles.activeClient:styles.client}
          aria-pressed={selectedKey===group.key} onClick={()=>setSelectedKey(group.key)}>
          <span className={styles.avatar} aria-hidden="true">{group.name.slice(0,1).toUpperCase()}</span>
          <span className={styles.summary}><strong>{group.name}</strong>
            <small>{t.requests}: {group.items.length} · {t.latest}: {labelDate(group.latest.createdAt,lang)}</small></span>
          {group.open>0&&<span className={styles.count}>{group.open}</span>}
        </button>)}
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
                  }</small>
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
    </div>
  </section>
}
