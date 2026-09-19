'use client'

import { useRef, useState } from 'react'

export function ConsultationDocumentActions({ recordId, locale = 'en', active }) {
  const credentials = useRef(null)
  const issuing = useRef(null)
  const [status, setStatus] = useState('')
  const copy = async (language) => {
    setStatus('Preparing link…')
    try {
      if (!credentials.current) {
        issuing.current ??= fetch(`/admin/api/documents/${recordId}/client-link`, { method: 'POST', credentials: 'same-origin', cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error('Unavailable')
          return response.json()
        }).finally(() => { issuing.current = null })
        credentials.current = await issuing.current
      }
      const { selector, secret } = credentials.current
      const link = new URL(`/${language}/prescriptions/${selector}`, window.location.origin)
      link.hash = secret
      await navigator.clipboard.writeText(link.toString())
      setStatus(`${language === 'en' ? 'English' : 'Russian'} link copied`)
    } catch { setStatus('Could not copy the link. Please try again.') }
  }
  return <>
    <div className="document-panel-actions">
      {active && <><button type="button" onClick={() => copy('en')}>Copy English link</button><button type="button" onClick={() => copy('ru')}>Copy Russian link</button></>}
      <a href={`/admin/documents/${recordId}?locale=${locale}`}>Open</a>
      <a href={`/admin/api/documents/${recordId}/pdf?locale=${locale}`} download>Download PDF</a>
      <a href={`/admin/documents/${recordId}?locale=${locale}&print=1`}>Print</a>
    </div>
    <p role="status" aria-live="polite">{active ? status : 'Client access revoked.'}</p>
  </>
}
