'use client'
import {useCallback,useEffect,useState} from 'react'
import {prepareBrowserPhoto,SUPPORT_PHOTO_ACCEPT} from '@/lib/mandala/prepare-browser-photo'

const COPY={
  en:{title:'My private photo',intro:'Your portrait for personal video mandalas and goal images. Only you can open it in My House.',
    empty:'No photo saved yet.',choose:'Choose photo or file',replace:'Change photo',save:'Save privately',saving:'Saving…',
    saved:'Photo saved in your Cabinet.',remove:'Delete saved photo',removed:'Photo deleted.',
    invalid:'Choose JPG, PNG, WebP or supported HEIC up to 25 MB.',error:'Photo action failed. Please try again.',
    private:'Only uploaded after you select Save. Remove at any time. Your photo is never shared with practitioners automatically.'},
  ru:{title:'Моё личное фото',intro:'Фото для персональной видео-мандалы или образа цели. Доступно только вам в My House.',
    empty:'Пока нет сохранённого фото.',choose:'Выбрать фото или файл',replace:'Изменить фото',save:'Сохранить в кабинет',saving:'Сохраняем…',
    saved:'Фото сохранено в вашем кабинете.',remove:'Удалить сохранённое фото',removed:'Фото удалено.',
    invalid:'Выберите JPG, PNG, WebP или поддерживаемый HEIC до 25 МБ.',error:'Не удалось выполнить действие. Попробуйте снова.',
    private:'Фото загружается только после нажатия «Сохранить». Можно удалить в любое время. Мастерам оно автоматически не передаётся.'},
  es:{title:'Mi foto privada',intro:'Tu imagen para mandalas y objetivos. Solo tú puedes verla en Mi Casa.',
    empty:'Todavía no hay foto guardada.',choose:'Elegir foto o archivo',replace:'Cambiar foto',save:'Guardar en privado',saving:'Guardando…',
    saved:'Foto guardada en tu cuenta.',remove:'Eliminar foto guardada',removed:'Foto eliminada.',
    invalid:'Elige JPG, PNG, WebP o HEIC compatible de hasta 25 MB.',error:'No se completó la acción. Inténtalo de nuevo.',
    private:'Solo se sube cuando pulsas Guardar. Puedes eliminarla cuando quieras. Nunca se comparte automáticamente con profesionales.'}
}

export default function SupportPhotoCabinet({locale='en'}){
  const t=COPY[locale]||COPY.en
  const [url,setUrl]=useState(null)
  const [preview,setPreview]=useState(null)
  const [blob,setBlob]=useState(null)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const reload=useCallback(async()=>{
    const response=await fetch('/api/app/support-photo',{credentials:'same-origin',cache:'no-store'})
    if(!response.ok)throw new Error('PHOTO_READ_FAILED')
    const data=await response.json()
    setUrl(typeof data.url==='string'?data.url:null)
  },[])
  useEffect(()=>{
    let mounted=true
    fetch('/api/app/support-photo',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():null).then(data=>{
        if(mounted&&data)setUrl(typeof data.url==='string'?data.url:null)
      }).catch(()=>{})
    return()=>{mounted=false}
  },[])
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  async function select(event){
    const file=event.currentTarget.files?.[0]
    event.currentTarget.value=''
    if(!file)return
    setBusy(true);setNotice('');setError('')
    try{
      const result=await prepareBrowserPhoto(file)
      setBlob(result)
      setPreview(URL.createObjectURL(result))
    }catch{setError(t.invalid)}finally{setBusy(false)}
  }
  async function save(){
    if(!blob||busy)return
    setBusy(true);setError('');setNotice('')
    const form=new FormData();form.set('photo',blob,'portrait.jpg')
    try{
      const response=await fetch('/api/app/support-photo',{
        method:'POST',credentials:'same-origin',cache:'no-store',body:form,
      })
      if(!response.ok)throw new Error('PHOTO_SAVE_FAILED')
      const result=await response.json()
      if(!result.saved||typeof result.url!=='string')throw new Error('PHOTO_SAVE_FAILED')
      setBlob(null);setPreview(null);setUrl(result.url)
      setNotice(t.saved)
      await reload()
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  async function remove(){
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const response=await fetch('/api/app/support-photo',{method:'DELETE',credentials:'same-origin',cache:'no-store'})
      if(!response.ok)throw new Error('PHOTO_DELETE_FAILED')
      const result=await response.json()
      if(result.removed!==true)throw new Error('PHOTO_DELETE_FAILED')
      setUrl(null);setPreview(null);setBlob(null);setNotice(t.removed)
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  return <section data-support-photo-cabinet style={{margin:'12px 0 18px',padding:14,border:'1px solid #cbded0',borderRadius:14,background:'#fffdf9'}}>
    <h2 style={{margin:'0 0 5px',fontSize:19}}>{t.title}</h2>
    <p style={{margin:'0 0 10px',fontSize:14}}>{t.intro}</p>
    <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      {(preview||url)?<img src={preview||url} alt={t.title} loading="lazy" style={{width:92,height:92,borderRadius:16,objectFit:'cover',border:'2px solid #c8e3dc'}}/>:
        <p style={{margin:0,fontSize:13}}>{t.empty}</p>}
      <div style={{flex:'1 1 145px',minWidth:0,display:'grid',gap:8}}>
        <label style={{display:'grid',gap:3,fontWeight:650,fontSize:13}}>
          {preview||url?t.replace:t.choose}
          <input type="file" accept={SUPPORT_PHOTO_ACCEPT} disabled={busy}
            onChange={event=>{void select(event)}} aria-label={t.choose} style={{maxWidth:'100%',fontSize:12}}/>
        </label>
        {blob&&<button type="button" disabled={busy} onClick={()=>{void save()}}
          style={{minHeight:38,border:0,borderRadius:9,color:'#fff',fontWeight:750,background:'#078764'}}>
          {busy?t.saving:t.save}</button>}
        {url&&!blob&&<button type="button" disabled={busy} onClick={()=>{void remove()}}
          style={{minHeight:34,border:'1px solid #c1d2c4',borderRadius:9,background:'#fff',color:'#38584a'}}>{t.remove}</button>}
      </div>
    </div>
    <p style={{margin:'9px 0 0',fontSize:12,color:'#4a675c'}}>{t.private}</p>
    {notice&&<p role="status" style={{fontSize:13,color:'#137557'}}>{notice}</p>}
    {error&&<p role="alert" style={{fontSize:13,color:'#a33639'}}>{error}</p>}
  </section>
}
