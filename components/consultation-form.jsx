'use client'

import { ConsultationClientSelector } from './consultation-client-selector'
import { ConsultationTextImport } from './consultation-text-import'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { initialConsultationRows, serializeConsultationRows, validateConsultationRows } from '@/lib/consultations/editor'
import { consultationRemedySuggestions } from '@/lib/consultations/remedy-search'
import { readUiLocale } from '@/lib/ui-locale'

const copy = {
  ru: {
    client: 'Клиент',
    fullName: 'Имя клиента',
    date: 'Дата',
    items: 'Назначения',
    searchRemedy: 'Найти препарат…',
    searchEssence: 'Название эссенции…',
    addRemedy: '+ Препарат',
    addEssence: '+ Эссенция Баха',
    removeItem: 'Удалить позицию',
    profile: '✓ Полная карточка',
    sources: '○ Есть материалы',
    custom: '＋ Новый',
    sourceCardMissing: 'Карточка ещё не подготовлена',
    descriptionMissing: 'Описание пока отсутствует',
    useCustom: 'Добавить как новый препарат',
    potency: 'Потенция',
    granules: 'Гранул',
    timesPerDay: 'Раз/д.',
    itemType: 'Тип',
    homeopathyShort: 'Гомео',
    bachShort: 'Бах',
    reportAuto: 'Отчёт',
    reportHomeopathy: 'Гомеопатия',
    reportBach: 'Бах',
    reportMixed: 'Гомеопатия + Бах',
    note: 'Примечание',
    notePlaceholder: 'Свободное примечание для клиента…',
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
    save: 'Сохранить',
    create: 'СОЗДАТЬ ДОКУМЕНТЫ',
    saving: 'Сохранение…',
    chooseError: 'Выберите каждую позицию из подсказок. Нужна хотя бы одна позиция.',
  },
  en: {
    client: 'Client',
    fullName: 'Client name',
    date: 'Date',
    items: 'Recommendations',
    searchRemedy: 'Search remedy…',
    searchEssence: 'Essence name…',
    addRemedy: '+ Remedy',
    addEssence: '+ Bach essence',
    removeItem: 'Remove item',
    profile: '✓ Full profile',
    sources: '○ Sources available',
    custom: '＋ New',
    sourceCardMissing: 'Profile not prepared yet',
    descriptionMissing: 'Description not available yet',
    useCustom: 'Use custom remedy',
    potency: 'Potency',
    granules: 'Granules',
    timesPerDay: 'Times/day',
    itemType: 'Type',
    homeopathyShort: 'Homeo',
    bachShort: 'Bach',
    reportAuto: 'Report',
    reportHomeopathy: 'Homeopathy',
    reportBach: 'Bach',
    reportMixed: 'Homeopathy + Bach',
    note: 'Note',
    notePlaceholder: 'Free note for the client…',
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
    save: 'Save',
    create: 'CREATE DOCUMENTS',
    saving: 'Saving…',
    chooseError: 'Choose each item from the suggestions. At least one item is required.',
  },
}

function detectedType(items) {
  const types = new Set(items.filter((item) => item.selected).map((item) => item.itemType === 'bach' ? 'bach' : 'homeopathy'))
  if (types.has('homeopathy') && types.has('bach')) return 'mixed'
  if (types.has('bach')) return 'bach'
  return 'homeopathy'
}

export function ConsultationForm({ action, remedies, consultation, payment, requestId, clients = [], selectedClientId }) {
  const [state, submit, pending] = useActionState(action, {})
  const [items, setItems] = useState(() => initialConsultationRows(consultation, remedies, consultation ? 1 : 1))
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(payment?.paymentStatus ?? 'received')
  const [dateIssued, setDateIssued] = useState(consultation?.dateIssued ?? new Date().toLocaleDateString('en-CA'))
  const [note, setNote] = useState(consultation?.generalInstructions ?? '')
  const [uiLocale, setUiLocale] = useState('ru')

  useEffect(() => {
    setUiLocale(readUiLocale(document.cookie))
    const onLocale = (event) => setUiLocale(event.detail === 'en' ? 'en' : 'ru')
    window.addEventListener('holistic-house-ui-locale', onLocale)
    return () => window.removeEventListener('holistic-house-ui-locale', onLocale)
  }, [])

  const labels = copy[uiLocale]
  const reportType = useMemo(() => detectedType(items), [items])
  const reportLabel = reportType === 'mixed' ? labels.reportMixed : reportType === 'bach' ? labels.reportBach : labels.reportHomeopathy

  const update = (index, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item))

  function makeRow(type = 'homeopathy') {
    const [row] = initialConsultationRows(null, remedies, 1)
    return type === 'bach'
      ? { ...row, itemType: 'bach', potency: '', granules: '', timesPerDay: '' }
      : { ...row, itemType: 'homeopathy', potency: '30', granules: '5', timesPerDay: '3' }
  }

  function changeItemType(index, nextType) {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item
      if (nextType === 'bach') {
        return {
          ...item,
          itemType: 'bach',
          remedySlug: null,
          displayNameOverride: item.selected ? item.query : null,
          sourceStatus: item.selected ? 'custom' : null,
          potency: '',
          granules: '',
          timesPerDay: '',
        }
      }
      const wasBach = item.itemType === 'bach'
      return {
        ...item,
        itemType: 'homeopathy',
        remedySlug: wasBach ? null : item.remedySlug,
        displayNameOverride: wasBach ? null : item.displayNameOverride,
        sourceStatus: wasBach ? null : item.sourceStatus,
        selected: wasBach ? false : item.selected,
        potency: item.potency || '30',
        granules: item.granules || '5',
        timesPerDay: item.timesPerDay || '3',
      }
    }))
    setFocused(null)
  }

  function selectItem(index, candidate) {
    const item = items[index]
    const type = item.itemType === 'bach' ? 'bach' : 'homeopathy'
    const bach = type === 'bach'
    const status = bach ? 'custom' : candidate.sourceStatus ?? (candidate.slug ? 'canonical' : 'source_only')
    update(index, {
      itemType: type,
      remedySlug: bach ? null : candidate.slug || null,
      displayNameOverride: bach ? candidate.label : candidate.slug ? null : candidate.displayName ?? candidate.label,
      sourceStatus: status,
      query: candidate.label,
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

  function applyParsed(parsed) {
    const parsedRows = parsed.items.map((item) => ({
      ...makeRow(item.itemType),
      ...item,
      rowKey: crypto.randomUUID(),
      selected: true,
      itemType: item.itemType === 'bach' ? 'bach' : 'homeopathy',
      sourceStatus: item.itemType === 'bach' ? 'custom' : item.remedySlug ? 'canonical' : item.sourceStatus ?? 'custom',
    }))
    setItems((current) => {
      const retained = current.filter((item) => item.selected)
      return parsedRows.length ? [...retained, ...parsedRows] : current
    })
    if (parsed.dateIssued) setDateIssued(parsed.dateIssued)
    if (parsed.generalInstructions) setNote((current) => [current, parsed.generalInstructions].filter(Boolean).join('\n'))
  }

  return <form action={submit} className="prescription-admin-form consultation-form consultation-form--compact" onSubmit={(event) => {
    if (!validateConsultationRows(items)) {
      event.preventDefault()
      setError(labels.chooseError)
    } else {
      setError('')
    }
  }}>
    <input type="hidden" name="recommendationRevision" value={consultation?.updatedAt ?? ''} />
    <input type="hidden" name="paymentRevision" value={payment?.updatedAt ?? ''} />
    <input type="hidden" name="requestId" value={requestId ?? ''} />
    <input type="hidden" name="itemsJson" value={JSON.stringify(serializeConsultationRows(items))} />
    <input type="hidden" name="followUp" value={consultation?.followUp ?? ''} />
    <input type="hidden" name="recommendationNumber" value={consultation?.recommendationNumber ?? ''} />

    {!consultation
      ? <ConsultationClientSelector clients={clients} selectedClientId={selectedClientId} uiLocale={uiLocale} />
      : <div className="consultation-edit-client-row">
          <label>{labels.client}<input name="patientName" value={consultation.patientName} readOnly /></label>
          <label>{uiLocale === 'ru' ? 'Язык' : 'Language'}<select name="languagePreference" defaultValue={consultation?.languagePreference === 'ru' ? 'ru' : 'en'}><option value="en">EN</option><option value="ru">RU</option></select></label>
        </div>}

    <div className="consultation-quick-meta consultation-quick-meta--date-only">
      <label>{labels.date}<input type="date" name="dateIssued" required value={dateIssued} onChange={(event) => setDateIssued(event.target.value)} /></label>
    </div>

    <ConsultationTextImport remedies={remedies} onApply={applyParsed} uiLocale={uiLocale} />

    <fieldset className="consultation-remedy-fieldset consultation-remedy-fieldset--compact"><legend>{labels.items}<span className="consultation-report-badge">{labels.reportAuto}: {reportLabel}</span></legend>
      <div className="consultation-remedies">{items.map((item, index) => {
        const type = item.itemType === 'bach' ? 'bach' : 'homeopathy'
        const matches = focused === index && !item.selected
          ? type === 'bach'
            ? item.query.trim() ? [{ id: 'bach-' + index, slug: null, label: item.query.trim(), displayName: item.query.trim(), sourceStatus: 'custom' }] : []
            : consultationRemedySuggestions(remedies, item.query)
          : []
        return <div className={'consultation-remedy-row consultation-remedy-row--stacked ' + (type === 'bach' ? 'consultation-remedy-row--bach' : '')} key={item.rowKey}>
          <label className="consultation-item-type"><span>{labels.itemType}</span><select value={type} onChange={(event) => changeItemType(index, event.target.value)}>
            <option value="homeopathy">{labels.homeopathyShort}</option>
            <option value="bach">{labels.bachShort}</option>
          </select></label>

          <div className="prescription-remedy-search" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null)
          }}>
            <input
              aria-label={(type === 'bach' ? labels.bachShort : labels.homeopathyShort) + ' ' + (index + 1)}
              placeholder={type === 'bach' ? labels.searchEssence : labels.searchRemedy}
              autoComplete="off"
              value={item.query}
              onFocus={() => setFocused(index)}
              onChange={(event) => {
                update(index, { query: event.target.value, remedySlug: null, displayNameOverride: null, sourceStatus: null, selected: false })
                setFocused(index)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setFocused(null)
                if (event.key === 'Enter' && !item.selected) {
                  event.preventDefault()
                  if (matches.length === 1) selectItem(index, matches[0])
                }
                if (event.key === 'ArrowDown' && matches.length) {
                  event.preventDefault()
                  event.currentTarget.parentElement.querySelector('button')?.focus()
                }
              }}
            />
            {item.selected && type !== 'bach' && <span className="consultation-source-badge">{statusLabel(item.sourceStatus)}</span>}
            {matches.length > 0 && <div className="prescription-remedy-results" aria-label={type === 'bach' ? labels.bachShort : labels.homeopathyShort}>
              {matches.map((candidate) => {
                const status = candidate.sourceStatus ?? (candidate.slug ? 'canonical' : 'source_only')
                return <button
                  key={candidate.id ?? candidate.slug ?? candidate.label}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    selectItem(index, candidate)
                  }}
                  onClick={() => selectItem(index, candidate)}
                >
                  <span>{type === 'bach' ? (uiLocale === 'ru' ? 'Добавить эссенцию: ' : 'Add essence: ') + candidate.label : status === 'custom' ? labels.useCustom + ': ' + candidate.label : candidate.label}</span>
                  {type !== 'bach' && <small className="consultation-source-status">{statusLabel(status)}</small>}
                  {type !== 'bach' && status !== 'canonical' && <small>{status === 'source_only' ? labels.sourceCardMissing : labels.descriptionMissing}</small>}
                </button>
              })}
            </div>}
          </div>

          {type === 'homeopathy' && <div className="consultation-dose-strip">
            <label className="consultation-remedy-dose"><span>{labels.potency}</span><input aria-label={labels.potency + ' ' + (index + 1)} inputMode="text" maxLength={20} value={item.potency ?? ''} onChange={(event) => update(index, { potency: event.target.value })} /></label>
            <label className="consultation-remedy-dose"><span>{labels.granules}</span><input aria-label={labels.granules + ' ' + (index + 1)} type="number" inputMode="numeric" min="1" max="99" value={item.granules ?? ''} onChange={(event) => update(index, { granules: event.target.value })} /></label>
            <label className="consultation-remedy-dose"><span>{labels.timesPerDay}</span><input aria-label={labels.timesPerDay + ' ' + (index + 1)} type="number" inputMode="numeric" min="1" max="99" value={item.timesPerDay ?? ''} onChange={(event) => update(index, { timesPerDay: event.target.value })} /></label>
          </div>}

          <button type="button" className="consultation-remove" aria-label={labels.removeItem + ' ' + (index + 1)} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>
        </div>
      })}</div>

      <div className="consultation-add-actions">
        <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, makeRow('homeopathy')])}>{labels.addRemedy}</button>
        <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, makeRow('bach')])}>{labels.addEssence}</button>
      </div>
    </fieldset>

    <label className="consultation-note">{labels.note}<textarea name="generalInstructions" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={labels.notePlaceholder} /></label>

    <div className="consultation-payment-row">
      <label>{labels.payment}<select name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">{labels.paid}</option><option value="unpaid">{labels.unpaid}</option></select></label>
      <details className="consultation-details consultation-payment-settings"><summary>{labels.paymentSettings}</summary><div className="consultation-two-columns">
        <label>{labels.amount}<input name="amount" inputMode="decimal" required defaultValue={payment ? (payment.amount / 100).toFixed(2) : '230.00'} /></label>
        <label>{labels.currency}<select name="currency" defaultValue={payment?.currency ?? 'CAD'}>{['CAD', 'USD', 'EUR', 'UAH'].map((code) => <option key={code}>{code}</option>)}</select></label>
        <label>{labels.service}<input name="service" required defaultValue={payment?.service ?? 'Individual consultation'} /></label>
        <label>{labels.paymentStatus}<select aria-label={labels.paymentStatus} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">{labels.paid}</option><option value="unpaid">{labels.unpaid}</option></select></label>
        <label>{labels.paymentMethod}<input name="paymentMethod" maxLength={120} defaultValue={payment?.paymentMethod} /></label>
        <label>{labels.documentNumber}<input name="documentNumber" defaultValue={payment?.documentNumber} /></label>
      </div></details>
    </div>

    {(error || state.error) && <p className="prescription-form-error" role="alert">{error || state.error}</p>}
    <button className="prescription-save consultation-primary-action" type="submit" disabled={pending}>{pending ? labels.saving : consultation ? labels.save : labels.create}</button>
  </form>
}
