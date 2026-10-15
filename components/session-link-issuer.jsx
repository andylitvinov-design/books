'use client'
import {useState} from 'react'

export function SessionLinkIssuer({recordId,locale='en'}) {
  const ru=locale==='ru'
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [link,setLink]=useState('')
  async function copy() {
    if(busy)return
    setBusy(true);setLink('');setMessage('')
    try {
      const response=await fetch('/admin/api/documents/'+recordId+'/session-link',{
        method:'POST',headers:{'content-type':'application/json'},body:'{}',
        credentials:'same-origin',cache:'no-store',
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'SESSION_NOT_PUBLISHED')
      const url=new URL('/'+locale+'/client/session/'+data.selector,window.location.origin)
      url.hash=data.secret
      const value=url.toString()
      setLink(value)
      try{
        await navigator.clipboard.writeText(value)
        setMessage(ru?'Ссылка на полную консультацию скопирована.':'Full consultation page link copied.')
      }catch{
        setMessage(ru?'Ссылка готова. Скопируйте её из поля ниже.':'Copy the invitation from the field below.')
      }
    }catch(error){
      setMessage(error.message==='SESSION_LINK_EXPIRED'
        ? (ru?'Доступ к сессии отозван или истёк. Откройте редактор сессии и обновите приглашение.':'Invitation revoked or expired. Renew it in the session editor.')
        : (ru?'Сначала опубликуйте страницу консультации с вложениями.':'Publish the consultation page and its attachments first.'))
    }finally{setBusy(false)}
  }
  return <div className="consultation-share-session">
    <button type="button" className="consultation-copy" onClick={copy} disabled={busy}>
      {busy?(ru?'Готовим ссылку…':'Preparing…'):(ru?'Копировать ссылку на полную консультацию':'Copy full consultation page link')}
    </button>
    {message&&<p role="status">{message}</p>}
    {link&&<input aria-label={ru?'Ссылка на консультацию':'Consultation page link'}
      type="text" readOnly value={link} onFocus={event=>event.target.select()}/>}
  </div>
}
