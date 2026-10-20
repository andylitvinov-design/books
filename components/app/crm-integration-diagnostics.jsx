'use client'
import styles from './crm-manager.module.css'
import {crmIntegrationStage} from '../../lib/crm/integration-readiness.js'

const COPY={
  en:{title:'Connections',intro:'Read-only setup status. No provider request or message is sent from this page.',configured:'Server configured · delivery not tested',pilot:'Owner test only · not public',setup:'Setup required',off:'Live sending disabled',missing:'Missing or invalid:',webhook:'Webhook:',check:'Last safe check: no check recorded.',error:'Last provider error: none recorded.',test:'Test mode:',yes:'available',no:'not available',unverified:'Credentials and a button do not prove that any message reached a person.',console:'Open official console',email:'Resend email',sms:'Twilio SMS',telegram:'Telegram bot',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
  ru:{title:'Подключения',intro:'Только статус настройки. Эта страница не отправляет запросы провайдерам и не рассылает сообщения.',configured:'Сервер настроен · доставка не проверена',pilot:'Только личный пилот · не для клиентов',setup:'Требуется настройка',off:'Рассылка клиентам выключена',missing:'Отсутствует или неверно:',webhook:'Webhook:',check:'Последняя безопасная проверка: ещё не записана.',error:'Последняя ошибка провайдера: не записана.',test:'Тестовый режим:',yes:'доступен',no:'недоступен',unverified:'Наличие ключей и кнопки не подтверждает, что сообщение дошло до человека.',console:'Открыть официальный кабинет',email:'Resend email',sms:'Twilio SMS',telegram:'Telegram-бот',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
  es:{title:'Conexiones',intro:'Estado de configuración de solo lectura. Esta página no envía solicitudes al proveedor ni mensajes.',configured:'Servidor configurado; entrega sin verificar',pilot:'Solo prueba propia · no pública',setup:'Configuración requerida',off:'Envío en vivo desactivado',missing:'Falta o no es válido:',webhook:'Webhook:',check:'Última comprobación segura: aún no registrada.',error:'Último error del proveedor: no registrado.',test:'Modo de prueba:',yes:'disponible',no:'no disponible',unverified:'Las credenciales no demuestran la entrega a una persona.',console:'Abrir consola oficial',email:'Correo Resend',sms:'SMS Twilio',telegram:'Bot de Telegram',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
}

const CONSOLES={
  email:'https://resend.com/domains',sms:'https://console.twilio.com/',telegram:'https://t.me/BotFather',
  whatsapp:'https://business.facebook.com/latest/whatsapp_manager',instagram:'https://developers.facebook.com/apps/',messenger:'https://developers.facebook.com/apps/',
}

function IntegrationCard({kind,item,t}){
  const state=crmIntegrationStage(kind,item), missing=Array.isArray(item?.missingKeys)?item.missingKeys:[]
  const stateText=t[state]
  const testMode=kind==='sms'?(!item?.live&&item?.enabled):kind==='telegram'&&state==='pilot'
  return <article className={styles.integrationCard}>
    <h3>{t[kind]}</h3>
    <span className={[styles.integrationStatus,state==='configured'?styles.integrationReady:''].filter(Boolean).join(' ')}>{stateText}</span>
    {missing.length>0&&<p>{t.missing}</p>}
    {missing.length>0&&<code className={styles.integrationCode}>{missing.join('\n')}</code>}
    {item?.webhookUrl||item?.callbackUrl?<p>{t.webhook}<code className={styles.integrationCode}>{item.webhookUrl||item.callbackUrl}</code></p>:null}
    <p>{t.unverified}</p>
    {(kind==='sms'||kind==='telegram')&&<p>{t.test} {testMode?t.yes:t.no}</p>}
    <a className={styles.integrationLink} href={CONSOLES[kind]} target="_blank" rel="noreferrer">{t.console}</a>
  </article>
}

export default function CrmIntegrationDiagnostics({locale='en',setup}){
  const t=COPY[locale]||COPY.en
  const items=[['email',setup?.email],['sms',setup?.sms],...(setup?.messengers||[]).map(item=>[item.channel,item])]
  const distinction=locale==='ru'
    ?'Telegram для уведомлений клиентов и Telegram в CRM Inbox — разные каналы. Настройка клиентского бота находится ниже.'
    :locale==='es'
      ?'Telegram de avisos al cliente y Telegram de la bandeja CRM son canales distintos. La configuración de avisos está abajo.'
      :'Client Telegram alerts and the CRM Telegram Inbox are separate integrations. Client bot setup is below.'
  return <section className={styles.formCard} aria-labelledby="crm-integrations-title">
    <h3 id="crm-integrations-title">{t.title}</h3><p className={styles.fine}>{t.intro}</p>
    <p className={styles.fine}>{distinction}</p>
    <div className={styles.integrationGrid}>{items.map(([kind,item])=><IntegrationCard key={kind} kind={kind} item={item} t={t}/>)}</div>
  </section>
}
