'use client'

import { useState } from 'react'
import { requestOwnerDocumentLink, prepareReportSession, tryCopyOwnerLink } from '@/lib/consultations/owner-report-sharing'

export function SessionLinkIssuer({recordId,clientId,locale='en'}) {
  const ru=locale==='ru'
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [reason,setReason]=useState('')
  const [link,setLink]=useState('')

  async function copy() {
    if(busy)return
    setBusy(true);setMessage('');setReason('');setLink('')
    try {
      const data=await requestOwnerDocumentLink(recordId)
      const url=new URL('/'+locale+'/client/session/'+data.selector,window.location.origin)
      url.hash=data.secret
      const value=url.toString()
      setLink(value)
      if(await tryCopyOwnerLink(value,navigator.clipboard)) {
        setMessage(ru?'Ссылка на полную консультацию скопирована.':'Full consultation page link copied.')
      } else {
        setMessage(ru?'Ссылка готова. Safari не разрешил автокопирование. Нажмите «Копировать ещё раз» или выделите адрес ниже.':
          'Link ready. Safari blocked automatic copying; tap Copy again or select the link below.')
      }
    }catch(error){
      const code=error?.code||error?.message
      setReason(code)
      setMessage(code==='SESSION_NOT_PUBLISHED'?
        (ru?'Отчёт сохранён, но страница клиента не опубликована. Откройте редактор и подтвердите публикацию.':
          'Report saved, but its client page is not published. Review and explicitly publish the session.'):
        code==='SESSION_REPORT_CHANGED'?
          (ru?'Отчёт изменился после публикации. Проверьте и повторно опубликуйте страницу клиента.':
            'The report changed after publication. Review and republish the client page.'):
        code==='SESSION_LINK_EXPIRED'?
          (ru?'Доступ истёк или отозван. Обновите приглашение в редакторе сессии.':
            'Link expired or revoked. Renew access in the session editor.'):
        code==='SESSION_UNAVAILABLE'?
          (ru?'Сервис защищённых ссылок недоступен либо требуется повторный вход.':
            'Private sharing is unavailable or practitioner sign-in expired.'):
        (ru?'Не удалось получить ссылку. Попробуйте снова.':'Could not retrieve the link. Try again.'))
    }finally{setBusy(false)}
  }

  async function retryCopy() {
    if(!link)return
    const copied=await tryCopyOwnerLink(link,navigator.clipboard)
    setMessage(copied?
      (ru?'Ссылка скопирована.':'Link copied.'):
      (ru?'Нажмите поле и выделите ссылку вручную.':'Tap the field to select and copy the link manually.'))
  }

  async function prepare() {
    if(busy||!clientId)return
    setBusy(true)
    try {
      const editor=await prepareReportSession(clientId,recordId)
      window.location.assign(editor)
    }catch{
      setMessage(ru?'Не удалось открыть редактор. Проверьте авторизацию.':
        'Could not open the editor. Check your sign-in.')
      setBusy(false)
    }
  }

  const needsPublication=['SESSION_NOT_PUBLISHED','SESSION_REPORT_CHANGED','SESSION_LINK_EXPIRED'].includes(reason)
  return <div className="consultation-share-session">
    <button type="button" className="consultation-copy" onClick={copy} disabled={busy}>
      {busy?(ru?'Готовим ссылку…':'Preparing…'):(ru?'Копировать ссылку на полную консультацию':'Copy full consultation page link')}
    </button>
    {message&&<p role="status" aria-live="polite">{message}</p>}
    {link&&<div className="consultation-share-link-ready">
      <label htmlFor={'session-link-'+recordId}>{ru?'Личная ссылка на консультацию':'Private consultation link'}</label>
      <div className="consultation-share-link-controls">
        <input id={'session-link-'+recordId} type="text" readOnly value={link}
          onFocus={event=>event.target.select()} aria-label={ru?'Ссылка на консультацию':'Consultation page link'}/>
        <button type="button" onClick={retryCopy}>{ru?'Копировать ещё раз':'Copy again'}</button>
      </div>
    </div>}
    {needsPublication&&clientId&&<button className="consultation-prepare-session"
      type="button" disabled={busy} onClick={prepare}>
      {ru?'Проверить и опубликовать страницу клиента →':'Review and publish client page →'}
    </button>}
    {needsPublication&&!clientId&&<p role="status">
      {ru?'Сначала привяжите отчёт к клиенту.':'Assign the report to a client before sharing.'}
    </p>}
  </div>
}
