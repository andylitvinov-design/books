'use client'

import { ConsultationClientSelector } from './consultation-client-selector'
import { useActionState, useState } from 'react'
import { initialConsultationRows, serializeConsultationRows, validateConsultationRows, consultationClinicalFields as clinicalFields } from '@/lib/consultations/editor'
import { consultationRemedySuggestions } from '@/lib/consultations/remedy-search'

const badges = { canonical: '✓ Profile', source_only: '○ Sources', custom: '＋ Custom' }
export function ConsultationForm({ action, remedies, consultation, payment, requestId, clients = [], selectedClientId }) {
  const [state, submit, pending] = useActionState(action, {})
  const [items, setItems] = useState(() => initialConsultationRows(consultation, remedies, 2))
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(payment?.paymentStatus ?? 'received')
  const update = (index, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item))
  const selected = items.filter((item) => item.selected)
  const today = new Date().toLocaleDateString('en-CA')
  return <form action={submit} className="prescription-admin-form consultation-form" onSubmit={(event) => {
    if (!validateConsultationRows(items)) {
      event.preventDefault(); setError('Choose each remedy from the suggestions. At least one remedy is required.')
    } else setError('')
  }}>
    <input type="hidden" name="recommendationRevision" value={consultation?.updatedAt ?? ''} />
    <input type="hidden" name="paymentRevision" value={payment?.updatedAt ?? ''} />
    <input type="hidden" name="requestId" value={requestId ?? ''} />
    <input type="hidden" name="itemsJson" value={JSON.stringify(serializeConsultationRows(items))} />
    {!consultation ? <ConsultationClientSelector clients={clients} selectedClientId={selectedClientId} /> : <label>Client<input name="patientName" placeholder="Full name" required maxLength={200} defaultValue={consultation?.patientName} autoComplete="off" /></label>}
    <div className="consultation-two-columns">
      <label>Date<input type="date" name="dateIssued" required defaultValue={consultation?.dateIssued ?? today} /></label>
      {consultation && <label>Client language<select name="languagePreference" defaultValue={consultation?.languagePreference === 'ru' ? 'ru' : 'en'}><option value="en">English</option><option value="ru">Русский</option></select></label>}
    </div>
    <fieldset><legend>Remedies</legend>
      <div className="consultation-remedies">{items.map((item, index) => {
        const matches = focused === index && !item.selected ? consultationRemedySuggestions(remedies, item.query) : []
        return <div className="consultation-remedy-row" key={item.rowKey}>
          <div className="prescription-remedy-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null) }}>
            <input aria-label={`Remedy ${index + 1}`} placeholder="Search remedy…" autoComplete="off" value={item.query} onFocus={() => setFocused(index)} onChange={(event) => { update(index, { query: event.target.value, remedySlug: null, displayNameOverride: null, sourceStatus: null, selected: false }); setFocused(index) }} onKeyDown={(event) => {
              if (event.key === 'Escape') setFocused(null)
              if (event.key === 'Enter' && !item.selected) event.preventDefault()
              if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); event.currentTarget.parentElement.querySelector('button')?.focus() }
            }} />
            {item.selected && <span className="consultation-source-badge">{badges[item.sourceStatus]}</span>}
            {matches.length > 0 && <div className="prescription-remedy-results" aria-label="Remedy suggestions">{matches.map((remedy) => {
              const status = remedy.sourceStatus ?? (remedy.slug ? 'canonical' : 'source_only')
              return <button key={remedy.id ?? remedy.slug ?? remedy.label} type="button" onClick={() => {
                update(index, { remedySlug: remedy.slug || null, displayNameOverride: remedy.slug ? null : remedy.displayName ?? remedy.label, sourceStatus: status, query: remedy.label, selected: true })
                setFocused(null); setError('')
              }}>
                <span>{status === 'custom' ? `Use custom remedy: ${remedy.label}` : remedy.label}</span>
                <small className="consultation-source-status">{status === 'canonical' ? '✓ Полная карточка' : status === 'source_only' ? '○ Есть материалы' : '＋ Новый препарат'}</small>
                {status !== 'canonical' && <small>{status === 'source_only' ? 'Карточка ещё не подготовлена' : 'Описание пока отсутствует'}</small>}
              </button>
            })}</div>}
          </div>
          <button type="button" className="consultation-remove" aria-label={`Remove remedy ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>
        </div>
      })}</div>
      <button type="button" className="prescription-add" onClick={() => setItems((current) => [...current, ...initialConsultationRows(null, remedies, 1)])}>+ Add remedy</button>
    </fieldset>
    <label>Payment<select name="paymentStatus" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">Paid — Receipt</option><option value="unpaid">Not paid — Invoice</option></select></label>
    <details className="consultation-details"><summary>Payment settings</summary><div className="consultation-two-columns">
      <label>Amount<input name="amount" inputMode="decimal" required defaultValue={payment ? (payment.amount / 100).toFixed(2) : '230.00'} /></label>
      <label>Currency<select name="currency" defaultValue={payment?.currency ?? 'CAD'}>{['CAD', 'USD', 'EUR', 'UAH'].map((code) => <option key={code}>{code}</option>)}</select></label>
      <label>Service<input name="service" required defaultValue={payment?.service ?? 'Individual consultation'} /></label>
      <label>Payment status<select aria-label="Payment status settings" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="received">Paid — Receipt</option><option value="unpaid">Not paid — Invoice</option></select></label>
      <label>Payment method<input name="paymentMethod" maxLength={120} defaultValue={payment?.paymentMethod} /></label>
      <label>Document number<input name="documentNumber" defaultValue={payment?.documentNumber} /></label>
    </div></details>
    <details className="consultation-details"><summary>Additional recommendation details</summary><div>
      {selected.map((item) => { const index = items.indexOf(item); return <fieldset key={item.rowKey}><legend>{item.query}</legend><div className="consultation-two-columns">{clinicalFields.map(([key, label]) => <label key={key}>{label}<input value={item[key] ?? ''} onChange={(event) => update(index, { [key]: event.target.value })} /></label>)}</div></fieldset> })}
      <label>General recommendations<textarea name="generalInstructions" defaultValue={consultation?.generalInstructions} rows={2} /></label>
      <label>Follow-up<textarea name="followUp" defaultValue={consultation?.followUp} rows={2} /></label>
      <label>Recommendation number<input name="recommendationNumber" defaultValue={consultation?.recommendationNumber} /></label>
    </div></details>
    {(error || state.error) && <p role="alert">{error || state.error}</p>}
    <button className="prescription-save" type="submit" disabled={pending}>{pending ? 'Saving documents…' : consultation ? 'Save consultation' : 'CREATE DOCUMENTS'}</button>
  </form>
}
