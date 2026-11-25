'use client'
import {useEffect,useState} from 'react'
import {Film,Images,Link2,FolderOpen,Headphones,ChevronUp,ChevronDown,Trash2} from 'lucide-react'
import styles from './session-material-picker.module.css'

function typeLabel(item,ru){return item.kind==='youtube'?'YouTube':item.kind==='image'?(ru?'Фото':'Photo'):item.kind==='audio'?(ru?'Аудиотрек':'Audio track'):item.kind==='unavailable'?(ru?'Нет в библиотеке':'Not in library'):(ru?'Видео':'Video')}

export function SessionMaterialPicker({locale='en',selectedIds=[],placements={},onChange,onOpen,disabled=false}){
  const ru=locale==='ru'
  const [open,setOpen]=useState(false)
  const [materials,setMaterials]=useState([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [reloadCount,setReloadCount]=useState(0)
  const [search,setSearch]=useState('')
  useEffect(()=>{
    const refresh=()=>setReloadCount(value=>value+1)
    window.addEventListener('hh-materials-changed',refresh)
    return ()=>window.removeEventListener('hh-materials-changed',refresh)
  },[])
  useEffect(()=>{
    // Keep the available count current even when the picker is collapsed.
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
  },[open,reloadCount])
  const filtered=materials.filter(item=>
    (item.title+' '+item.description+' '+item.kind).toLowerCase().includes(search.toLowerCase()))
  function commit(ids,nextPlacements=placements){
    const allowed=new Set(ids)
    onChange?.(ids,Object.fromEntries(Object.entries(nextPlacements).filter(([id])=>allowed.has(id))))
  }
  function toggle(id,enabled){
    const next=enabled?(selectedIds.includes(id)?selectedIds:[...selectedIds,id]):selectedIds.filter(value=>value!==id)
    commit(next)
  }
  function move(index,delta){
    const next=[...selectedIds],target=index+delta
    if(target<0||target>=next.length)return
    ;[next[index],next[target]]=[next[target],next[index]]
    commit(next)
  }
  function setPlacement(id,value){
    const next={...placements}
    if(value==='opening'||value==='closing')next[id]=value
    else delete next[id]
    commit(selectedIds,next)
  }
  const selected=selectedIds.map(id=>materials.find(item=>item.id===id)||{id,kind:'unavailable',title:ru?'Материал недоступен':'Unavailable material'})
  return <>
    {selected.length>0&&<section className={styles.selected} aria-label={ru?'Выбранные треки и материалы':'Selected tracks and materials'}>
      <div className={styles.selectedHeading}><strong>{ru?'В отчёте · порядок показа':'In report · playback order'}</strong><small>{selected.length}/24</small></div>
      <ol className={styles.selectedList}>{selected.map((item,index)=>{
        const movable=['youtube','video','audio'].includes(item.kind)
        return <li className={styles.selectedItem} key={item.id}>
          <div className={styles.selectedTitle}><span aria-hidden="true">{index+1}.</span><strong>{item.title}</strong><small>{typeLabel(item,ru)}</small></div>
          <div className={styles.selectedActions}>
            {movable&&<label className={styles.placementLabel}>
              <span>{ru?'Где показать':'Position'}</span>
              <select disabled={disabled} value={placements[item.id]||'materials'}
                aria-label={(ru?'Позиция: ':'Position: ')+item.title}
                onChange={event=>setPlacement(item.id,event.target.value)}>
                <option value="opening">{ru?'В начале отчёта':'At report start'}</option>
                <option value="materials">{ru?'В материалах':'In materials'}</option>
                <option value="closing">{ru?'В конце отчёта':'At report end'}</option>
              </select>
            </label>}
            <button type="button" disabled={disabled||index===0} onClick={()=>move(index,-1)} aria-label={(ru?'Выше: ':'Move up: ')+item.title}><ChevronUp size={18}/></button>
            <button type="button" disabled={disabled||index===selected.length-1} onClick={()=>move(index,1)} aria-label={(ru?'Ниже: ':'Move down: ')+item.title}><ChevronDown size={18}/></button>
            <button type="button" className={styles.remove} disabled={disabled}
              onClick={()=>toggle(item.id,false)} aria-label={(ru?'Убрать из отчёта: ':'Remove from report: ')+item.title}><Trash2 size={18}/></button>
          </div>
        </li>
      })}</ol>
      <p className={styles.selectionHelp}>{ru?'В начале и в конце — только выбранные вами видео или аудиотреки. Удаление из отчёта не удаляет файл из библиотеки.':'Opening and closing tracks are optional. Removing a track from this report does not delete it from your library.'}</p>
    </section>}
    <details className={styles.picker} onToggle={event=>{
    setOpen(event.currentTarget.open)
    if(event.currentTarget.open){
      onOpen?.()
    }
  }}>
    <summary><FolderOpen size={20}/>{ru?'Выбрать из библиотеки':'Select from library'}
      <span className={styles.count}>{loading?'…':materials.length} {ru?'доступно':'available'}</span>
    </summary>
    <div className={styles.contents}>
      <p className={styles.help}>{ru?'Отметьте материалы, которые нужно приложить к этому отчёту. Аудио, фото и видео можно предварительно загрузить в библиотеку. Клиент увидит выбранные записи только после публикации отчёта.':
        'Choose materials for this report. Upload reusable audio, photos or videos to the library, then select them here. Clients see selected items only after publication.'}</p>
      <div className={styles.tools}>
        <input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={ru?'Поиск по материалам…':'Search materials…'} aria-label={ru?'Поиск материалов':'Search materials'}/>
        <a className={styles.link} href="/admin/materials" target="_blank" rel="noopener noreferrer">
          {ru?'Библиотека мастера':'Practitioner library'} ↗</a>
        <button type="button" className={styles.refresh} disabled={loading}
          onClick={()=>setReloadCount(value=>value+1)}>
          {ru?'Обновить список':'Refresh list'}
        </button>
      </div>
      {error&&<p role="alert" className={styles.alert}>{error}</p>}
      <div className={styles.items}>
        {loading?<p className={styles.empty}>{ru?'Загрузка…':'Loading…'}</p>:
        filtered.length===0?<p className={styles.empty}>{ru?'Пока нет подходящих материалов. Сохраните видео выше — оно сразу появится здесь.':'No matching materials yet. Save a video above to see it here.'}</p>:
        filtered.map(item=><label className={styles.item} key={item.id}>
          <input type="checkbox" checked={selectedIds.includes(item.id)} disabled={disabled||(!selectedIds.includes(item.id)&&selectedIds.length>=24)}
            onChange={event=>toggle(item.id,event.target.checked)}/>
          {item.kind==='youtube'?<Link2 size={19}/>:item.kind==='image'?<Images size={19}/>:item.kind==='audio'?<Headphones size={19}/>:<Film size={19}/>}
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
  </>
}
