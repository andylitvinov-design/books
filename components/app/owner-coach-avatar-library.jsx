'use client'
import {useEffect,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './owner-coach-avatar-library.module.css'

const COPY={
  en:{
    title:'Our generated coach avatars',
    intro:'Eight existing 5-second clips of Mira, Sofia, Max and Alex. These site-owned presets are shared with the public site, but your selection is personal.',
    calm:'Calm',attentive:'Attentive',
    remove:'Remove from my avatars',restore:'Restore to my avatars',
    showHidden:'Show removed',hideHidden:'Hide removed',
    removed:'Removed from your Cabinet only. The site and other accounts are unchanged.',
    restored:'Restored to your Cabinet.',
    confirm:'Remove this shared coach avatar from your Cabinet? The public site will not change.',
    empty:'No avatars shown. You can restore removed presets.',
    error:'Avatar library is temporarily unavailable. Try again.',
    busy:'Updating…',hidden:'Removed from Cabinet',notice:'Only your personal selection changes. Public coach videos cannot be deleted here.',
  },
  ru:{
    title:'Наши сгенерированные аватары коучей',
    intro:'Восемь готовых 5-секундных роликов Миры, Софии, Макса и Алекса. Они используются на сайте, но ваш список в кабинете настраивается отдельно.',
    calm:'Спокойный',attentive:'Внимательный',
    remove:'Убрать из моих аватаров',restore:'Вернуть в мои аватары',
    showHidden:'Показать убранные',hideHidden:'Скрыть убранные',
    removed:'Аватар убран только из вашего кабинета. Сайт и другие аккаунты не изменились.',
    restored:'Аватар возвращён в ваш кабинет.',
    confirm:'Убрать этот общий аватар коуча из кабинета? На публичном сайте он останется.',
    empty:'В списке нет аватаров. Вы можете вернуть убранные.',
    error:'Библиотека аватаров временно недоступна. Повторите попытку.',
    busy:'Сохраняем…',hidden:'Убран из кабинета',notice:'Меняется только ваш личный список. Удалить публичные видео коучей здесь нельзя.',
  },
  es:{
    title:'Nuestros avatares de coaches generados',
    intro:'Ocho vídeos existentes de 5 segundos de Mira, Sofía, Max y Alex. Son recursos compartidos del sitio, pero tú controlas tu lista personal.',
    calm:'Tranquilo',attentive:'Atento',
    remove:'Quitar de mis avatares',restore:'Restaurar en mis avatares',
    showHidden:'Mostrar retirados',hideHidden:'Ocultar retirados',
    removed:'Retirado solo de tu cuenta. El sitio público y otras cuentas no cambian.',
    restored:'Restaurado en tu cuenta.',
    confirm:'¿Quitar este avatar compartido de tu cuenta? Seguirá en el sitio público.',
    empty:'No hay avatares visibles. Puedes restaurar los retirados.',
    error:'La biblioteca no está disponible ahora. Inténtalo de nuevo.',
    busy:'Guardando…',hidden:'Retirado de la cuenta',notice:'Solo cambias tu selección personal. Los vídeos públicos no se borran aquí.',
  },
}
export default function OwnerCoachAvatarLibrary({accountId,locale='en'}){
  const tab=useSearchParams()?.get('tab')
  const t=COPY[locale]||COPY.en
  const [state,setState]=useState('loading')
  const [avatars,setAvatars]=useState([])
  const [hiddenIds,setHiddenIds]=useState([])
  const [showHidden,setShowHidden]=useState(false)
  const [busyId,setBusyId]=useState('')
  const [message,setMessage]=useState('')
  useEffect(()=>{
    if(tab!=='avatars')return
    let live=true
    setState('loading');setAvatars([]);setHiddenIds([]);setMessage('')
    void appFetch('site-coach-avatars',undefined,'GET',{accountId})
      .then(result=>{
        if(!live)return
        setAvatars(Array.isArray(result.avatars)?result.avatars:[])
        setHiddenIds(Array.isArray(result.hiddenIds)?result.hiddenIds:[])
        setState('ready')
      }).catch(error=>{
        if(live)setState(error?.code==='ACCESS_DENIED'?'not-owner':'error')
      })
    return()=>{live=false}
  },[accountId,tab])
  if(tab!=='avatars'||state==='not-owner')return null
  async function update(item,hidden){
    if(busyId)return
    if(!hidden&&!window.confirm(t.confirm))return
    setBusyId(item.id);setMessage('')
    try{
      await appFetch('site-coach-avatars',{id:item.id},hidden?'POST':'DELETE',{accountId})
      setHiddenIds(current=>hidden?
        current.filter(id=>id!==item.id):[...new Set([...current,item.id])])
      setMessage(hidden?t.restored:t.removed)
    }catch{setMessage(t.error)}
    finally{setBusyId('')}
  }
  const hidden=new Set(hiddenIds)
  const shown=avatars.filter(item=>showHidden||!hidden.has(item.id))
  return <section className={styles.library} data-owner-coach-avatars aria-label={t.title}>
    <div className={styles.heading}>
      <div><h2>{t.title}</h2><p>{t.intro}</p></div>
      {state==='ready'&&hidden.size>0&&<button type="button"
        className={styles.toggle} onClick={()=>setShowHidden(value=>!value)}>
        {showHidden?t.hideHidden:t.showHidden} ({hidden.size})
      </button>}
    </div>
    {state==='error'&&<p role="alert">{t.error}</p>}
    {state==='ready'&&<>
      {shown.length===0&&<p role="status">{t.empty}</p>}
      <div className={styles.grid}>{shown.map(item=>
        <article className={styles.item} key={item.id}>
          <video className={styles.video} src={item.video} poster={item.poster}
            controls playsInline preload="none" aria-label={(item.names?.[locale]||item.personaId)+' '+t[item.take]}/>
          <div className={styles.itemMeta}>
            <strong>{item.names?.[locale]||item.personaId}</strong>
            <span>{t[item.take]} · 5 s</span>
          </div>
          {hidden.has(item.id)&&<p className={styles.hidden}>{t.hidden}</p>}
          <button type="button" className={styles.action} disabled={Boolean(busyId)}
            onClick={()=>void update(item,hidden.has(item.id))}>
            {busyId===item.id?t.busy:hidden.has(item.id)?t.restore:t.remove}
          </button>
        </article>)}
      </div>
      <p className={styles.note}>{t.notice}</p>
    </>}
    {message&&<p role="status" aria-live="polite" className={styles.status}>{message}</p>}
  </section>
}
