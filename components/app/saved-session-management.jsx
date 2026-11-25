'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './saved-sessions-panel.module.css'

export function SavedSessionManagement({locale='en',savedId,savedAt}){
 const ru=locale==='ru'
 const router=useRouter()
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 async function remove(){
   if(busy)return
   if(!window.confirm(ru?'Убрать только эту консультацию из Google-кабинета? Исходный отчёт специалиста останется без изменений.':
     'Remove only this consultation from your Google Cabinet? The original practitioner report is unchanged.'))return
   setBusy(true);setError('')
   try{
     await appFetch('saved-sessions/'+encodeURIComponent(savedId)+'/remove',{})
     router.replace('/'+locale+'/app/portrait#personal-reports')
     router.refresh()
   }catch{
     setError(ru?'Не удалось убрать консультацию. Повторите попытку.':
       'Could not remove the saved consultation. Please retry.')
     setBusy(false)
   }
 }
 return <section className={styles.management} aria-label={ru?'Управление сохранением':'Manage saved consultation'}>
   <details><summary>{ru?'Управление сохранением':'Manage saved consultation'}</summary>
     <p>{ru?'Сохранено в выбранном Google-кабинете':'Saved to your chosen Google Cabinet'}:{' '}
       {new Date(savedAt).toLocaleDateString(ru?'ru-RU':'en-CA')}</p>
     <button disabled={busy} onClick={remove} type="button">
       {busy?(ru?'Удаляем…':'Removing…'):(ru?'Убрать из моего кабинета':'Remove from my Cabinet')}
     </button>
     <p>{ru?'Это действие не отзывает исходную защищённую ссылку и не меняет назначение.':
       'This does not revoke the original session invitation or change the prescription.'}</p>
     {error&&<p role="alert">{error}</p>}
   </details>
 </section>
}
