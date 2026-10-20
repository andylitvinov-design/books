'use client'
import styles from './crm-manager.module.css'
import {crmIntegrationStage} from '../../lib/crm/integration-readiness.js'

// Navigation only. Clinical/client conversations remain on their own
// authenticated practitioner API. Never merge client profiles into CRM contacts.
const COPY={
 en:{
  title:'Where messages arrive',intro:'Separate private Cabinet conversations from external CRM channels. A connected provider is not proof of delivery.',
  internal:'Private client conversations',internalInfo:'Read and reply to messages from consultation requests. This is not the external contact list.',
  whatsapp:'Manual WhatsApp replies',whatsappInfo:'Open approved business enquiries with a confirmed WhatsApp preference. This opens your own app; it does not send automatically.',
  sms:'SMS from your phone',smsInfo:'Review, copy and send one by one, only to contacts with SMS consent. Not an automatic delivery.',
  connections:'Channel connections',connectionsInfo:'Check Telegram, WhatsApp, SMS and email setup before attempting provider sends.',
  settings:'My phone notifications',settingsInfo:'Enable opt-in Web Push for your own account.',
  open:'Open',notice:'Your customer Telegram notifications bot is separate from the CRM Telegram Inbox.'
 },
 ru:{
  title:'Куда приходят сообщения',intro:'Личная переписка кабинета и внешние каналы CRM — разные защищённые разделы. Настроенный провайдер ещё не означает доставку.',
  internal:'Личные сообщения клиентов',internalInfo:'Просматривайте заявки и отвечайте клиенту внутри защищённого кабинета мастера. Клинические профили не смешиваются с CRM-контактами.',
  whatsapp:'Ответить через WhatsApp вручную',whatsappInfo:'Откройте заявки, где клиент явно выбрал WhatsApp. Сообщение откроется в вашем приложении; отправка только вручную.',
  sms:'SMS с вашего телефона',smsInfo:'По одной: проверить согласие, скопировать текст и отправить вручную. Это не автоматическая SMS-рассылка.',
  connections:'Подключения каналов',connectionsInfo:'Проверьте Telegram, WhatsApp, SMS и email до внешней отправки.',
  settings:'Уведомления на мой телефон',settingsInfo:'Включите Web Push после отдельного согласия.',
  open:'Открыть',notice:'Бот Telegram для клиентских уведомлений не совпадает с внешней перепиской CRM Telegram.'
 },
 es:{
  title:'Dónde llegan los mensajes',intro:'Las conversaciones privadas y los canales externos del CRM están separados. Configuración no significa entrega.',
  internal:'Mensajes privados de clientes',internalInfo:'Consulta solicitudes y responde dentro del espacio protegido. Los perfiles clínicos no se fusionan con contactos comerciales.',
  whatsapp:'WhatsApp manual',whatsappInfo:'Abre consultas comerciales que pidieron WhatsApp. Tu app se abre sin envío automático.',
  sms:'SMS desde tu teléfono',smsInfo:'Revisa el consentimiento, copia y envía uno por uno. No se envían automáticamente.',
  connections:'Conexiones de canales',connectionsInfo:'Comprueba Telegram, WhatsApp, SMS y correo antes de responder por el proveedor.',
  settings:'Notificaciones de mi teléfono',settingsInfo:'Activa Web Push con consentimiento independiente.',
  open:'Abrir',notice:'El bot Telegram para notificaciones del cliente no es la bandeja Telegram del CRM.'
 }
}
export default function CrmMessagesNavigation({locale='en',setup,onSms,onIntegrations,onOverview}){
 const t=COPY[locale]||COPY.en
 const external=setup?.messengers||[]
 const realReady=external.filter(item=>crmIntegrationStage(item.channel,item)==='configured').length
 const pilot=external.filter(item=>crmIntegrationStage(item.channel,item)==='pilot').length
 const count=realReady+pilot
 const providerNote=locale==='ru'
   ?'Внешних каналов технически готово: '+realReady+(pilot?' · пилотных: '+pilot:'')+'. Фактические доставки не подтверждены этим счётчиком.'
   :locale==='es'
     ?'Canales externos configurados: '+realReady+(pilot?' · pilotos: '+pilot:'')+'. La entrega real no está confirmada.'
     :'External channels configured: '+realReady+(pilot?' · pilot: '+pilot:'')+'. This is not a delivery receipt.'
 return <section className={styles.messageHub} aria-labelledby="hh-crm-channel-entry">
   <h3 id="hh-crm-channel-entry">{t.title}</h3>
   <p>{t.intro}</p>
   <div className={styles.messageHubGrid}>
     <article className={styles.messageHubCard}>
       <h4>{t.internal}</h4><p>{t.internalInfo}</p>
       <a href={'/'+(locale==='es'?'en':locale)+'/app/practice?panel=clients'}>{t.open} →</a>
     </article>
     <article className={styles.messageHubCard}>
       <h4>{t.sms}</h4><p>{t.smsInfo}</p>
       <button type="button" onClick={onSms}>{t.open} →</button>
     </article>
     <article className={styles.messageHubCard}>
       <h4>{t.whatsapp}</h4><p>{t.whatsappInfo}</p>
       <button type="button" onClick={onOverview}>{t.open} →</button>
     </article>
     <article className={styles.messageHubCard}>
       <h4>{t.connections}</h4><p>{t.connectionsInfo}</p>
       <button type="button" onClick={onIntegrations}>{t.open} →</button>
     </article>
     <article className={styles.messageHubCard}>
       <h4>{t.settings}</h4><p>{t.settingsInfo}</p>
       <a href={'/'+(locale==='es'?'en':locale)+'/app/settings#hh-phone-notifications'}>{t.open} →</a>
     </article>
   </div>
   <p className={styles.messageHubFoot} role="status">{providerNote}</p>
   <p className={styles.messageHubFoot}>{t.notice}</p>
 </section>
}
