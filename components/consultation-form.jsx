'use client'

import { ConsultationClientSelector } from './consultation-client-selector'
import './consultation-studio.css'
import './consultation-report.css'
import { ClipboardList, FileCheck2, UsersRound } from 'lucide-react'
import { ConsultationTextImport } from './consultation-text-import'
import { ConsultationDraftPreview } from './consultation-draft-preview'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { consultationClinicalFields, initialConsultationRows, serializeConsultationRows, validateConsultationRows } from '@/lib/consultations/editor'
import { consultationRemedySuggestions } from '@/lib/consultations/remedy-search'
import { getOwnerReportTextTemplate } from '@/lib/consultations/owner-report-template'
import { reportFollowUpCopy } from '@/lib/documents/recommendation'
import { ReportLanguagePicker } from './report-language-picker'
import { ConsultationRecommendedTests } from './consultation-recommended-tests'
import { DaoResourceStageField } from './dao-resource-stage'
import { parseDaoResourceScore } from '@/lib/consultations/dao-resource-stage'
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
    note: 'Общие инструкции (дополнительно)',
    notePlaceholder: 'Общие указания для клиента…',
    analysis: 'Анализ',
    analysisHint: 'Замеры состояния, динамика симптомов и наблюдения',
    analysisPlaceholder: 'Например: дата наблюдения, показатели и изменения состояния…',
    clientNotes: 'Примечания',
    clientNotesHint: 'Ваши дополнительные советы и пояснения клиенту',
    clientNotesPlaceholder: 'Что важно делать, наблюдать или обсудить на следующей консультации…',
    followUpDate: 'Дата повторной сессии',
    followUpDateHint: 'Необязательно. Дата и пояснение появятся в отчёте клиента.',
    reportTextLanguageNotice: 'Язык отчёта:',
    reportTextManualNote: 'Ваш авторский текст не переводится автоматически. Проверьте его перед отправкой клиенту.',
    reloadTemplate: 'Подставить шаблон на',
    templateReplaceConfirm: 'Заменить ваш текст анализа и примечаний шаблоном на выбранном языке?',
    payment: 'Оплата',
    prescriptionChoice: 'Рецепт',
    prescriptionChoiceHint: 'Назначения и рекомендации клиенту',
    invoiceChoice: 'Инвойс',
    invoiceChoiceHint: 'Счёт или квитанция об оплате',
    invoiceDetails: 'Данные для инвойса',
    prescriptionOnlyHint: 'Будет сохранён только рецепт. Инвойс не создаётся.',
    invoiceOnlyHint: 'Будет сохранён только счёт. Рецепт не создаётся.',
    receiptOnlyHint: 'Будет сохранена только квитанция. Рецепт не создаётся.',
    noDocumentError: 'Отметьте хотя бы один документ: рецепт или инвойс.',
    existingPaymentHint: 'Ранее созданный счёт остаётся в истории. Чтобы отозвать его, используйте действия документа.',
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
    workflow: 'Порядок оформления консультации',
    clientHeading: 'Клиент и дата',
    clientHint: 'Выберите клиента из базы или создайте новую карточку.',
    recommendationsHeading: 'Рекомендации',
    recommendationsHint: 'Добавьте препараты или эссенции для документа.',
    documentsHeading: 'Документы и оплата',
    documentsHint: 'Выберите, какие документы оформить. Инвойс не обязателен.',
    createHeading: 'Всё готово к оформлению?',
    saveHeading: 'Сохранить изменения',
    invoiceHint: 'Будут подготовлены рекомендация и счёт. Ссылки клиенту передаются отдельно.',
    receiptHint: 'Будут подготовлены рекомендация и квитанция. Ссылки клиенту передаются отдельно.',
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
    note: 'General instructions (optional)',
    notePlaceholder: 'General client instructions…',
    analysis: 'Analysis',
    analysisHint: 'State measurements, symptom changes and observations',
    analysisPlaceholder: 'For example: observation date, measured scores and changes…',
    clientNotes: 'Notes',
    clientNotesHint: 'Additional guidance and practical next steps for the client',
    clientNotesPlaceholder: 'Things to do, observe or discuss at follow-up…',
    followUpDate: 'Follow-up session date',
    followUpDateHint: 'Optional. The date and message will appear in the client report.',
    reportTextLanguageNotice: 'Report language:',
    reportTextManualNote: 'Your own text is not translated automatically. Review it before sharing with the client.',
    reloadTemplate: 'Load template in',
    templateReplaceConfirm: 'Replace your analysis and notes with the selected-language template?',
    payment: 'Payment',
    prescriptionChoice: 'Prescription',
    prescriptionChoiceHint: 'Remedies and client recommendations',
    invoiceChoice: 'Invoice',
    invoiceChoiceHint: 'An invoice or paid receipt',
    invoiceDetails: 'Invoice details',
    prescriptionOnlyHint: 'Only the prescription will be saved. No invoice is created.',
    invoiceOnlyHint: 'Only the invoice will be saved. No prescription is created.',
    receiptOnlyHint: 'Only the receipt will be saved. No prescription is created.',
    noDocumentError: 'Select at least one document: prescription or invoice.',
    existingPaymentHint: 'The existing payment document stays in the client history. Revoke it from document actions if needed.',
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
    workflow: 'Consultation preparation steps',
    clientHeading: 'Client & date',
    clientHint: 'Choose an existing client or create a new profile.',
    recommendationsHeading: 'Recommendations',
    recommendationsHint: 'Add remedies or essences to the document.',
    documentsHeading: 'Documents & payment',
    documentsHint: 'Choose which documents to create. An invoice is optional.',
    createHeading: 'Ready to prepare documents?',
    saveHeading: 'Save your changes',
    invoiceHint: 'A recommendation and invoice will be prepared. Client links are shared separately.',
    receiptHint: 'A recommendation and receipt will be prepared. Client links are shared separately.',
  },
}

const clinicalLabelsRu = {
  dosage: 'Дозировка', frequency: 'Частота', duration: 'Продолжительность',
  purpose: 'Цель', sequence: 'Этап / последовательность', instructions: 'Инструкции',
  notes: 'Примечание к препарату',
}

function detectedType(items) {
  const types = new Set(items.filter((item) => item.selected).map((item) => item.itemType === 'bach' ? 'bach' : 'homeopathy'))
  if (types.has('homeopathy') && types.has('bach')) return 'mixed'
  if (types.has('bach')) return 'bach'
  return 'homeopathy'
}

export function ConsultationForm({ action, remedies, consultation, payment, requestId, clients = [], selectedClientId, recommendedTestOptions = { en: [], ru: [] } }) {
  const selectedClientLocale = clients.find((client) => client.id === selectedClientId)?.preferredLocale
  const initialReportLocale = consultation?.languagePreference === 'ru' || consultation?.languagePreference === 'en'
    ? consultation.languagePreference
    : selectedClientLocale === 'ru' ? 'ru' : 'en'
  const [reportLocale, setReportLocale] = useState(initialReportLocale)
  const [state, submit, pending] = useActionState(action, {})
  const [items, setItems] = useState(() => initialConsultationRows(consultation, remedies, consultation ? 1 : 1))
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(payment?.paymentStatus ?? 'unpaid')
  const [includeRecommendation, setIncludeRecommendation] = useState(true)
  const [includeInvoice, setIncludeInvoice] = useState(Boolean(payment))
  const [includeDistanceHomeopathy, setIncludeDistanceHomeopathy] = useState(consultation?.includeDistanceHomeopathy === true)
  const [dateIssued, setDateIssued] = useState(consultation?.dateIssued ?? new Date().toLocaleDateString('en-CA'))
  const [note, setNote] = useState(consultation?.generalInstructions ?? '')
  const [analysis, setAnalysis] = useState(() => consultation?.analysis ?? getOwnerReportTextTemplate(initialReportLocale).analysis)
  const [templateReviewed, setTemplateReviewed] = useState(Boolean(consultation))
  const [additionalNotes, setAdditionalNotes] = useState(() => consultation?.additionalNotes ?? getOwnerReportTextTemplate(initialReportLocale).additionalNotes)
  const [recommendedTestKeys, setRecommendedTestKeys] = useState(() => consultation?.recommendedTestKeys ?? [])
  const [daoResourceScore, setDaoResourceScore] = useState(() => consultation?.daoResourceScore == null ? '' : String(consultation.daoResourceScore))
  const [daoResourcePublished, setDaoResourcePublished] = useState(() => consultation?.daoResourcePublished !== false)
  const [uiLocale, setUiLocale] = useState('en')

  useEffect(() => {
    setUiLocale(readUiLocale(document.cookie))
    const onLocale = (event) => setUiLocale(event.detail === 'en' ? 'en' : 'ru')
    window.addEventListener('holistic-house-ui-locale', onLocale)
    return () => window.removeEventListener('holistic-house-ui-locale', onLocale)
  }, [])

  const labels = copy[uiLocale]
  const reportType = useMemo(() => detectedType(items), [items])
  const reportLabel = reportType === 'mixed' ? labels.reportMixed : reportType === 'bach' ? labels.reportBach : labels.reportHomeopathy
  const daoScoreInvalid = (() => { try { parseDaoResourceScore(daoResourceScore); return false } catch { return true } })()

  function changeReportLocale(nextLocale) {
    const next = nextLocale === 'ru' ? 'ru' : 'en'
    if (next === reportLocale) return
    if (consultation && next !== consultation.languagePreference && !window.confirm(uiLocale === 'ru'
      ? 'Изменить язык сохранённого отчёта? Заголовки и приложения переключатся, но ваш текст не будет переведён.'
      : 'Change the saved report language? Headings and appendices will switch, but your text will not be translated.')) return
    if (!consultation) {
      const previousTemplate = getOwnerReportTextTemplate(reportLocale)
      const nextTemplate = getOwnerReportTextTemplate(next)
      // Only replace untouched examples; never silently destroy practitioner notes.
      setAnalysis((current) => !current.trim() || current === previousTemplate.analysis ? nextTemplate.analysis : current)
      setAdditionalNotes((current) => !current.trim() || current === previousTemplate.additionalNotes ? nextTemplate.additionalNotes : current)
      setTemplateReviewed(false)
    }
    setReportLocale(next)
  }

  function restoreReportTemplate() {
    if (consultation) return
    const template = getOwnerReportTextTemplate(reportLocale)
    if ((analysis !== template.analysis || additionalNotes !== template.additionalNotes) &&
        !window.confirm(labels.templateReplaceConfirm)) return
    setAnalysis(template.analysis)
    setAdditionalNotes(template.additionalNotes)
    setTemplateReviewed(false)
  }

  const update = (index, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item))

  function makeRow(type = 'homeopathy') {
    const [row] = initialConsultationRows(null, remedies, 1)
    return type === 'bach'
      ? { ...row, itemType: 'bach', potency: '', granules: '', timesPerDay: '' }
      : { ...row, itemType: 'homeopathy', potency: '', granules: '', timesPerDay: '' }
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
        potency: item.potency || '',
        granules: item.granules || '',
        timesPerDay: item.timesPerDay || '',
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

  return <form id="consultation-report-form" action={submit} className="prescription-admin-form consultation-form consultation-form--compact consultation-studio" onSubmit={(event) => {
    if (!includeRecommendation && !includeInvoice) {
      event.preventDefault()
      setError(labels.noDocumentError)
    } else if (includeRecommendation && !validateConsultationRows(items)) {
      event.preventDefault()
      setError(labels.chooseError)
    } else if (includeRecommendation && daoScoreInvalid) {
      event.preventDefault()
      setError(uiLocale === 'ru' ? 'Укажите балл У-син от 0 до 10 с одним знаком после запятой.' : 'Enter a Wu Xing score from 0 to 10 with at most one decimal place.')
    } else {
      setError('')
    }
  }}>
    <input type="hidden" name="consultationId" value={consultation?.id ?? ''} />
    <input type="hidden" name="recommendationRevision" value={consultation?.updatedAt ?? ''} />
    <input type="hidden" name="languageChangeConfirmed" value={reportLocale !== initialReportLocale ? 'yes' : 'no'} />
    <input type="hidden" name="paymentRevision" value={payment?.updatedAt ?? ''} />
    <input type="hidden" name="requestId" value={requestId ?? ''} />
    <input type="hidden" name="itemsJson" value={JSON.stringify(serializeConsultationRows(items))} />
    <input type="hidden" name="recommendedTestsJson" value={JSON.stringify(recommendedTestKeys)} />

    <ol className="consultation-studio-progress" aria-label={labels.workflow}>
      <li><span>01</span>{labels.client}</li>
      <li><span>02</span>{labels.items}</li>
      <li><span>03</span>{labels.documentsHeading}</li>
    </ol>

    <section className="consultation-studio-card" aria-labelledby="consultation-client-heading">
      <div className="consultation-studio-section-head">
        <span className="consultation-studio-section-index" aria-hidden="true">01</span>
        <div>
          <h2 id="consultation-client-heading">{labels.clientHeading}</h2>
          <p>{labels.clientHint}</p>
        </div>
        <UsersRound aria-hidden="true" size={21} strokeWidth={1.5} />
      </div>
      <div className="consultation-studio-client-layout">
        {!consultation
          ? <ConsultationClientSelector clients={clients} selectedClientId={selectedClientId} uiLocale={uiLocale} onClientChange={(client) => changeReportLocale(client.preferredLocale)} />
          : <div className="consultation-edit-client-row">
              <label>{labels.client}<input name="patientName" value={consultation.patientName} readOnly /></label>
            </div>}
        <div className="consultation-quick-meta consultation-quick-meta--date-only">
          <label>{labels.date}<input type="date" name="dateIssued" required value={dateIssued} onChange={(event) => setDateIssued(event.target.value)} /></label>
        </div>
      </div>
      <ReportLanguagePicker locale={reportLocale} onChange={changeReportLocale} uiLocale={uiLocale} />
    </section>

    {includeRecommendation && <section className="consultation-studio-card" aria-labelledby="consultation-items-heading">
      <div className="consultation-studio-section-head">
        <span className="consultation-studio-section-index" aria-hidden="true">02</span>
        <div>
          <h2 id="consultation-items-heading">{labels.recommendationsHeading}</h2>
          <p>{labels.recommendationsHint}</p>
        </div>
        <ClipboardList aria-hidden="true" size={21} strokeWidth={1.5} />
      </div>
      <p className="consultation-studio-report-type">{labels.reportAuto}: <strong>{reportLabel}</strong></p>

      <fieldset className="consultation-remedy-fieldset consultation-remedy-fieldset--compact">
        <legend>{labels.items}</legend>
        <div className="consultation-remedies">{items.map((item, index) => {
          const type = item.itemType === 'bach' ? 'bach' : 'homeopathy'
          const matches = focused === index && !item.selected
            ? type === 'bach'
              ? item.query.trim() ? [{ id: 'bach-' + index, slug: null, label: item.query.trim(), displayName: item.query.trim(), sourceStatus: 'custom' }] : []
              : consultationRemedySuggestions(remedies, item.query)
            : []
          return <div className={'consultation-remedy-row consultation-remedy-row--stacked ' + (type === 'bach' ? 'consultation-remedy-row--bach' : '')} key={item.rowKey}>
            <div className="consultation-remedy-row-head">
              <span className="consultation-remedy-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <label className="consultation-item-type"><span>{labels.itemType}</span><select aria-label={labels.itemType + ' ' + (index + 1)} value={type} onChange={(event) => changeItemType(index, event.target.value)}>
                <option value="homeopathy">{labels.homeopathyShort}</option>
                <option value="bach">{labels.bachShort}</option>
              </select></label>
              <button type="button" className="consultation-remove" aria-label={labels.removeItem + ' ' + (index + 1)} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>
            </div>

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
            <details className="consultation-advanced-remedy">
              <summary>{uiLocale === 'ru' ? 'Дополнительные параметры препарата' : 'Additional remedy details'}
                {consultationClinicalFields.some(([field]) => String(item[field] ?? '').trim()) || String(item.notes ?? '').trim()
                  ? <span> · {uiLocale === 'ru' ? 'есть сохранённые данные' : 'saved details'}</span>
                  : null}
              </summary>
              <div className="consultation-advanced-grid">
                {consultationClinicalFields.map(([field, label]) => <label key={field}>
                  <span>{uiLocale === 'ru' ? clinicalLabelsRu[field] : label}</span>
                  {field === 'instructions'
                    ? <textarea rows={2} value={item[field] ?? ''} onChange={(event) => update(index, { [field]: event.target.value })} />
                    : <input value={item[field] ?? ''} onChange={(event) => update(index, { [field]: event.target.value })} />}
                </label>)}
                <label className="consultation-advanced-notes">
                  <span>{uiLocale === 'ru' ? clinicalLabelsRu.notes : 'Remedy notes'}</span>
                  <textarea rows={2} value={item.notes ?? ''} onChange={(event) => update(index, { notes: event.target.value })} />
                </label>
              </div>
            </details>
          </div>
        })}</div>

        <div className="consultation-add-actions">
          <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, makeRow('homeopathy')])}>{labels.addRemedy}</button>
          <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, makeRow('bach')])}>{labels.addEssence}</button>
        </div>
      </fieldset>

      <ConsultationTextImport remedies={remedies} onApply={applyParsed} uiLocale={uiLocale} />
      <p className="consultation-clinical-note">{uiLocale === 'ru' ? 'Проверьте рекомендации самостоятельно. Потенция и схема приёма остаются пустыми до вашего решения.' : 'Review recommendations yourself. Potency and dosing stay blank until you enter them.'}</p>
    </section>}

    {includeRecommendation && <section className="consultation-studio-card consultation-report-notes-panel" aria-label={labels.analysis + ' & ' + labels.clientNotes}>
      <div className="consultation-review-notes-title">
        <h2>{uiLocale === 'ru' ? 'Анализ и примечания' : 'Analysis & notes'}</h2>
        <p>{uiLocale === 'ru' ? 'Добавьте замеры состояния и персональные указания, которые войдут в PDF-отчёт.' : 'Record state measurements and personalized guidance for the client PDF.'}</p>
      </div>
      <p className="consultation-report-language-note" role="note">
        <strong>{labels.reportTextLanguageNotice} {reportLocale === 'ru' ? 'Русский' : 'English'}</strong>
        {' '}{labels.reportTextManualNote}
      </p>
      {!consultation && <p className="consultation-template-notice" role="note">{uiLocale === 'ru'
        ? 'Поля заполнены вашим примером как редактируемым шаблоном. Проверьте и замените замеры, выводы и инструкции для этого клиента перед сохранением.'
        : 'Your saved example is loaded as an editable draft. Review and replace all client-specific measurements and guidance before saving.'}</p>}
      {!consultation && <button type="button" className="consultation-reload-template" onClick={restoreReportTemplate}>
        {labels.reloadTemplate} {reportLocale === 'ru' ? 'русском' : 'English'}
      </button>}
      <div className="consultation-report-note-grid">
        <label className="consultation-report-note">
          <span>{labels.analysis}</span>
          <small>{labels.analysisHint}</small>
          <textarea name="analysis" rows={4} maxLength={5000} value={analysis} onChange={(event) => setAnalysis(event.target.value)} placeholder={labels.analysisPlaceholder} />
        </label>
        <label className="consultation-report-note">
          <span>{labels.clientNotes}</span>
          <small>{labels.clientNotesHint}</small>
          <textarea name="additionalNotes" rows={4} maxLength={5000} value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} placeholder={labels.clientNotesPlaceholder} />
        </label>
      </div>
      <ConsultationRecommendedTests locale={reportLocale}
        options={recommendedTestOptions[reportLocale] || []}
        analysis={analysis} additionalNotes={additionalNotes} generalInstructions={note}
        isDraftTemplate={!consultation && analysis === getOwnerReportTextTemplate(reportLocale).analysis}
        selectedKeys={recommendedTestKeys} onChange={setRecommendedTestKeys} />
      {!consultation && <label className="consultation-template-review">
        <input
          type="checkbox"
          checked={templateReviewed}
          onChange={(event) => setTemplateReviewed(event.target.checked)}
          required
        />
        <span>{uiLocale === 'ru'
          ? 'Я проверил(а) и отредактировал(а) шаблон для этого клиента. Это персональные рекомендации, а не готовое назначение.'
          : 'I have reviewed and adapted this template for this client. This is personal guidance, not a ready-made prescription.'}</span>
      </label>}
      <div className="consultation-follow-up-setting">
        <label>
          <span>{labels.followUpDate}</span>
          <input type="date" name="followUpDate" defaultValue={consultation?.followUpDate ?? ''} />
          <small>{labels.followUpDateHint}</small>
        </label>
        <p>{reportFollowUpCopy(reportLocale).description}</p>
      </div>
      <label className="consultation-note consultation-legacy-instructions">{labels.note}
        <textarea name="generalInstructions" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={labels.notePlaceholder} />
      </label>
      <details className="consultation-extra-details">
        <summary>{uiLocale === 'ru' ? 'Дополнительные данные документа' : 'Additional document details'}</summary>
        <div className="consultation-advanced-grid">
          <label>
            <span>{uiLocale === 'ru' ? 'Дата рождения клиента (необязательно)' : 'Client date of birth (optional)'}</span>
            <input type="date" name="patientDob" defaultValue={consultation?.patientDob ?? ''} />
          </label>
          <label>
            <span>{uiLocale === 'ru' ? 'Номер рекомендации (необязательно)' : 'Recommendation number (optional)'}</span>
            <input name="recommendationNumber" defaultValue={consultation?.recommendationNumber ?? ''} />
          </label>
          <label className="consultation-advanced-notes">
            <span>{uiLocale === 'ru' ? 'Пояснение к повторной консультации' : 'Follow-up instructions'}</span>
            <textarea rows={2} name="followUp" defaultValue={consultation?.followUp ?? ''} />
          </label>
          <label className="consultation-advanced-notes">
            <span>{uiLocale === 'ru' ? 'Личные заметки практика (не показываются клиенту)' : 'Private practitioner notes (not shown to client)'}</span>
            <textarea rows={2} name="internalNotes" defaultValue={consultation?.internalNotes ?? ''} />
          </label>
        </div>
      </details>
      <label className="consultation-studio-document-choice consultation-distance-homeopathy-choice" data-selected={includeDistanceHomeopathy}>
        <input type="checkbox" name="includeDistanceHomeopathy" checked={includeDistanceHomeopathy} onChange={event => setIncludeDistanceHomeopathy(event.target.checked)} />
        <span>
          <strong>{uiLocale === 'ru' ? 'Дистанционная гомеопатия' : 'Distance homeopathy'}</strong>
          <small>{uiLocale === 'ru'
            ? 'Добавить полный текст статьи последним приложением к отчёту клиента и PDF — без ссылки на сайт.'
            : 'Add the full article as the final appendix in the client report and PDF, without a website link.'}</small>
        </span>
      </label>
    </section>}

    <section className="consultation-studio-card" aria-labelledby="consultation-documents-heading">
      <div className="consultation-studio-section-head">
        <span className="consultation-studio-section-index" aria-hidden="true">03</span>
        <div>
          <h2 id="consultation-documents-heading">{labels.documentsHeading}</h2>
          <p>{labels.documentsHint}</p>
        </div>
        <FileCheck2 aria-hidden="true" size={21} strokeWidth={1.5} />
      </div>

    <div className="consultation-studio-document-choices" role="group" aria-label={labels.documentsHeading}>
      <label className="consultation-studio-document-choice" data-selected={includeRecommendation}>
        <input type="checkbox" name="includeRecommendation" checked={includeRecommendation} onChange={(event) => { setIncludeRecommendation(event.target.checked); setError('') }} />
        <span><strong>{labels.prescriptionChoice}</strong><small>{labels.prescriptionChoiceHint}</small></span>
      </label>
      <label className="consultation-studio-document-choice" data-selected={includeInvoice}>
        <input type="checkbox" name="includeInvoice" checked={includeInvoice} onChange={(event) => { setIncludeInvoice(event.target.checked); setError('') }} />
        <span><strong>{labels.invoiceChoice}</strong><small>{labels.invoiceChoiceHint}</small></span>
      </label>
    </div>

      {includeInvoice && <div className="consultation-studio-invoice-panel">
        <h3>{labels.invoiceDetails}</h3>
        <div className="consultation-payment-row consultation-studio-payment-grid">
        <label className="consultation-studio-payment-service">{labels.service}<input name="service" required defaultValue={payment?.service ?? ''} /></label>
        <label>{labels.amount}<input name="amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" required defaultValue={payment ? (payment.amount / 100).toFixed(2) : ''} /></label>
        <label>{labels.currency}<select name="currency" defaultValue={payment?.currency ?? 'CAD'}>{['CAD', 'USD', 'EUR', 'UAH'].map((code) => <option key={code}>{code}</option>)}</select></label>
        <label className="consultation-studio-payment-status">{labels.payment}<select name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">{labels.paid}</option><option value="unpaid">{labels.unpaid}</option></select></label>
      </div>
      <details className="consultation-details consultation-payment-settings">
        <summary>{labels.paymentSettings}</summary>
        <div className="consultation-two-columns">
          <label>{labels.paymentMethod}<input name="paymentMethod" maxLength={120} defaultValue={payment?.paymentMethod ?? ''} /></label>
          <label>{labels.documentNumber}<input name="documentNumber" defaultValue={payment?.documentNumber ?? ''} /></label>
        </div>
      </details>
      </div>}
      {!includeInvoice && payment && <p className="consultation-existing-payment-note">{labels.existingPaymentHint}</p>}
    </section>

    {includeRecommendation && <DaoResourceStageField value={daoResourceScore} onChange={setDaoResourceScore}
      published={daoResourcePublished} onPublishedChange={setDaoResourcePublished} locale={uiLocale} />}

    <div className="consultation-studio-submit">
      <div className="consultation-studio-submit-copy">
        <strong>{includeRecommendation
          ? (uiLocale==='ru'?'Сохранение не публикует изменения для клиента':'Saving does not publish changes to the client')
          : (consultation ? labels.saveHeading : labels.createHeading)}</strong>
        <span>{includeRecommendation
          ? includeInvoice
            ? paymentStatus === 'received' ? labels.receiptHint : labels.invoiceHint
            : labels.prescriptionOnlyHint
          : includeInvoice
            ? paymentStatus === 'received' ? labels.receiptOnlyHint : labels.invoiceOnlyHint
            : labels.noDocumentError}</span>
      </div>
      {(error || state.error) && <p className="prescription-form-error" role="alert">{error || state.error}</p>}
      <div className="consultation-studio-submit-buttons">
        <ConsultationDraftPreview locale={reportLocale} includeRecommendation={includeRecommendation} includeInvoice={includeInvoice} disabled={pending} />
        <button className="prescription-save consultation-primary-action" type="submit" disabled={pending}>
          {pending ? labels.saving : consultation ? labels.save : labels.create}
        </button>
      </div>
    </div>
  </form>
}
