'use client'

import { useState } from 'react'
import { buildManualPaymentRequest, MANUAL_PAYMENT_CONTACT_URL, MANUAL_PAYMENT_METHODS } from '@/lib/billing/manual-payment-request'
import styles from './manual-billing-request.module.css'

const COPY = {
  en: {
    title: 'Other ways to pay', subtitle: 'As on Ezohata: choose the currency and request payment instructions directly.',
    method: 'Preferred payment method', copy: 'Copy payment request', copied: 'Request copied',
    copyFailed: 'Could not copy automatically. Select the text below and copy it manually.',
    open: 'Open Telegram to request an invoice', view: 'View / copy request text',
    important: 'This is an inquiry only. No money is taken here and no access is activated. Method, payee, conversion, taxes and final total are confirmed before payment.',
    renewal: 'These channels are manual payments for one month, not automatic subscriptions. A new confirmed payment is needed to renew.',
  },
  ru: {
    title: 'Другие способы оплаты', subtitle: 'Как на EzoHata: выберите валюту и запросите инструкции для оплаты напрямую.',
    method: 'Предпочтительный способ оплаты', copy: 'Скопировать заявку', copied: 'Заявка скопирована',
    copyFailed: 'Не удалось скопировать автоматически. Выделите текст ниже и скопируйте вручную.',
    open: 'Открыть Telegram для запроса счёта', view: 'Показать / скопировать текст заявки',
    important: 'Это только запрос. Здесь деньги не списываются и доступ не открывается. Доступность способа, получатель, курс валют, налоги и итоговая сумма подтверждаются до перевода.',
    renewal: 'Это ручная оплата одного месяца, а не автоматическая подписка. Для продления потребуется следующая подтверждённая оплата.',
  },
}

export default function ManualBillingRequest({ planId, locale = 'en' }) {
  const [methodId, setMethodId] = useState('paypal-eur')
  const [feedback, setFeedback] = useState('')
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[lang]
  const request = buildManualPaymentRequest({ planId, methodId, locale: lang })
  if (!request) return null

  async function copyRequest() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE')
      await navigator.clipboard.writeText(request)
      setFeedback('copied')
    } catch {
      setFeedback('failed')
    }
  }

  return <section className={styles.panel} aria-label={t.title} data-manual-billing-request={planId}>
    <h4>{t.title}</h4>
    <p className={styles.intro}>{t.subtitle}</p>
    <fieldset className={styles.methods}>
      <legend>{t.method}</legend>
      <div className={styles.grid}>{MANUAL_PAYMENT_METHODS.map(method => <label key={method.id} className={styles.option}
        data-selected={method.id === methodId}>
        <input type="radio" name={'manual-payment-method-' + planId} value={method.id} checked={methodId === method.id}
          onChange={() => { setMethodId(method.id); setFeedback('') }}/>
        <span><strong>{method[lang]}</strong><small>{method[lang + 'Hint']}</small></span>
      </label>)}</div>
    </fieldset>
    <p className={styles.important}>{t.important}</p>
    <div className={styles.actions}>
      <button type="button" onClick={copyRequest} className={styles.copy}>{t.copy}</button>
      <a href={MANUAL_PAYMENT_CONTACT_URL} rel="noopener noreferrer" target="_blank" className={styles.contact}>{t.open}</a>
    </div>
    {feedback && <p className={styles.feedback} role="status">{feedback === 'copied' ? t.copied : t.copyFailed}</p>}
    <details className={styles.preview}><summary>{t.view}</summary><textarea readOnly value={request} rows={6}
      aria-label={t.view} onFocus={event => event.currentTarget.select()}/></details>
    <p className={styles.renewal}>{t.renewal}</p>
  </section>
}
