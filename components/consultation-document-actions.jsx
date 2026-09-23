'use client'

import { useEffect, useRef, useState } from 'react'
import { resultCopy } from '@/lib/consultations/result-copy'
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

  const labels = resultCopy(locale)
  const urls = documentActionUrls(recordId, locale)

  const copy = async () => {
    setCopying(true)
    setStatus('')
    setCopiedLocale(null)
    try {
      await navigator.clipboard.writeText(await cache.current.url(locale, window.location.origin))
      setCopiedLocale(locale)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiedLocale(null), 2200)
    } catch {
      setStatus('error')
    } finally {
      setCopying(false)
    }
  }

  return <>
    <div className="consultation-result-actions consultation-document-actions">
      <a className="consultation-action-primary" href={urls.open}>{labels.open}</a>
      <a href={urls.pdf} download>{labels.pdf}</a>
      <a href={urls.print}>{labels.print}</a>
    </div>

    <details className="consultation-share">
      <summary>{locale === 'ru' ? 'Поделиться отдельно' : 'Share separately'}</summary>
      <div>
        <button className="consultation-copy" type="button" disabled={!active || copying} onClick={copy}>
          {copying ? labels.copying : copiedLocale === locale ? labels.copied : labels.copy}
        </button>
      </div>
    </details>

    <p className="consultation-copy-feedback" role="status" aria-live="polite">
      {status ? labels.copyError : copiedLocale === locale ? labels.copiedFeedback : !active ? labels.disabled : ''}
    </p>
  </>
}
