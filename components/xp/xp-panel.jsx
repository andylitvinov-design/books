'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, RefreshCw, Share2, Sparkles, Zap } from 'lucide-react'
import styles from './xp-panel.module.css'

const copy={
  ru:{
    title:'Энергия творчества',available:'Доступно',earned:'Получено за активность',
    paid:'Из оплаченного баланса',invite:'Пригласить друга · +10 XP',
    test:'Первый завершённый тест · +5 XP',video:'Гипнокоррекция · 10 XP',
    topup:'Пополнить баланс',history:'Последние операции',copy:'Скопировать приглашение',
    copied:'Ссылка скопирована',error:'Баллы временно недоступны',referral:'За приглашение',
    assessment:'За завершённый тест',consultation:'За услугу',spend:'Видео',
    sync:'Обновить XP',explainer:'XP нельзя перевести другому человеку или обменять на деньги.',
    off:'Платное списание XP ещё не подключено.',
  },
  en:{
    title:'Creative energy',available:'Available',earned:'Earned through activity',
    paid:'From verified account balance',invite:'Invite a friend · +10 XP',
    test:'First completed assessment · +5 XP',video:'Hypno video · 10 XP',
    topup:'Top up balance',history:'Recent activity',copy:'Copy referral link',
    copied:'Link copied',error:'XP temporarily unavailable',referral:'Referral',
    assessment:'Completed assessment',consultation:'Completed service',spend:'Video',
    sync:'Refresh XP',explainer:'XP cannot be transferred or exchanged for cash.',
    off:'Paid XP redemption is not enabled yet.',
  },
  es:{
    title:'Energía creativa',available:'Disponible',earned:'Ganado por actividad',
    paid:'Del saldo verificado',invite:'Invitar a alguien · +10 XP',
    test:'Primera prueba completada · +5 XP',video:'Video hipno · 10 XP',
    topup:'Recargar saldo',history:'Últimos movimientos',copy:'Copiar enlace',
    copied:'Enlace copiado',error:'XP temporalmente no disponible',referral:'Invitación',
    assessment:'Prueba completada',consultation:'Servicio completado',spend:'Vídeo',
    sync:'Actualizar XP',explainer:'Los XP no se pueden transferir ni cambiar por dinero.',
    off:'Los pagos con XP aún no están activos.',
  },
}
export default function XpPanel({accountId,locale='en'}){
  const t=copy[locale]||copy.en
  const [data,setData]=useState(null)
  const [error,setError]=useState('')
  const [copied,setCopied]=useState(false)
  const load=useCallback(async()=>{
    const headers={'x-hh-account-id':accountId}
    const response=await fetch('/api/app/xp/status',{cache:'no-store',credentials:'same-origin',headers})
    if(!response.ok)throw Error('XP_UNAVAILABLE')
    const state=await response.json()
    setData(state)
  },[accountId])
  const sync=useCallback(async()=>{
    const response=await fetch('/api/app/xp/sync',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json','x-hh-account-id':accountId},
      body:'{}',
    })
    if(!response.ok && response.status!==503)throw Error('XP_UNAVAILABLE')
    await load()
  },[accountId,load])
  useEffect(()=>{
    let alive=true
    void sync().catch(()=>{if(alive)setError(t.error)})
    return ()=>{alive=false}
  },[sync,t.error])
  if(!data?.enabled)return null
  const loc=['en','ru'].includes(locale)?locale:'en'
  const invitation=data.inviteCode?
    '/'+loc+'/xp/invite/'+data.inviteCode:''
  async function copyLink(){
    if(!invitation)return
    try{
      await navigator.clipboard.writeText(window.location.origin+invitation)
      setCopied(true)
    }catch{setError(t.error)}
  }
  return <section className={styles.shell} aria-label={t.title} data-xp-wallet>
    <div className={styles.head}>
      <div><p className={styles.eyebrow}><Sparkles size={16}/>{t.title}</p>
        <h2><Zap size={24} aria-hidden="true"/>{data.balanceXp.toLocaleString()} <span>XP</span></h2>
        <small>{t.available}</small></div>
      <button type="button" onClick={()=>sync().catch(()=>setError(t.error))}
        aria-label={t.sync} className={styles.reload}><RefreshCw size={19}/></button>
    </div>
    <div className={styles.stats}>
      <div><b>{data.earnedXp} XP</b><small>{t.earned}</small></div>
      <div><b>{data.paidXp} XP</b><small>{t.paid}</small></div>
    </div>
    <div className={styles.actions}>
      <button type="button" onClick={copyLink} disabled={!invitation}>
        <Share2 size={17}/>{copied?t.copied:t.invite}</button>
      <Link href={'/'+loc+'/app/wallet#wallet-topup'}><Gift size={17}/>{t.topup}</Link>
    </div>
    <p className={styles.hint}>{t.test} · {t.video}</p>
    {!data.available?.hypno_video && <p className={styles.hint}>{t.off}</p>}
    <p className={styles.foot}>{t.explainer}</p>
    {!!data.history?.length&&<details className={styles.history}>
      <summary>{t.history}</summary>
      {data.history.map((entry,i)=><div key={i}>
        <span>{t[entry.kind]||t.spend}</span>
        <b>{entry.deltaXp>0?'+':''}{entry.deltaXp} XP</b>
      </div>)}
    </details>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </section>
}
