'use client'

import { useEffect, useRef, useState } from 'react'
import { resultCopy } from '@/lib/consultations/result-copy'
import { createDocumentLinkCache, documentActionUrls } from '@/lib/consultations/result-actions'
import { reportPdfFilename } from '@/lib/documents/report-filename'
import { requestOwnerDocumentLink, publishSavedClientReport, tryCopyOwnerLink } from '@/lib/consultations/owner-report-sharing'

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
  const [publishing,setPublishing]=useState(false)

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
  const publish=async()=>{
    if(!clientId||!recordId||publishing)return
    setPublishing(true);setStatus('');setCopiedLocale(null)
    try{
      await publishSavedClientReport(clientId,recordId)
      setStatus('published')
    }catch(error){
      const code=error?.code||error?.message
      setStatus(['SESSION_CHANGED','REPORT_VERSION_CHANGED','REPORT_SESSION_MISMATCH',
        'PUBLICATION_REVIEW_REQUIRED'].includes(code)?'publish-conflict':
        code==='SESSION_UNAVAILABLE'?'unavailable':'publish-failed')
    }finally{setPublishing(false)}
  }
  const needsPublication=['not-published','changed','expired','publish-failed','publish-conflict'].includes(status)

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
       status==='not-published'?(ru?'Отчёт сохранён, но страница клиента ещё не опубликована. Нажмите «Опубликовать» ниже.':'Report saved, but the client page is not published yet. Tap Publish below.'):
       status==='changed'?(ru?'Опубликованная версия отчёта устарела. Нажмите «Опубликовать», чтобы обновить страницу клиента.':'The published report is outdated. Tap Publish to update the client page.'):
       status==='expired'?(ru?'Доступ к ссылке истёк или отозван. Обновите приглашение в редакторе сессии.':'Invitation expired or revoked. Renew it in the session editor.'):
       status==='unavailable'?(ru?'Сервис защищённых ссылок недоступен либо требуется повторный вход в кабинет специалиста.':'Private session links unavailable or practitioner sign-in expired.'):
       status==='published'?(ru?'Страница клиента опубликована. Теперь можно скопировать приватную ссылку.':'Client page published. You can now copy the private link.'):
       status==='publish-conflict'?(ru?'Отчёт или черновик изменился либо к этой сессии привязан другой отчёт. Проверьте сохранённую версию перед повторной публикацией.':'The report or draft changed, or another report is attached to this session. Check the saved version before publishing again.'):
       status==='publish-failed'?(ru?'Не удалось опубликовать страницу клиента. Проверьте соединение и повторите.':'Could not publish the client page. Check your connection and try again.'):
       status==='failed'?(ru?'Не удалось получить ссылку. Попробуйте ещё раз.':'Could not retrieve the link. Try again.'):
       copiedLocale===locale?labels.copiedFeedback:!active?labels.disabled:''}
    </p>
    {kind!=='payment'&&active&&clientId&&
      <button className="consultation-prepare-session" type="button" disabled={publishing || copying} onClick={publish}>
        {publishing?(ru?'Публикуем…':'Publishing…'):(ru?'Опубликовать':'Publish')}
      </button>}
    {needsPublication&&kind!=='payment'&&!clientId&&<p className="consultation-copy-feedback">
      {ru?'Отчёт не связан с клиентом. Сначала укажите клиента в редакторе.':'Assign the report to a client before private sharing.'}
    </p>}
  </>
}
