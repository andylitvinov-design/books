'use client'
import {useState} from 'react'
import {Globe2,Link2,ShieldCheck,LoaderCircle,AlertCircle} from 'lucide-react'
import {previewPublicGrowthSourceAction} from '@/app/admin/growth-studio/actions'
import styles from './growth-studio.module.css'

const COPY={
  en:{
    button:'Read published page',loading:'Checking public page…',
    explanation:'Read title and description from a public page of the selected site. Never access private client records, translate text, save or publish automatically.',
    noindex:'Page is not publicly indexable or could not be accessed anonymously.',
    invalid_source:'Use a public page on the selected project website without URL parameters, redirects or private paths.',
    source_not_public:'Page is inaccessible, redirects or is marked noindex. Use its final public address.',
    source_not_html:'Only HTML pages can be used for source drafts.',
    source_invalid_html:'Unable to read the public document head.',
    source_missing_metadata:'This page has no public title or description.',
    source_too_large:'Page metadata could not be safely read within the size limit.',
    source_unavailable:'The public source is not available now. Try again later.',
    unauthorized:'Your admin session has expired. Sign in again.',
    preview:'Public source found — review copy before saving.',
  },
  ru:{
    button:'Взять текст с сайта',loading:'Проверяем открытую страницу…',
    explanation:'Загрузить заголовок и описание с открытой страницы выбранного сайта. Никаких данных клиентов, автоматических переводов, сохранений и публикаций.',
    noindex:'Страница не индексируется или недоступна без авторизации.',
    invalid_source:'Укажите открытую страницу выбранного проекта без параметров, переадресации и приватных путей.',
    source_not_public:'Страница недоступна, перенаправляется или закрыта от индексации. Укажите конечную открытую ссылку.',
    source_not_html:'Для создания черновика нужна HTML-страница.',
    source_invalid_html:'Не удалось безопасно прочитать заголовок документа.',
    source_missing_metadata:'У страницы нет публичного заголовка или описания.',
    source_too_large:'Не удалось прочитать метаданные страницы в безопасном лимите размера.',
    source_unavailable:'Источник временно недоступен. Повторите позже.',
    unauthorized:'Сессия администратора истекла. Войдите снова.',
    preview:'Открытая страница найдена. Проверьте текст перед сохранением.',
  },
}
export default function GrowthStudioSourcePicker({
  brand,sourceUrl,locale='en',disabled=false,onApply=()=>{},
}){
  const t=COPY[locale==='ru'?'ru':'en']
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [preview,setPreview]=useState(null)
  async function read(){
    if(busy||disabled||!sourceUrl?.trim())return
    setBusy(true);setMessage('');setPreview(null)
    try{
      const result=await previewPublicGrowthSourceAction({brand,sourceUrl})
      if(!result.ok){setMessage(t[result.error]||t.source_unavailable);return}
      setPreview(result.preview)
      setMessage(t.preview)
    }catch{setMessage(t.source_unavailable)}
    finally{setBusy(false)}
  }
  return <section className={styles.publicSourcePicker}>
    <button type="button" disabled={disabled||busy||!sourceUrl?.trim()}
      onClick={read}><Globe2 size={16} aria-hidden="true"/>{busy?t.loading:t.button}</button>
    <p><ShieldCheck size={14} aria-hidden="true"/>{t.explanation}</p>
    {message&&<p role="status" aria-live="polite">{preview?<Link2 size={15} aria-hidden="true"/>:<AlertCircle size={15} aria-hidden="true"/>}{message}</p>}
    {preview&&<div className={styles.publicSourceResult}>
      <strong>{preview.title}</strong>
      {preview.description&&<p>{preview.description}</p>}
      <small>{preview.language?.toUpperCase()||'—'} · {preview.sourceUrl}</small>
      <button type="button" disabled={busy||disabled}
        onClick={()=>{onApply(preview);setPreview(null)}}>{locale==='ru'?'Добавить в черновик':'Use in draft'}</button>
    </div>}
  </section>
}
