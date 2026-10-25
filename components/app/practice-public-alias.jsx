'use client'
import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Link2 } from 'lucide-react'
import { PROFILE_ALIAS_PATTERN, PROFILE_ALIAS_RESERVED } from '@/lib/practitioners/profile-alias-contract.mjs'
import styles from './practice-public-alias.module.css'

const copy={
  en:{
    kicker:'YOUR PUBLIC PAGE', title:'Choose your short link',
    description:'An easy address to put on your business card, social media or message to a client.',
    label:'Your personal link', placeholder:'your-name',check:'Check',save:'Save link',
    checking:'Checking…',saving:'Saving…',available:'This address is available.',
    taken:'This address is already taken.',invalid:'Use 3–24 Latin letters, numbers and single hyphens.',
    reserved:'This address is reserved.',saved:'Address saved. Previous links still work.',
    copy:'Copy',copied:'Link copied',view:'View page',
    unpublished:'You can reserve a link now. It becomes public when your profile is approved.',
    error:'Could not save the address. Try again.',
    limit:'You have reached the limit of five historical addresses.',
    signIn:'Sign in to save the link.',rate:'Too many attempts. Please try again later.',
    copyFallback:'Select the link above to copy it.', current:'Your active address',
  },
  ru:{
    kicker:'ВАША ПУБЛИЧНАЯ СТРАНИЦА',title:'Короткий адрес мастера',
    description:'Удобная ссылка для визитки, социальных сетей и сообщений клиентам.',
    label:'Ваш персональный адрес',placeholder:'vashe-imya',check:'Проверить',save:'Сохранить',
    checking:'Проверяем…',saving:'Сохраняем…',available:'Адрес свободен.',
    taken:'Адрес уже занят.',invalid:'От 3 до 24 латинских букв, цифры и одинарные дефисы.',
    reserved:'Этот адрес зарезервирован.',saved:'Адрес сохранён. Старые ссылки продолжат работать.',
    copy:'Копировать',copied:'Ссылка скопирована',view:'Открыть страницу',
    unpublished:'Можете выбрать адрес сейчас. Страница станет публичной после проверки профиля.',
    error:'Не удалось сохранить адрес. Попробуйте ещё раз.',
    limit:'Достигнут лимит пяти исторических адресов.',
    signIn:'Войдите, чтобы сохранить адрес.',rate:'Слишком много попыток. Повторите позже.',
    copyFallback:'Выделите и скопируйте адрес выше.',current:'Ваш активный адрес',
  },
  es:{
    kicker:'TU PÁGINA PÚBLICA',title:'Elige un enlace corto',
    description:'Una dirección fácil de compartir con clientes o en redes sociales.',
    label:'Tu dirección personal',placeholder:'tu-nombre',check:'Comprobar',save:'Guardar',
    checking:'Comprobando…',saving:'Guardando…',available:'Dirección disponible.',
    taken:'La dirección ya está ocupada.',invalid:'Usa de 3 a 24 letras latinas, números y guiones sencillos.',
    reserved:'Esta dirección está reservada.',saved:'Dirección guardada. Los enlaces antiguos siguen funcionando.',
    copy:'Copiar',copied:'Enlace copiado',view:'Ver página',
    unpublished:'Puedes reservarla ahora. La página será pública después de la aprobación.',
    error:'No se pudo guardar la dirección. Inténtalo de nuevo.',
    limit:'Has alcanzado el límite de cinco direcciones históricas.',
    signIn:'Inicia sesión para guardar.',rate:'Demasiados intentos. Inténtalo más tarde.',
    copyFallback:'Selecciona y copia el enlace de arriba.',current:'Tu dirección activa',
  },
}

function message(error,t){
  return error==='INVALID_ALIAS'?t.invalid:
    error==='ALIAS_RESERVED'?t.reserved:
    error==='ALIAS_TAKEN'?t.taken:
    error==='ALIAS_CHANGE_LIMIT'?t.limit:
    error==='SIGN_IN_REQUIRED'||error==='ACCOUNT_REQUIRED'?t.signIn:
    error==='RATE_LIMITED'?t.rate:t.error
}
const PUBLIC_ORIGIN='https://holistichouse.vercel.app'
const shortPath=(locale,alias)=>(locale==='en'?'/m/':'/'+locale+'/m/')+alias

export default function PracticePublicAlias({practitioner,locale='en',profileLive=false,onSaved}){
  const t=copy[locale]||copy.en
  const id=useId()
  const alias=practitioner?.publicAlias||''
  const [draft,setDraft]=useState(alias)
  const [checking,setChecking]=useState(false)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [tone,setTone]=useState('')
  useEffect(()=>{setDraft(alias)},[alias])
  const candidate=draft.trim().toLowerCase()
  const valid=PROFILE_ALIAS_PATTERN.test(candidate)&&!candidate.includes('--')&&!PROFILE_ALIAS_RESERVED.has(candidate)
  const url=alias?PUBLIC_ORIGIN+shortPath(locale,alias):''
  function change(value){setDraft(value.toLowerCase());setNotice('');setTone('')}
  function localValidation(){
    if(!PROFILE_ALIAS_PATTERN.test(candidate)||candidate.includes('--'))return t.invalid
    if(PROFILE_ALIAS_RESERVED.has(candidate))return t.reserved
    return null
  }
  async function check(){
    const warning=localValidation()
    if(warning){setNotice(warning);setTone('error');return}
    setChecking(true);setNotice('');setTone('')
    try{
      const response=await fetch('/api/app/practice/alias?alias='+encodeURIComponent(candidate),{
        credentials:'same-origin',cache:'no-store',
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw Object.assign(new Error(result.error||'REQUEST_FAILED'),{code:result.error})
      setNotice(result.available?t.available:t.taken)
      setTone(result.available?'success':'error')
    }catch(error){setNotice(message(error.code,t));setTone('error')}
    finally{setChecking(false)}
  }
  async function save(event){
    event.preventDefault()
    const warning=localValidation()
    if(warning){setNotice(warning);setTone('error');return}
    setSaving(true);setNotice('');setTone('')
    try{
      const response=await fetch('/api/app/practice/alias',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({alias:candidate}),
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw Object.assign(new Error(result.error||'REQUEST_FAILED'),{code:result.error})
      setNotice(t.saved);setTone('success')
      await onSaved?.()
    }catch(error){setNotice(message(error.code,t));setTone('error')}
    finally{setSaving(false)}
  }
  async function copyLink(){
    if(!url||!profileLive)return
    try{
      if(!navigator.clipboard?.writeText)throw new Error('COPY_UNAVAILABLE')
      await navigator.clipboard.writeText(url)
      setNotice(t.copied);setTone('success')
    }catch{
      setNotice(t.copyFallback);setTone('error')
    }
  }
  return <section className={styles.card} aria-labelledby={id+'-title'} data-practice-public-alias>
    <div className={styles.heading}>
      <span className={styles.icon}><Link2 aria-hidden="true"/></span>
      <div><p className={styles.kicker}>{t.kicker}</p>
        <h2 id={id+'-title'}>{t.title}</h2>
        <p className={styles.description}>{t.description}</p>
      </div>
    </div>
    <form className={styles.form} onSubmit={save}>
      <label htmlFor={id+'-handle'}>{t.label}</label>
      <div className={styles.field}>
        <span className={styles.prefix} aria-hidden="true">holistichouse.vercel.app/m/</span>
        <input id={id+'-handle'} type="text" inputMode="url" autoCapitalize="none"
          autoCorrect="off" autoComplete="off" spellCheck={false}
          maxLength={24} placeholder={t.placeholder} value={draft}
          onChange={event=>change(event.target.value)}
          aria-describedby={id+'-hint'}/>
      </div>
      <p className={styles.hint} id={id+'-hint'}>{t.invalid}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={checking||saving||!valid}
          onClick={check}>{checking?t.checking:t.check}</button>
        <button type="submit" className={styles.primary} disabled={saving||checking||!valid||candidate===alias}>
          {saving?t.saving:t.save}</button>
      </div>
    </form>
    {notice&&<p className={tone==='error'?styles.error:styles.success}
      role={tone==='error'?'alert':'status'}>{notice}</p>}
    {alias&&<div className={styles.published}>
      <div className={styles.activeLink}><small>{t.current}</small><span>{url}</span></div>
      {profileLive&&<div className={styles.share}>
        <Link href={shortPath(locale,alias)} prefetch={false} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true"/>{t.view}</Link>
        <button type="button" onClick={copyLink}><Copy aria-hidden="true"/>{t.copy}</button>
      </div>}
    </div>}
    {!profileLive&&<p className={styles.unpublished}><CheckCircle2 aria-hidden="true"/>{t.unpublished}</p>}
  </section>
}
