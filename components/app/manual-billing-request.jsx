'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildManualPaymentRequest, MANUAL_PAYMENT_CONTACT_URL, MANUAL_PAYMENT_METHODS } from '@/lib/billing/manual-payment-request'
import styles from './manual-billing-request.module.css'

const COPY = {
  en: {
    title:'Other ways to pay', subtitle:'Choose a preferred method and request payment instructions, as on Ezohata.',
    method:'Preferred payment method', copy:'Copy payment request', copied:'Request copied',
    copyFailed:'Clipboard unavailable. Copy the text below.', open:'Open Telegram to request instructions',
    view:'View / copy request text', important:'This is not checkout. No funds are charged and no paid access starts when you request an invoice.',
    renewal:'A bank/PayPal transfer covers one confirmed month. Renewal requires another payment; it is not an automatic subscription.',
    create:'Create a numbered request', creating:'Saving your request…', unavailable:'Online requests are not enabled yet. You can still contact us.',
    pending:'Your request', refresh:'Refresh payment status', created:'Request saved. Contact us with this reference for verified payment details.',
    required:'Sign in to your Google cabinet to save an order.', failed:'Could not save the request. No money was taken.',
    existing:'An earlier request is still pending. It must be resolved before creating another.',
    quote:'Payment instructions and the exact total will be confirmed by the owner before a transfer.',
    ref:'Reference', amount:'Confirmed invoice amount', status:'Status',
    statuses:{requested:'Awaiting merchant instructions',quoted:'Invoice prepared — verify the recipient before paying',
      paid:'Payment verified by owner',rejected:'Declined',refunded:'Refund recorded',expired:'Expired'},
  },
  ru: {
    title:'Другие способы оплаты', subtitle:'Как на EzoHata: выберите способ и валюту, затем запросите реквизиты.',
    method:'Предпочтительный способ оплаты', copy:'Скопировать заявку', copied:'Заявка скопирована',
    copyFailed:'Скопируйте текст заявки ниже вручную.', open:'Открыть Telegram для получения реквизитов',
    view:'Показать / скопировать текст заявки', important:'Это не оплата. Создание заявки не списывает деньги и не открывает платный доступ.',
    renewal:'Ручной перевод оплачивает один подтверждённый месяц. Для продления нужен новый платёж, автоматического списания нет.',
    create:'Создать заявку с номером', creating:'Сохраняем заявку…', unavailable:'Регистрация онлайн-заявок пока недоступна. Можно связаться напрямую.',
    pending:'Ваша заявка', refresh:'Обновить статус оплаты', created:'Заявка сохранена. Передайте номер для получения подтверждённых реквизитов.',
    required:'Войдите через Google в личный кабинет, чтобы сохранить заявку.', failed:'Не удалось сохранить заявку. Деньги не списаны.',
    existing:'У вас уже есть незавершённая заявка. Сначала завершите её.',
    quote:'Получателя, точную сумму и условия оплаты мастер подтвердит до перевода.',
    ref:'Номер', amount:'Подтверждённая сумма счёта', status:'Статус',
    statuses:{requested:'Ожидает инструкций мастера',quoted:'Счёт подготовлен — проверьте получателя до оплаты',
      paid:'Мастер подтвердил поступление',rejected:'Отказ',refunded:'Возврат оформлен',expired:'Срок заявки истёк'},
  },
}

function currencyAmount(cents,currency,locale) {
  if(!Number.isSafeInteger(cents)||!['EUR','USD','CAD','UAH'].includes(currency))return ''
  return new Intl.NumberFormat(locale==='ru'?'ru-RU':'en-CA',{
    style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2,
  }).format(cents/100)
}

export default function ManualBillingRequest({ planId, locale = 'en', accountId = null }) {
  const lang=locale==='ru'?'ru':'en',t=COPY[lang]
  const [methodId,setMethodId]=useState('paypal-eur')
  const [feedback,setFeedback]=useState('')
  const [registry,setRegistry]=useState(null)
  const [busy,setBusy]=useState(false)
  const operation=useRef(null)
  const liveOwner=useRef(accountId)
  liveOwner.current=accountId
  const activeOrder=registry?.orders?.find(item=>['requested','quoted'].includes(item.status)) || null
  const currentOrder=activeOrder || registry?.orders?.find(item=>item.planId===planId) || null
  const ownOrder=currentOrder?.planId===planId&&currentOrder?.methodId===methodId?currentOrder:null
  const baseRequest=buildManualPaymentRequest({planId,methodId,locale:lang})
  const message=baseRequest+(ownOrder?'\n'+t.ref+': '+ownOrder.id+'.':'')
  const pending=Boolean(activeOrder)
  const canCreate=Boolean(accountId&&registry?.enabled&&!busy&&!pending&&baseRequest)

  const refresh=useCallback(async({signal}={})=>{
    if(!accountId){setRegistry(null);return}
    const response=await fetch('/api/app/manual-billing/orders',{
      method:'GET',credentials:'same-origin',cache:'no-store',signal,
      headers:{'X-HH-Account-ID':accountId},
    })
    if(!response.ok)throw new Error('REQUEST_UNAVAILABLE')
    const result=await response.json()
    if(!signal?.aborted&&liveOwner.current===accountId)setRegistry(result)
  },[accountId])

  useEffect(()=>{
    operation.current=null
    setRegistry(null)
    setFeedback('')
    if(!accountId)return
    const ctrl=new AbortController()
    void refresh({signal:ctrl.signal}).catch(()=>{
      if(!ctrl.signal.aborted&&liveOwner.current===accountId)setRegistry({enabled:false,orders:[]})
    })
    return()=>ctrl.abort()
  },[accountId,refresh])

  async function createRequest(){
    if(!canCreate)return
    const issuedFor=accountId
    setBusy(true);setFeedback('')
    operation.current ||= {id:crypto.randomUUID(),planId,methodId}
    if(operation.current.planId!==planId||operation.current.methodId!==methodId)
      operation.current={id:crypto.randomUUID(),planId,methodId}
    try {
      const response=await fetch('/api/app/manual-billing/orders',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':accountId},
        body:JSON.stringify({operationId:operation.current.id,planId,methodId}),
      })
      const result=await response.json()
      if(!response.ok||!result.order)throw new Error(result.error||'REQUEST_FAILED')
      if(liveOwner.current!==issuedFor)return
      setRegistry(prev=>({enabled:true,orders:[result.order,...(prev?.orders||[]).filter(item=>item.id!==result.order.id)]}))
      setFeedback('created')
    } catch {
      if(liveOwner.current===issuedFor)setFeedback('failed')
    } finally {if(liveOwner.current===issuedFor)setBusy(false)}
  }

  async function copyRequest(){
    try {
      if(!navigator.clipboard?.writeText)throw new Error('CLIPBOARD_UNAVAILABLE')
      await navigator.clipboard.writeText(message)
      setFeedback('copied')
    }catch{setFeedback('copyFailed')}
  }

  if(!baseRequest)return null
  return <section className={styles.panel} aria-label={t.title} data-manual-billing-request={planId}>
    <h4>{t.title}</h4><p className={styles.intro}>{t.subtitle}</p>
    <fieldset className={styles.methods}><legend>{t.method}</legend>
      <div className={styles.grid}>{MANUAL_PAYMENT_METHODS.map(method=><label key={method.id}
        className={styles.option} data-selected={method.id===methodId}>
        <input type="radio" name={'manual-method-'+planId} value={method.id} checked={methodId===method.id}
          onChange={()=>{setMethodId(method.id);setFeedback('')}}/>
        <span><strong>{method[lang]}</strong><small>{method[lang+'Hint']}</small></span>
      </label>)}</div>
    </fieldset>
    <p className={styles.important}>{t.important}</p>
    {accountId&&currentOrder&&<div className={styles.order} data-manual-order-status>
      <strong>{t.pending}: {currentOrder.id?.slice(0,8)?.toUpperCase()}</strong>
      <p>{t.status}: {t.statuses[currentOrder.status]||currentOrder.status}</p>
      <p>{t.ref}: <code>{currentOrder.id}</code></p>
      {currentOrder.invoiceAmountMinor!=null&&<p>{t.amount}: {currencyAmount(currentOrder.invoiceAmountMinor,currentOrder.invoiceCurrency,lang)}</p>}
      <p className={styles.renewal}>{t.quote}</p>
    </div>}
    <div className={styles.actions}>
      {accountId&&<button className={styles.create} type="button" onClick={createRequest}
        disabled={!canCreate}>{busy?t.creating:t.create}</button>}
      <button type="button" onClick={copyRequest} className={styles.copy}>{t.copy}</button>
      <a href={MANUAL_PAYMENT_CONTACT_URL} rel="noopener noreferrer" target="_blank"
        className={styles.contact}>{t.open}</a>
    </div>
    {accountId&&<button type="button" className={styles.refresh} onClick={()=>{
      void refresh().catch(()=>setFeedback('failed'))
    }}>{t.refresh}</button>}
    {!accountId&&<p className={styles.feedback}>{t.required}</p>}
    {accountId&&!registry?.enabled&&<p className={styles.feedback}>{t.unavailable}</p>}
    {pending&&<p className={styles.feedback}>{t.existing}</p>}
    {feedback&&<p role="status" className={styles.feedback}>{{
      created:t.created,failed:t.failed,copied:t.copied,copyFailed:t.copyFailed,
    }[feedback]}</p>}
    <details className={styles.preview}><summary>{t.view}</summary>
      <textarea readOnly value={message} rows={7} aria-label={t.view} onFocus={e=>e.currentTarget.select()}/>
    </details>
    <p className={styles.renewal}>{t.renewal}</p>
  </section>
}
