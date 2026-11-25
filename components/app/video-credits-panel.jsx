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
    error:'Баланс временно недоступен',
    v2Hint:'Новым аккаунтам — 1 900 XP один раз. У существующих клиентов история баланса и прежние начисления сохраняются.',
    v2Title:'Тарифы Video Studio',pending:'Функция ещё не включена',
    priceLabels:{basic:'Персональный ролик',live_gift:'Живое фото · HeyGen',cinematic:'Cinematic',cinematic_premium:'Cinematic Premium'}},
  en:{title:'Video credits',available:'Available',starter:'Starter and permanent',
    monthly:'This month',price:'Per finished video',reload:'Refresh',
    history:'Recent transactions',video:'Create video',bonus:'Starter bonus',
    renewal:'Monthly allowance',charge:'Video generation',
    hint:'1,300 credits at first sign-in, then 300 each month. Unused monthly credits do not roll over.',
    error:'Balance is temporarily unavailable',
    v2Hint:'New accounts receive 1,900 XP once. Existing clients retain their historical credits and grants.',
    v2Title:'Video Studio prices',pending:'Not enabled yet',
    priceLabels:{basic:'Personal video',live_gift:'Live Photo · HeyGen',cinematic:'Cinematic',cinematic_premium:'Cinematic Premium'}},
  es:{title:'Créditos de vídeo',available:'Disponible',starter:'Iniciales y permanentes',
    monthly:'Este mes',price:'Por vídeo terminado',reload:'Actualizar',
    history:'Operaciones recientes',video:'Crear vídeo',bonus:'Bono inicial',
    renewal:'Asignación mensual',charge:'Crear vídeo',
    hint:'1.300 créditos al iniciar por primera vez y luego 300 al mes. Los créditos mensuales no se acumulan.',
    error:'Saldo temporalmente no disponible',
    v2Hint:'Las cuentas nuevas reciben 1.900 XP una sola vez. Los clientes anteriores conservan su historial.',
    v2Title:'Precios Video Studio',pending:'Aún no disponible',
    priceLabels:{basic:'Vídeo personal',live_gift:'Foto viva · HeyGen',cinematic:'Cinematic',cinematic_premium:'Cinematic Premium'}},
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
  const v2=status.pricingModel==='xp-v2'
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
    <p className={styles.hint}>{v2?t.v2Hint:t.hint}</p>
    {v2&&status.pricesXp?<section data-video-xp-pricebook aria-label={t.v2Title}
      style={{borderTop:'1px solid #d3e5e1',marginTop:10,paddingTop:12}}>
      <h3 style={{margin:'0 0 8px',fontSize:16}}>{t.v2Title}</h3>
      {Object.entries(status.pricesXp).map(([sku,price])=>
        <div key={sku} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          gap:12,padding:'7px 0',borderBottom:'1px solid #e4eeee'}}>
          <div style={{display:'grid',gap:2}}>
            <strong style={{fontSize:13}}>{t.priceLabels[sku]||sku}</strong>
            {status.productReady?.[sku]!==true?<small style={{opacity:.75}}>{t.pending}</small>:null}
          </div>
          <b style={{whiteSpace:'nowrap'}}>{fmt(price)} XP</b>
        </div>)}
    </section>:null}
    <Link className={styles.create} href={'/'+(locale==='es'?'en':locale)+'/holistic-support/mandala'}>{t.video}</Link>
    {status.history?.length>0?<details className={styles.history}>
      <summary>{t.history}</summary>
      {status.history.map((item,index)=><div key={item.operationId||index}>
        <span>{item.kind==='starter'?t.bonus:item.kind==='monthly'?t.renewal:(v2&&item.sku&&t.priceLabels[item.sku]||t.charge)}</span>
        <b>{item.delta>0?'+':''}{fmt(item.delta)} XP</b>
      </div>)}
    </details>:null}
    {error?<p role="alert">{error}</p>:null}
  </section>
}
