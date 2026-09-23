'use client'

import { ConsultationClientSelector } from './consultation-client-selector'
import { useActionState, useEffect, useState } from 'react'
import { initialConsultationRows, serializeConsultationRows, validateConsultationRows, consultationClinicalFields as clinicalFields } from '@/lib/consultations/editor'
import { consultationRemedySuggestions } from '@/lib/consultations/remedy-search'
import { readUiLocale } from '@/lib/ui-locale'

const copy = {
  ru: {
    client: 'Клиент',
    fullName: 'Имя клиента',
    date: 'Дата',
    remedies: 'Препараты',
    searchRemedy: 'Найти препарат…',
    addRemedy: '+ Добавить препарат',
    removeRemedy: 'Удалить препарат',
    profile: '✓ Полная карточка',
    sources: '○ Есть материалы',
    custom: '＋ Новый',
    sourceCardMissing: 'Карточка ещё не подготовлена',
    descriptionMissing: 'Описание пока отсутствует',
    useCustom: 'Добавить как новый препарат',
    granules: 'Гранул',
    timesPerDay: 'Раз/д.',
    recommendationType: 'Тип назначения',
    homeopathy: 'Гомеопатия',
    bach: 'Эссенции Баха',
    essences: 'Эссенции',
    searchEssence: 'Название эссенции…',
    addEssence: '+ Добавить эссенцию',
    removeEssence: 'Удалить эссенцию',
    payment: 'Оплата',
    paid: 'Оплачено — Квитанция',
    unpaid: 'Не оплачено — Счёт',
    paymentSettings: 'Настройки оплаты',
    amount: 'Сумма',
    currency: 'Валюта',
    service: 'Услуга',
    paymentStatus: 'Статус оплаты',
    paymentMethod: 'Способ оплаты',
    documentNumber: 'Номер документа',
    additional: 'Дополнительные детали',
    general: 'Общие рекомендации',
    followUp: 'Повторная консультация',
    recommendationNumber: 'Номер рекомендации',
    save: 'Сохранить консультацию',
    create: 'СОЗДАТЬ ДОКУМЕНТЫ',
    saving: 'Сохранение…',
    chooseError: 'Выберите каждый препарат или эссенцию из подсказок. Нужна хотя бы одна позиция.',
    clinical: {
      potency: 'Потенция',
      dosage: 'Дозировка',
      frequency: 'Частота',
      duration: 'Длительность',
      purpose: 'Цель',
      sequence: 'Этап / последовательность',
      instructions: 'Инструкция',
    },
  },
  en: {
    client: 'Client',
    fullName: 'Full name',
    date: 'Date',
    remedies: 'Remedies',
    searchRemedy: 'Search remedy…',
    addRemedy: '+ Add remedy',
    removeRemedy: 'Remove remedy',
    profile: '✓ Full profile',
    sources: '○ Sources available',
    custom: '＋ New',
    sourceCardMissing: 'Profile not prepared yet',
    descriptionMissing: 'Description not available yet',
    useCustom: 'Use custom remedy',
    granules: 'Granules',
    timesPerDay: 'Times/day',
    recommendationType: 'Recommendation type',
    homeopathy: 'Homeopathy',
    bach: 'Bach essences',
    essences: 'Essences',
    searchEssence: 'Essence name…',
    addEssence: '+ Add essence',
    removeEssence: 'Remove essence',
    payment: 'Payment',
    paid: 'Paid — Receipt',
    unpaid: 'Not paid — Invoice',
    paymentSettings: 'Payment settings',
    amount: 'Amount',
    currency: 'Currency',
    service: 'Service',
    paymentStatus: 'Payment status',
    paymentMethod: 'Payment method',
    documentNumber: 'Document number',
    additional: 'Additional details',
    general: 'General recommendations',
    followUp: 'Follow-up',
    recommendationNumber: 'Recommendation number',
    save: 'Save consultation',
    create: 'CREATE DOCUMENTS',
    saving: 'Saving…',
    chooseError: 'Choose each remedy or essence from the suggestions. At least one item is required.',
    clinical: Object.fromEntries(clinicalFields),
  },
}

export function ConsultationForm({ action, remedies, consultation, payment, requestId, clients = [], selectedClientId }) {
  const [state, submit, pending] = useActionState(action, {})
  const [items, setItems] = useState(() => initialConsultationRows(consultation, remedies, consultation ? 2 : 1))
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(payment?.paymentStatus ?? 'received')
  const [recommendationType, setRecommendationType] = useState(consultation?.recommendationType === 'bach' ? 'bach' : 'homeopathy')
  const [uiLocale, setUiLocale] = useState('ru')

  useEffect(() => {
    setUiLocale(readUiLocale(document.cookie))
    const onLocale = (event) => setUiLocale(event.detail === 'en' ? 'en' : 'ru')
    window.addEventListener('holistic-house-ui-locale', onLocale)
    return () => window.removeEventListener('holistic-house-ui-locale', onLocale)
  }, [])

  const labels = copy[uiLocale]
  const update = (index, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item))
  const selected = items.filter((item) => item.selected)
  const today = new Date().toLocaleDateString('en-CA')
  const itemLabels = recommendationType === 'bach'
    ? { title: labels.essences, search: labels.searchEssence, add: labels.addEssence, remove: labels.removeEssence }
    : { title: labels.remedies, search: labels.searchRemedy, add: labels.addRemedy, remove: labels.removeRemedy }

  function changeRecommendationType(nextType) {
    setRecommendationType(nextType)
    setItems((current) => current.map((item) => nextType === 'bach'
      ? { ...item, granules: '', timesPerDay: '' }
      : { ...item, granules: item.granules || '5', timesPerDay: item.timesPerDay || '3' }))
    setFocused(null)
  }

  function selectRemedy(index, remedy) {
    const bach = recommendationType === 'bach'
    const status = bach ? 'custom' : remedy.sourceStatus ?? (remedy.slug ? 'canonical' : 'source_only')
    update(index, {
      remedySlug: bach ? null : remedy.slug || null,
      displayNameOverride: bach ? remedy.label : remedy.slug ? null : remedy.displayName ?? remedy.label,
      sourceStatus: status,
      query: remedy.label,
      selected: true,
    })
    setFocused(null)
    setError('')
  }

  function statusLabel(status) {
    if (status === 'canonical') return labels.profile
    if (status === 'source_only') return labels.sources
    return labels.custom
  }

  return <form action={submit} className="prescription-admin-form consultation-form" onSubmit={(event) => {
    if (!validateConsultationRows(items)) {
      event.preventDefault()
      setError(labels.chooseError)
    } else setError('')
  }}>
    <input type="hidden" name="recommendationRevision" value={consultation?.updatedAt ?? ''} />
    <input type="hidden" name="paymentRevision" value={payment?.updatedAt ?? ''} />
    <input type="hidden" name="requestId" value={requestId ?? ''} />
    <input type="hidden" name="itemsJson" value={JSON.stringify(serializeConsultationRows(items))} />

    {!consultation
      ? <ConsultationClientSelector clients={clients} selectedClientId={selectedClientId} uiLocale={uiLocale} />
      : <label>{labels.client}<input name="patientName" placeholder={labels.fullName} required maxLength={200} defaultValue={consultation?.patientName} autoComplete="off" /></label>}

    <div className="consultation-two-columns">
      <label>{labels.date}<input type="date" name="dateIssued" required defaultValue={consultation?.dateIssued ?? today} /></label>
      <label>{labels.recommendationType}<select name="recommendationType" value={recommendationType} onChange={(event) => changeRecommendationType(event.target.value)}><option value="homeopathy">{labels.homeopathy}</option><option value="bach">{labels.bach}</option></select></label>
      {consultation && <label>{uiLocale === 'ru' ? 'Язык клиента' : 'Client language'}<select name="languagePreference" defaultValue={consultation?.languagePreference === 'ru' ? 'ru' : 'en'}><option value="en">English</option><option value="ru">Русский</option></select></label>}
    </div>

    <fieldset className="consultation-remedy-fieldset"><legend>{itemLabels.title}</legend>
      <div className="consultation-remedies">{items.map((item, index) => {
        const matches = focused === index && !item.selected
          ? recommendationType === 'bach'
            ? item.query.trim() ? [{ id: `bach-${index}`, slug: null, label: item.query.trim(), displayName: item.query.trim(), sourceStatus: 'custom' }] : []
            : consultationRemedySuggestions(remedies, item.query)
          : []
        return <div className={`consultation-remedy-row ${recommendationType === 'bach' ? 'consultation-remedy-row--bach' : ''}`} key={item.rowKey}>
          <div className="prescription-remedy-search" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null)
          }}>
            <input
              aria-label={`${itemLabels.title} ${index + 1}`}
              placeholder={itemLabels.search}
              autoComplete="off"
              value={item.query}
              onFocus={() => setFocused(index)}
              onChange={(event) => {
                update(index, { query: event.target.value, remedySlug: null, displayNameOverride: null, sourceStatus: null, selected: false })
                setFocused(index)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setFocused(null)
                if (event.key === 'Enter' && !item.selected) { event.preventDefault(); if (matches.length === 1) selectRemedy(index, matches[0]) }
                if (event.key === 'ArrowDown' && matches.length) {
                  event.preventDefault()
                  event.currentTarget.parentElement.querySelector('button')?.focus()
                }
              }}
            />
            {item.selected && recommendationType !== 'bach' && <span className="consultation-source-badge">{statusLabel(item.sourceStatus)}</span>}
            {matches.length > 0 && <div className="prescription-remedy-results" aria-label={uiLocale === 'ru' ? 'Подсказки препаратов' : 'Remedy suggestions'}>
              {matches.map((remedy) => {
                const status = remedy.sourceStatus ?? (remedy.slug ? 'canonical' : 'source_only')
                return <button
                  key={remedy.id ?? remedy.slug ?? remedy.label}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    selectRemedy(index, remedy)
                  }}
                  onClick={() => selectRemedy(index, remedy)}
                >
                  <span>{recommendationType === 'bach' ? `${uiLocale === 'ru' ? 'Добавить эссенцию' : 'Add essence'}: ${remedy.label}` : status === 'custom' ? `${labels.useCustom}: ${remedy.label}` : remedy.label}</span>
                  {recommendationType !== 'bach' && <small className="consultation-source-status">{statusLabel(status)}</small>}
                  {recommendationType !== 'bach' && status !== 'canonical' && <small>{status === 'source_only' ? labels.sourceCardMissing : labels.descriptionMissing}</small>}
                </button>
              })}
            </div>}
          </div>
          {recommendationType === 'homeopathy' && <><label className="consultation-remedy-dose"><span>{labels.granules}</span><input aria-label={`${labels.granules} ${index + 1}`} type="number" inputMode="numeric" min="1" max="99" value={item.granules ?? ''} onChange={(event) => update(index, { granules: event.target.value })} /></label>
          <label className="consultation-remedy-dose"><span>{labels.timesPerDay}</span><input aria-label={`${labels.timesPerDay} ${index + 1}`} type="number" inputMode="numeric" min="1" max="99" value={item.timesPerDay ?? ''} onChange={(event) => update(index, { timesPerDay: event.target.value })} /></label></>}
          <button type="button" className="consultation-remove" aria-label={`${itemLabels.remove} ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>
        </div>
      })}</div>
      <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, ...initialConsultationRows(null, remedies, 1)])}>{itemLabels.add}</button>
    </fieldset>

    <label>{labels.payment}<select name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">{labels.paid}</option><option value="unpaid">{labels.unpaid}</option></select></label>

    <details className="consultation-details"><summary>{labels.paymentSettings}</summary><div className="consultation-two-columns">
      <label>{labels.amount}<input name="amount" inputMode="decimal" required defaultValue={payment ? (payment.amount / 100).toFixed(2) : '230.00'} /></label>
      <label>{labels.currency}<select name="currency" defaultValue={payment?.currency ?? 'CAD'}>{['CAD', 'USD', 'EUR', 'UAH'].map((code) => <option key={code}>{code}</option>)}</select></label>
      <label>{labels.service}<input name="service" required defaultValue={payment?.service ?? 'Individual consultation'} /></label>
      <label>{labels.paymentStatus}<select aria-label={labels.paymentStatus} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">{labels.paid}</option><option value="unpaid">{labels.unpaid}</option></select></label>
      <label>{labels.paymentMethod}<input name="paymentMethod" maxLength={120} defaultValue={payment?.paymentMethod} /></label>
      <label>{labels.documentNumber}<input name="documentNumber" defaultValue={payment?.documentNumber} /></label>
    </div></details>

    <details className="consultation-details"><summary>{labels.additional}</summary><div>
      {selected.map((item) => {
        const index = items.indexOf(item)
        return <fieldset key={item.rowKey}><legend>{item.query}</legend><div className="consultation-two-columns">
          {clinicalFields.map(([key, fallbackLabel]) => <label key={key}>{labels.clinical[key] ?? fallbackLabel}<input value={item[key] ?? ''} onChange={(event) => update(index, { [key]: event.target.value })} /></label>)}
        </div></fieldset>
      })}
      <label>{labels.general}<textarea name="generalInstructions" defaultValue={consultation?.generalInstructions} rows={2} /></label>
      <label>{labels.followUp}<textarea name="followUp" defaultValue={consultation?.followUp} rows={2} /></label>
      <label>{labels.recommendationNumber}<input name="recommendationNumber" defaultValue={consultation?.recommendationNumber} /></label>
    </div></details>

    {(error || state.error) && <p className="prescription-form-error" role="alert">{error || state.error}</p>}
    <button className="prescription-save consultation-primary-action" type="submit" disabled={pending}>{pending ? labels.saving : consultation ? labels.save : labels.create}</button>
  </form>
}