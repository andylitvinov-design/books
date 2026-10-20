'use client'
import {useState} from 'react'
import Link from 'next/link'
import {Search,ShieldCheck,FilePlus2,ExternalLink,AlertCircle,CheckCircle2} from 'lucide-react'
import {
  scanGrowthRadarAction,createGrowthRadarDraftAction,
} from '@/app/admin/growth-studio/content-radar/actions'
import styles from './growth-studio-content-radar.module.css'

const COPY={
  ru:{
    intro:'Один поиск по публичной карте сайта — до 12 материалов для подготовки постов. Проверяется открытая страница, затем создаётся только черновик. Соцсети ничего не получают.',
    locale:'Язык страниц',channel:'Для какой площадки',scan:'Найти материалы',scanning:'Проверяем sitemap…',
    empty:'Подходящих открытых страниц не найдено. Можно использовать обычный редактор.',
    saved:'Черновик уже есть',create:'Подготовить черновик',creating:'Сохраняем…',
    confirm:'Создать один черновик для проверки? Никакая публикация не отправляется.',
    done:'Черновик создан. Откройте Growth Studio, проверьте текст, источник и медиа.',
    reused:'Этот материал уже добавлялся; дубликат не создан.',
    error:'Не удалось проверить источник или хранилище. Ничего не опубликовано.',
    unauthorized:'Время входа истекло. Авторизуйтесь заново.',
    invalid_source:'Материал не разрешён для автоматической подготовки.',
    radar_unavailable:'Публичная карта сайта недоступна. Попробуйте позже.',
    storage_unavailable:'Хранилище черновиков недоступно.',
    source_not_public:'Страница недоступна публично.',
    source_unavailable:'Не удалось прочитать открытую страницу.',
    conflict:'Обнаружен существующий или изменённый черновик.',
    capacity_reached:'Превышен лимит черновиков.',
    sourceDate:'Дата в sitemap — ориентир, не доказательство обновления',
    open:'Открыть страницу',goEditor:'Открыть черновики',
    alreadyNote:'Существующие черновики не изменяются.',
    manual:'Ручной канал',telegram:'Telegram (черновик)',instagram:'Instagram (черновик)',
    facebook:'Facebook (черновик)',linkedin:'LinkedIn (черновик)',threads:'Threads (черновик)',
    bluesky:'Bluesky (черновик)',
    notice:'Никаких данных клиентов, рекламы, автоматических переводов или публикаций. Каждый пост проверяется человеком.',
  },
  en:{
    intro:'One public sitemap scan suggests up to 12 pages for editorial review. Each selection rechecks the publicly available source and creates a draft only. No social platform receives a post.',
    locale:'Page language',channel:'Prepare for',scan:'Find content',scanning:'Checking sitemap…',
    empty:'No eligible public pages found. The regular editor remains available.',
    saved:'Draft already exists',create:'Prepare a draft',creating:'Saving…',
    confirm:'Create one review-only draft? Nothing will be published.',
    done:'Draft created. Open Growth Studio to review the text, source and media.',
    reused:'This source already has a radar draft. No duplicate was created.',
    error:'Source or storage could not be verified. Nothing was published.',
    unauthorized:'Your admin session expired. Sign in again.',
    invalid_source:'This source is not approved for automated preparation.',
    radar_unavailable:'Public sitemap is unavailable. Try again later.',
    storage_unavailable:'Draft storage is unavailable.',
    source_not_public:'The page is not publicly accessible.',
    source_unavailable:'Could not read the public page.',
    conflict:'A saved draft changed or conflicts. Refresh.',
    capacity_reached:'Draft storage limit reached.',
    sourceDate:'Sitemap date is only a hint, not proof of an update',
    open:'View public page',goEditor:'Open my drafts',
    alreadyNote:'Existing drafts will not be changed.',
    manual:'Manual',telegram:'Telegram (draft)',instagram:'Instagram (draft)',
    facebook:'Facebook (draft)',linkedin:'LinkedIn (draft)',threads:'Threads (draft)',
    bluesky:'Bluesky (draft)',
    notice:'No private client data, ad pixels, automatic translations, or publishing. Every post requires owner review.',
  },
}
const CHANNELS=['manual','telegram','instagram','facebook','linkedin','threads','bluesky']
const LOCALES=['en','ru','es']

export default function GrowthStudioContentRadar({initialLocale='en'}){
  const ui=COPY[initialLocale==='ru'?'ru':'en']
  const [locale,setLocale]=useState(initialLocale==='ru'?'ru':'en')
  const [channel,setChannel]=useState('manual')
  const [items,setItems]=useState([])
  const [scanned,setScanned]=useState(false)
  const [busy,setBusy]=useState(false)
  const [saving,setSaving]=useState(null)
  const [message,setMessage]=useState('')
  const [success,setSuccess]=useState(false)

  async function scan(){
    if(busy||saving)return
    setBusy(true);setMessage('');setScanned(false);setSuccess(false);setItems([])
    try{
      const result=await scanGrowthRadarAction({locale})
      if(!result?.ok){setMessage(ui[result?.error]||ui.error);return}
      setItems(result.candidates)
      setScanned(true)
    }catch{setMessage(ui.error)}
    finally{setBusy(false)}
  }
  async function save(item){
    if(busy||saving||item.hasDraft)return
    if(!window.confirm(ui.confirm))return
    setSaving(item.sourceUrl);setMessage('');setSuccess(false)
    try{
      const result=await createGrowthRadarDraftAction({
        sourceUrl:item.sourceUrl,locale,channel,confirmed:true,
      })
      if(!result?.ok){setMessage(ui[result?.error]||ui.error);return}
      setItems(current=>current.map(row=>row.sourceUrl===item.sourceUrl?
        {...row,hasDraft:true}:row))
      setSuccess(true);setMessage(result.reused?ui.reused:ui.done)
    }catch{setMessage(ui.error)}
    finally{setSaving(null)}
  }
  function changeLocale(value){
    setLocale(value);setItems([]);setScanned(false);setMessage('');setSuccess(false)
  }
  return <section className={styles.radar} aria-label="Growth Studio content radar">
    <header className={styles.header}>
      <h2><Search size={22} aria-hidden="true"/>{initialLocale==='ru'?'Публичные материалы → черновики':'Public content → review drafts'}</h2>
      <p>{ui.intro}</p>
    </header>
    <div className={styles.guards}><ShieldCheck size={18} aria-hidden="true"/>{ui.notice}</div>
    <div className={styles.controls}>
      <label>{ui.locale}<select value={locale} onChange={event=>changeLocale(event.target.value)} disabled={busy||Boolean(saving)}>
        {LOCALES.map(lang=><option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
      </select></label>
      <label>{ui.channel}<select value={channel} onChange={event=>setChannel(event.target.value)} disabled={busy||Boolean(saving)}>
        {CHANNELS.map(name=><option value={name} key={name}>{ui[name]}</option>)}
      </select></label>
      <button type="button" className={styles.primary} onClick={scan} disabled={busy||Boolean(saving)}>
        <Search size={17} aria-hidden="true"/>{busy?ui.scanning:ui.scan}
      </button>
    </div>
    {message&&<p role={success?'status':'alert'} aria-live="polite" className={success?styles.good:styles.bad}>
      {success?<CheckCircle2 size={17} aria-hidden="true"/>:<AlertCircle size={17} aria-hidden="true"/>}{message}
      {success&&<> <Link href="/admin/growth-studio">{ui.goEditor} →</Link></>}
    </p>}
    {scanned&&items.length===0&&<p className={styles.empty}>{ui.empty}</p>}
    <div className={styles.results}>
      {items.map(item=><article key={item.sourceUrl} className={styles.card}>
        <p className={styles.path}>{item.sourceUrl.replace('https://holistichouse.vercel.app','')}</p>
        {item.lastmod&&<small>{ui.sourceDate}: {item.lastmod.slice(0,10)}</small>}
        <div className={styles.actions}>
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} aria-hidden="true"/>{ui.open}
          </a>
          <button type="button" disabled={item.hasDraft||Boolean(saving)||busy} onClick={()=>save(item)}>
            {item.hasDraft?<CheckCircle2 size={16} aria-hidden="true"/>:<FilePlus2 size={16} aria-hidden="true"/>}
            {item.hasDraft?ui.saved:saving===item.sourceUrl?ui.creating:ui.create}
          </button>
        </div>
        {item.hasDraft&&<small>{ui.alreadyNote}</small>}
      </article>)}
    </div>
    <footer><Link href="/admin/growth-studio">← {ui.goEditor}</Link></footer>
  </section>
}
