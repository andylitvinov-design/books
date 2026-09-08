'use client'

import { useMemo, useState } from 'react'

const blankItem = () => ({ remedySlug: '', potency: '', dosage: '', frequency: '', duration: '', notes: '', query: '' })

function initialItems(prescription) {
  return prescription?.items?.map((item) => ({ ...blankItem(), ...item, query: item.remedySlug ?? '' })) ?? [blankItem()]
}

export function PrescriptionForm({ action, prescription, remedies, submitLabel = 'Save prescription' }) {
  const [items, setItems] = useState(() => initialItems(prescription))
  const [queries, setQueries] = useState(() => initialItems(prescription).map((item) => item.query))
  const update = (index, changes) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))
  const matchesFor = (query) => query.trim().length < 2 ? [] : remedies.filter((remedy) => remedy.searchText.includes(query.trim().toLowerCase())).slice(0, 6)
  const serializedItems = useMemo(() => JSON.stringify(items.map(({ query, ...item }) => item)), [items])
  return (
    <form className="prescription-admin-form" action={action}>
      <input type="hidden" name="itemsJson" value={serializedItems} />
      <fieldset><legend>Prescription</legend>
        <label>Client name<input name="patientName" defaultValue={prescription?.patientName} required /></label>
        <label>Date<input name="dateIssued" type="date" defaultValue={prescription?.dateIssued ?? new Date().toISOString().slice(0, 10)} required /></label>
      </fieldset>

      <fieldset><legend>Remedies</legend>
        {items.map((item, index) => {
          const matches = matchesFor(queries[index] ?? '')
          return <section className="prescription-admin-item" key={index}>
            <div><strong>Item {index + 1}</strong><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={items.length === 1}>Remove</button></div>
            <label>Remedy
              <input value={queries[index] ?? ''} onChange={(event) => {
                const query = event.target.value
                setQueries((current) => current.map((value, itemIndex) => itemIndex === index ? query : value))
                update(index, { remedySlug: '' })
              }} placeholder="aurum, золото, nat mur" />
            </label>
            {matches.length > 0 && <div className="prescription-remedy-results">{matches.map((remedy) => <button key={remedy.slug} type="button" onClick={() => {
              update(index, { remedySlug: remedy.slug })
              setQueries((current) => current.map((value, itemIndex) => itemIndex === index ? remedy.label : value))
            }}>{remedy.label}</button>)}</div>}
            <div className="prescription-admin-item-fields">
              {['potency', 'dosage', 'frequency', 'duration', 'notes'].map((field) => <label key={field}>{field}<input value={item[field]} onChange={(event) => update(index, { [field]: event.target.value })} /></label>)}
            </div>
          </section>
        })}
        <button type="button" onClick={() => { setItems((current) => [...current, blankItem()]); setQueries((current) => [...current, '']) }}>+ Add remedy</button>
      </fieldset>

      <label>General instructions<textarea name="generalInstructions" defaultValue={prescription?.generalInstructions} /></label>
      <div className="prescription-admin-actions">
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  )
}
