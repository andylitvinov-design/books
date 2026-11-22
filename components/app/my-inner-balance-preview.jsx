'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS,emptyDevelopmentVectors,normalizeDevelopmentVectors} from '@/lib/profile/development-vectors.mjs'
import DevelopmentVectorWheel from './development-vector-wheel'
import styles from './my-inner-balance-preview.module.css'

const COPY={
 en:{edit:'Review or edit my balance',note:'Only your saved self-ratings are displayed here. They are not automatically shared with an AI coach or a practitioner.',loading:'Opening your saved balance…',error:'Your private balance could not be loaded.'},
 ru:{edit:'Посмотреть или изменить мой баланс',note:'Здесь показаны только сохранённые самооценки. Они не передаются автоматически AI-коучу или специалисту.',loading:'Открываем сохранённый баланс…',error:'Не удалось открыть личный баланс.'},
 es:{edit:'Ver o editar mi equilibrio',note:'Solo aparecen tus valoraciones guardadas. No se comparten automáticamente con un coach IA ni con profesionales.',loading:'Cargando tu equilibrio guardado…',error:'No se pudo cargar tu equilibrio privado.'}
}
export default function MyInnerBalancePreview({accountId,locale='en'}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [snapshot,setSnapshot]=useState({owner:null,loading:true,error:false,vectors:null})
 useEffect(()=>{
  if(!accountId)return undefined
  let active=true
  const controller=new AbortController()
  const refresh=()=>{
   appFetch('development-goals',undefined,'GET',{accountId,signal:controller.signal})
    .then(result=>{
     if(!active||controller.signal.aborted)return
     const values=normalizeDevelopmentVectors(result?.goals?.vectors)||emptyDevelopmentVectors()
     setSnapshot({owner:accountId,loading:false,error:false,vectors:values})
    }).catch(()=>{
     if(active&&!controller.signal.aborted)
      setSnapshot({owner:accountId,loading:false,error:true,vectors:null})
    })
  }
  refresh()
  window.addEventListener('hh:development-vectors-saved',refresh)
  return ()=>{
   active=false;controller.abort()
   window.removeEventListener('hh:development-vectors-saved',refresh)
  }
 },[accountId])
 if(!accountId)return null
 const own=snapshot.owner===accountId
 return <section className={styles.section} data-my-context-inner-balance>
  <div className={styles.top}>
   <p>{t.note}</p>
   <Link href={'/'+lang+'/development-vectors'}>{t.edit}</Link>
  </div>
  {!own||snapshot.loading?<p role="status" className={styles.status}>{t.loading}</p>:
   snapshot.error?<p role="alert" className={styles.status}>{t.error}</p>:
   <DevelopmentVectorWheel items={INNER_VECTOR_ITEMS} ratings={snapshot.vectors.inner.ratings}
    focusId={snapshot.vectors.inner.focusId} locale={lang} track="inner"/>}
 </section>
}
