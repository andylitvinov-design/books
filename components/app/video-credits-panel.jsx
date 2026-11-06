'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import styles from './video-credits-panel.module.css'

const copy={
  ru:{title:'Кредиты для видео',available:'Доступно',starter:'Стартовые и постоянные',
    monthly:'В этом месяце',price:'За один готовый ролик',reload:'Обновить',
    history:'История операций',video:'Создать видео',bonus:'Стартовый бонус',
    renewal:'Ежемесячное начисление',charge:'Создание видео',
    hint:'1 300 кредитов при первом входе, затем 300 каждый месяц. Месячный остаток не переносится.',
    error:'Баланс временно недоступен'},
  en:{title:'Video credits',available:'Available',starter:'Starter and permanent',
    monthly:'This month',price:'Per finished video',reload:'Refresh',
    history:'Recent transactions',video:'Create video',bonus:'Starter bonus',
    renewal:'Monthly allowance',charge:'Video generation',
    hint:'1,300 credits at first sign-in, then 300 each month. Unused monthly credits do not roll over.',
    error:'Balance is temporarily unavailable'},
  es:{title:'Créditos de vídeo',available:'Disponible',starter:'Iniciales y permanentes',
    monthly:'Este mes',price:'Por vídeo terminado',reload:'Actualizar',
    history:'Operaciones recientes',video:'Crear vídeo',bonus:'Bono inicial',
    renewal:'Asignación mensual',charge:'Crear vídeo',
    hint:'1.300 créditos al iniciar por primera vez y luego 300 al mes. Los créditos mensuales no se acumulan.',
    error:'Saldo temporalmente no disponible'},
}
export default function VideoCreditsPanel({locale='en',accountId}){
  const t=copy[locale]||copy.en
  const [status,setStatus]=useState(null)
  const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    const catalogResponse=await fetch('/api/app/video-credits/catalog',{
      cache:'no-store',credentials:'same-origin'})
    if(!catalogResponse.ok)throw Error('CATALOG_UNAVAILABLE')
    const catalog=await catalogResponse.json()
    if(!catalog.ready){setStatus(null);return}
    const response=await fetch('/api/app/video-credits/status',{
      cache:'no-store',credentials:'same-origin',
      headers:{'x-hh-account-id':accountId}})
    if(!response.ok)throw Error('CREDITS_UNAVAILABLE')
    setStatus(await response.json())
    setError('')
  },[accountId])
  useEffect(()=>{
    let active=true
    void refresh().catch(()=>{if(active)setError(t.error)})
    return()=>{active=false}
  },[refresh,t.error])
  // No provisional balance is displayed when the production ledger is disabled.
  if(!status?.ready)return null
  const fmt=v=>Number.isSafeInteger(v)?v.toLocaleString(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-US'):'—'
  return <section className={styles.panel} data-video-credits-panel aria-label={t.title}>
    <div className={styles.heading}>
      <div><small>HOLISTIC HOUSE · XP</small><h2>{t.title}</h2></div>
      <button type="button" onClick={()=>void refresh().catch(()=>setError(t.error))}>{t.reload}</button>
    </div>
    <strong className={styles.total}>{fmt(status.balanceCredits)} XP <small>{t.available}</small></strong>
    <div className={styles.stats}>
      <span><b>{fmt(status.starterCredits)} XP</b><small>{t.starter}</small></span>
      <span><b>{fmt(status.monthlyCredits)} XP</b><small>{t.monthly}</small></span>
      <span><b>{fmt(status.priceCredits)} XP</b><small>{t.price}</small></span>
    </div>
    <p className={styles.hint}>{t.hint}</p>
    <Link className={styles.create} href={'/'+(locale==='es'?'en':locale)+'/holistic-support/mandala'}>{t.video}</Link>
    {status.history?.length>0?<details className={styles.history}>
      <summary>{t.history}</summary>
      {status.history.map((item,index)=><div key={item.operationId||index}>
        <span>{item.kind==='starter'?t.bonus:item.kind==='monthly'?t.renewal:t.charge}</span>
        <b>{item.delta>0?'+':''}{fmt(item.delta)} XP</b>
      </div>)}
    </details>:null}
    {error?<p role="alert">{error}</p>:null}
  </section>
}
