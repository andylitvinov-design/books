'use client'
import {useActionState,useState} from 'react'
import {ConsultationClientSelector} from './consultation-client-selector'
import './consultation-studio.css'

export function PdfReportStartForm({clients,selectedClientId,locale='en',requestId,action}) {
  const ru=locale==='ru'
  const [state,submit,pending]=useActionState(action,null)
  const [language,setLanguage]=useState(clients.find(c=>c.id===selectedClientId)?.preferredLocale||locale)
  return <form action={submit} style={{display:'grid',gap:16,maxWidth:760,margin:'0 auto',padding:18,background:'#fff',border:'1px solid #dce6e3',borderRadius:18}}>
    <input type="hidden" name="requestId" value={requestId}/>
    <ConsultationClientSelector clients={clients} selectedClientId={selectedClientId} uiLocale={locale}
      onClientChange={client=>setLanguage(client.preferredLocale==='ru'?'ru':'en')}/>
    <label>{ru?'Название отчёта':'Report title'}<input name="title" required maxLength={160}
      defaultValue={ru?'Персональный отчёт':'Personal report'} style={{display:'block',width:'100%',padding:12,marginTop:6}}/></label>
    <label>{ru?'Дата консультации':'Consultation date'}<input type="date" name="dateIssued" required
      defaultValue={new Date().toISOString().slice(0,10)} style={{display:'block',width:'100%',padding:12,marginTop:6}}/></label>
    <label>{ru?'Язык ссылки':'Link language'}<select name="languagePreference" value={language} onChange={event=>setLanguage(event.target.value)}
      style={{display:'block',width:'100%',padding:12,marginTop:6}}><option value="ru">Русский</option><option value="en">English</option></select></label>
    <p>{ru?'Укажите проверенный email клиента в его карточке: он понадобится для безопасной привязки Google-аккаунта. После выбора клиента откроется загрузка PDF.':
      'Keep the client’s verified email in the client record for secure Google-account linking. The PDF uploader opens next.'}</p>
    {state?.error&&<p role="alert">{state.error}</p>}
    <button type="submit" disabled={pending} style={{padding:15,border:0,borderRadius:12,background:'#204d51',color:'#fff',fontWeight:700}}>
      {pending?(ru?'Создаём…':'Creating…'):(ru?'Продолжить к загрузке PDF':'Continue to PDF upload')}</button>
  </form>
}
