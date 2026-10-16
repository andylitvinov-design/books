'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import styles from './practitioner-articles-public.module.css'
type ArticleCard={id:string;slug:string;practitionerName:string;publishedAt:string;title:string;excerpt:string;coverPath:string}
export function ArticleDirectory({locale,articles}:{locale:string;articles:ArticleCard[]}){
 const ru=locale==='ru',es=locale==='es';
 const [query,setQuery]=useState(''),[author,setAuthor]=useState(''),[sort,setSort]=useState('new')
 const authors=useMemo(()=>[...new Set(articles.map(a=>a.practitionerName).filter(Boolean))].sort(),[articles])
 const filtered=useMemo(()=>{
  const normalized=query.trim().toLocaleLowerCase()
  return articles.filter(a=>(!author||a.practitionerName===author)&&(!normalized||[a.title,a.excerpt,a.practitionerName].join(' ').toLocaleLowerCase().includes(normalized)))
   .sort((a,b)=>sort==='az'?a.title.localeCompare(b.title,locale):(new Date(b.publishedAt).getTime()||0)-(new Date(a.publishedAt).getTime()||0))
 },[articles,query,author,sort,locale])
 return <section className={styles.directory} aria-label={ru?'Каталог статей':es?'Catálogo de artículos':'Article directory'}>
  <div className={styles.articleFilters}>
   <label>{ru?'Поиск статьи':es?'Buscar artículos':'Search articles'}<input type="search" autoComplete="off" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder={ru?'Тема, название, автор…':es?'Tema, título, autor…':'Topic, title, author…'}/></label>
   <label>{ru?'Автор':es?'Autor':'Author'}<select value={author} onChange={e=>setAuthor(e.target.value)}><option value="">{ru?'Все авторы':es?'Todos':'All authors'}</option>{authors.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
   <label>{ru?'Порядок':es?'Orden':'Sort'}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="new">{ru?'Сначала новые':es?'Recientes':'Newest first'}</option><option value="az">A–Z</option></select></label>
   {(query||author||sort!=='new')&&<button type="button" className={styles.reset} onClick={()=>{setQuery('');setAuthor('');setSort('new')}}>{ru?'Сбросить':es?'Restablecer':'Clear'}</button>}
  </div>
  <p className={styles.meta} role="status" aria-live="polite">{filtered.length} {ru?'статей':es?'artículos':'articles'}</p>
  <div className={styles.grid}>{filtered.map(a=><article className={styles.card} key={a.id}>
   {a.coverPath?<img src={a.coverPath} alt="" loading="lazy" className={styles.cover}/>:null}
   <p className={styles.meta}>{a.practitionerName}{a.publishedAt?' · '+new Date(a.publishedAt).toLocaleDateString(locale):''}</p>
   <h2><Link href={'/'+locale+'/articles/'+a.slug}>{a.title}</Link></h2>
   <p>{a.excerpt}</p>
   <Link href={'/'+locale+'/articles/'+a.slug} className={styles.primary}>{ru?'Читать':es?'Leer':'Read article'} →</Link>
  </article>)}</div>
  {!filtered.length&&<p className={styles.empty}>{ru?'Подходящих опубликованных статей пока нет.':es?'No hay artículos coincidentes publicados.':'No matching published articles yet.'}</p>}
 </section>
}
