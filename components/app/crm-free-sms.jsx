'use client'
import { useMemo, useState } from 'react'
import { buildManualSmsQueue, listManualSmsCandidates,
  MANUAL_SMS_MAX_RECIPIENTS, prepareManualSms } from '../../lib/crm/manual-sms.js'
import { smsMessageEstimate } from '../../lib/crm/sms-text.js'
import styles from './crm-free-sms.module.css'

const WORDS={
 en:{
  title:'SMS from your phone · no paid API',subtitle:'Prepare an opt-in list and open Messages for each recipient. You personally review, paste and send every SMS.',
  price:'No Twilio/API charges. Your own mobile carrier may charge for SMS, roaming or each segment.',
  privacy:'Only contacts with documented SMS permission appear. No group chat, automatic dispatch, delivery claim or client data upload.',
  body:'Message to prepare',placeholder:'A short business message (no medical information)',
  example:'Hello! Thank you for your interest. Would you like to hear about available appointment times?',
  eligible:'Eligible contacts in the loaded CRM',none:'No eligible phone contacts yet. Open Contacts to record genuine SMS opt-in, then return here.',
  search:'Find recipient by name or number',choose:'Choose',selectAll:'Select up to 20',clear:'Clear',
  chosen:'selected',limit:'Select up to 20 recipients. Each needs a separate, manual send.',
  prepare:'Prepare manual SMS list',unavailable:'Check text, consent and the SMS segment count.',
  count:'SMS segments including sender and STOP',blocked:'Do not include health data, assessments or private links.',
  prepared:'Prepared contact',of:'of',first:'Copy the text, open Messages, paste and check it, then tap Send yourself.',
  copy:'1. Copy SMS text',copied:'Copied. Paste it into Messages.',copyFailed:'Clipboard unavailable. Select and copy the text below.',
  open:'2. Open Messages for this number',next:'Next recipient',previous:'Previous',
  close:'Close prepared list',warn:'Opening Messages does not send an SMS or confirm delivery.',
  stop:'If someone replies STOP, mark “Do not contact” in the CRM immediately before continuing.',
  invalid:'Message or recipient selection is not eligible. Refresh CRM and try again.',
  expired:'Permission or number changed. Refresh the CRM before preparing this contact.',
  ready:'Ready to copy and open Messages',noneSelected:'Choose at least one eligible contact.',
  loaded:'Only already-loaded contacts are shown. Use “Load more contacts” below to expand the list.',
  push:'Also free of SMS API charges: private Cabinet messages with opt-in Web Push. Only signed-in clients who enabled alerts receive them; never a phone-number broadcast.',
  pushSettings:'Client notification settings',
 },
 ru:{
  title:'SMS с вашего телефона · без платного API',subtitle:'Подготовьте список согласившихся клиентов. Каждую SMS вы отдельно просматриваете, вставляете и отправляете через «Сообщения».',
  price:'Плата Twilio/API — 0. Но мобильный оператор может брать плату за SMS, роуминг или дополнительные части.',
  privacy:'Только контакты с зафиксированным согласием на SMS. Без групповых чатов, авторассылки, фиктивных статусов доставки и передачи контактов.',
  body:'Текст сообщения',placeholder:'Короткое деловое сообщение без сведений о здоровье',
  example:'Здравствуйте! Спасибо за интерес. Хотите, я пришлю свободное время для консультации?',
  eligible:'Контакты с разрешением на SMS',none:'Пока нет контактов с согласием на SMS. Откройте «Контакты», зафиксируйте подтверждённое согласие и вернитесь сюда.',
  search:'Поиск по имени или телефону',choose:'Выбрать',selectAll:'Выбрать до 20',clear:'Очистить',
  chosen:'выбрано',limit:'До 20 адресатов за одну подготовку. Каждому SMS отправляется вручную.',
  prepare:'Подготовить список SMS',unavailable:'Проверьте текст, согласие и количество частей SMS.',
  count:'Частей SMS с подписью и STOP',blocked:'Без медицинских данных, результатов тестов и секретных ссылок.',
  prepared:'Контакт',of:'из',first:'Скопируйте текст, откройте «Сообщения», вставьте, проверьте и сами нажмите «Отправить».',
  copy:'1. Копировать текст SMS',copied:'Текст скопирован. Вставьте его в «Сообщения».',copyFailed:'Буфер обмена недоступен. Выделите и скопируйте текст ниже.',
  open:'2. Открыть «Сообщения» с номером',next:'Следующий контакт',previous:'Предыдущий',
  close:'Закрыть список',warn:'Открытие «Сообщений» не отправляет SMS и не подтверждает её доставку.',
  stop:'Если клиент ответил STOP, сразу установите «Не связываться» в CRM.',
  invalid:'Некорректный текст или выбор контактов. Обновите CRM и повторите.',
  expired:'Согласие или номер изменились. Обновите CRM перед продолжением.',
  ready:'Готово для копирования и открытия «Сообщений»',noneSelected:'Сначала выберите хотя бы один контакт с согласием.',
  loaded:'Показаны только загруженные контакты. Чтобы увидеть остальные, нажмите «Загрузить ещё контакты» ниже.',
  push:'Ещё один канал без SMS API: личные сообщения кабинета с Web Push. Уведомления получают только авторизованные клиенты, включившие их сами; это не рассылка по номерам.',
  pushSettings:'Настройки уведомлений кабинета',
 },
 es:{
  title:'SMS desde tu teléfono · sin API de pago',subtitle:'Prepara una lista con consentimiento; revisa y envía cada SMS manualmente en Mensajes.',
  price:'Sin cargos de Twilio/API. Tu operador puede cobrar SMS, roaming o segmentos adicionales.',
  privacy:'Solo contactos con permiso documentado. Sin envío automático, grupos ni afirmaciones falsas de entrega.',
  body:'Texto del mensaje',placeholder:'Mensaje profesional breve, sin información médica',
  example:'Hola, gracias por tu interés. ¿Quieres conocer los horarios disponibles?',
  eligible:'Contactos autorizados para SMS',none:'No hay contactos elegibles. Registra su consentimiento real en Contactos.',
  search:'Buscar por nombre o teléfono',choose:'Elegir',selectAll:'Elegir hasta 20',clear:'Borrar',
  chosen:'seleccionados',limit:'Hasta 20 destinatarios, con envío manual individual.',
  prepare:'Preparar lista SMS',unavailable:'Revisa el texto, los permisos y los segmentos.',
  count:'Segmentos con remitente y STOP',blocked:'Sin datos médicos, pruebas o enlaces privados.',
  prepared:'Contacto',of:'de',first:'Copia el texto, abre Mensajes, pégalo y envíalo tú mismo.',
  copy:'1. Copiar SMS',copied:'Texto copiado, pégalo en Mensajes.',copyFailed:'No se pudo copiar. Selecciona el texto de abajo.',
  open:'2. Abrir Mensajes para este número',next:'Siguiente',previous:'Anterior',
  close:'Cerrar lista',warn:'Abrir Mensajes no envía SMS ni confirma entrega.',
  stop:'Si alguien responde STOP, marca No contactar en el CRM.',
  invalid:'El texto o los destinatarios no son válidos. Actualiza CRM.',
  expired:'El permiso o número cambió. Actualiza CRM.',
  ready:'Listo para copiar y abrir Mensajes',noneSelected:'Elige al menos un contacto.',
  loaded:'Solo se muestran contactos cargados. Carga más contactos abajo para ampliar la lista.',
  push:'Otra opción sin tarifa SMS: mensajes privados en el gabinete con Web Push. Solo clientes registrados que autorizaron avisos; no es una difusión por teléfono.',
  pushSettings:'Preferencias de notificaciones',
 },
}

export default function CrmFreeSmsPanel({contacts=[],locale='en'}){
 const language=WORDS[locale]?locale:'en',t=WORDS[language]
 const [draft,setDraft]=useState(t.example)
 const [search,setSearch]=useState('')
 const [selected,setSelected]=useState([])
 const [queue,setQueue]=useState([])
 const [current,setCurrent]=useState(0)
 const [copyState,setCopyState]=useState('')
 const [notice,setNotice]=useState('')
 const eligible=useMemo(()=>listManualSmsCandidates(contacts),[contacts])
 const filtered=eligible.filter(contact=>
  [contact.displayName,contact.phone].join(' ').toLowerCase().includes(search.trim().toLowerCase())).slice(0,80)
 const picked=new Set(selected)
 const estimate=smsMessageEstimate(draft)
 let previewOk=false
 try{prepareManualSms({phone:'+14165551234',body:draft});previewOk=true}catch{}
 const active=queue[current]
 const liveContact=active&&contacts.find(contact=>contact.id===active.id)
 const stillEligible=active&&liveContact&&liveContact.phone===active.phone &&
  liveContact.smsEligibility?.allowed===true && liveContact.suppressed!==true &&
  liveContact.lifecycle!=='archived'
 function resetQueue(){
  setQueue([]);setCurrent(0);setCopyState('');setNotice('')
 }
 function toggle(id,checked){
  resetQueue()
  setSelected(prior=>{
   if(!checked)return prior.filter(x=>x!==id)
   return prior.includes(id)||prior.length>=MANUAL_SMS_MAX_RECIPIENTS?prior:[...prior,id]
  })
 }
 function selectVisible(){
  resetQueue()
  setSelected(filtered.slice(0,MANUAL_SMS_MAX_RECIPIENTS).map(c=>c.id))
 }
 function prepare(){
  setNotice('')
  try{
   const next=buildManualSmsQueue(contacts,selected,draft)
   if(!next.length){setNotice(t.noneSelected);return}
   setQueue(next);setCurrent(0);setCopyState('')
  }catch{setNotice(t.invalid)}
 }
 async function copyText(){
  if(!active||!stillEligible)return
  try {
   if(!navigator.clipboard?.writeText)throw Error('NO_CLIPBOARD')
   await navigator.clipboard.writeText(active.text)
   setCopyState('copied')
  }catch{setCopyState('fallback')}
 }
 return <section className={styles.panel} aria-label={t.title}>
  <div className={styles.head}>
   <div><h4>{t.title}</h4><p>{t.subtitle}</p></div>
   <span className={styles.cost}>$0 API</span>
  </div>
  <p className={styles.fine}>{t.price}</p>
  <p className={styles.fine}>{t.privacy}</p>
  <label className={styles.field}>{t.body}
   <textarea rows={3} maxLength={240} placeholder={t.placeholder}
     value={draft} onChange={event=>{setDraft(event.target.value);resetQueue()}}/>
  </label>
  <p className={estimate.valid?styles.estimate:styles.warning}>
   {t.count}: {estimate.segments}/4 · {estimate.encoding}
   {!previewOk&&' · '+t.unavailable}
  </p>
  <p className={styles.fine}>{t.blocked}</p>
  <div className={styles.selectionHead}>
   <strong>{t.eligible} ({eligible.length})</strong>
   <span>{selected.length}/{MANUAL_SMS_MAX_RECIPIENTS} {t.chosen}</span>
  </div>
  {eligible.length===0?<p className={styles.warning}>{t.none}</p>:<>
   <label className={styles.field}>{t.search}
    <input type="search" maxLength={90} value={search} onChange={event=>setSearch(event.target.value)}/>
   </label>
   <div className={styles.actions}>
    <button type="button" className={styles.secondary} onClick={selectVisible}>{t.selectAll}</button>
    <button type="button" className={styles.secondary} onClick={()=>{setSelected([]);resetQueue()}}>{t.clear}</button>
   </div>
   <div className={styles.picker} role="group" aria-label={t.eligible}>
    {filtered.map(contact=><label key={contact.id} className={styles.recipient}>
     <input type="checkbox" checked={picked.has(contact.id)}
      disabled={!picked.has(contact.id)&&selected.length>=MANUAL_SMS_MAX_RECIPIENTS}
      onChange={event=>toggle(contact.id,event.target.checked)}/>
     <span><strong>{contact.displayName||contact.phone}</strong><small>{contact.phone}</small></span>
    </label>)}
   </div>
   <p className={styles.fine}>{t.loaded}</p>
   <p className={styles.fine}>{t.limit}</p>
   <button type="button" className={styles.primary} disabled={!previewOk||!selected.length}
     onClick={prepare}>{t.prepare} ({selected.length})</button>
  </>}
  {notice&&<p className={styles.warning} role="alert">{notice}</p>}
  {active&&<div className={styles.dispatch} role="region" aria-label={t.prepared}>
   <div className={styles.step}><strong>{t.prepared} {current+1} {t.of} {queue.length}</strong>
    <span>{active.name} · {active.phone}</span></div>
   {!stillEligible?<p className={styles.warning}>{t.expired}</p>:<>
    <p>{t.first}</p>
    <textarea readOnly rows={5} value={active.text} aria-label={t.body} className={styles.readonly}/>
    <p className={styles.estimate}>{active.segments}/4 SMS · {active.encoding}</p>
    <div className={styles.actions}>
     <button type="button" className={styles.primary} onClick={copyText}>{t.copy}</button>
     <a className={styles.link} href={active.href}>{t.open}</a>
    </div>
    {copyState&&<p role="status" className={copyState==='copied'?styles.success:styles.warning}>
     {copyState==='copied'?t.copied:t.copyFailed}</p>}
    <p className={styles.fine}>{t.warn}</p>
   </>}
   <div className={styles.actions}>
    <button type="button" className={styles.secondary} disabled={current===0}
      onClick={()=>{setCurrent(x=>Math.max(0,x-1));setCopyState('')}}>{t.previous}</button>
    <button type="button" className={styles.secondary} disabled={current===queue.length-1}
      onClick={()=>{setCurrent(x=>Math.min(queue.length-1,x+1));setCopyState('')}}>{t.next}</button>
    <button type="button" className={styles.secondary} onClick={resetQueue}>{t.close}</button>
   </div>
   <p className={styles.fine}>{t.stop}</p>
  </div>}
  <div className={styles.pushInfo}>
   <strong>{t.pushSettings}</strong>
   <p>{t.push}</p>
   <a href={'/'+language+'/app/settings#hh-phone-notifications'}>{t.pushSettings} ↗</a>
  </div>
 </section>
}
