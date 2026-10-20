'use client'
import { useEffect, useMemo, useState } from 'react'
import styles from './crm-marketing.module.css'

const STRINGS={
  en:{title:'Marketing Analytics',subtitle:'Real enquiries by source, campaign and outcome.',owner:'Owner-confirmed only',notMeasured:'Not measured',mapsTitle:'Google Maps · confirmed enquiries',mapsNote:'Only enquiries actually received and confirmed by the owner are counted. Views, directions and clicks are not leads.',mapsZero:'No confirmed Maps enquiries for this period.',leads:'Confirmed enquiries',qualified:'Qualified enquiries',booked:'Confirmed bookings',revenue:'Paid revenue',explain:'Campaign spend and captured payments are not connected. Clicks, course starts and contact imports are not counted as paid customers.',sources:'Enquiries by source',campaigns:'Campaigns and creatives',allSources:'All sources',allOffers:'All offers',bookedRate:'Booking rate',noCampaigns:'No campaign data for this period.',source:'Source',leadCount:'Enquiries',qualifiedShort:'Qualified',bookedShort:'Booked',contacts:'People',history:'Recent enquiries',none:'No verified enquiries in this period.',loading:'Loading verified CRM data…',error:'Marketing data is unavailable. No conversion was recorded.',form:'Record a received enquiry',contact:'Contact',offer:'Offer',medium:'Channel',campaign:'Campaign ID (optional)',creative:'Creative ID (optional)',confirm:'I confirm this enquiry was actually received. Do not enter client conditions, answers, diagnoses or private messages.',save:'Record enquiry',sourceInfo:'An owner-confirmed record is not an ad-platform verified conversion.',button:'Save',status:'Status',course1:'Course started',course2:'Initiation requested',saved:'Saved. Sources updated.',manual:'Existing CRM contacts by source — not verified advertising conversions',new:'No matching contacts are available. Add a business contact to CRM first.'},
  ru:{title:'Эффективность рекламы',subtitle:'Подтверждённые обращения по источникам, кампаниям и результатам.',owner:'Подтверждено владельцем',notMeasured:'Не измеряется',mapsTitle:'Google Maps · подтверждённые заявки',mapsNote:'Учитываются только действительно полученные обращения, подтверждённые владельцем. Просмотры, маршруты и клики не равны заявкам.',mapsZero:'За этот период подтверждённых заявок Google Maps пока нет.',leads:'Полученные заявки',qualified:'Целевые обращения',booked:'Записи',revenue:'Оплаченная выручка',explain:'Расходы рекламы и подтверждённые оплаты пока не подключены. Клики, начало курса и импорт контактов не считаются оплатами.',sources:'Заявки по источникам',campaigns:'Кампании и объявления',allSources:'Все источники',allOffers:'Все услуги',bookedRate:'Записались, %',noCampaigns:'За период ещё нет данных по кампаниям.',source:'Источник',leadCount:'Заявки',qualifiedShort:'Целевые',bookedShort:'Записи',contacts:'Люди',history:'Последние обращения',none:'За период нет подтверждённых обращений.',loading:'Загружаем CRM…',error:'Аналитика недоступна. Конверсия не записана.',form:'Учесть полученную заявку',contact:'Контакт',offer:'Услуга',medium:'Тип трафика',campaign:'Код кампании (необязательно)',creative:'Код объявления (необязательно)',confirm:'Подтверждаю, что обращение действительно получено. Не вводите симптомы, диагнозы, тесты или частную переписку.',save:'Сохранить обращение',sourceInfo:'Запись владельца — не подтверждённая рекламной платформой конверсия.',button:'Сохранить',status:'Статус',course1:'Курс начат',course2:'Запрос инициации',saved:'Сохранено. Показатели обновлены.',manual:'Контакты CRM по источникам — ещё не подтверждённые рекламные конверсии',new:'Нет доступных контактов. Сначала добавьте контакт в CRM.'},
  es:{title:'Analítica de marketing',subtitle:'Solicitudes reales por origen, campaña y resultado.',owner:'Confirmado por propietario',notMeasured:'Sin medir',mapsTitle:'Google Maps · consultas confirmadas',mapsNote:'Solo se incluyen consultas realmente recibidas y confirmadas por el propietario. Las visitas y los clics no son clientes.',mapsZero:'No hay consultas de Maps confirmadas en este período.',leads:'Consultas recibidas',qualified:'Consultas calificadas',booked:'Reservas confirmadas',revenue:'Ingresos pagados',explain:'Los gastos publicitarios y los pagos confirmados aún no están conectados. Clics y registros no cuentan como ventas.',sources:'Solicitudes por origen',campaigns:'Campañas y anuncios',allSources:'Todos los orígenes',allOffers:'Todos los servicios',bookedRate:'Tasa de reserva',noCampaigns:'Sin datos de campañas para este período.',source:'Origen',leadCount:'Solicitudes',qualifiedShort:'Calificadas',bookedShort:'Reservas',contacts:'Personas',history:'Consultas recientes',none:'No hay consultas verificadas en este período.',loading:'Cargando CRM…',error:'No hay datos de marketing disponibles. No se guardó ninguna conversión.',form:'Registrar consulta recibida',contact:'Contacto',offer:'Servicio',medium:'Canal',campaign:'Campaña (opcional)',creative:'Anuncio (opcional)',confirm:'Confirmo que recibí esta consulta. No introduzca datos clínicos, respuestas ni mensajes privados.',save:'Registrar consulta',sourceInfo:'Una declaración manual no verifica conversiones en la plataforma de anuncios.',button:'Guardar',status:'Estado',course1:'Curso iniciado',course2:'Solicitud de iniciación',saved:'Guardado. Métricas actualizadas.',manual:'Contactos CRM por origen, no conversiones publicitarias verificadas',new:'No hay contactos disponibles. Añada primero un contacto a CRM.'}
}
const SOURCES=[['instagram','Instagram'],['facebook','Facebook'],['google_ads','Google Ads'],['google_organic','Google Organic'],['google_maps','Google Maps'],['youtube','YouTube'],['telegram','Telegram'],['eventbrite','Eventbrite'],['meetup','Meetup'],['luma','Luma'],['allevents','AllEvents'],['humanitix','Humanitix'],['tickettailor','Ticket Tailor'],['partner','Partner'],['website','Website'],['academy','Academy'],['referral','Referral'],['event','Event'],['direct','Direct'],['offline','Offline'],['manual','Manual'],['other','Other'],['unknown','Unknown']]
const MEDIA=[['paid_social','Paid social'],['cpc','Search ads'],['organic_social','Organic social'],['organic_search','Organic search'],['referral','Referral'],['organic_event','Organic event'],['email','Email'],['course','Course'],['direct','Direct'],['offline','Offline'],['unknown','Unknown']]
const OFFERS=[['free_review','Free personal review'],['personal_session','Personal session'],['reiki_course','Reiki course'],['reiki_initiation','Reiki initiation'],['business_consulting','Business coaching'],['other','Other']]
const STAGES={en:{received:'Received',qualified:'Qualified',booked:'Booked',closed_lost:'Closed / lost'},
  ru:{received:'Получено',qualified:'Целевой',booked:'Запись',closed_lost:'Закрыто'},
  es:{received:'Recibido',qualified:'Calificado',booked:'Reserva',closed_lost:'Cerrado'}}
const STATUS_IDS=['received','qualified','booked','closed_lost']
function sourceName(source) {return SOURCES.find(([id])=>id===source)?.[1] || 'Unknown'}
export default function CrmMarketingPanel({accountId,contacts=[],locale='en'}) {
  const language=STRINGS[locale]?locale:'en',t=STRINGS[language]
  const [period,setPeriod]=useState('30')
  const [refresh,setRefresh]=useState(0)
  const [campaignSource,setCampaignSource]=useState('all')
  const [campaignOffer,setCampaignOffer]=useState('all')
  const [data,setData]=useState(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [contactId,setContactId]=useState('')
  const [source,setSource]=useState('manual')
  const [medium,setMedium]=useState('unknown')
  const [offer,setOffer]=useState('other')
  const [campaign,setCampaign]=useState('')
  const [creative,setCreative]=useState('')
  const [confirmed,setConfirmed]=useState(false)
  const [submissionId,setSubmissionId]=useState(null)
  useEffect(()=>{setSubmissionId(null)},[contactId,source,medium,offer,campaign,creative])
  useEffect(()=>{
    if(!accountId)return
    const controller=new AbortController()
    setData(null);setError('')
    fetch('/api/app/crm/marketing?days='+period,{credentials:'same-origin',cache:'no-store',
      signal:controller.signal,headers:{'X-HH-Account-Id':accountId}})
      .then(async r=>{if(!r.ok)throw Error('MARKETING_UNAVAILABLE');return r.json()})
      .then(result=>{if(!controller.signal.aborted)setData(result)})
      .catch(e=>{if(!controller.signal.aborted)setError(t.error)})
    return ()=>controller.abort()
  },[accountId,period,refresh,t.error])
  async function send(action,payload) {
    if(busy)return
    setBusy(true);setNotice('');setError('')
    try{
      const r=await fetch('/api/app/crm/marketing',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify({action,payload})})
      if(!r.ok)throw Error('SAVE_FAILED')
      if(action==='record_lead'){setCampaign('');setCreative('');setConfirmed(false);setSubmissionId(null)}
      setNotice(t.saved);setRefresh(v=>v+1)
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  const totals=useMemo(()=>((data?.groups||[]).reduce((s,x)=>({
    leads:s.leads+Number(x.leads||0),qualified:s.qualified+Number(x.qualified||0),
    booked:s.booked+Number(x.booked||0)}),{leads:0,qualified:0,booked:0})),[data])
  const names=useMemo(()=>new Map(contacts.map(x=>[x.id,x.displayName])),[contacts])
  const milestoneKeys=useMemo(()=>new Set((data?.milestones||[]).map(x=>x.opportunity_id+':'+x.kind)),[data])
  const top=Math.max(1,...(data?.groups||[]).map(g=>Number(g.leads||0)))
  const mapsGroup=(data?.groups||[]).find(g=>g.source==='google_maps')
  const choices=contacts.filter(x=>x.lifecycle!=='archived')
  const campaignRows=(data?.campaigns||[]).filter(row=>(campaignSource==='all'||row.source===campaignSource)&&
    (campaignOffer==='all'||row.offer===campaignOffer))
  return <section className={styles.panel} aria-labelledby="hh-marketing-title">
    <div className={styles.head}>
      <div><h3 id="hh-marketing-title">{t.title}</h3><p>{t.subtitle}</p></div>
      <span className={styles.badge}>{t.owner}</span>
    </div>
    <div className={styles.switch} role="group" aria-label="Time window">
      {['7','30','90'].map(n=><button type="button" key={n} aria-pressed={period===n}
        onClick={()=>setPeriod(n)}>{n} {language==='ru'?'дней':language==='es'?'días':'days'}</button>)}
    </div>
    <div className={styles.kpis}>
      {[[t.leads,data?totals.leads:'—'],[t.qualified,data?totals.qualified:'—'],
        [t.booked,data?totals.booked:'—'],[t.revenue,'—']].map(([label,value])=>
        <div className={styles.kpi} key={label}><span>{label}</span><strong>{value}</strong>
          <small>{label===t.revenue?t.notMeasured:t.owner}</small></div>)}
    </div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {!data&&!error&&<p role="status" className={styles.status}>{t.loading}</p>}
    <p className={styles.info}>{t.explain}</p>
    {data&&<section className={styles.mapsFocus} aria-label={t.mapsTitle}>
      <h4>{t.mapsTitle}</h4>
      {mapsGroup?<p><strong>{mapsGroup.leads}</strong> {t.leads.toLowerCase()} · <strong>{mapsGroup.qualified}</strong> {t.qualifiedShort.toLowerCase()} · <strong>{mapsGroup.booked}</strong> {t.bookedShort.toLowerCase()}</p>:<p>{t.mapsZero}</p>}
      <small>{t.mapsNote}</small>
    </section>}
    {data&&<>
      <h4 className={styles.subhead}>{t.sources}</h4>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>{t.source}</th><th className={styles.number}>{t.leadCount}</th>
          <th className={styles.number}>{t.qualifiedShort}</th><th className={styles.number}>{t.bookedShort}</th></tr></thead>
        <tbody>{data.groups?.length?data.groups.map(row=><tr key={row.source}>
          <td>{sourceName(row.source)}<div className={styles.bar} aria-hidden="true">
            <span style={{width:Math.round(100*Number(row.leads)/top)+'%'}} /></div></td>
          <td className={styles.number}>{row.leads}</td>
          <td className={styles.number}>{row.qualified}</td>
          <td className={styles.number}>{row.booked}</td></tr>):
          <tr><td colSpan="4" className={styles.empty}>{t.none}</td></tr>}</tbody>
      </table></div>
      <details className={styles.manage} open>
        <summary>{t.campaigns} ({campaignRows.length})</summary>
        <div className={styles.form} style={{marginBottom:12}}>
          <label>{t.source}<select value={campaignSource} onChange={e=>setCampaignSource(e.target.value)}>
            <option value="all">{t.allSources}</option>
            {SOURCES.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
          <label>{t.offer}<select value={campaignOffer} onChange={e=>setCampaignOffer(e.target.value)}>
            <option value="all">{t.allOffers}</option>
            {OFFERS.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
        </div>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>{t.source}</th><th>{t.campaign}</th><th>{t.creative}</th>
            <th>{t.offer}</th><th className={styles.number}>{t.leadCount}</th>
            <th className={styles.number}>{t.qualifiedShort}</th>
            <th className={styles.number}>{t.bookedRate}</th></tr></thead>
          <tbody>{campaignRows.length?campaignRows.map((row,i)=><tr key={[row.source,row.campaign,row.creative,row.offer,i].join(':')}>
            <td>{sourceName(row.source)}</td><td>{row.campaign||'—'}</td><td>{row.creative||'—'}</td>
            <td>{OFFERS.find(([id])=>id===row.offer)?.[1]||row.offer}</td>
            <td className={styles.number}>{row.leads}</td>
            <td className={styles.number}>{row.qualified}</td>
            <td className={styles.number}>{Math.round(100*Number(row.booked)/Math.max(1,Number(row.leads)))}%</td>
          </tr>):<tr><td colSpan="7" className={styles.empty}>{t.noCampaigns}</td></tr>}</tbody>
        </table></div>
        <p className={styles.info}>{t.sourceInfo}</p>
      </details>
      <details className={styles.manage}>
        <summary>{t.form}</summary>
        {choices.length?<form className={styles.form} onSubmit={event=>{
          event.preventDefault()
          if(confirmed&&contactId){
            const id=submissionId||globalThis.crypto.randomUUID()
            setSubmissionId(id)
            send('record_lead',{id,contactId,source,medium,campaign,creative,offer})
          }
        }}>
          <label>{t.contact}<select required value={contactId} onChange={e=>setContactId(e.target.value)}>
            <option value="">—</option>{choices.map(x=><option key={x.id} value={x.id}>{x.displayName}</option>)}
          </select></label>
          <label>{t.source}<select value={source} onChange={e=>{setSource(e.target.value);if(e.target.value==='google_maps')setMedium('organic_search');else if(['eventbrite','meetup','luma','allevents','humanitix','tickettailor'].includes(e.target.value))setMedium('organic_event')}}>
            {SOURCES.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          <label>{t.medium}<select value={medium} onChange={e=>setMedium(e.target.value)}>
            {MEDIA.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          <label>{t.offer}<select value={offer} onChange={e=>setOffer(e.target.value)}>
            {OFFERS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          <label>{t.campaign}<input value={campaign} maxLength={80} pattern="[a-zA-Z0-9_-]*"
            placeholder="hh_reiki_oct" onChange={e=>setCampaign(e.target.value)} /></label>
          <label>{t.creative}<input value={creative} maxLength={80} pattern="[a-zA-Z0-9_-]*"
            placeholder="creative_a" onChange={e=>setCreative(e.target.value)} /></label>
          <label className={styles.checkbox}><input type="checkbox" checked={confirmed}
            onChange={e=>setConfirmed(e.target.checked)} required />{t.confirm}</label>
          <button type="submit" disabled={busy||!confirmed||!contactId}>{t.save}</button>
        </form>:<p className={styles.empty}>{t.new}</p>}
        <p className={styles.info}>{t.sourceInfo}</p>
      </details>
      <details className={styles.manage}>
        <summary>{t.history} ({data.leads?.length||0})</summary>
        <div className={styles.leads}>
          {data.leads?.length?data.leads.map(item=><div className={styles.lead} key={item.id}>
            <div className={styles.leadInfo}>
              <strong>{names.get(item.contact_id)||t.contact} · {sourceName(item.source)}</strong>
              <small>{item.offer.replaceAll('_',' ')} · {item.campaign||'—'} · {String(item.created_at).slice(0,10)}</small>
            </div>
            <label>{t.status} <select disabled={busy} value={item.stage} onChange={e=>send('update_stage',{
              id:item.id,stage:e.target.value,expectedRevision:item.revision})}>
              {STATUS_IDS.map(id=><option key={id} value={id}>{STAGES[language][id]}</option>)}</select></label>
            {item.offer==='reiki_course'&&<div className={styles.milestones}>
              {[['reiki_course_started',t.course1],['reiki_initiation_requested',t.course2]].map(([id,label])=>
                <button type="button" key={id} disabled={busy||milestoneKeys.has(item.id+':'+id)}
                  onClick={()=>send('record_milestone',{id:item.id,milestone:id})}>
                  {milestoneKeys.has(item.id+':'+id)?'✓ ':''}{label}</button>)}
            </div>}
          </div>):<p className={styles.empty}>{t.none}</p>}
        </div>
      </details>
      <details className={styles.manage}>
        <summary>{t.manual}</summary>
        <div className={styles.tableWrap}><table className={styles.table}><tbody>
          {(data.oldSources||[]).map((row,i)=><tr key={i}><td>{sourceName(row.source)}</td>
            <td>{row.lifecycle}</td><td className={styles.number}>{row.contacts}</td></tr>)}
        </tbody></table></div>
      </details>
    </>}
    {notice&&<p className={styles.status} role="status">{notice}</p>}
  </section>
}
