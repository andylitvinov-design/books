'use client'
import { useState } from 'react'

// A separate confirmation prevents accidentally erasing a clinical report
// while tapping the adjacent View / Edit actions on a phone.
export function DeleteReportButton({ action, label, confirmation }) {
  return <form action={action} className="owner-report-delete-form"
    onSubmit={event => { if (!window.confirm(confirmation)) event.preventDefault() }}>
    <button type="submit" title={label} aria-label={label} className="owner-report-delete-button">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6m4-6v6" />
      </svg>
    </button>
  </form>
}

export function DeleteClientPanel({ action, fullName, labels, documentCount, assessmentCount }) {
  const [entered, setEntered] = useState('')
  return <details className="client-detail-delete-panel">
    <summary>{labels.deleteClient}</summary>
    <p>{labels.deleteWarning}</p>
    <p><strong>{documentCount}</strong> {labels.documents} · <strong>{assessmentCount}</strong> {labels.assessments}</p>
    <form action={action} onSubmit={event => {
      if (entered !== fullName || !window.confirm(labels.deleteConfirm)) event.preventDefault()
    }}>
      <label>{labels.typeName}
        <input name="confirmation" value={entered} onChange={event => setEntered(event.target.value)}
          autoComplete="off" required maxLength={200} />
      </label>
      <button type="submit" disabled={entered !== fullName}>{labels.deleteForever}</button>
    </form>
  </details>
}
