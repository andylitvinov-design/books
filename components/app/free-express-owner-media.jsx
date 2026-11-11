'use client'
import Image from 'next/image'
import {useEffect,useState} from 'react'
import styles from './free-express-owner-media.module.css'

const copy={
  en:{open:'Private photos / drawing',close:'Hide private media',loading:'Checking private files…',empty:'No images have been received with this request.',error:'Unable to verify protected files. Retry after checking your owner account.',portrait:'Client photo',drawing:'ME — GOAL — PROBLEM drawing',privacy:'Visible only to the verified practice owner. Never forward screenshots through messengers.'},
  ru:{open:'Фото и рисунок заявки',close:'Скрыть личные материалы',loading:'Проверяем защищённые материалы…',empty:'К этой заявке изображения пока не прикреплены.',error:'Не удалось проверить приватные файлы. Повторите под учётной записью владельца.',portrait:'Фото клиента',drawing:'Рисунок «Я — ЦЕЛЬ — ПРОБЛЕМА»',privacy:'Видно только подтверждённому владельцу практики. Не пересылайте скриншоты в мессенджерах.'},
  es:{open:'Foto y dibujo privados',close:'Ocultar materiales privados',loading:'Comprobando archivos privados…',empty:'No hay imágenes asociadas a esta solicitud.',error:'No pudimos verificar los archivos protegidos. Comprueba la cuenta del profesional.',portrait:'Foto del cliente',drawing:'Dibujo YO — META — PROBLEMA',privacy:'Solo para el profesional autenticado. No reenvíes capturas por mensajería.'},
}
export default function FreeExpressOwnerMedia({request,locale='en'}){
  const t=copy[locale]||copy.en
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [flags,setFlags]=useState(null)
  const [error,setError]=useState('')
  const target='/api/app/practice/free-express/'+encodeURIComponent(request.id)+'/media'
  useEffect(()=>{setOpen(false);setFlags(null);setError('')},[request.id])
  async function load(){
    if(busy)return
    if(open){setOpen(false);return}
    setOpen(true);setBusy(true);setError('')
    try{
      const result=await fetch(target,{method:'GET',credentials:'same-origin',cache:'no-store'})
      if(!result.ok)throw new Error('UNAVAILABLE')
      const data=await result.json()
      if(typeof data.portrait!=='boolean'||typeof data.drawing!=='boolean')throw new Error('UNAVAILABLE')
      setFlags(data)
    }catch{setError(t.error);setFlags(null)}
    finally{setBusy(false)}
  }
  return <section className={styles.root} data-free-express-owner-media>
    <button type="button" className={styles.toggle} aria-expanded={open} disabled={busy}
      onClick={()=>{void load()}}>{open?t.close:t.open}</button>
    {open&&<div className={styles.panel}>
      {busy&&<p role="status">{t.loading}</p>}
      {error&&<p role="alert">{error}</p>}
      {flags&&!flags.portrait&&!flags.drawing&&<p>{t.empty}</p>}
      {flags&&(flags.portrait||flags.drawing)&&<div className={styles.grid}>
        {(['portrait','drawing']).filter(kind=>flags[kind]).map(kind=><figure key={kind}>
          <figcaption>{t[kind]}</figcaption>
          <Image src={target+'/'+kind} alt={t[kind]} width={600} height={560}
            unoptimized loading="lazy" referrerPolicy="no-referrer" />
        </figure>)}
      </div>}
      <small>{t.privacy}</small>
    </div>}
  </section>
}
