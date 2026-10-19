'use client'
import { useEffect, useRef, useState } from 'react'
import { CRM_TEMPLATES } from '../../lib/crm/campaigns'
import CrmEmailTools from './crm-email-tools'
import CrmSmsTools from './crm-sms-tools'
import CrmSmsSetup from './crm-sms-setup'
import CrmContactEditor from './crm-contact-editor'
import CrmExportTools from './crm-export-tools'
import CrmMessengerPanel from './crm-messenger'
import CrmBusinessEnquiries from './crm-business-enquiries'
import CrmMarketingPanel from './crm-marketing'
import { CrmWorkflowOverview, CrmContactWorkflow } from './crm-workflow'
import styles from './crm-manager.module.css'
const COPY = {
  en: { title: 'Clients & subscribers', privacy: 'Business contact details only. Do not enter health information here.', name: 'Name', email: 'Email', add: 'Add contact', loading: 'Loading…', error: 'CRM is not available yet. Your information was not saved.', noContacts: 'No contacts yet.', noConsent: 'Marketing consent is separate from a paid subscription.', draft: 'Prepare an update', saveDraft: 'Save draft', drafts: 'Drafts', off: 'Automatic campaigns are off. Individual opted-in emails are handled in each contact.', saved: 'Saved.', unverified: 'Address not verified', suppressed: 'Do not contact', locale: 'Language' },
  ru: { title: 'Клиенты и подписчики', privacy: 'Только деловые контактные данные. Не вводите здесь сведения о здоровье.', name: 'Имя', email: 'Email', add: 'Добавить контакт', loading: 'Загрузка…', error: 'CRM пока недоступна. Данные не сохранены.', noContacts: 'Контактов пока нет.', noConsent: 'Согласие на рассылку оформляется отдельно от платной подписки.', draft: 'Подготовить новость', saveDraft: 'Сохранить черновик', drafts: 'Черновики', off: 'Автоматические массовые рассылки отключены. Отдельные письма доступны в карточке контакта при наличии согласия.', saved: 'Сохранено.', unverified: 'Адрес не подтверждён', suppressed: 'Не писать', locale: 'Язык' },
  es: { title: 'Clientes y suscriptores', privacy: 'Solo datos de contacto. No introduzcas información de salud aquí.', name: 'Nombre', email: 'Correo', add: 'Añadir contacto', loading: 'Cargando…', error: 'El CRM aún no está disponible. Los datos no se han guardado.', noContacts: 'Todavía no hay contactos.', noConsent: 'El consentimiento para recibir novedades es independiente de la suscripción.', draft: 'Preparar novedades', saveDraft: 'Guardar borrador', drafts: 'Borradores', off: 'Las campañas automáticas están desactivadas. Puedes preparar correos individuales en cada contacto.', saved: 'Guardado.', unverified: 'Dirección no verificada', suppressed: 'No contactar', locale: 'Idioma' },
}
const SOURCE_CHOICES={
  en:{manual:'Added manually',website:'Website enquiry',referral:'Referral',event:'Event',academy:'Academy',other:'Other'},
  ru:{manual:'Добавлен вручную',website:'Заявка с сайта',referral:'Рекомендация',event:'Мероприятие',academy:'Академия',other:'Другое'},
  es:{manual:'Añadido manualmente',website:'Consulta web',referral:'Referencia',event:'Evento',academy:'Academia',other:'Otro'},
}
const BILLING_COPY = {
  en: { title: 'Subscription register', note: 'Up to 100 technical account records. Contact matching has not been verified.', off: 'Subscription register is not connected.', until: 'Paid through', cancel: 'Renewal cancelled' },
  ru: { title: 'Реестр подписок', note: 'До 100 технических записей аккаунтов. Связь с контактами ещё не подтверждена.', off: 'Реестр подписок пока не подключён.', until: 'Оплачено до', cancel: 'Продление отменено' },
  es: { title: 'Registro de suscripciones', note: 'Hasta 100 registros técnicos de cuentas. La vinculación con contactos no está verificada.', off: 'El registro aún no está conectado.', until: 'Pagado hasta', cancel: 'Renovación cancelada' },
}
const EXTRA_COPY = {
  en: { all: 'All', leads: 'Interested', clients: 'Clients', archived: 'Archived', suppress: 'Do not contact', suppressConfirm: 'Stop promotional contact with this person? This cannot be undone on this screen.', duplicate: 'This email is already in your contacts.', showing: 'Search and filters apply to loaded contacts. Load more to review the full list.', stage: 'Contact stage', conflict: 'Contact changed in another tab. Refresh and retry.' },
  ru: { all: 'Все', leads: 'Интересуются', clients: 'Клиенты', archived: 'Архив', suppress: 'Не связываться', suppressConfirm: 'Запретить рекламные сообщения этому контакту? На этой странице отменить это действие нельзя.', duplicate: 'Контакт с таким email уже существует.', showing: 'Поиск и фильтры работают по загруженным контактам. Для остальных нажмите «Загрузить ещё».', stage: 'Статус контакта', conflict: 'Контакт изменён в другой вкладке. Обновите страницу.' },
  es: { all: 'Todos', leads: 'Interesados', clients: 'Clientes', archived: 'Archivados', suppress: 'No contactar', suppressConfirm: '¿Excluir este contacto de los mensajes promocionales? No se puede revertir aquí.', duplicate: 'Ya existe un contacto con este correo.', showing: 'La búsqueda y los filtros abarcan los contactos cargados. Carga más para ver los demás.', stage: 'Estado del contacto', conflict: 'El contacto cambió en otra pestaña. Actualiza la página.' },
}
export default function CrmManager({ locale = 'en', accountId }) {
  const language = COPY[locale] ? locale : 'en'
  const c = { ...COPY[language], ...EXTRA_COPY[language] }
  const billing = BILLING_COPY[language]
  const [data, setData] = useState(null)
  const sessionRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [pageBusy, setPageBusy] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [displayName, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [templateId, setTemplate] = useState('course_update')
  const [search, setSearch] = useState('')
  const [serverResults,setServerResults]=useState(null)
  const [serverSearchStatus,setServerSearchStatus]=useState('idle')
  const [searchRefresh,setSearchRefresh]=useState(0)
  const [filter, setFilter] = useState('all')
  const [lifecycle, setLifecycle] = useState('lead')
  const [source, setSource] = useState('manual')
  const [activeSection, setActiveSection] = useState('overview')
  async function load(session) {
    const response = await fetch('/api/app/crm', { credentials: 'same-origin', cache: 'no-store', signal: session.controller.signal, headers: { 'X-HH-Account-Id': session.accountId } })
    if (!response.ok) throw new Error('unavailable')
    const result = await response.json(); if (sessionRef.current === session) setData(result)
  }
  useEffect(() => {
    if (!accountId) return
    const controller = new AbortController()
    const session = { accountId, controller }
    sessionRef.current = session
    setData(null); setNotice(''); setBusy(false); setPageBusy(false); setPageError(false); setName(''); setEmail(''); setPhone(''); setFilter('all'); setSearch(''); setSource('manual'); setActiveSection('overview')
    fetch('/api/app/crm', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { 'X-HH-Account-Id': accountId } })
      .then(async (response) => { if (!response.ok) throw new Error('unavailable'); const result = await response.json(); if (sessionRef.current === session) setData(result) })
      .catch((error) => { if (error.name !== 'AbortError' && sessionRef.current === session) setNotice(c.error) })
    return () => { controller.abort(); if (sessionRef.current === session) sessionRef.current = null }
  }, [c.error, accountId])
  useEffect(()=>{
    const q=search.trim()
    if(!['contacts','sms'].includes(activeSection)||!accountId||!data||q.length<2) {
      setServerResults(null);setServerSearchStatus('idle')
      return
    }
    const session=sessionRef.current
    if(!session||session.accountId!==accountId)return
    const controller=new AbortController()
    setServerSearchStatus('loading')
    setServerResults(null)
    const timer=setTimeout(()=>{
      fetch('/api/app/crm/search',{method:'POST',credentials:'same-origin',cache:'no-store',
        signal:controller.signal,
        headers:{'Content-Type':'application/json','X-HH-Account-Id':session.accountId},
        body:JSON.stringify({query:q,stage:filter})})
      .then(async response=>{
        if(!response.ok)throw new Error('SEARCH_UNAVAILABLE')
        return response.json()
      })
      .then(result=>{
        if(!controller.signal.aborted&&sessionRef.current===session&&Array.isArray(result.contacts)){
          setServerResults(result);setServerSearchStatus('done')
        }
      })
      .catch(error=>{
        if(error?.name!=='AbortError'&&!controller.signal.aborted&&sessionRef.current===session)
          setServerSearchStatus('error')
      })
    },320)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[search,filter,activeSection,accountId,data,searchRefresh])
  async function save(action, payload) {
    const session = sessionRef.current
    if (busy || !session || session.accountId !== accountId) return
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/app/crm', { method: 'POST', credentials: 'same-origin', signal: session.controller.signal, headers: { 'Content-Type': 'application/json', 'X-HH-Account-Id': session.accountId }, body: JSON.stringify({ action, payload }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(['CONTACT_ALREADY_EXISTS','CONFLICT','CONTACT_CHANNEL_REQUIRED','INVALID_PHONE','EMAIL_ADDRESS_REQUIRED','EMAIL_DELIVERY_UNCONFIRMED','EMAIL_NOT_CONFIGURED','EMAIL_CONSENT_REQUIRED','EMAIL_VERIFICATION_RECENT','EMAIL_CONTACT_BLOCKED','EMAIL_DAILY_LIMIT','INVALID_EMAIL_MESSAGE','INVALID_FOLLOWUP','CRM_FOLLOWUP_LIMIT','CRM_CONTACT_ARCHIVED','INVALID_CRM_ACTIVITY','INVALID_BUSINESS_LEAD','INVALID_CONTACT_EDIT','EMAIL_CHANGE_REQUIRES_NEW_CONTACT','PHONE_LINKED_TO_MESSAGES','CONTACT_ARCHIVED','SMS_PHONE_CHANGE_REQUIRES_NEW_CONTACT','SMS_NOT_CONFIGURED','SMS_DELIVERY_UNCONFIRMED','SMS_CONTACT_BLOCKED','SMS_CONSENT_REQUIRED','SMS_DAILY_LIMIT','SMS_RECENT_DUPLICATE','INVALID_SMS_MESSAGE','SMS_TOO_LONG','PRIVATE_CONTENT_BLOCKED','SMS_PILOT_ONLY','SMS_CONSENT_CHANGED','SMS_STATUS_UNAVAILABLE','SMS_STATUS_UNCONFIRMED'].includes(result.error) ? result.error : 'unavailable')
      if (sessionRef.current !== session) return
      setNotice(action==='check_sms_status'?(language==='ru'?'Статус SMS проверен у Twilio. Обновлена история доставки.':language==='es'?'Estado consultado en Twilio. Historial actualizado.':'Twilio delivery status checked. History updated.'):action==='check_sms_connection'?'':action==='send_sms'?(result.accepted?(language==='ru'?'SMS принято провайдером; это ещё не подтверждение доставки.':language==='es'?'SMS aceptado por el proveedor, no confirmado como entregado.':'SMS accepted by provider; delivery not confirmed.'):(language==='ru'?'Отправка SMS не подтверждена.':'SMS status is unconfirmed.')):action==='send_email'?(result.accepted?(language==='ru'?'Письмо принято почтовым сервисом.':language==='es'?'Correo aceptado por el proveedor.':'Email accepted by provider.'):(language==='ru'?'Статус отправки неопределён. Повторной отправки не было.':language==='es'?'Estado de entrega desconocido. No se volvió a enviar.':'Delivery status unknown; no duplicate email was sent.')):action==='send_verification'?(language==='ru'?'Письмо для подтверждения отправлено.':language==='es'?'Confirmación enviada.':'Verification email submitted.'):c.saved)
      if (action === 'create_contact') { setName(''); setEmail(''); setPhone(''); setLifecycle('lead'); setSource('manual') }
      await load(session).catch(() => {})
      setSearchRefresh(v=>v+1)
      return result
    } catch (error) {
      if (sessionRef.current === session) {
        const labels={
          SMS_NOT_CONFIGURED:language==='ru'?'Для SMS необходимо подключить и подтвердить отправителя Twilio.':'A verified Twilio SMS sender must be connected first.',
          SMS_DELIVERY_UNCONFIRMED:language==='ru'?'Статус отправки SMS неизвестен. Не отправляйте повторно без проверки.':'SMS delivery unconfirmed. Do not retry without checking.',
          SMS_STATUS_UNAVAILABLE:language==='ru'?'Не найден проверяемый номер SMS у провайдера или отсутствуют ключи Twilio.':'This SMS has no verifiable Twilio reference or credentials.',
          SMS_STATUS_UNCONFIRMED:language==='ru'?'Twilio не подтвердил статус. SMS повторно не отправлялась.':'Twilio could not verify the delivery status. No SMS was resent.',
          SMS_CONSENT_REQUIRED:language==='ru'?'Нет действующего согласия на SMS или номер отписан.':'SMS consent missing or number opted out.',
          SMS_CONTACT_BLOCKED:language==='ru'?'Для этого контакта отправка SMS запрещена.':'SMS sending is blocked for this contact.',
          SMS_DAILY_LIMIT:language==='ru'?'Достигнут лимит 10 SMS в сутки.':'Daily limit of 10 SMS reached.',
          SMS_RECENT_DUPLICATE:language==='ru'?'Похожее SMS этому контакту уже отправлялось. Проверьте историю.':'Similar SMS was already attempted recently.',
          SMS_PILOT_ONLY:language==='ru'?'В тестовом режиме SMS допускаются только на контрольный номер.':'Only the approved pilot phone is allowed.',
          SMS_TOO_LONG:language==='ru'?'Слишком длинное SMS. Сократите текст.':'SMS exceeds the permitted segment limit.',
          INVALID_SMS_MESSAGE:language==='ru'?'Проверьте текст SMS.':'Check SMS message text.',
          PRIVATE_CONTENT_BLOCKED:language==='ru'?'Не включайте в SMS медицинские сведения или приватные ссылки.':'Do not include private links or medical information in SMS.',
          SMS_CONSENT_CHANGED:language==='ru'?'Согласие на SMS изменилось, отправка остановлена.':'SMS consent changed; sending blocked.',
          SMS_PHONE_CHANGE_REQUIRES_NEW_CONTACT:language==='ru'?'Телефон имеет историю SMS или согласий. Для нового номера создайте отдельный контакт.':'Phone has SMS consent or delivery history; create a new contact.',
          EMAIL_DELIVERY_UNCONFIRMED:language==='ru'?'Статус доставки неизвестен. Не повторяйте отправку автоматически.':'Delivery status unknown. Do not resend automatically.',
          EMAIL_NOT_CONFIGURED:language==='ru'?'Почтовый сервис пока не подключён.':'Email sender is not configured.',
          EMAIL_CONSENT_REQUIRED:language==='ru'?'Нет подтверждённого согласия.':'Consent evidence required.',
          EMAIL_VERIFICATION_RECENT:language==='ru'?'Подтверждение уже запрашивалось за последние 24 часа.':'Verification already requested in the last 24 hours.',
          EMAIL_CONTACT_BLOCKED:language==='ru'?'Контакт недоступен для рассылки.':'Contact is not eligible for email.',
          EMAIL_DAILY_LIMIT:language==='ru'?'Достигнут лимит писем за сутки.':'Daily message limit reached.',
          INVALID_EMAIL_MESSAGE:language==='ru'?'Проверьте текст и тему письма.':'Check the email subject and body.',
          INVALID_FOLLOWUP:language==='ru'?'Проверьте дату и вид действия.':'Check follow-up date and type.',
          CRM_FOLLOWUP_LIMIT:language==='ru'?'У контакта слишком много открытых задач.':'Too many open follow-ups for this contact.',
          CRM_CONTACT_ARCHIVED:language==='ru'?'Контакт в архиве; новые действия недоступны.':'Archived contact cannot receive new tasks.',
          INVALID_CRM_ACTIVITY:language==='ru'?'Действие не поддерживается.':'This activity is not supported.',
          INVALID_BUSINESS_LEAD:language==='ru'?'Проверьте статус заявки.':'Check the business enquiry status.',
          INVALID_CONTACT_EDIT:language==='ru'?'Проверьте исправленные контактные данные.':'Check the contact details.',
          EMAIL_CHANGE_REQUIRES_NEW_CONTACT:language==='ru'?'Этот email уже имеет историю согласий или подтверждения. Создайте отдельный контакт для нового адреса.':'This email has verification or consent history. Create a separate contact for the new address.',
          PHONE_LINKED_TO_MESSAGES:language==='ru'?'Телефон связан с историей переписки. Изменять его здесь нельзя.':'Phone is linked to message history and cannot be changed here.',
          CONTACT_ARCHIVED:language==='ru'?'Сначала верните контакт из архива.':'Reopen this contact before editing.',
          INVALID_PHONE:language==='ru'?'Укажите телефон в международном формате, например +14165551234.':'Use an international phone number, e.g. +14165551234.',
          CONTACT_CHANNEL_REQUIRED:language==='ru'?'Нужен email или телефон.':'Enter an email or phone number.',
          EMAIL_ADDRESS_REQUIRED:language==='ru'?'У контакта нет email для подтверждения.':'This contact has no email address.',
        }
        setNotice(error?.message==='CONTACT_ALREADY_EXISTS'?c.duplicate:error?.message==='CONFLICT'?c.conflict:labels[error?.message]||c.error)
      }
      return null
    } finally { if (sessionRef.current === session) setBusy(false) }
  }
  async function loadMoreContacts() {
    const session=sessionRef.current
    const cursor=data?.contactsNextCursor
    if (!session||!cursor||pageBusy||busy||session.accountId!==accountId)return
    setPageBusy(true);setPageError(false)
    try {
      const res=await fetch('/api/app/crm?contactsCursor='+encodeURIComponent(cursor),{
        credentials:'same-origin',cache:'no-store',signal:session.controller.signal,
        headers:{'X-HH-Account-Id':session.accountId},
      })
      if(!res.ok)throw new Error('CONTACT_PAGE_UNAVAILABLE')
      const page=await res.json()
      if(!page.pageOnly||!Array.isArray(page.contacts)||page.contacts.length>50)
        throw new Error('CONTACT_PAGE_UNAVAILABLE')
      if(sessionRef.current!==session)return
      setData(previous=>{
        if(!previous||previous.contactsNextCursor!==cursor)return previous
        const seen=new Set(previous.contacts.map(contact=>contact.id))
        const added=page.contacts.filter(contact=>!seen.has(contact.id))
        return {...previous,contacts:[...previous.contacts,...added],
          contactsNextCursor:page.nextCursor||null}
      })
    } catch(error) {
      if(sessionRef.current===session&&error?.name!=='AbortError')setPageError(true)
    } finally {if(sessionRef.current===session)setPageBusy(false)}
  }
  if (!accountId) return null
  const globalSearch=search.trim().length>=2
  const contacts=(globalSearch?(serverSearchStatus==='done'?serverResults?.contacts||[]:[]):data?.contacts||[]).filter(contact=>{
    if(globalSearch)return filter==='all'||contact.lifecycle===filter
    const text=[contact.displayName,contact.email,contact.phone].join(' ').toLowerCase()
    return text.includes(search.trim().toLowerCase()) && (filter === 'all' || contact.lifecycle === filter)
  })
  const retry=()=>{
    const session=sessionRef.current
    if(!session)return
    setNotice('')
    load(session).catch(()=>{if(sessionRef.current===session)setNotice(c.error)})
  }
  return <section className={styles.panel} aria-labelledby="crm-title">
    <header className={styles.head}>
      <div><h2 id="crm-title">{c.title}</h2>
        <p>{language==='ru'?'Все деловые контакты в одном месте.':language==='es'?'Tus contactos profesionales en un solo lugar.':'Keep your business contacts in one place.'}</p>
      </div>
    </header>
    <nav className={styles.sectionTabs} aria-label={language==='ru'?'Разделы CRM':language==='es'?'Secciones CRM':'CRM sections'}>
      {[
        ['overview',language==='ru'?'Обзор':language==='es'?'Resumen':'Overview'],
        ['messages',language==='ru'?'Сообщения':language==='es'?'Mensajes':'Messages'],
        ['sms','SMS'],
        ['contacts',language==='ru'?'Контакты':language==='es'?'Contactos':'Contacts'],
      ].map(([id,label])=><button key={id} type="button" aria-pressed={activeSection===id}
        className={activeSection===id?styles.sectionTabActive:styles.sectionTab}
        onClick={()=>setActiveSection(id)}>{label}</button>)}
    </nav>
    {activeSection!=='messages'&&<div className={styles.privacy}>
      <strong>{language==='ru'?'Только деловые контакты':'Business contacts only'}</strong>
      <p>{c.privacy} {c.noConsent}</p>
    </div>}
    {!data&&activeSection!=='messages'&&<div className={styles.unavailable} role={notice?'alert':'status'}>
      <p>{notice||c.loading}</p>
      {notice&&<button type="button" onClick={retry}>{language==='ru'?'Повторить':'Retry'}</button>}
    </div>}
    {activeSection==='messages'&&<CrmMessengerPanel key={accountId+'-messenger'} accountId={accountId} locale={language} onCrmChange={retry} />}
    {activeSection==='sms'&&data&&<div className={styles.formCard}>
      <h3>SMS · {language==='ru'?'сообщения клиентам':language==='es'?'mensajes a clientes':'client messages'}</h3>
      <CrmSmsSetup locale={language} setup={data.smsSetup} busy={busy} onAction={save} />
      <p className={styles.fine}>{language==='ru'?'Выберите контакт, подтвердите согласие на SMS и отправляйте сообщения вручную. Групповых рассылок нет.':language==='es'?'Selecciona un contacto con consentimiento SMS. Los envíos requieren confirmación individual.':'Select a contact with recorded SMS consent. Every send is manual and individually confirmed.'}</p>
      <p className={styles.fine}>{data.smsEnabled?
        (data.smsLive?(language==='ru'?'SMS-канал активен.':'SMS sending is available.'):(language==='ru'?'Тестовый режим: только проверенный номер.':'Test mode: approved phone number only.')):
        (language==='ru'?'Провайдер пока не подключён. Для платных сообщений нужен проверенный Twilio-номер.':'Twilio SMS sender is not yet connected. Real paid SMS delivery remains disabled.')}</p>
      <input type="search" aria-label={language==='ru'?'Найти контакт для SMS':language==='es'?'Buscar contacto para SMS':'Find contact for SMS'}
        placeholder={language==='ru'?'Поиск по имени или телефону…':'Search name or phone…'}
        value={search} onChange={e=>setSearch(e.target.value)} />
      {globalSearch&&serverSearchStatus==='loading'&&<p role="status">{language==='ru'?'Ищу…':'Searching…'}</p>}
      {globalSearch&&serverSearchStatus==='error'&&<p role="alert">{language==='ru'?'Ошибка поиска':'Search unavailable'}</p>}
      <ul className={styles.list}>
        {contacts.filter(contact=>contact.phone).map(contact=><li key={contact.id} className={styles.emailContactRow}>
          <span className={styles.avatar} aria-hidden="true">{String(contact.displayName||'?').trim().slice(0,1).toUpperCase()}</span>
          <span className={styles.contactInfo}><strong>{contact.displayName}</strong><small>{contact.phone}</small></span>
          <CrmSmsTools contact={contact} locale={language} enabled={data.smsEnabled}
            live={data.smsLive} busy={busy} statusCheckEnabled={data.smsSetup?.credentialsPresent} onAction={save} messages={data.smsMessages||[]} />
        </li>)}
        {!contacts.some(contact=>contact.phone)&&<li className={styles.empty}>{language==='ru'?'Нет контактов с телефоном. Добавьте их в разделе «Контакты».':'No contacts with a saved mobile number. Add a contact first.'}</li>}
      </ul>
      {!globalSearch&&data.contactsNextCursor&&<button type="button" className={styles.loadMore}
        disabled={busy||pageBusy} onClick={loadMoreContacts}>{language==='ru'?'Загрузить ещё':'Load more contacts'}</button>}
      {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    </div>}
    {data&&<>
      {activeSection==='overview'&&<>
      <p><a href="/admin/reiki-leads" style={{color:'#087e95',fontWeight:800,textDecoration:'underline',textUnderlineOffset:3}}>
      {language==='ru'?'Открыть CRM по Reiki-курсу: лиды и письма →':language==='es'?'Abrir CRM de Reiki: solicitudes y cartas →':'Open Reiki CRM: course leads and initiation letters →'}
    </a></p>
      <CrmWorkflowOverview locale={language} overview={data.overview} followups={data.followups||[]} activity={data.activity||[]} busy={busy} onAction={save} />
      <CrmBusinessEnquiries locale={language} enquiries={data.businessEnquiries||[]} busy={busy} onAction={save} />
      <CrmMarketingPanel key={accountId+'-marketing'} accountId={accountId} contacts={data.contacts||[]} locale={language} />
      </>}
      {activeSection==='contacts'&&<>
      <div className={styles.formCard}>
        <h3>{language==='ru'?'Добавить контакт':'Add new contact'}</h3>
        <form className={styles.form} onSubmit={(event) => {
          event.preventDefault()
          save('create_contact', { displayName, email, phone, locale: language, lifecycle, source })
        }}>
          <label>{c.name} *<input value={displayName} onChange={(event)=>setName(event.target.value)}
            placeholder={language==='ru'?'Имя клиента':'e.g. Jane Smith'} maxLength={120} autoComplete="off" required /></label>
          <label>{c.email}<input type="email" value={email} onChange={(event)=>setEmail(event.target.value)}
            placeholder="name@example.com" maxLength={254} autoComplete="off" /></label>
          <label>{language==='ru'?'Телефон / WhatsApp':language==='es'?'Teléfono / WhatsApp':'Phone / WhatsApp'}
            <input type="tel" value={phone} onChange={(event)=>setPhone(event.target.value)}
              placeholder="+14165551234" maxLength={40} autoComplete="tel" /></label>
          <label>{language==='ru'?'Тип контакта':'Contact type'}
            <select value={lifecycle} onChange={(event)=>setLifecycle(event.target.value)}>
              <option value="lead">{language==='ru'?'Интересуется':'Interested'}</option>
              <option value="client">{language==='ru'?'Клиент':'Client'}</option>
            </select>
          </label>
          <label>{language==='ru'?'Источник контакта':language==='es'?'Origen del contacto':'Contact source'}
            <select value={source} onChange={event=>setSource(event.target.value)}>
              {Object.entries(SOURCE_CHOICES[language]).map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <button disabled={busy||(!email.trim()&&!phone.trim())} type="submit">{busy?c.loading:c.add}</button>
        </form>
        <p className={styles.fine}>{language==='ru'?'Добавляйте только контакты, с которыми есть допустимое основание для деловой связи. Это не подписка на рассылку.':'Add only business contacts you are permitted to keep. This does not enroll them in marketing messages.'}</p>
        {notice&&<p role="status" className={styles.notice}>{notice}</p>}
      </div>
      <div className={styles.contactsHead}>
        <h3>{language==='ru'?'Ваши контакты':language==='es'?'Tus contactos':'Your contacts'} ({data.contacts?.length||0} / {data.overview?.total??data.contacts?.length??0})</h3>
        <input aria-label={language==='ru'?'Поиск контактов во всей CRM':language==='es'?'Buscar contactos CRM':'Search all CRM contacts'} type="search"
          placeholder={language==='ru'?'Поиск по всей CRM…':language==='es'?'Buscar en CRM…':'Search the whole CRM…'} value={search} onChange={(event)=>setSearch(event.target.value)} />
      </div>
      <div className={styles.filters} role="group" aria-label={language==='ru'?'Фильтр контактов':language==='es'?'Filtro de contactos':'Contact filter'}>
        {[[ 'all', c.all ], [ 'lead', c.leads ], [ 'client', c.clients ], [ 'archived', c.archived ]].map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} className={filter===key?styles.filterSelected:styles.filterButton} onClick={()=>setFilter(key)}>{label}</button>)}
      </div>
      <p className={styles.fine}>{globalSearch?
        (language==='ru'?'Поиск по зашифрованным деловым контактам доступен только владельцу.':language==='es'?'Búsqueda privada en contactos cifrados; solo para el propietario.':'Owner-only search across encrypted business contacts.'):
        c.showing}</p>
      {globalSearch&&serverSearchStatus==='loading'&&<p role="status" className={styles.searchInfo}>{language==='ru'?'Ищу контакты…':language==='es'?'Buscando contactos…':'Searching contacts…'}</p>}
      {globalSearch&&serverSearchStatus==='error'&&<p role="alert" className={styles.searchError}>{language==='ru'?'Поиск временно недоступен. Повторите.':language==='es'?'No se pudo buscar. Inténtalo de nuevo.':'Search is unavailable; retry.'}</p>}
      {globalSearch&&serverSearchStatus==='done'&&serverResults&&<p role="status" className={styles.searchInfo}>
        {language==='ru'?'Найдено':language==='es'?'Encontrados':'Matches'}: {serverResults.contacts?.length||0}
        {(serverResults.scanLimited||serverResults.matchesLimited)&&' · '+
          (language==='ru'?'Показана только часть. Уточните запрос.':language==='es'?'Resultados parciales; ajusta la búsqueda.':'Partial results; refine your search.')}
      </p>}
      {!data.emailEnabled&&<p className={styles.privacy} role="status">{language==='ru'?'Отправка email пока не подключена: требуется проверенный почтовый домен, Resend и подтверждённые настройки отправителя.':language==='es'?'Para enviar correo debes conectar Resend y un dominio de remitente verificado.':'Connect Resend and a verified sender domain to enable actual email delivery.'}</p>}
      <ul className={styles.list}>
        {contacts.length?contacts.map(contact=><li key={contact.id} className={styles.emailContactRow}>
          <span className={styles.avatar} aria-hidden="true">{String(contact.displayName||'?').trim().slice(0,1).toUpperCase()}</span>
          <span className={styles.contactInfo}><strong>{contact.displayName}</strong><small>{[contact.email,contact.phone].filter(Boolean).join(' · ')}</small></span>
          <label className={styles.stageLabel}><span>{c.stage}</span>
            <select aria-label={c.stage+' — '+contact.displayName} disabled={busy} value={contact.lifecycle} onChange={(event)=>save('set_lifecycle',{id:contact.id,lifecycle:event.target.value,expectedRevision:contact.revision})}>
              <option value="lead">{c.leads}</option><option value="client">{c.clients}</option><option value="archived">{c.archived}</option>
            </select>
          </label>
          {contact.suppressed&&<small className={styles.tag}>{c.suppressed}</small>}
          {!contact.suppressed&&<button className={styles.suppress} type="button" disabled={busy} onClick={()=>{ if (window.confirm(c.suppressConfirm)) save('suppress_contact',{id:contact.id}) }}>{c.suppress}</button>}
          <CrmContactEditor contact={contact} locale={language} busy={busy||pageBusy} onAction={save} />
          <CrmContactWorkflow contact={contact} locale={language} accountId={accountId} busy={busy||pageBusy} onAction={save} followups={data.followups||[]} />
          <CrmEmailTools contact={contact} locale={language} enabled={data.emailEnabled} busy={busy} onAction={save} messages={data.emailMessages||[]} />
          <CrmSmsTools contact={contact} locale={language} enabled={data.smsEnabled} live={data.smsLive} busy={busy} statusCheckEnabled={data.smsSetup?.credentialsPresent} onAction={save} messages={data.smsMessages||[]} />
        </li>):<li className={styles.empty}>{search?(language==='ru'?'Ничего не найдено.':'No matching contacts.'):c.noContacts}</li>}
      </ul>
      {!globalSearch&&data.contactsNextCursor&&<button className={styles.loadMore} type="button"
        disabled={busy||pageBusy} onClick={loadMoreContacts}>
        {pageBusy?(language==='ru'?'Загрузка…':language==='es'?'Cargando…':'Loading…'):
          (language==='ru'?'Загрузить ещё контакты':language==='es'?'Cargar más contactos':'Load more contacts')}
      </button>}
      {pageError&&<p role="alert" className={styles.loadError}>
        {language==='ru'?'Не удалось загрузить следующую страницу. Повторите.':language==='es'?'No se pudo cargar la página. Inténtalo de nuevo.':'Could not load more contacts. Please retry.'}
      </p>}
      <CrmExportTools accountId={accountId} locale={language}
        recentExports={data.recentExports||[]} onCompleted={()=>{
          const session=sessionRef.current
          if(session)load(session).catch(()=>{})
        }}/>
      <details className={styles.advanced}>
        <summary>{language==='ru'?'Подписки и подготовка писем':'Subscriptions & prepared updates'}</summary>
        <h3>{billing.title}</h3><p>{data.subscriberRegistryEnabled?billing.note:billing.off}</p>
        {data.subscriberRegistryEnabled&&<ul className={styles.list}>{data.subscribers?.map(subscriber=><li key={[subscriber.accountId,subscriber.provider,subscriber.environment].join('-')}>
          <strong>{subscriber.accountId?.slice(0,8)}</strong><span>{subscriber.status}</span>
          <span>{subscriber.provider} · {subscriber.environment}</span>
          {subscriber.paidThrough&&<span>{billing.until}: {new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(subscriber.paidThrough))}</span>}
          {subscriber.cancelAtPeriodEnd&&<small>{billing.cancel}</small>}
        </li>)}</ul>}
        <h3>{c.draft}</h3><p>{c.off}</p>
        <select aria-label={c.draft} value={templateId} onChange={(event)=>setTemplate(event.target.value)}>
          {Object.entries(CRM_TEMPLATES).map(([id,text])=><option key={id} value={id}>{text[language].subject}</option>)}
        </select>
        <p>{CRM_TEMPLATES[templateId][language].body}</p>
        <button disabled={busy} type="button" onClick={()=>save('create_draft',{templateId,locale:language,channel:'email',segment:'all_opted_in'})}>{c.saveDraft}</button>
        <h3>{c.drafts}</h3><ul>{data.drafts?.map(draft=><li key={draft.id}>{CRM_TEMPLATES[draft.definition?.templateId]?.[draft.definition?.locale]?.subject||draft.status}</li>)}</ul>
      </details>
      </>}
    </>}
  </section>
}
