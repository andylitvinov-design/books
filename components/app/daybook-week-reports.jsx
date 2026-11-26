'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './daybook-week-reports.module.css'
const COPY={
  en:{heading:'Reports for this week',report:'Consultation report',failed:'Reports could not be loaded.',retry:'Retry',more:'Earlier reports are available in My Reports.',all:'My Reports'},
  ru:{heading:'Отчёты этой недели',report:'Отчёт консультации',failed:'Не удалось загрузить отчёты.',retry:'Повторить',more:'Более ранние отчёты доступны в разделе «Мои отчёты».',all:'Мои отчёты'},
  es:{heading:'Informes de esta semana',report:'Informe de consulta',failed:'No se pudieron cargar los informes.',retry:'Reintentar',more:'Los informes anteriores están en Mis informes.',all:'Mis informes'},
}
export default function DaybookWeekReports({locale='en',accountId,program,week,goalId=null,showEmpty=false}){
  const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang],savedLocale=lang==='ru'?'ru':'en'
  const key=accountId+':'+program+':'+(goalId||'')
  const [result,setResult]=useState(null),[retry,setRetry]=useState(0)
  useEffect(()=>{
    if(!accountId||(program==='goal'&&!goalId))return
    const controller=new AbortController()
    let active=true
    appFetch('daybook-reports?program='+encodeURIComponent(program)+(program==='goal'?'&goal='+encodeURIComponent(goalId):''),undefined,'GET',{accountId,signal:controller.signal})
      .then(data=>{if(active)setResult({key,reports:Array.isArray(data?.reports)?data.reports:[],limited:data?.limited===true})})
      .catch(()=>{if(active&&!controller.signal.aborted)setResult({key,error:true})})
    return()=>{active=false;controller.abort()}
  },[accountId,program,goalId,key,retry])
  const empty=({en:'No saved report for this session yet.',ru:'За эту сессию пока нет сохранённого отчёта.',es:'Todavía no hay un informe guardado de esta sesión.'})[lang]
  const loading=({en:'Loading saved reports…',ru:'Загружаем сохранённые отчёты…',es:'Cargando informes guardados…'})[lang]
  if(!accountId||result?.key!==key)return showEmpty?<p role="status">{loading}</p>:null
  if(result.error)return <section className={css.box} data-daybook-week-reports role="status">
    <p>{t.failed}</p><button type="button" onClick={()=>{setResult(null);setRetry(n=>n+1)}}>{t.retry}</button>
  </section>
  const reports=result.reports.filter(row=>row.week===week)
  if(!reports.length&&!result.limited)return showEmpty?<p role="status">{empty}</p>:null
  return <section className={css.box} data-daybook-week-reports aria-label={t.heading}>
    <h3>{t.heading}</h3>
    {reports.map(row=><Link key={row.id} href={'/'+savedLocale+'/app/sessions/'+encodeURIComponent(row.id)} prefetch={false}>{t.report} · {row.occurredOn}</Link>)}
    {result.limited&&<p>{t.more} <Link href={'/'+savedLocale+'/app/portrait#personal-reports'} prefetch={false}>{t.all}</Link></p>}
  </section>
}
