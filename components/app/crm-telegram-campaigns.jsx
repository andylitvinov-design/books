'use client'
import {useCallback,useEffect,useState} from 'react'
import {CRM_TEMPLATES} from '../../lib/crm/campaigns'
import styles from './crm-telegram-campaigns.module.css'

const senderCopy={
  ru:{heading:'Сведения об отправителе (обязательно для коммерческой рассылки)',name:'Публичное название организации / отправителя',address:'Действующий почтовый адрес для корреспонденции',confirm:'Подтверждаю достоверность адреса и разрешаю указать его в каждом отправленном сообщении',notice:'Используйте адрес для деловой корреспонденции, не домашний адрес. Он будет виден всем получателям. Контактная ссылка Holistic House и отписка добавятся автоматически.'},
  en:{heading:'Sender identification (required for commercial messages)',name:'Public business / sender name',address:'Valid business mailing address',confirm:'I confirm the address is accurate and authorize its inclusion in each message',notice:'Use a public business mailing address, not your home address. All recipients will see it. Contact and opt-out details are added automatically.'},
  es:{heading:'Identificación del remitente (obligatorio)',name:'Nombre público de la empresa o remitente',address:'Dirección postal comercial válida',confirm:'Confirmo que la dirección es correcta y autorizo su inclusión en cada mensaje',notice:'Usa una dirección comercial pública, no tu domicilio. Los destinatarios la verán. Se añaden contacto y baja automáticamente.'},
}
const copy={
  ru:{title:'Рассылки в мессенджерах',hint:'Telegram: отправка вручную только подписавшимся. Личная переписка и подписка на новости независимы.',people:'Подписчиков',prepare:'Подготовить кампанию',send:'Отправить следующую партию (до 3)',refresh:'Обновить',select:'Кампания',preview:'Текст сообщения',confirm:'Подтверждаю отправку только добровольно подписавшимся адресатам',pending:'Осталось отправить',accepted:'Принято Telegram',unknown:'Доставка не подтверждена',blocked:'Заблокировано',failed:'Отклонено',ready:'Канал готов',notReady:'Telegram не подключён для рассылок',none:'Пока нет подписчиков. Сначала попросите клиента отправить боту /subscribe.',how:'Подписка: /subscribe · Отписка от новостей: /unsubnews · Отписка от всех сообщений: /stop.',other:'WhatsApp, Instagram и Messenger: отправка маркетинга отключена до отдельного согласия, проверки правил провайдера и финансового одобрения.',error:'Не удалось выполнить действие. Проверьте подписку, дневной лимит и настройки канала.',done:'Партия обработана; проверьте статусы.',zero:'Дополнительных платных сервисов и автоматической отправки нет.'},
  en:{title:'Messenger campaigns',hint:'Telegram: manually send only to people who opted in. Personal replies and newsletters have separate consent.',people:'Subscribers',prepare:'Prepare campaign',send:'Send next batch (up to 3)',refresh:'Refresh',select:'Campaign',preview:'Message preview',confirm:'I confirm only explicit, active newsletter subscribers may receive this campaign',pending:'Still eligible',accepted:'Accepted by Telegram',unknown:'Unconfirmed delivery',blocked:'Blocked',failed:'Rejected',ready:'Channel ready',notReady:'Telegram is not connected for campaigns',none:'No subscribers yet. Invite clients to send /subscribe to the bot.',how:'Subscribe: /subscribe · News opt-out: /unsubnews · Stop all contact: /stop.',other:'WhatsApp, Instagram and Messenger marketing are disabled until separate opt-in, provider review and cost approval.',error:'Action unavailable. Check consent, daily cap and provider configuration.',done:'Batch processed; review the delivery statuses.',zero:'No new paid services or automatic sends.'},
  es:{title:'Campañas en mensajería',hint:'Telegram: envío manual solo a personas suscritas. Las respuestas personales y las noticias tienen consentimientos separados.',people:'Suscriptores',prepare:'Preparar campaña',send:'Enviar siguiente lote (hasta 3)',refresh:'Actualizar',select:'Campaña',preview:'Vista previa',confirm:'Confirmo el envío solo a suscriptores que aceptaron expresamente',pending:'Restantes',accepted:'Aceptado por Telegram',unknown:'Entrega no confirmada',blocked:'Bloqueado',failed:'Rechazado',ready:'Canal listo',notReady:'Telegram no está conectado',none:'No hay suscriptores. Invita a escribir /subscribe al bot.',how:'Suscribirse: /subscribe · Noticias: /unsubnews · Detener todo: /stop.',other:'Marketing en WhatsApp, Instagram y Messenger desactivado hasta revisión de consentimiento, reglas y costes.',error:'Acción no disponible. Comprueba consentimiento, límite y configuración.',done:'Lote procesado; revisa los estados.',zero:'Sin servicios de pago adicionales ni envíos automáticos.'},
}
export default function CrmTelegramCampaigns({accountId,locale='ru'}){
  const lang=copy[locale]?locale:'en',t=copy[lang],senderLabels=senderCopy[lang]
  const [data,setData]=useState(null)
  const [campaignId,setCampaignId]=useState('')
  const [templateId,setTemplateId]=useState('course_update')
  const [senderName,setSenderName]=useState('Holistic House')
  const [postalAddress,setPostalAddress]=useState('')
  const [addressConfirmed,setAddressConfirmed]=useState(false)
  const [summary,setSummary]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const call=useCallback(async (action,payload)=>{
    const response=await fetch('/api/app/crm/messenger/campaign',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
      body:JSON.stringify({action,payload}),
    })
    if(!response.ok)throw Error('CAMPAIGN_UNAVAILABLE')
    return response.json()
  },[accountId])
  const refresh=useCallback(async ()=>{
    const response=await fetch('/api/app/crm/messenger/campaign',{
      credentials:'same-origin',cache:'no-store',headers:{'X-HH-Account-Id':accountId},
    })
    if(!response.ok)throw Error('CAMPAIGN_UNAVAILABLE')
    setData(await response.json())
  },[accountId])
  const inspect=useCallback(async id=>{
    setSummary(await call('stats',{campaignId:id}))
  },[call])
  useEffect(()=>{
    if(!accountId)return
    let mounted=true
    refresh().catch(()=>{if(mounted)setError(t.error)})
    return()=>{mounted=false}
  },[accountId,refresh,t.error])
  async function prepare(){
    if(busy||!addressConfirmed||senderName.trim().length<3||postalAddress.trim().length<10)return
    setBusy(true);setError('');setNotice('')
    try{
      const created=await call('create',{templateId,locale:lang,sender:{
        name:senderName.trim(),postalAddress:postalAddress.trim(),addressConfirmed:true,
      }})
      setCampaignId(created.id)
      setConfirmed(false)
      await refresh()
      await inspect(created.id)
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  async function selectCampaign(id){
    if(!id||busy)return
    setCampaignId(id);setConfirmed(false);setError('');setNotice('')
    try{await inspect(id)}catch{setError(t.error)}
  }
  async function dispatch(){
    if(busy||!confirmed||!summary?.providerReady||!summary?.remaining)return
    setBusy(true);setError('');setNotice('')
    try{
      const result=await call('dispatch',{campaignId,confirmed:true})
      setSummary(result.summary)
      setNotice(t.done)
      await refresh()
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  return <section className={styles.panel} aria-labelledby="hh-tg-campaigns-title">
    <h3 id="hh-tg-campaigns-title">{t.title}</h3>
    <p>{t.hint}</p>
    <p className={styles.guide}>{t.how}</p>
    <div className={styles.metrics}>
      <strong>{t.people}: {data?.subscriberCounts?.[lang]??'—'}</strong>
      <span>{data?.providerReady?t.ready:t.notReady}</span>
    </div>
    {!data?.subscriberCounts?.[lang]&&<p>{t.none}</p>}
    <div className={styles.controls}>
      <label>{t.preview}
        <select value={templateId} disabled={busy} onChange={e=>setTemplateId(e.target.value)}>
          {Object.entries(CRM_TEMPLATES).map(([id,item])=>
            <option key={id} value={id}>{item[lang].subject}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy||!addressConfirmed||
        senderName.trim().length<3||postalAddress.trim().length<10}
        onClick={prepare}>{t.prepare}</button>
    </div>
    <fieldset className={styles.sender}>
      <legend>{senderLabels.heading}</legend>
      <label>{senderLabels.name}
        <input type="text" value={senderName} maxLength={100} disabled={busy}
          onChange={e=>{setSenderName(e.target.value);setAddressConfirmed(false)}}/>
      </label>
      <label>{senderLabels.address}
        <textarea value={postalAddress} maxLength={240} rows={2} disabled={busy}
          onChange={e=>{setPostalAddress(e.target.value);setAddressConfirmed(false)}}/>
      </label>
      <p>{senderLabels.notice}</p>
      <label className={styles.confirm}>
        <input type="checkbox" checked={addressConfirmed} disabled={busy}
          onChange={e=>setAddressConfirmed(e.target.checked)}/>
        {senderLabels.confirm}
      </label>
    </fieldset>
    <p className={styles.preview}>{CRM_TEMPLATES[templateId][lang].body}</p>
    {(data?.campaigns||[]).length>0&&<label>{t.select}
      <select value={campaignId} disabled={busy} onChange={e=>selectCampaign(e.target.value)}>
        <option value="">—</option>
        {data.campaigns.map(item=><option key={item.id} value={item.id}>
          {CRM_TEMPLATES[item.templateId]?.[item.locale]?.subject||item.templateId} · {item.locale}
        </option>)}
      </select>
    </label>}
    {summary&&<div className={styles.summary}>
      <h4>{t.preview} · {summary.locale.toUpperCase()}</h4>
      <p>{summary.body}</p>
      <div className={styles.metrics}>
        <span>{t.people}: {summary.subscribers}</span>
        <span>{t.pending}: {summary.remaining}</span>
        <span>{t.accepted}: {summary.delivery?.accepted||0}</span>
        <span>{t.unknown}: {summary.delivery?.unknown||0}</span>
        <span>{t.failed}: {summary.delivery?.failed||0}</span>
        <span>{t.blocked}: {summary.delivery?.blocked||0}</span>
      </div>
      <label className={styles.confirm}><input type="checkbox" checked={confirmed}
        onChange={e=>setConfirmed(e.target.checked)}/> {t.confirm}</label>
      <button type="button" disabled={busy||!confirmed||!summary.providerReady||!summary.remaining}
        onClick={dispatch}>{t.send}</button>
    </div>}
    <div className={styles.footer}>
      <p>{t.zero}</p><p>{t.other}</p>
      <button type="button" disabled={busy} onClick={()=>{setError('');setNotice('');void refresh().then(()=>campaignId&&inspect(campaignId)).catch(()=>setError(t.error))}}>{t.refresh}</button>
    </div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>
}
