'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Leaf, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { filterPracticeServices } from '@/lib/practitioners/filter-owned-services.mjs'
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
    choose:'Find matching services',hide:'Hide service search',hint:'Topics, prices & formats',collapse:'Tap to collapse search',
    kicker:'MY SERVICES · HOLISTIC HOUSE',title:'My services',intro:'Your offers, publication status and next steps.',
    search:'Search my services',placeholder:'Service name, topic or method…',
    area:'Topic',allAreas:'All topics',format:'Format',anyFormat:'Any format',online:'Online',inPerson:'In person',hybrid:'Online or in person',
    price:'Price',anyPrice:'Any price',free:'Free',priced:'With a price',contact:'Price on request',
    status:'Status',all:'All services',published:'Published',review:'Under review',draft:'Drafts / paused',draftOne:'Draft',
    total:'Services',clear:'Clear filters',viewAll:'Explore all services',add:'Add service',close:'Close editor',
    showing:'Showing',noResults:'No matching services. Change your filters or clear the search.',filters:'active filters',
    untitled:'Untitled service',changes:'Changes needed',paused:'Paused',suspended:'Suspended',min:'min',
  },
  ru: {
    choose:'Подобрать услуги',hide:'Свернуть поиск услуг',hint:'Темы, цены и форматы',collapse:'Нажмите, чтобы закрыть поиск',
    kicker:'МОИ УСЛУГИ · HOLISTIC HOUSE',title:'Мои услуги',intro:'Ваши предложения, публикации и дальнейшие шаги.',
    search:'Поиск по моим услугам',placeholder:'Название, тема или метод…',
    area:'Тема',allAreas:'Все темы',format:'Формат',anyFormat:'Любой формат',online:'Онлайн',inPerson:'Лично',hybrid:'Онлайн или лично',
    price:'Цена',anyPrice:'Любая цена',free:'Бесплатно',priced:'С указанной ценой',contact:'По запросу',
    status:'Статус',all:'Все услуги',published:'Опубликованные',review:'На проверке',draft:'Черновики / пауза',draftOne:'Черновик',
    total:'Услуги',clear:'Сбросить фильтры',viewAll:'Все услуги сайта',add:'Добавить услугу',close:'Закрыть форму',
    showing:'Показано',noResults:'Нет подходящих услуг. Измените фильтры или сбросьте поиск.',filters:'активных фильтров',
    untitled:'Без названия',changes:'Нужны правки',paused:'На паузе',suspended:'Приостановлено',min:'мин',
  },
  es: {
    choose:'Buscar servicios',hide:'Ocultar búsqueda',hint:'Temas, precios y formatos',collapse:'Pulsa para cerrar la búsqueda',
    kicker:'MIS SERVICIOS · HOLISTIC HOUSE',title:'Mis servicios',intro:'Tus servicios, publicaciones y próximos pasos.',
    search:'Buscar mis servicios',placeholder:'Nombre, tema o método…',
    area:'Tema',allAreas:'Todos los temas',format:'Formato',anyFormat:'Cualquier formato',online:'En línea',inPerson:'Presencial',hybrid:'En línea o presencial',
    price:'Precio',anyPrice:'Cualquier precio',free:'Gratis',priced:'Con precio',contact:'Precio a consultar',
    status:'Estado',all:'Todos',published:'Publicados',review:'En revisión',draft:'Borradores / pausa',draftOne:'Borrador',
    total:'Servicios',clear:'Restablecer filtros',viewAll:'Explorar todos los servicios',add:'Añadir servicio',close:'Cerrar formulario',
    showing:'Mostrando',noResults:'No hay coincidencias. Cambia los filtros.',filters:'filtros activos',
    untitled:'Sin título',changes:'Necesita cambios',paused:'En pausa',suspended:'Suspendido',min:'min',
  },
}

export default function MyServicesDashboard({items=[],locale='en',createRequest=0,quota,renderEditor}) {
  const lang=COPY[locale]?locale:'en'
  const c=COPY[lang]
  const canAdd=quota?.canAdd!==false
  const [creating,setCreating]=useState(items.length===0&&canAdd)
  const [finderOpen,setFinderOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('all')
  const [area,setArea]=useState('all')
  const [format,setFormat]=useState('any')
  const [price,setPrice]=useState('any')
  useEffect(()=>{if(items.length||!canAdd)setCreating(false)},[items.length,canAdd])
  useEffect(()=>{if(createRequest>0&&canAdd)setCreating(true)},[createRequest,canAdd])
  const visible=useMemo(()=>filterPracticeServices(items,{query,status,area,format,price}),[items,query,status,area,format,price])
  const published=items.filter(item=>item.status==='published').length
  const reviewing=items.filter(item=>['submitted','changes_requested'].includes(item.status)).length
  const activeFilters=[query.trim(),status!=='all',area!=='all',format!=='any',price!=='any'].filter(Boolean).length
  const clearFilters=()=>{setQuery('');setStatus('all');setArea('all');setFormat('any');setPrice('any')}
  const statusLabel=value=>({published:c.published,submitted:c.review,changes_requested:c.changes,draft:c.draftOne,paused:c.paused,suspended:c.suspended}[value]||value)
  const priceLabel=item=>item.pricingMode==='free'?c.free:item.pricingMode==='contact'?c.contact:item.confirmedPrice!=null
    ? ((item.pricingMode==='from'?(lang==='ru'?'От ':lang==='es'?'Desde ':'From '):'')+[item.currency,item.confirmedPrice].filter(Boolean).join(' '))
    : c.contact
  return <section className={styles.dashboard} aria-labelledby="hh-my-services-title">
    <div className={styles.inner}>
      <button type="button" className={styles.finderButton} id="hh-services-picker-toggle"
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
      <header className={styles.header}>
        <p className={styles.kicker}>{c.kicker}</p>
        <h2 id="hh-my-services-title">{c.title}</h2>
        <p>{c.intro}</p>
      </header>
      <div className={styles.stats} role="group" aria-label={c.title}>
        <div><Leaf size={18} aria-hidden="true"/><strong>{items.length}</strong><span>{c.total}</span></div>
        <div><CheckCircle2 size={18} aria-hidden="true"/><strong>{published}</strong><span>{c.published}</span></div>
        <div><ClipboardList size={18} aria-hidden="true"/><strong>{reviewing}</strong><span>{c.review}</span></div>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={!canAdd&&!creating} aria-expanded={creating} onClick={()=>setCreating(value=>!value)}>
          <Plus size={17} aria-hidden="true"/>{creating?c.close:c.add}
        </button>
        <Link href={'/'+locale+'/services'} prefetch={false}>{c.viewAll}<ArrowUpRight size={15} aria-hidden="true"/></Link>
      </div>
      <p className={styles.count} role="status" aria-live="polite">{c.showing} {visible.length} / {items.length}</p>
      {creating&&canAdd&&<div className={styles.editor}>{renderEditor(null)}</div>}
      <div className={styles.list}>
        {visible.map(item=><details key={item.id+':'+item.revision} className={styles.serviceCard}>
          <summary>
            <span className={styles.serviceIcon}>{(item.draftCopy?.photos?.[0]||item.photos?.[0])?<img src={item.draftCopy?.photos?.[0]||item.photos?.[0]} alt="" loading="lazy" />:<Leaf size={21} aria-hidden="true"/>}</span>
            <span className={styles.serviceInfo}>
              <strong>{item.localizedCopy?.[lang]?.title||item.copy?.title||item.localizedCopy?.en?.title||c.untitled}</strong>
              <small>{item.deliveryFormat==='in_person'?c.inPerson:item.deliveryFormat==='hybrid'?c.hybrid:c.online}{item.durationMinutes?' · '+item.durationMinutes+' '+c.min:''}</small>
              <small className={styles.price}>{priceLabel(item)}</small>
            </span>
            <span className={styles.status} data-status={item.status}>{statusLabel(item.status)}</span>
            <ChevronRight className={styles.cardChevron} size={16} aria-hidden="true"/>
          </summary>
          <div className={styles.editor}>{renderEditor(item)}</div>
        </details>)}
      </div>
      {items.length===0&&!creating&&canAdd&&<p className={styles.empty}>{lang==='ru'?'Пока нет услуг. Добавьте своё первое предложение.':lang==='es'?'Aún no hay servicios. Añade tu primera oferta.':'No services yet. Add your first offer.'}</p>}
      {items.length>0&&!visible.length&&<p className={styles.empty} role="status">{c.noResults}</p>}
    </div>
  </section>
}
