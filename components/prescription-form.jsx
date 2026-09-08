'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, X, Check, Loader2 } from 'lucide-react'

import { PrescriptionLinkIssuer } from './prescription-link-issuer'
import { initialPrescriptionRows, serializePrescriptionRows } from '@/lib/prescriptions/editor'

const columns = [['potency', 'Potency'], ['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration'], ['notes', 'Notes']]

function SaveButton({ editing, status }) {
  const { pending } = useFormStatus()
  return <button className="prescription-save" type="submit" name="status" value={status} disabled={pending}>
    {pending ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
    {pending ? 'Saving…' : editing ? 'Save changes' : 'Create prescription'}
  </button>
}

export function PrescriptionForm({ action, prescription, remedies }) {
  const [items, setItems] = useState(() => initialPrescriptionRows(prescription, remedies))
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const update = (index, changes) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes } : item))
  const selectedCount = items.filter((item) => item.remedySlug || item.displayNameOverride).length

  return (
    <form className="prescription-admin-form" action={action} onSubmit={(event) => {
      const unresolved = items.findIndex((item) => !item.remedySlug && !item.displayNameOverride && [item.query, ...columns.map(([field]) => item[field]), item.instructions].some((value) => value?.trim()))
      if (unresolved >= 0 || selectedCount === 0) {
        event.preventDefault()
        setError(unresolved >= 0 ? `Choose a remedy from the suggestions in row ${unresolved + 1}.` : 'Choose at least one remedy to continue.')
      } else setError('')
    }}>
      <input type="hidden" name="itemsJson" value={serializePrescriptionRows(items)} />
      <input type="hidden" name="internalNotes" value={prescription?.internalNotes ?? ''} />
      <fieldset className="prescription-client-fields"><legend>Client details</legend>
        <label>Client name<input name="patientName" defaultValue={prescription?.patientName} placeholder="Full name" autoComplete="off" required /></label>
        <label>Date<input name="dateIssued" type="date" defaultValue={prescription?.dateIssued ?? new Date().toLocaleDateString('en-CA')} required /></label>
      </fieldset>

      <fieldset className="prescription-remedies"><legend>Remedies <span>{selectedCount} selected</span></legend>
        <p className="prescription-form-hint">Search by name or alias. Leave unused rows empty.</p>
        <div className="prescription-column-headings" aria-hidden="true"><span>#</span><span>Remedy</span>{columns.map(([field, label]) => <span key={field}>{label}</span>)}<span /></div>
        <div className="prescription-rows">
          {items.map((item, index) => {
            const matches = focused === index && !item.remedySlug && item.query.trim().length >= 2 ? remedies.filter((remedy) => remedy.searchText.includes(item.query.trim().toLowerCase())).slice(0, 6) : []
            return <section className="prescription-admin-item" key={item.rowKey} aria-label={`Remedy ${index + 1}`}>
              <span className="prescription-row-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="prescription-remedy-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null) }}>
                <label><span>Remedy</span><input aria-label={`Remedy ${index + 1}`} autoComplete="off" value={item.query} onFocus={() => setFocused(index)} onKeyDown={(event) => {
                  if (event.key === 'Escape') setFocused(null)
                  if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); event.currentTarget.closest('.prescription-remedy-search').querySelector('button')?.focus() }
                }} onChange={(event) => { update(index, { query: event.target.value, remedySlug: '', displayNameOverride: '' }); setFocused(index) }} placeholder="Search remedy…" /></label>
                {matches.length > 0 && <div className="prescription-remedy-results" aria-label="Remedy suggestions">{matches.map((remedy) => <button key={remedy.slug} type="button" onClick={() => { update(index, { remedySlug: remedy.slug, query: remedy.label, displayNameOverride: '' }); setFocused(null); setError('') }}>{remedy.label}</button>)}</div>}
                {focused === index && !item.remedySlug && item.query.trim().length >= 2 && !matches.length && <p className="prescription-remedy-empty">No match. Try another name or alias.</p>}
              </div>
              {columns.map(([field, label]) => <label className={`prescription-field-${field}`} key={field}><span>{label}</span><input aria-label={`${label} ${index + 1}`} value={item[field]} onChange={(event) => update(index, { [field]: event.target.value })} placeholder={field === 'notes' ? 'Optional' : '—'} /></label>)}
              <button className="prescription-remove" type="button" aria-label={`Remove remedy ${index + 1}`} disabled={items.length === 1} onClick={() => { setItems((current) => current.filter((_, i) => i !== index)); setFocused(null) }}><X size={16} /></button>
              {(item.instructions || item.displayNameOverride) && <details className="prescription-legacy-details"><summary>Additional remedy details</summary>
                {item.displayNameOverride && <label>Unlinked item<input value={item.displayNameOverride} onChange={(event) => update(index, { displayNameOverride: event.target.value, query: event.target.value })} /></label>}
                <label>Instructions<input value={item.instructions} onChange={(event) => update(index, { instructions: event.target.value })} /></label>
              </details>}
            </section>
          })}
        </div>
        <button className="prescription-add" type="button" onClick={() => setItems((current) => [...current, ...initialPrescriptionRows(null, remedies, 1)])}><Plus size={16} />Add remedy</button>
      </fieldset>

      <label className="prescription-instructions">General instructions <span className="prescription-form-hint">Optional · included on the client page and PDF</span><textarea name="generalInstructions" defaultValue={prescription?.generalInstructions} placeholder="Instructions for the client…" rows={3} /></label>
      <details className="prescription-document-options"><summary>Document settings</summary><div>
        <label>Patient DOB<input name="patientDob" type="date" defaultValue={prescription?.patientDob} /></label>
        <label>Language preference<select name="languagePreference" defaultValue={prescription?.languagePreference ?? 'bilingual'}><option value="bilingual">Bilingual</option><option value="ru">RU</option><option value="en">EN</option></select></label>
        <label>Practitioner<input name="practitionerName" defaultValue={prescription?.practitionerName ?? 'Andrii Litvinov'} /></label>
        <label>Role<input name="practitionerRole" defaultValue={prescription?.practitionerRole ?? 'Homeopathy / Integrative Practice'} /></label>
        <label>Professional background<input name="practitionerBackground" defaultValue={prescription?.practitionerBackground ?? 'Professional background: Ukraine'} /></label>
        <label>Contact<input name="practitionerContact" defaultValue={prescription?.practitionerContact} /></label>
      </div><div className="prescription-lifecycle">
        <button type="submit" name="status" value="draft">Save draft</button>
        {prescription && <><button type="submit" name="status" value="active">Activate private link</button><button type="submit" name="status" value="revoked">Revoke link</button><button type="submit" name="status" value="archived">Archive</button></>}
      </div></details>
      {error && <p className="prescription-form-error" role="alert">{error}</p>}
      <div className="prescription-admin-actions"><span>{selectedCount} {selectedCount === 1 ? 'remedy' : 'remedies'} in this prescription</span><SaveButton editing={Boolean(prescription)} status={prescription?.status ?? 'active'} /></div>
      {prescription?.status === 'active' && <PrescriptionLinkIssuer recordId={prescription.id} hasAccess={Boolean(prescription.access)} />}
    </form>
  )
}
