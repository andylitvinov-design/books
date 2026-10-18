'use client'
import {useEffect,useState} from 'react'
import styles from './client-session.module.css'
import {parseSessionYouTubeUrl} from '@/lib/clients/youtube-resource'

// Promote only owner-approved, general YouTube lessons from the report footer.
// Private session recordings can never be copied into the cross-client library.
export function SessionSaveFooterVideo({clientId,session,locale='en'}){
  const ru=locale==='ru'
  const [saved,setSaved]=useState({})
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const footer=[...(session?.published?.plan?.resources||[]),...(session?.draft?.plan?.resources||[])]
    .map((resource,index)=>({resource,index,video:parseSessionYouTubeUrl(resource?.url)}))
    .filter(row=>row.resource?.kind==='youtube'&&row.resource?.placement==='materials'&&row.video)
    .filter((row,index,all)=>all.findIndex(other=>other.video.id===row.video.id)===index)
  const footerKey=footer.map(row=>row.video.id).join(',')

  useEffect(()=>{
    if(!footerKey)return
    let active=true
    setLoading(true)
    fetch('/api/admin/materials',{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{
        const data=await response.json().catch(()=>({}))
        if(!response.ok)throw new Error(data.error||'MATERIAL_UNAVAILABLE')
        return data.materials||[]
      })
      .then(items=>{
        if(!active)return
        const existing={}
        for(const item of items){
          if(item.kind==='youtube'){
            const video=parseSessionYouTubeUrl(item.url)
            if(video)existing[video.id]=true
          }
        }
        setSaved(existing)
      }).catch(()=>{/* Saving is still possible if the catalog list is unavailable. */})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[footerKey])

  async function save(video){
    if(busy)return
    const label=window.prompt(ru?
      'Как назвать общее видео в ваших материалах? Уберите имя клиента и личные подробности.':
      'Name this reusable video. Remove the client name and personal details.',
      ru?'Обучающее видео':'Educational video')
    if(label===null)return
    const title=label.trim()
    if(!title||title.length>140){
      setError(ru?'Укажите название до 140 символов.':'Enter a title up to 140 characters.')
      return
    }
    if(!window.confirm(ru?
      'Подтвердите: видео подходит другим клиентам, не содержит личной информации этого или других клиентов. Оно сохранится только в ваши Материалы; другим клиентам не отправляется автоматически.':
      'Confirm this video is general education and contains no client information. It will be saved only to your Materials, not sent to other clients automatically.'))return
    setBusy(video.id);setNotice('');setError('')
    try{
      const response=await fetch('/api/admin/materials',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'youtube',title,description:'',url:video.url}),
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'MATERIAL_UNAVAILABLE')
      setSaved(previous=>({...previous,[video.id]:true}))
      window.dispatchEvent(new Event('hh-materials-changed'))
      setNotice(ru?'Видео сохранено. Теперь оно доступно для выбора в отчётах других клиентов.':
        'Saved to your Materials. This video can now be selected in other client reports.')
    }catch(e){
      setError(e.message==='MATERIAL_UNAVAILABLE'?
        (ru?'Не удалось сохранить видео. Проверьте вход в кабинет.':'Could not save the video. Check your practitioner sign-in.'):
        (e.message||'MATERIAL_UNAVAILABLE'))
    }finally{setBusy('')}
  }

  if(!session?.id||!clientId||!footer.length)return null
  return <section className={styles.ownerMaterialsGroup} aria-label={ru?'Сохранить видео из отчёта':'Save a video from the report'}>
    <h3>{ru?'Видео из нижнего блока отчёта':'Videos from the report footer'}</h3>
    <p className={styles.ownerMaterialsMuted}>{ru?'Сохраните учебное видео один раз, чтобы затем выбирать его в материалах других клиентов. Только для видео без личных данных.':
      'Save a general educational video once and attach it to other client reports. Never reuse personal recordings.'}</p>
    {footer.map(({resource,index,video})=><div className={styles.ownerMaterialsToolbar} key={index}>
      <strong>{resource.title} · YouTube</strong>
      <button type="button" className={styles.secondaryButton} disabled={Boolean(busy)||Boolean(saved[video.id])||loading}
        onClick={()=>void save(video)}>
        {saved[video.id]?(ru?'Уже в материалах':'Already in Materials'):
          busy===video.id?(ru?'Сохраняем…':'Saving…'):
          (ru?'Сохранить в мои материалы':'Save to my Materials')}
      </button>
    </div>)}
    {notice&&<p className={styles.success} role="status">{notice} <a href="/admin/materials">{ru?'Открыть материалы →':'Open Materials →'}</a></p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>
}
