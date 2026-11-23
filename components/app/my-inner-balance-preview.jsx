'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS} from '@/lib/profile/development-vectors.mjs'
import {savedDaybookBalance} from '@/lib/profile/daybook-growth-balance.mjs'
import DevelopmentVectorWheel from './development-vector-wheel'
import ClientLifeContextEditor from './client-life-context-editor'
import styles from './my-inner-balance-preview.module.css'

const COPY={
 en:{edit:'Review or edit my balance',note:'Only your saved self-ratings are displayed here. They are not automatically shared with an AI coach or a practitioner.',loading:'Opening your saved balance…',error:'Your private balance could not be loaded.'},
 ru:{edit:'Посмотреть или изменить мой баланс',note:'Здесь показаны только сохранённые самооценки. Они не передаются автоматически AI-коучу или специалисту.',loading:'Открываем сохранённый баланс…',error:'Не удалось открыть личный баланс.'},
 es:{edit:'Ver o editar mi equilibrio',note:'Solo aparecen tus valoraciones guardadas. No se comparten automáticamente con un coach IA ni con profesionales.',loading:'Cargando tu equilibrio guardado…',error:'No se pudo cargar tu equilibrio privado.'}
}
export default function MyInnerBalancePreview({accountId,locale='en',onSessionLost}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const lost=useRef(onSessionLost)
 useEffect(()=>{lost.current=onSessionLost},[onSessionLost])
 const [snapshot,setSnapshot]=useState({owner:null,loading:true,error:false,vectors:null,goals:null,revision:0})
 useEffect(()=>{
  if(!accountId)return undefined
  let active=true,sequence=0
  const controller=new AbortController()
  const refresh=()=>{
   const token=++sequence
   appFetch('development-goals',undefined,'GET',{accountId,signal:controller.signal})
    .then(result=>{
     if(!active||controller.signal.aborted||token!==sequence)return
     const values=savedDaybookBalance(result)
     setSnapshot({owner:accountId,loading:false,error:false,vectors:values,
      goals:result.goals,revision:result.revision})
    }).catch(error=>{
     if(active&&!controller.signal.aborted&&token===sequence){
      setSnapshot({owner:accountId,loading:false,error:true,vectors:null,goals:null,revision:0})
      if(error.status===401||error.status===403||error.code==='ACCOUNT_CHANGED')lost.current?.()
     }
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
   <>
    <ClientLifeContextEditor key={accountId} accountId={accountId} locale={lang}
     goals={snapshot.goals} revision={snapshot.revision}
     onSessionLost={()=>lost.current?.()}
     onSaved={result=>{
      setSnapshot(previous=>previous.owner!==accountId?previous:{
       owner:accountId,loading:false,error:false,vectors:savedDaybookBalance(result),
       goals:result.goals,revision:result.revision
      })
     }}/>
    <DevelopmentVectorWheel items={INNER_VECTOR_ITEMS} ratings={snapshot.vectors.inner.ratings}
     focusId={snapshot.vectors.inner.focusId} locale={lang} track="inner"/>
   </>}
 </section>
}
