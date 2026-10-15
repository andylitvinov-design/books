'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from './manual-billing-review.module.css'

const text={
  en:{title:'Manual membership payments',intro:'Review customer requests without viewing assessments or clinical information. Only confirm a payment after independently verifying the merchant statement.',
    loading:'Checking the private payment queue…',none:'No requests.',reviewDisabled:'Owner review is not enabled yet. No money can be confirmed.',
    payeeDisabled:'Payee verification has not been approved. Do not send payment instructions or accept transfers.',
    accessDisabled:'Paid access has not been approved. Verification is blocked until billing, multi-course and session-delivery checks pass.',
    amount:'Invoice amount in the selected currency (enter cents, not euros/dollars)',first:'Eligible first-month Advanced discount (only after checking history)',
    fx:'I independently checked conversion and final quote',receipt:'Exact transaction reference from merchant statement (not a customer screenshot)',
    quote:'Confirm invoice amount',verify:'I checked the received payment — activate',reject:'Reject request',refund:'Record refund and withdraw coverage',
    reference:'Reference',owner:'Google account ID',status:'Status',method:'Method',plan:'Membership',
    refresh:'Refresh requests',success:'Updated after server confirmation.',failed:'Action rejected; no access changed.',
    confirm:'Confirm this exact reviewer action?',noAccess:'Additional provider/merchant configuration is required.',
  },
  ru:{title:'Ручные платежи подписок',intro:'Заявки клиентов без медицинских данных. Подтверждайте оплату только после независимой проверки поступления по выписке получателя.',
    loading:'Проверяем защищённую очередь платежей…',none:'Заявок нет.',reviewDisabled:'Доступ мастера к подтверждению пока не активирован. Оплаты не подтверждаются.',
    payeeDisabled:'Получатель платежа не подтверждён. Пока нельзя выдавать реквизиты или принимать переводы.',
    accessDisabled:'Выдача платного доступа не одобрена. Подтверждение блокируется до проверки подписок, курсов и оказания услуг.',
    amount:'Сумма счёта в выбранной валюте — в копейках/центах',first:'Скидка первого месяца Advanced (проверьте историю)',
    fx:'Я независимо проверил(а) валютный курс и итоговую сумму',receipt:'Уникальный номер операции из выписки получателя (не скриншот клиента)',
    quote:'Подтвердить сумму счёта',verify:'Деньги проверены в выписке — активировать',reject:'Отклонить заявку',refund:'Оформить возврат и отозвать доступ',
    reference:'Номер',owner:'ID Google-аккаунта',status:'Статус',method:'Способ',plan:'Подписка',
    refresh:'Обновить список',success:'Изменения подтверждены сервером.',failed:'Операция отклонена. Доступ не изменён.',
    confirm:'Подтвердить это действие мастера?',noAccess:'Нужны одобрение получателя и настройки платёжной системы.',
  },
}

function Item({order,locale,refresh,accessApproved,payeeApproved}) {
  const t=text[locale]
  const [amount,setAmount]=useState(String(order.invoiceAmountMinor??(order.planId==='premium'?10000:order.firstMonthCandidate?1000:2000)))
  const [receipt,setReceipt]=useState('')
  const [promo,setPromo]=useState(order.planId==='advanced'&&order.firstMonthCandidate)
  const [fx,setFx]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const canChange=payeeApproved&&!busy
  async function act(action){
    if(busy||!window.confirm(t.confirm))return
    setBusy(true);setNotice('')
    try{
      const payload={orderId:order.id,expectedRevision:order.revision,action,confirmed:true,
        ...(action==='quote'?{amountMinor:Number(amount),firstMonthDiscount:promo,fxReviewed:fx}:{}),
        ...(action==='verify'?{amountMinor:Number(order.invoiceAmountMinor),receiptReference:receipt.trim(),
          receiptSource:order.methodId.startsWith('paypal')?'paypal_transaction':'bank_statement'}:{})}
      const res=await fetch('/admin/api/manual-billing',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const data=await res.json()
      if(!res.ok||!data.order)throw new Error(data.error||'REJECTED')
      setNotice(t.success)
      await refresh()
    }catch(error){setNotice(t.failed+' '+(error.message||''))}
    finally{setBusy(false)}
  }
  return <article className={styles.order} data-manual-review-order>
    <div className={styles.identity}>
      <strong>{order.planId==='premium'?'Premium €100':'Advanced €20'} · {order.methodId}</strong>
      <small>{t.reference}: <code>{order.id}</code></small>
      <small>{t.owner}: <code>{order.ownerId}</code></small>
      <small>{t.status}: <b>{order.status}</b> · {order.createdAt?.slice(0,10)}</small>
    </div>
    {order.status==='requested'&&<div className={styles.controls}>
      <label>{t.amount}<input type="number" min="100" step="1" value={amount}
        onChange={event=>setAmount(event.target.value)}/></label>
      {order.firstMonthCandidate&&<label className={styles.check}><input type="checkbox"
        checked={promo} onChange={event=>setPromo(event.target.checked)}/>{t.first}</label>}
      {order.currency!=='EUR'&&<label className={styles.check}><input type="checkbox"
        checked={fx} onChange={event=>setFx(event.target.checked)}/>{t.fx}</label>}
      <button type="button" disabled={!canChange} onClick={()=>act('quote')}>{t.quote}</button>
      <button type="button" disabled={!canChange} onClick={()=>act('reject')}>{t.reject}</button>
    </div>}
    {order.status==='quoted'&&<div className={styles.controls}>
      <p>{order.invoiceCurrency} {(order.invoiceAmountMinor/100).toFixed(2)} · {order.firstMonthDiscountApplied?'−50%':''}</p>
      <label>{t.receipt}<input value={receipt} autoComplete="off" minLength={6}
        onChange={event=>setReceipt(event.target.value)} placeholder="Provider / statement transaction ID"/></label>
      <button type="button" disabled={!canChange||!accessApproved||receipt.trim().length<6}
        onClick={()=>act('verify')}>{t.verify}</button>
      <button type="button" disabled={!canChange} onClick={()=>act('reject')}>{t.reject}</button>
    </div>}
    {order.status==='paid'&&<div className={styles.controls}>
      <p>Paid through: {order.paidThrough?.slice(0,10)||'—'}</p>
      <button type="button" disabled={!canChange} onClick={()=>act('refund')}>{t.refund}</button>
    </div>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
  </article>
}

export function ManualBillingReview() {
  const [locale,setLocale]=useState('ru'),t=text[locale]
  const [status,setStatus]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const refresh=useCallback(async()=>{
    const res=await fetch('/admin/api/manual-billing',{credentials:'same-origin',cache:'no-store'})
    const data=await res.json()
    if(!res.ok||!Array.isArray(data.orders))throw new Error(data.error||'UNAVAILABLE')
    setStatus(data);setError('')
  },[])
  useEffect(()=>{let active=true;void refresh().catch(error=>{if(active)setError(error.message)})
    .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[refresh])
  return <section className={styles.review}>
    <div className={styles.header}><h1>{t.title}</h1>
      <button type="button" onClick={()=>setLocale(locale==='ru'?'en':'ru')}>{locale==='ru'?'English':'Русский'}</button></div>
    <p>{t.intro}</p>
    {!status?.payeeApproved&&<p className={styles.warning}>{t.payeeDisabled}</p>}
    {!status?.accessApproved&&<p className={styles.warning}>{t.accessDisabled}</p>}
    <button type="button" className={styles.refresh} onClick={()=>void refresh().catch(error=>setError(error.message))}>{t.refresh}</button>
    {loading&&<p role="status">{t.loading}</p>}
    {error&&<p role="alert">{t.reviewDisabled} ({error})</p>}
    {status?.orders?.length===0&&<p>{t.none}</p>}
    {status?.orders?.map(order=><Item key={order.id+':'+order.revision} order={order} locale={locale}
      refresh={refresh} payeeApproved={status.payeeApproved} accessApproved={status.accessApproved}/>)}
  </section>
}
