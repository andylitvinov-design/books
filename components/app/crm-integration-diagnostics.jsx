'use client'
import styles from './crm-manager.module.css'

const COPY={
  en:{title:'Connections',intro:'Read-only setup status. No provider request or message is sent from this page.',configured:'Configured — delivery not verified',setup:'Setup required',off:'Production sending is off',missing:'Missing or invalid:',webhook:'Webhook:',check:'Last safe check: no check recorded.',error:'Last provider error: none recorded.',test:'Test mode:',yes:'available',no:'not available',console:'Open official console',email:'Resend email',sms:'Twilio SMS',telegram:'Telegram bot',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
  ru:{title:'Подключения',intro:'Только статус настройки. Эта страница не отправляет запросы провайдерам и не рассылает сообщения.',configured:'Настроено — доставка ещё не подтверждена',setup:'Требуется настройка',off:'Отправка в Production выключена',missing:'Отсутствует или неверно:',webhook:'Webhook:',check:'Последняя безопасная проверка: ещё не записана.',error:'Последняя ошибка провайдера: не записана.',test:'Тестовый режим:',yes:'доступен',no:'недоступен',console:'Открыть официальный кабинет',email:'Resend email',sms:'Twilio SMS',telegram:'Telegram-бот',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
  es:{title:'Conexiones',intro:'Estado de configuración de solo lectura. Esta página no envía solicitudes al proveedor ni mensajes.',configured:'Configurado; entrega aún no verificada',setup:'Configuración requerida',off:'El envío en producción está desactivado',missing:'Falta o no es válido:',webhook:'Webhook:',check:'Última comprobación segura: aún no registrada.',error:'Último error del proveedor: no registrado.',test:'Modo de prueba:',yes:'disponible',no:'no disponible',console:'Abrir consola oficial',email:'Correo Resend',sms:'SMS Twilio',telegram:'Bot de Telegram',whatsapp:'WhatsApp Cloud API',instagram:'Instagram Direct',messenger:'Facebook Messenger'},
}

const CONSOLES={
  email:'https://resend.com/domains',sms:'https://console.twilio.com/',telegram:'https://t.me/BotFather',
  whatsapp:'https://business.facebook.com/latest/whatsapp_manager',instagram:'https://developers.facebook.com/apps/',messenger:'https://developers.facebook.com/apps/',
}

function cardState(item){
  if(item?.configured===true||item?.enabled===true)return 'configured'
  if(item?.liveApproved===false||item?.reason==='production_not_approved'||item?.reason==='sms_production_not_approved')return 'off'
  return 'setup'
}

function IntegrationCard({kind,item,t}){
  const state=cardState(item), missing=Array.isArray(item?.missingKeys)?item.missingKeys:[]
  const stateText=state==='configured'?t.configured:state==='off'?t.off:t.setup
  const testMode=kind==='sms'?(!item?.live&&item?.enabled):kind==='telegram'?item?.pilot:false
  return <article className={styles.integrationCard}>
    <h3>{t[kind]}</h3>
    <span className={[styles.integrationStatus,state==='configured'?styles.integrationReady:''].filter(Boolean).join(' ')}>{stateText}</span>
    {missing.length>0&&<p>{t.missing}</p>}
    {missing.length>0&&<code className={styles.integrationCode}>{missing.join('\n')}</code>}
    {item?.webhookUrl||item?.callbackUrl?<p>{t.webhook}<code className={styles.integrationCode}>{item.webhookUrl||item.callbackUrl}</code></p>:null}
    <p>{t.check}</p><p>{t.error}</p>
    {(kind==='sms'||kind==='telegram')&&<p>{t.test} {testMode?t.yes:t.no}</p>}
    <a className={styles.integrationLink} href={CONSOLES[kind]} target="_blank" rel="noreferrer">{t.console}</a>
  </article>
}

export default function CrmIntegrationDiagnostics({locale='en',setup}){
  const t=COPY[locale]||COPY.en
  const items=[['email',setup?.email],['sms',setup?.sms],...(setup?.messengers||[]).map(item=>[item.channel,item])]
  return <section className={styles.formCard} aria-labelledby="crm-integrations-title">
    <h3 id="crm-integrations-title">{t.title}</h3><p className={styles.fine}>{t.intro}</p>
    <div className={styles.integrationGrid}>{items.map(([kind,item])=><IntegrationCard key={kind} kind={kind} item={item} t={t}/>)}</div>
  </section>
}
