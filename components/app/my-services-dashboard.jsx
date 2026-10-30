'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BookOpen, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, ClipboardList, Heart, Leaf, MapPin, Monitor, Pencil, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { filterPracticeServices } from '@/lib/practitioners/filter-owned-services.mjs'
import { getPublicServiceDetailHref } from '@/lib/practitioners/public-service-links.js'
import styles from './my-services-dashboard.module.css'

const AREAS = {
  emotional_psychological: ['Emotional wellbeing','Эмоции и психология','Bienestar emocional'],
  body_somatic: ['Body & somatic','Тело и соматика','Cuerpo y somática'],
  relationships: ['Relationships','Отношения','Relaciones'],
  homeopathy_holistic: ['Holistic health','Холистическое здоровье','Salud holística'],
  energy_spiritual: ['Energy & spiritual','Энергетические практики','Energía y espiritualidad'],
  career_purpose: ['Career & purpose','Карьера и предназначение','Vocación y carrera'],
  business_money: ['Business & money','Бизнес и деньги','Negocios y dinero'],
  personal_development: ['Personal growth','Личностное развитие','Crecimiento personal'],
}
const COPY = {
  en: {
    choose:'Filter services',hide:'Hide filters',hint:'Topic · format · price',collapse:'Tap to close filters',
    kicker:'MY SERVICES · HOLISTIC HOUSE',title:'My services',intro:'Your offers, publication status and next steps.',
    search:'Search my services',placeholder:'Service name, topic or method…',
    area:'Topic',allAreas:'All topics',format:'Format',anyFormat:'Any format',online:'Online',inPerson:'In person',hybrid:'Online or in person',
    price:'Price',anyPrice:'Any price',free:'Free',priced:'With a price',contact:'Price on request',
    status:'Status',all:'All services',published:'Published',review:'Under review',draft:'Drafts / paused',draftOne:'Draft',
    total:'Services',clear:'Clear filters',viewAll:'Explore all services',add:'Add new service',edit:'Edit',close:'Back to my services',discard:'Close without saving changes?',
    showing:'Showing',noResults:'No matching services. Change your filters or clear the search.',filters:'active filters',
    untitled:'Untitled service',changes:'Changes needed',paused:'Paused',suspended:'Suspended',min:'min',hybrid:'Online or in person',
    allShort:'All',publishedShort:'Active',reviewShort:'In review',draftShort:'Drafts',
    preview:'View',private:'Not public',pending:'Awaiting review',illustration:'Category illustration',
  },
  ru: {
    choose:'Фильтры услуг',hide:'Скрыть фильтры',hint:'Тема · формат · цена',collapse:'Нажмите, чтобы закрыть фильтры',
    kicker:'МОИ УСЛУГИ · HOLISTIC HOUSE',title:'Мои услуги',intro:'Ваши предложения, публикации и дальнейшие шаги.',
    search:'Поиск по моим услугам',placeholder:'Название, тема или метод…',
    area:'Тема',allAreas:'Все темы',format:'Формат',anyFormat:'Любой формат',online:'Онлайн',inPerson:'Лично',hybrid:'Онлайн или лично',
    price:'Цена',anyPrice:'Любая цена',free:'Бесплатно',priced:'С указанной ценой',contact:'По запросу',
    status:'Статус',all:'Все услуги',published:'Опубликованные',review:'На проверке',draft:'Черновики / пауза',draftOne:'Черновик',
    total:'Услуги',clear:'Сбросить фильтры',viewAll:'Все услуги сайта',add:'Добавить новую услугу',edit:'Редактировать',close:'К моим услугам',discard:'Закрыть редактор без сохранения изменений?',
    showing:'Показано',noResults:'Нет подходящих услуг. Измените фильтры или сбросьте поиск.',filters:'активных фильтров',
    untitled:'Без названия',changes:'Нужны правки',paused:'На паузе',suspended:'Приостановлено',min:'мин',hybrid:'Онлайн или лично',
    allShort:'Все',publishedShort:'Активные',reviewShort:'На проверке',draftShort:'Черновики',
    preview:'Просмотр',private:'Не опубликовано',pending:'Ожидает проверки',illustration:'Иллюстрация',
  },
  es: {
    choose:'Filtrar servicios',hide:'Ocultar filtros',hint:'Tema · formato · precio',collapse:'Cerrar filtros',
    kicker:'MIS SERVICIOS · HOLISTIC HOUSE',title:'Mis servicios',intro:'Tus servicios, publicaciones y próximos pasos.',
    search:'Buscar mis servicios',placeholder:'Nombre, tema o método…',
    area:'Tema',allAreas:'Todos los temas',format:'Formato',anyFormat:'Cualquier formato',online:'En línea',inPerson:'Presencial',hybrid:'En línea o presencial',
    price:'Precio',anyPrice:'Cualquier precio',free:'Gratis',priced:'Con precio',contact:'Precio a consultar',
    status:'Estado',all:'Todos',published:'Publicados',review:'En revisión',draft:'Borradores / pausa',draftOne:'Borrador',
    total:'Servicios',clear:'Restablecer filtros',viewAll:'Explorar todos los servicios',add:'Añadir nuevo servicio',edit:'Editar',close:'Volver a mis servicios',discard:'¿Cerrar sin guardar los cambios?',
    showing:'Mostrando',noResults:'No hay coincidencias. Cambia los filtros.',filters:'filtros activos',
    untitled:'Sin título',changes:'Necesita cambios',paused:'En pausa',suspended:'Suspendido',min:'min',hybrid:'En línea o presencial',
    allShort:'Todos',publishedShort:'Activos',reviewShort:'En revisión',draftShort:'Borradores',
    preview:'Ver',private:'No publicado',pending:'En revisión',illustration:'Ilustración',
  },
}

// Only first-party images are used when the practitioner has not uploaded a cover.
// A category illustration is never represented as the master's own photo.
const CATEGORY_COVERS={
  emotional_psychological:'/images/holistic-house/hero-olive-incense.webp',
  body_somatic:'/images/holistic-house/hero-olive-incense.webp',
  relationships:'/images/holistic-house/video-posters/constellations-en-v1.webp',
  homeopathy_holistic:'/images/holistic-house/distance-homeopathy.webp',
  energy_spiritual:'/academy/reiki-yggdrasil/source/basic-program.jpg',
  career_purpose:'/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  business_money:'/images/holistic-house/video-posters/constellations-en-v1.webp',
  personal_development:'/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
}

function ServiceCover({item,label,kind,Icon}){
  const [failed,setFailed]=useState(false)
  const uploaded=item.draftCopy?.photos?.[0]||item.photos?.[0]||''
  const image=uploaded&&!failed?uploaded:null
  const background=CATEGORY_COVERS[item.areaKey]||CATEGORY_COVERS.personal_development
  return <div className={styles.serviceCover} data-service-cover data-has-uploaded-photo={Boolean(image)}
    style={{backgroundImage:`linear-gradient(0deg,rgba(5,39,31,.32),transparent 55%),url("${background}")`}}>
    {image&&<img src={image} alt="" loading="lazy" onError={()=>setFailed(true)}/>}
    <span className={styles.coverIcon}><Icon size={17} aria-hidden="true"/></span>
    <span className={styles.coverStatus} data-status={item.status}>
      <span className={styles.statusDot} aria-hidden="true"/>{label}
    </span>
  </div>
}

export default function MyServicesDashboard({items=[],locale='en',createRequest=0,quota,busy=false,renderEditor}) {
  const lang=COPY[locale]?locale:'en'
  const c=COPY[lang]
  const canAdd=quota?.canAdd!==false
  // Viewing My Services is not consent to start the three-step editor.
  // Explicit Add / protected ?create=1 is the only entry to composition.
  const [creating,setCreating]=useState(false)
  const [createDirty,setCreateDirty]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [editDirty,setEditDirty]=useState(false)
  const [mediaBusy,setMediaBusy]=useState(false)
  const [finderOpen,setFinderOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('all')
  const [area,setArea]=useState('all')
  const [format,setFormat]=useState('any')
  const [price,setPrice]=useState('any')
  useEffect(()=>{if(items.length||!canAdd){setCreating(false);setCreateDirty(false)}},[items.length,canAdd])
  useEffect(()=>{if(createRequest>0&&canAdd)setCreating(true)},[createRequest,canAdd])
  const visible=useMemo(()=>filterPracticeServices(items,{query,status,area,format,price}),[items,query,status,area,format,price])
  const editingItem=items.find(item=>item.id===editingId)||null
  const composing=creating||Boolean(editingItem)
  const published=items.filter(item=>item.status==='published').length
  const reviewing=items.filter(item=>['submitted','changes_requested'].includes(item.status)).length
  const activeFilters=[query.trim(),status!=='all',area!=='all',format!=='any',price!=='any'].filter(Boolean).length
  const clearFilters=()=>{setQuery('');setStatus('all');setArea('all');setFormat('any');setPrice('any')}
  const toggleComposer=()=>{
    if(busy||mediaBusy)return
    if(editingItem){
      if(editDirty&&!window.confirm(c.discard))return
      setEditingId(null);setEditDirty(false);return
    }
    if(creating&&createDirty&&!window.confirm(c.discard))return
    setCreating(value=>!value);setCreateDirty(false)
  }
  const statusLabel=value=>({published:c.publishedShort,submitted:c.reviewShort,changes_requested:c.changes,
    draft:c.draftOne,paused:c.paused,suspended:c.suspended}[value]||value)
  const serviceKind=item=>item.reikiOffer?'reiki':item.offeringType==='course'?'course':
    item.areaKey==='relationships'?'relationship':item.areaKey==='business_money'?'business':'service'
  const serviceIcon={service:Leaf,reiki:Heart,course:BookOpen,relationship:Heart,business:BriefcaseBusiness}
  const priceLabel=item=>{
    const draft=item.draftCopy||{}
    const mode=draft.pricingMode||item.pricingMode
    const amount=draft.confirmedPrice??item.confirmedPrice
    const currency=draft.currency||item.currency||'CAD'
    if(mode==='free')return c.free
    if(mode==='contact'||amount==null||amount==='')return c.contact
    if(!['fixed','from'].includes(mode)||!Number.isFinite(Number(amount)))return c.contact
    try{
      const formatted=new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',{
        style:'currency',currency,maximumFractionDigits:2,
      }).format(Number(amount))
      return (mode==='from'?(lang==='ru'?'От ':lang==='es'?'Desde ':'From '):'')+formatted
    }catch{return c.contact}
  }
  const openEditor=item=>{
    if(busy||mediaBusy)return
    setEditingId(item.id);setEditDirty(false);setCreating(false);setCreateDirty(false)
  }
  return <section className={styles.dashboard} data-practice-services-new-design
    aria-label={c.title}>
    <div className={styles.inner}>
      {!composing&&<><button type="button" className={styles.finderButton} id="hh-services-picker-toggle"
        onClick={()=>setFinderOpen(value=>!value)}
        aria-controls="hh-services-picker" aria-expanded={finderOpen}>
        <span className={styles.finderIcon}><SlidersHorizontal size={22} aria-hidden="true"/></span>
        <span className={styles.finderCopy}>
          <strong>{finderOpen?c.hide:c.choose}</strong>
          <small>{finderOpen?c.collapse:activeFilters?String(activeFilters)+' '+c.filters:c.hint}</small>
        </span>
        <ChevronDown className={styles.finderChevron} size={21} aria-hidden="true"/>
      </button>
      <div id="hh-services-picker" className={styles.finder} hidden={!finderOpen}>
        <label htmlFor="hh-services-query">{c.search}</label>
        <div className={styles.searchField}>
          <Search size={18} aria-hidden="true"/>
          <input id="hh-services-query" type="search" autoComplete="off" placeholder={c.placeholder}
            value={query} onChange={event=>setQuery(event.target.value)}/>
        </div>
        <div className={styles.selectGrid}>
          <label>{c.area}<select value={area} onChange={event=>setArea(event.target.value)}>
            <option value="all">{c.allAreas}</option>
            {Object.entries(AREAS).map(([key,labels])=><option key={key} value={key}>{labels[lang==='ru'?1:lang==='es'?2:0]}</option>)}
          </select></label>
          <label>{c.format}<select value={format} onChange={event=>setFormat(event.target.value)}>
            <option value="any">{c.anyFormat}</option><option value="online">{c.online}</option><option value="in_person">{c.inPerson}</option>
          </select></label>
          <label>{c.price}<select value={price} onChange={event=>setPrice(event.target.value)}>
            <option value="any">{c.anyPrice}</option><option value="free">{c.free}</option>
            <option value="priced">{c.priced}</option><option value="contact">{c.contact}</option>
          </select></label>
          <label>{c.status}<select value={status} onChange={event=>setStatus(event.target.value)}>
            <option value="all">{c.all}</option><option value="published">{c.published}</option>
            <option value="review">{c.review}</option><option value="draft">{c.draft}</option>
          </select></label>
        </div>
        <div className={styles.finderActions}>
          <button type="button" onClick={clearFilters}>{c.clear}</button>
          <Link href={'/'+locale+'/services'} prefetch={false}>{c.viewAll}<ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
      </div>
      </>}

      {!composing&&<div className={styles.stats} role="group" aria-label={c.title}>
        <div><Leaf size={18} aria-hidden="true"/><strong>{items.length}</strong><span>{c.total}</span></div>
        <div><CheckCircle2 size={18} aria-hidden="true"/><strong>{published}</strong><span>{c.published}</span></div>
        <div><ClipboardList size={18} aria-hidden="true"/><strong>{reviewing}</strong><span>{c.review}</span></div>
      </div>}
      <div className={styles.actions}>
        <button type="button" disabled={busy||mediaBusy||(!canAdd&&!composing)} aria-expanded={composing} onClick={toggleComposer}>
          {composing?<ArrowLeft size={17} aria-hidden="true"/>:<Plus size={17} aria-hidden="true"/>}{composing?c.close:c.add}
        </button>
        {!composing&&<Link href={'/'+locale+'/services'} prefetch={false}>{c.viewAll}<ArrowUpRight size={15} aria-hidden="true"/></Link>}
      </div>
      {!composing&&<div className={styles.statusTabs} role="group" aria-label={c.status} data-practice-service-status-tabs>
        {[
          {key:'all',label:c.allShort,count:items.length},
          {key:'published',label:c.publishedShort,count:published},
          {key:'review',label:c.reviewShort,count:reviewing},
          {key:'draft',label:c.draftShort,count:Math.max(0,items.length-published-reviewing)},
        ].map(entry=><button key={entry.key} type="button"
          onClick={()=>setStatus(entry.key)} aria-pressed={status===entry.key}>
          {entry.label}<span>{entry.count}</span>
        </button>)}
      </div>}
      {!composing&&<p className={styles.count} role="status" aria-live="polite">{c.showing} {visible.length} / {items.length}</p>}
      {creating&&canAdd&&<div className={styles.editor} data-service-composer-focus>{renderEditor(null,setCreateDirty,setMediaBusy)}</div>}
      {editingItem&&<div className={styles.editor} data-service-composer-focus data-edit-service={editingItem.id}>{renderEditor(editingItem,setEditDirty,setMediaBusy)}</div>}
      {!composing&&<div className={styles.list} data-service-card-list>
        {visible.map(item=>{
          const kind=serviceKind(item)
          const Icon=serviceIcon[kind]||Sparkles
          const draft=item.draftCopy||{}
          const localized=draft.copy?.[lang]||draft.copy?.en||item.localizedCopy?.[lang]||item.localizedCopy?.en||{}
          const title=localized.title||item.localizedCopy?.[lang]?.title||item.copy?.title||c.untitled
          const description=(localized.shortDescription||item.copy?.shortDescription||'').trim()
          const delivery=draft.deliveryFormat||item.deliveryFormat
          const duration=draft.durationMinutes??item.durationMinutes
          const formatLabel=delivery==='in_person'?c.inPerson:delivery==='hybrid'?c.hybrid:c.online
          const hasPublicLink=item.status==='published'&&Boolean(item.slug&&item.practitionerSlug)
          return <article key={item.id+':'+item.revision} className={styles.serviceCard}
            data-service-list-item data-status={item.status}>
            <ServiceCover item={item} kind={kind} Icon={Icon} label={statusLabel(item.status)}/>
            <div className={styles.serviceInfo}>
              <h3>{title}</h3>
              {description&&<p className={styles.description}>{description}</p>}
              <div className={styles.cardMeta}>
                <span>{delivery==='in_person'?<MapPin size={15} aria-hidden="true"/>:<Monitor size={15} aria-hidden="true"/>}{formatLabel}</span>
                {duration!=null&&duration!==''&&<span><Clock3 size={15} aria-hidden="true"/>{duration} {c.min}</span>}
                <strong className={styles.price}>{priceLabel(item)}</strong>
              </div>
              <div className={styles.cardActions}>
                <button type="button" disabled={busy||mediaBusy} onClick={()=>openEditor(item)}
                  data-service-edit-action><Pencil size={15} aria-hidden="true"/>
                  {c.edit}</button>
                {hasPublicLink
                  ? <Link href={getPublicServiceDetailHref(locale,item.practitionerSlug,item.slug)} prefetch={false}>
                    {c.preview}<ArrowUpRight size={15} aria-hidden="true"/></Link>
                  : <span className={styles.unpublishedHint}>{item.status==='submitted'?c.pending:c.private}</span>}
              </div>
            </div>
          </article>
        })}
      </div>}
      {items.length===0&&!creating&&canAdd&&<p className={styles.empty}>{lang==='ru'?'Пока нет услуг. Добавьте своё первое предложение.':lang==='es'?'Aún no hay servicios. Añade tu primera oferta.':'No services yet. Add your first offer.'}</p>}
      {!composing&&items.length>0&&!visible.length&&<p className={styles.empty} role="status">{c.noResults}</p>}
    </div>
  </section>
}
