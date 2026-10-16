'use client'

import { useEffect, useRef, useState } from 'react'
import { resultCopy } from '@/lib/consultations/result-copy'
import { createDocumentLinkCache, documentActionUrls } from '@/lib/consultations/result-actions'
import { reportPdfFilename } from '@/lib/documents/report-filename'
import { requestOwnerDocumentLink, prepareReportSession, tryCopyOwnerLink } from '@/lib/consultations/owner-report-sharing'

export function ConsultationDocumentActions({
  recordId,
  clientId,
  locale,
  dateIssued,
  kind = 'recommendation',
  paymentStatus,
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
  const [shareUrl,setShareUrl]=useState('')
  const [preparing,setPreparing]=useState(false)

  if (!cache.current) cache.current = createDocumentLinkCache(
    () => requestOwnerDocumentLink(recordId, kind),
    { scope: kind === 'payment' ? 'document' : 'session' },
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  const labels = resultCopy(locale)
  const urls = documentActionUrls(recordId, locale, kind)
  const pdfFilename = kind === 'payment' ? (paymentStatus === 'received' ? 'receipt.pdf' : 'invoice.pdf') : reportPdfFilename({dateIssued})
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
      <a className="consultation-action-primary" href={urls.open}>{ru ? 'Предпросмотр / открыть' : 'Preview / Open'}</a>
      <a href={urls.previewPdf}>{ru ? 'Открыть PDF крупным текстом' : 'Read large PDF'}</a>
      <a href={urls.pdf} download={pdfFilename}>{labels.pdf}</a>
      <button className="consultation-copy consultation-share-action" type="button" disabled={!active || copying} onClick={copy}
        title={ru?(kind==='payment'?'Ссылка на счёт':'Ссылка на полную опубликованную консультацию'):(kind==='payment'?'Invoice link':'Published consultation page link')}>

        {copying ? labels.copying : copiedLocale === locale ? labels.copied : labels.copy}
      </button>
    </div>

    <div className="consultation-document-secondary-actions" aria-label={ru ? 'Дополнительные действия с документом' : 'Additional document actions'}>
      <a href={urls.print}>{labels.print}</a>
      {editHref && <a href={editHref}>{editLabel}</a>}
      {(revoke || reactivate) && <form action={active ? revoke : reactivate}>
        {!active && <p>{reactivateHelp}</p>}
        <button className={active ? 'consultation-access-revoke' : 'consultation-access-restore'} type="submit">{active ? revokeLabel : reactivateLabel}</button>
      </form>}
    </div>

    <p className="consultation-copy-feedback" role="status" aria-live="polite">
      {status ? (ru?'Сначала опубликуйте страницу консультации с материалами или проверьте авторизацию.':'Publish the client session first, or check your sign-in.') : copiedLocale === locale ? labels.copiedFeedback : !active ? labels.disabled : ''}
    </p>
  </>
}
