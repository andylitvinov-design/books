'use client'

import { useEffect, useRef, useState } from 'react'
import { resultCopy } from '@/lib/consultations/result-copy'
import { createDocumentLinkCache, documentActionUrls } from '@/lib/consultations/result-actions'

export function ConsultationDocumentActions({
  recordId,
  locale,
  active,
  editHref,
  editLabel,
  revoke,
  reactivate,
  reactivateHelp,
  revokeLabel,
  reactivateLabel,
}) {
  const cache = useRef(null)
  const timer = useRef(null)
  const [status, setStatus] = useState('')
  const [copying, setCopying] = useState(false)
  const [copiedLocale, setCopiedLocale] = useState(null)

  if (!cache.current) cache.current = createDocumentLinkCache(async () => {
    const response = await fetch(`/admin/api/documents/${recordId}/client-link`, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!response.ok) throw new Error('Unavailable')
    return response.json()
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  const labels = resultCopy(locale)
  const urls = documentActionUrls(recordId, locale)
  const ru = locale === 'ru'

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
    <div className="consultation-result-actions consultation-document-actions" aria-label={ru ? 'Просмотр и отправка документа' : 'Document preview and sharing'}>
      <a className="consultation-action-primary" href={urls.previewPdf} target="_blank" rel="noopener noreferrer">{labels.previewPdf}</a>
      <a href={urls.open} target="_blank" rel="noopener noreferrer">{labels.open}</a>
      <a href={urls.pdf} download>{labels.pdf}</a>
      <button className="consultation-copy consultation-share-action" type="button" disabled={!active || copying} onClick={copy}>
        {copying ? labels.copying : copiedLocale === locale ? labels.copied : labels.copy}
      </button>
    </div>

    <div className="consultation-document-secondary-actions" aria-label={ru ? 'Дополнительные действия с документом' : 'Additional document actions'}>
      <a href={urls.print} target="_blank" rel="noopener noreferrer">{labels.print}</a>
      {editHref && <a href={editHref}>{editLabel}</a>}
      {(revoke || reactivate) && <form action={active ? revoke : reactivate}>
        {!active && <p>{reactivateHelp}</p>}
        <button className={active ? 'consultation-access-revoke' : 'consultation-access-restore'} type="submit">{active ? revokeLabel : reactivateLabel}</button>
      </form>}
    </div>

    <p className="consultation-copy-feedback" role="status" aria-live="polite">
      {status ? labels.copyError : copiedLocale === locale ? labels.copiedFeedback : !active ? labels.disabled : ''}
    </p>
  </>
}
