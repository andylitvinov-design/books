'use client'

import { useEffect, useRef, useState } from 'react'
import { createDocumentLinkCache, documentActionUrls } from '@/lib/consultations/result-actions'

export function ConsultationDocumentActions({ recordId, locale, active }) {
  const cache = useRef(null)
  const timer = useRef(null)
  const [status, setStatus] = useState('')
  const [copying, setCopying] = useState(false)
  const [copiedLocale, setCopiedLocale] = useState(null)
  if (!cache.current) cache.current = createDocumentLinkCache(async () => {
    const response = await fetch(`/admin/api/documents/${recordId}/client-link`, { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) throw new Error('Unavailable')
    return response.json()
  })
  useEffect(() => () => clearTimeout(timer.current), [])
  const urls = documentActionUrls(recordId, locale)
  const copy = async () => {
    setCopying(true); setStatus(''); setCopiedLocale(null)
    try {
      await navigator.clipboard.writeText(await cache.current.url(locale, window.location.origin))
      setCopiedLocale(locale)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiedLocale(null), 2200)
    } catch { setStatus('Could not copy the link. Please try again.') }
    finally { setCopying(false) }
  }
  return <>
    <div className="consultation-result-actions">
      <a href={urls.open}>Open</a>
      <button className="consultation-copy" type="button" disabled={!active || copying} onClick={copy}>{copying ? 'Copying…' : copiedLocale === locale ? '✓ Copied' : 'Copy link'}</button>
      <a href={urls.pdf} download>Download PDF</a>
      <a href={urls.print}>Print</a>
    </div>
    <p className="consultation-copy-feedback" role="status" aria-live="polite">{status || (copiedLocale === locale ? `${locale === 'ru' ? 'Russian' : 'English'} link copied` : !active ? 'Client access is disabled.' : '')}</p>
  </>
}
