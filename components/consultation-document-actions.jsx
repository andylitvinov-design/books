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

  function onCopied() {
    setStatus('')
    setCopiedLocale(locale)
    clearTimeout(timer.current)
    timer.current=setTimeout(()=>setCopiedLocale(null),2200)
  }
  const copy=async()=>{
    setCopying(true);setStatus('');setCopiedLocale(null);setShareUrl('')
    try {
      const url=await cache.current.url(locale,window.location.origin)
      setShareUrl(url)
      if(await tryCopyOwnerLink(url,navigator.clipboard))onCopied()
      else setStatus('manual')
    } catch(error) {
      const code=error?.code||error?.message
      setStatus(code==='SESSION_NOT_PUBLISHED'?'not-published':
        code==='SESSION_LINK_EXPIRED'?'expired':
        code==='SESSION_REPORT_CHANGED'?'changed':
        code==='SESSION_UNAVAILABLE'?'unavailable':'failed')
    } finally {setCopying(false)}
  }
  const retryCopy=async()=>{
    if(!shareUrl)return
    if(await tryCopyOwnerLink(shareUrl,navigator.clipboard))onCopied()
    else setStatus('manual')
  }
  const prepare=async()=>{
    if(!clientId||!recordId||preparing)return
    setPreparing(true)
    try{const editor=await prepareReportSession(clientId,recordId);window.location.assign(editor)}
    catch{setStatus('prepare-failed');setPreparing(false)}
  }
  const needsPublication=['not-published','changed','expired','prepare-failed'].includes(status)

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


    {shareUrl&&<div className="consultation-share-link-ready">
      <label htmlFor={'consultation-link-'+recordId}>{ru?'Личная ссылка на этот отчёт':'Private link to this report'}</label>
      <div className="consultation-share-link-controls">
        <input id={'consultation-link-'+recordId} readOnly type="text" value={shareUrl}
          onFocus={event=>event.target.select()}
          aria-label={ru?'Ссылка на отчёт клиента':'Client report link'}/>
        <button type="button" onClick={retryCopy}>{ru?'Копировать ещё раз':'Copy again'}</button>
      </div>
    </div>}
    <p className="consultation-copy-feedback" role="status" aria-live="polite">
      {status==='manual'?(ru?'Ссылка получена, но Safari запретил автокопирование. Нажмите «Копировать ещё раз» или выделите адрес в поле.':'Link ready, but Safari blocked automatic copying. Tap Copy again or select the URL.'):
       status==='not-published'?(ru?'Отчёт сохранён, но страница клиента ещё не опубликована. Проверьте её и нажмите «Опубликовать клиенту».':'Report saved, but the client page is not yet published. Review it and explicitly publish.'):
       status==='changed'?(ru?'Опубликованная версия отчёта устарела. Проверьте и опубликуйте обновлённую страницу.':'The published report is outdated. Review and republish the updated page.'):
       status==='expired'?(ru?'Доступ к ссылке истёк или отозван. Обновите приглашение в редакторе сессии.':'Invitation expired or revoked. Renew it in the session editor.'):
       status==='unavailable'?(ru?'Сервис защищённых ссылок недоступен либо требуется повторный вход в кабинет специалиста.':'Private session links unavailable or practitioner sign-in expired.'):
       status==='prepare-failed'?(ru?'Не удалось открыть редактор клиентской сессии. Проверьте авторизацию и повторите.':'Could not open the session editor. Check your sign-in and retry.'):
       status==='failed'?(ru?'Не удалось получить ссылку. Попробуйте ещё раз.':'Could not retrieve the link. Try again.'):
       copiedLocale===locale?labels.copiedFeedback:!active?labels.disabled:''}
    </p>
    {needsPublication&&kind!=='payment'&&active&&clientId&&
      <button className="consultation-prepare-session" type="button" disabled={preparing} onClick={prepare}>
        {preparing?(ru?'Открываем редактор…':'Opening editor…'):
          (ru?'Проверить и опубликовать страницу клиента →':'Review and publish client page →')}
      </button>}
    {needsPublication&&kind!=='payment'&&!clientId&&<p className="consultation-copy-feedback">
      {ru?'Отчёт не связан с клиентом. Сначала укажите клиента в редакторе.':'Assign the report to a client before private sharing.'}
    </p>}
  </>
}
