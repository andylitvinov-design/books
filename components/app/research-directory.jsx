'use client'

import { useEffect, useState } from 'react'
import styles from './research-directory.module.css'

const COPY={
  en:{title:'Scientific test reference library',intro:'Browse research metadata and original sources. These entries are not cleared for online administration and cannot be started here.',query:'Search test names, research scales and categories',loading:'Loading research sources…',empty:'No additional references match. Try another phrase.',found:'research source and edition records',prev:'Previous',next:'Next',source:'Read source',rights:'Commercial digital rights not confirmed',evidence:'Exact-version psychometric review pending',language:'The interface language does not establish questionnaire validation',items:'Questions',scales:'Measured domains',population:'Study population',index:'Reference records indexed',access:'Research-only'},
  ru:{title:'Научный справочник психотестов',intro:'Поиск по исследованиям, шкалам и первоисточникам. Не разрешённые к онлайн-прохождению методики здесь нельзя запускать.',query:'Поиск по методикам, шкалам и категориям',loading:'Загружаем исследовательские записи…',empty:'Ничего не найдено. Попробуйте другой запрос.',found:'исследовательских записей и версий',prev:'Назад',next:'Далее',source:'Читать первоисточник',rights:'Коммерческие цифровые права не подтверждены',evidence:'Валидация точной версии ожидает проверки',language:'Перевод интерфейса не подтверждает валидность теста',items:'Вопросы',scales:'Измеряемые шкалы',population:'Популяция исследования',index:'Записей в справочнике',access:'Только справочник'},
  es:{title:'Biblioteca científica de pruebas',intro:'Metadatos de investigaciones y publicaciones originales. Los cuestionarios no autorizados no se pueden realizar aquí.',query:'Busca instrumentos, escalas y categorías',loading:'Cargando referencias…',empty:'No se encontraron referencias. Prueba otra búsqueda.',found:'referencias y versiones de investigación',prev:'Anterior',next:'Siguiente',source:'Leer publicación',rights:'Sin autorización comercial digital verificada',evidence:'Validación de edición exacta pendiente',language:'El idioma de la interfaz no valida el cuestionario',items:'Preguntas',scales:'Dimensiones evaluadas',population:'Población estudiada',index:'Referencias indexadas',access:'Solo referencia'}
}
const empty={results:[],total:0,page:1,pages:1,sourceCount:0}
export function ResearchDirectory({locale='en',search=''}) {
  const copy=COPY[locale]||COPY.en
  const [page,setPage]=useState(1)
  const [data,setData]=useState(empty)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  useEffect(()=>{setPage(1)},[search])
  useEffect(()=>{
    const controller=new AbortController()
    const query=new URLSearchParams({q:search.slice(0,120),page:String(page),limit:'12'})
    setLoading(true)
    setError(false)
    fetch('/api/assessments/research-directory?'+query.toString(),{signal:controller.signal})
      .then(response=>{if(!response.ok)throw Error('Fetch failed');return response.json()})
      .then(value=>{if(!controller.signal.aborted){setData(value);setLoading(false)}})
      .catch(()=>{if(!controller.signal.aborted){setError(true);setLoading(false)}})
    return()=>controller.abort()
  },[search,page])
  return <section className={styles.root} aria-label={copy.title} data-research-directory>
    <header className={styles.header}><div><h3>{copy.title}</h3><p>{copy.intro}</p></div>
      <div className={styles.counter}>{data.sourceCount ? data.sourceCount.toLocaleString(locale) : '–'} <small>{copy.index}</small></div>
    </header>
    <p className={styles.notice}>{copy.language}. {copy.rights}.</p>
    <div className={styles.results}>
      <p className={styles.resultsCount} role="status" aria-live="polite">{loading?copy.loading:error?copy.empty:data.total+' '+copy.found}</p>
      {!loading && !error && data.results.map(item=><article key={item.key} className={styles.card}>
        <div className={styles.top}><strong>{item.title}</strong><span className={styles.research}>{copy.access}</span></div>
        <div className={styles.metadata}><span>{item.acronym||item.key}</span><span>{item.itemCount ? copy.items+': '+item.itemCount:''}</span><span>{item.area||item.category}</span></div>
        {item.measuredDomains&&<p><b>{copy.scales}: </b>{item.measuredDomains}</p>}
        {item.targetPopulation&&<p><b>{copy.population}: </b>{item.targetPopulation}</p>}
        {item.evidenceNote&&<details className={styles.evidenceDetails}>
          <summary>{copy.evidence}</summary>
          <p>{item.evidenceNote}</p>
          {item.safetyNote&&<p>{item.safetyNote}</p>}
        </details>}
        <p className={styles.caution}>{copy.evidence}. {copy.rights}.</p>
        {item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.external}>{copy.source} ↗</a>}
      </article>)}
      {!loading && !error && !data.results.length&&<p className={styles.empty}>{copy.empty}</p>}
    </div>
    {!loading&&!error&&data.pages>1&&<nav className={styles.pages} aria-label={copy.title}>
      <button type="button" disabled={page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))}>{copy.prev}</button>
      <span>{data.page} / {data.pages}</span>
      <button type="button" disabled={page>=data.pages} onClick={()=>setPage(v=>Math.min(data.pages,v+1))}>{copy.next}</button>
    </nav>}
  </section>
}
