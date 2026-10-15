'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './saved-session-management.module.css'

export function SavedSessionManagement({id,locale='en'}){
  const ru=locale==='ru',router=useRouter()
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function remove(){
    if(busy)return
    if(!window.confirm(ru?'Убрать эту сессию из Google-кабинета? Исходный отчёт у специалиста не удалится.':
      'Remove this session from Google Cabinet? The practitioner’s original is not deleted.'))return
    setBusy(true);setError('')
    try{
      await appFetch('saved-sessions/'+encodeURIComponent(id)+'/remove',{})
      router.replace('/'+locale+'/app/portrait#personal-reports')
      router.refresh()
    }catch{
      setError(ru?'Не удалось удалить сохранённую сессию. Повторите попытку.':
        'Could not remove this saved session. Please retry.')
      setBusy(false)
    }
  }
  return <section className={styles.wrap}>
    <details><summary>{ru?'Управление сохранённой сессией':'Manage saved session'}</summary>
      <p>{ru?'Сессия принадлежит только вашему Google-аккаунту. Она не открывает другие консультации.':
        'Only your Google Account can open this saved session. Other consultations remain private.'}</p>
      <button type="button" disabled={busy} onClick={remove}>
        {busy?(ru?'Удаляем…':'Removing…'):(ru?'Убрать из моего кабинета':'Remove from My Cabinet')}
      </button>
      {error&&<p role="alert">{error}</p>}
    </details>
  </section>
}
