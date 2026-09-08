'use client'

import { useMemo, useState } from 'react'

import { PrescriptionLinkIssuer } from './prescription-link-issuer'

const blankItem = () => ({ remedySlug: '', displayNameOverride: '', potency: '', dosage: '', frequency: '', duration: '', instructions: '', notes: '', query: '' })

function initialItems(prescription) {
  return prescription?.items?.map((item) => ({ ...blankItem(), ...item, query: item.remedySlug ?? item.displayNameOverride ?? '' })) ?? [blankItem()]
}

export function PrescriptionForm({ action, prescription, remedies }) {
  const [items, setItems] = useState(() => initialItems(prescription))
  const [queries, setQueries] = useState(() => initialItems(prescription).map((item) => item.query))
  const update = (index, changes) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))
  const matchesFor = (query) => query.trim().length < 2 ? [] : remedies.filter((remedy) => remedy.searchText.includes(query.trim().toLowerCase())).slice(0, 6)
  const serializedItems = useMemo(() => JSON.stringify(items.map(({ query, ...item }) => item)), [items])

  return (
    <form className="prescription-admin-form" action={action}>
      <input type="hidden" name="itemsJson" value={serializedItems} />
      <fieldset><legend>Document</legend>
        <label>Patient name<input name="patientName" defaultValue={prescription?.patientName} required /></label>
        <label>Date<input name="dateIssued" type="date" defaultValue={prescription?.dateIssued ?? new Date().toISOString().slice(0, 10)} required /></label>
        <label>Patient DOB<input name="patientDob" type="date" defaultValue={prescription?.patientDob} /></label>
        <label>Language preference<select name="languagePreference" defaultValue={prescription?.languagePreference ?? 'bilingual'}><option value="bilingual">Bilingual</option><option value="ru">RU</option><option value="en">EN</option></select></label>
      </fieldset>

      <fieldset><legend>Practitioner</legend>
        <label>Name<input name="practitionerName" defaultValue={prescription?.practitionerName ?? 'Andrii Litvinov'} required /></label>
        <label>Role<input name="practitionerRole" defaultValue={prescription?.practitionerRole ?? 'Homeopathy / Integrative Practice'} /></label>
        <label>Professional background<input name="practitionerBackground" defaultValue={prescription?.practitionerBackground ?? 'Professional background: Ukraine'} /></label>
        <label>Contact<input name="practitionerContact" defaultValue={prescription?.practitionerContact} /></label>
      </fieldset>

      <fieldset><legend>Remedies</legend>
        {items.map((item, index) => {
          const matches = matchesFor(queries[index] ?? '')
          return <section className="prescription-admin-item" key={index}>
            <div><strong>Item {index + 1}</strong><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={items.length === 1}>Remove</button></div>
            <label>Search canonical remedy or alias
              <input value={queries[index] ?? ''} onChange={(event) => {
                const query = event.target.value
                setQueries((current) => current.map((value, itemIndex) => itemIndex === index ? query : value))
                update(index, { remedySlug: '' })
              }} placeholder="aurum, золото, nat mur" />
            </label>
            {matches.length > 0 && <div className="prescription-remedy-results">{matches.map((remedy) => <button key={remedy.slug} type="button" onClick={() => {
              update(index, { remedySlug: remedy.slug, displayNameOverride: '' })
              setQueries((current) => current.map((value, itemIndex) => itemIndex === index ? remedy.label : value))
            }}>{remedy.label}</button>)}</div>}
            <label>Unlinked item<input value={item.displayNameOverride} onChange={(event) => update(index, { displayNameOverride: event.target.value, remedySlug: '' })} placeholder="Only if not in catalogue" /></label>
            <div className="prescription-admin-item-fields">
              {['potency', 'dosage', 'frequency', 'duration', 'instructions', 'notes'].map((field) => <label key={field}>{field}<input value={item[field]} onChange={(event) => update(index, { [field]: event.target.value })} /></label>)}
            </div>
          </section>
        })}
        <button type="button" onClick={() => { setItems((current) => [...current, blankItem()]); setQueries((current) => [...current, '']) }}>+ Add remedy</button>
      </fieldset>

      <label>General instructions<textarea name="generalInstructions" defaultValue={prescription?.generalInstructions} /></label>
      <label>Internal notes<textarea name="internalNotes" defaultValue={prescription?.internalNotes} /></label>
      <div className="prescription-admin-actions">
        <button type="submit" name="status" value="draft">Save draft</button>
        <button type="submit" name="status" value="active">Activate private link</button>
        {prescription && <button type="submit" name="status" value="revoked">Revoke link</button>}
        {prescription && <button type="submit" name="status" value="archived">Archive</button>}
      </div>
      {prescription?.status === 'active' && <PrescriptionLinkIssuer recordId={prescription.id} hasAccess={Boolean(prescription.access)} />}
    </form>
  )
}
