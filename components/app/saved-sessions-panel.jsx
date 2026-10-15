'use client'
import Link from 'next/link'
import {BookOpen,ChevronRight,FileText} from 'lucide-react'
import styles from './saved-sessions-panel.module.css'

// Only independently, explicitly saved session references are listed. No
// automatic join to the legacy client dossier or their other consultation IDs.
export function SavedSessionsPanel({items=[],locale='en'}){
 const ru=locale==='ru'
 if(!Array.isArray(items)||!items.length)return null
 return <section className={styles.panel} aria-label={ru?'Сохранённые консультации':'Saved consultations'}>
   <header className={styles.heading}>
     <span className={styles.icon}><BookOpen size={22}/></span>
     <div><span className={styles.kicker}>{ru?'ЛИЧНАЯ БИБЛИОТЕКА':'YOUR PERSONAL LIBRARY'}</span>
       <h2>{ru?'Мои сохранённые консультации':'My saved consultations'}</h2>
       <p>{ru?'Консультации, которые вы самостоятельно добавили в этот Google-кабинет.':
         'Only the consultations you deliberately saved to this Google Account.'}</p></div>
   </header>
   <div className={styles.list}>
     {items.map(row=><Link key={row.id} prefetch={false} href={'/'+locale+'/app/sessions/'+row.id} className={styles.item}>
       <FileText size={23} aria-hidden="true"/><span><strong>{ru?'Личная консультация':'Personal consultation'}</strong>
       <small>{row.occurredOn}{row.available===false?' · '+(ru?'Обновление требуется':'Update required'):''}</small></span>
       <ChevronRight size={19} aria-hidden="true"/>
     </Link>)}
   </div>
 </section>
}
