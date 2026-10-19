'use client'
import { useState } from 'react'
import styles from './crm-email-tools.module.css'

const COPY={
 en:{
  title:'SMS provider setup',connected:'Sending is enabled',pilot:'Test-only mode',
  off:'Sending is OFF until a verified Twilio account and sender are connected.',
  missing:'Missing server-side configuration',ready:'Credentials are present. Verify the service before a controlled SMS test.',
  check:'Check Twilio connection (no SMS sent)',checking:'Checking configuration…',
  callback:'Incoming STOP + delivery callback',copy:'Copy webhook',
  copied:'Copied',copyFailed:'Copy the URL manually',how:'Open Twilio Console',
  caution:'Add credentials only in encrypted Vercel Production settings. Never paste API tokens into the CRM, chat or GitHub.',
  manual:'Twilio Advanced Opt-Out and commercial sender identity require separate manual approval. A successful connection check is not proof of SMS delivery.',
  missingCredentials:'Enter the three Twilio credentials in Vercel first.',
  invalid_credentials:'Twilio rejected the credentials.',
  provider_unavailable:'Could not confirm Twilio connectivity. No SMS was sent.',
  account_mismatch:'The Messaging Service does not belong to the configured Twilio account.',
  sender_lookup_unavailable:'Service is accessible but the attached-number check could not be completed.',
  needs_configuration:'Twilio is reachable; complete sender assignment or inbound webhook setup.',
  status_connected:'Twilio service and sender verified. Check opt-out and perform a manual pilot delivery before enabling clients.',
  verified:'Provider account verified',number:'Sending phone attached',
  inbound:'Incoming STOP webhook matches',delivery:'Service delivery callback matches (also set per message)',
  yes:'Yes',no:'Not verified',setup:'Connection checks',
 },
 ru:{
  title:'Подключение SMS-провайдера',connected:'Отправка разрешена',pilot:'Только тестовый режим',
  off:'Отправка отключена до подключения проверенного Twilio-аккаунта и номера.',
  missing:'Недостающие защищённые настройки сервера',ready:'Ключи добавлены. Проверьте сервис перед тестовой SMS.',
  check:'Проверить Twilio без отправки SMS',checking:'Проверяю подключение…',
  callback:'Webhook для STOP и статусов доставки',copy:'Копировать webhook',
  copied:'Скопировано',copyFailed:'Скопируйте адрес вручную',how:'Открыть Twilio',
  caution:'Добавляйте ключи только в зашифрованные настройки Vercel Production. Не вставляйте токены в CRM, чат или GitHub.',
  manual:'Advanced Opt-Out Twilio и юридические контакты отправителя нужно подтвердить отдельно. Проверка соединения ещё не подтверждает доставку SMS.',
  missingCredentials:'Сначала добавьте три ключа Twilio в Vercel.',
  invalid_credentials:'Twilio отклонил ключи доступа.',
  provider_unavailable:'Не удалось проверить связь с Twilio. SMS не отправлялась.',
  account_mismatch:'Messaging Service не принадлежит выбранному Twilio-аккаунту.',
  sender_lookup_unavailable:'Сервис доступен, но прикреплённый номер проверить не удалось.',
  needs_configuration:'Twilio отвечает. Нужно прикрепить номер или настроить входящий webhook.',
  status_connected:'Twilio и номер проверены. Проверьте отписку STOP и тестовую доставку до запуска для клиентов.',
  verified:'Аккаунт подтверждён',number:'Номер отправителя подключён',
  inbound:'Входящий webhook STOP настроен',delivery:'Webhook статусов на уровне сервиса (также задаётся в каждом SMS)',
  yes:'Да',no:'Не подтверждено',setup:'Проверка подключения',
 },
 es:{
  title:'Conexión del proveedor SMS',connected:'Envío habilitado',pilot:'Solo modo de prueba',
  off:'El envío está desactivado hasta conectar Twilio y un remitente verificado.',
  missing:'Configuración privada del servidor pendiente',ready:'Las credenciales están presentes. Verifica el servicio antes del SMS de prueba.',
  check:'Verificar Twilio (no envía SMS)',checking:'Verificando…',
  callback:'Webhook para STOP y entrega',copy:'Copiar webhook',
  copied:'Copiado',copyFailed:'Copia manualmente el URL',how:'Abrir Twilio',
  caution:'Configura los secretos solo en Vercel Production. Nunca los introduzcas en el CRM, chat o GitHub.',
  manual:'Advanced Opt-Out y la identidad comercial requieren verificación manual. La conexión no prueba la entrega.',
  missingCredentials:'Añade primero las tres credenciales de Twilio a Vercel.',
  invalid_credentials:'Twilio rechazó las credenciales.',
  provider_unavailable:'No se pudo conectar a Twilio. No se envió SMS.',
  account_mismatch:'El servicio no pertenece a esa cuenta de Twilio.',
  sender_lookup_unavailable:'Servicio accesible; no se pudo verificar el número remitente.',
  needs_configuration:'Twilio responde, pero falta un número o el webhook.',
  status_connected:'Cuenta y número verificados. Prueba STOP y la entrega antes de habilitar clientes.',
  verified:'Cuenta verificada',number:'Número remitente asociado',
  inbound:'Webhook entrante correcto',delivery:'Webhook de estado (también se asigna por mensaje)',
  yes:'Sí',no:'Sin verificar',setup:'Prueba de conexión',
 },
}
export default function CrmSmsSetup({locale='en',setup,onAction,busy=false}) {
 const lang=COPY[locale]?locale:'en',c=COPY[lang]
 const [report,setReport]=useState(null),[checking,setChecking]=useState(false),[copyMessage,setCopyMessage]=useState('')
 if(!setup)return null
 async function testConnection(){
  if(checking||busy||!setup.credentialsPresent)return
  setChecking(true);setReport(null)
  try {
   const result=await onAction('check_sms_connection',{})
   setReport(result||{status:'provider_unavailable',providerVerified:false})
  } finally {setChecking(false)}
 }
 async function copyWebhook(){
  try {await navigator.clipboard.writeText(setup.webhookUrl);setCopyMessage(c.copied)}
  catch{setCopyMessage(c.copyFailed)}
 }
 return <details className={styles.panel} open={!setup.enabled?true:undefined}>
  <summary>{c.title}</summary>
  <p className={setup.enabled?styles.success:styles.warning}>
   {setup.enabled?(setup.live?c.connected:c.pilot):c.off}
  </p>
  {setup.missingKeys?.length>0?
   <><p>{c.missing}</p><ul className={styles.history}>
     {setup.missingKeys.map(key=><li key={key}><code>{key}</code></li>)}
   </ul></>:<p className={styles.success}>{c.ready}</p>}
  <p>{c.callback}</p>
  <p><code style={{overflowWrap:'anywhere'}}>{setup.webhookUrl}</code></p>
  <button type="button" disabled={busy} onClick={copyWebhook}>{c.copy}</button>
  {copyMessage&&<p role="status">{copyMessage}</p>}
  <p><a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">{c.how} ↗</a></p>
  <p>{c.caution}</p>
  <button type="button" disabled={!setup.credentialsPresent||checking||busy} onClick={testConnection}>
   {checking?c.checking:c.check}
  </button>
  {!setup.credentialsPresent&&<p>{c.missingCredentials}</p>}
  {report&&<div role="status">
    <p><strong>{c[report.status==='connected'?'status_connected':report.status]||c.provider_unavailable}</strong></p>
    {report.providerVerified&&<ul className={styles.history}>
      {[
       [c.verified,report.providerVerified],
       [c.number,report.senderAttached],
       [c.inbound,report.inboundWebhookVerified],
       [c.delivery,report.statusCallbackVerified],
      ].map(([name,done])=><li key={name}>{name}: {done?c.yes:c.no}</li>)}
    </ul>}
  </div>}
  <p>{c.manual}</p>
 </details>
}
