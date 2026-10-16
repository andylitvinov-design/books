'use client'
import {useEffect,useState} from 'react'
import {Film,Images,Link2,FolderOpen} from 'lucide-react'
import styles from './session-material-picker.module.css'

function typeLabel(item,ru){return item.kind==='youtube'?'YouTube':item.kind==='image'?(ru?'Фото':'Photo'):(ru?'Видео':'Video')}

export function SessionMaterialPicker({locale='en',selectedIds=[],onChange,onOpen,disabled=false}){
  const ru=locale==='ru'
  const [open,setOpen]=useState(false)
  const [materials,setMaterials]=useState([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [search,setSearch]=useState('')
  useEffect(()=>{
    if(!open)return
    let mounted=true
    setLoading(true);setError('')
    fetch('/api/admin/materials',{credentials:'same-origin',cache:'no-store'})
      .then(async res=>{
        const data=await res.json()
        if(!res.ok)throw new Error(data.error||'MATERIAL_UNAVAILABLE')
        return data.materials||[]
      }).then(items=>{if(mounted)setMaterials(items)})
      .catch(e=>{if(mounted)setError(e.message)})
      .finally(()=>{if(mounted)setLoading(false)})
    return ()=>{mounted=false}
  },[open])
  const filtered=materials.filter(item=>
    (item.title+' '+item.description+' '+item.kind).toLowerCase().includes(search.toLowerCase()))
  function toggle(id,enabled){
    const next=enabled?[...selectedIds,id]:selectedIds.filter(value=>value!==id)
    onChange?.(next)
  }
  return <details className={styles.picker} onToggle={event=>{
    setOpen(event.currentTarget.open)
    if(event.currentTarget.open){
      onOpen?.()
    }
  }}>
    <summary><FolderOpen size={20}/>{ru?'Материалы для клиента':'Materials for client'}
      <span className={styles.count}>{selectedIds.length}</span>
    </summary>
    <div className={styles.contents}>
      <p className={styles.help}>{ru?'Отметьте галочками фото, видео и YouTube-материалы из вашей библиотеки. Выбранное появится в конце клиентского отчёта после публикации.':
        'Check photos, videos and YouTube links from your library. Selected items appear at the end of the published client report.'}</p>
      <div className={styles.tools}>
        <input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={ru?'Поиск по материалам…':'Search materials…'} aria-label={ru?'Поиск материалов':'Search materials'}/>
        <a className={styles.link} href="/admin/materials" target="_blank" rel="noopener noreferrer">
          + {ru?'Добавить материал':'Add material'} ↗</a>
      </div>
      {error&&<p role="alert" className={styles.alert}>{error}</p>}
      <div className={styles.items}>
        {loading?<p className={styles.empty}>{ru?'Загрузка…':'Loading…'}</p>:
        filtered.length===0?<p className={styles.empty}>{ru?'Материалы пока не добавлены.':'No materials found.'}</p>:
        filtered.map(item=><label className={styles.item} key={item.id}>
          <input type="checkbox" checked={selectedIds.includes(item.id)} disabled={disabled||(!selectedIds.includes(item.id)&&selectedIds.length>=24)}
            onChange={event=>toggle(item.id,event.target.checked)}/>
          {item.kind==='youtube'?<Link2 size={19}/>:item.kind==='image'?<Images size={19}/>:<Film size={19}/>}
          <span><strong>{item.title}</strong>
            <small>{typeLabel(item,ru)}{item.description?' · '+item.description:''}</small>
          </span>
        </label>)}
      </div>
      <div className={styles.footer}>
        <small>{ru?'Выбрано':'Selected'}: {selectedIds.length}/24</small>
        <small>{ru?'Не публикуется автоматически':'Never publishes automatically'}</small>
      </div>
    </div>
  </details>
}
