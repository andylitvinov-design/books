'use client'
import { useEffect, useState } from 'react'
import { CalendarDays, Plus, ArrowLeft, Save, Send, MapPin, ExternalLink } from 'lucide-react'
import PracticePhotoUpload from './practice-photo-upload'
import styles from './practice-events.module.css'

const languages = ['en', 'ru', 'es']
const emptyDraft = () => ({
  title: {en:'',ru:'',es:''}, description: {en:'',ru:'',es:''},
  category:'connection', format:'in_person', startsAt:'', endsAt:'',
  timeZone:'America/Toronto', city:'Toronto',location:'',
  posterUrl:'', registrationHref:'', pricingMode:'free',priceAmount:'',currency:'CAD',
})
const copy = {
  en: {
    title:'My events',intro:'Create workshops, gatherings, circles or online meetings. Every event is reviewed before it goes public.',
    new:'Add event',empty:'No events yet. Add your first gathering.',edit:'Edit',review:'Send for review',
    save:'Save draft',cancel:'Back to events',archive:'Archive',pause:'Unpublish',published:'Published',
    draft:'Draft',submitted:'Under review',changes_requested:'Changes requested',paused:'Unpublished',
    suspended:'Suspended',archived:'Archived',titleLabel:'Event name',description:'Description',
    date:'Starts',ends:'Ends (optional)',zone:'Time zone',format:'Format',inPerson:'In person',online:'Online',
    category:'Theme',city:'City',venue:'Venue / address',registration:'Registration link (HTTPS or site page)',
    pricing:'Price',free:'Free',fixed:'Fixed price',contact:'Contact organizer',amount:'Amount',
    photo:'Cover photo',titleHelp:'Provide at least one language. Missing translations use your original text.',
    registrationHelp:'Use your registration or booking page. Client contact details should not appear in the public description.',
    sent:'Event sent for review.',saved:'Event saved as a draft.',pausedNotice:'Event is no longer listed publicly.',
    archivedNotice:'Event archived.',error:'Could not save the event.',dateError:'Enter a valid start date and time.',
    timeError:'This time does not exist in the selected time zone (daylight saving change).',
    confirm:'Archive this event?',locationHelp:'Add a venue for an in-person event.',
    overview:'Drafts, review and public events in one place.',preview:'Public calendar',
    'somatic':'Body & safety','connection':'Heart & connection','reiki':'Reiki & energy','temple':'Temple studies',
  },
  ru: {
    title:'Мои мероприятия',intro:'Размещайте семинары, встречи, круги и онлайн-мероприятия. Публикация на сайте — после проверки.',
    new:'Добавить мероприятие',empty:'Мероприятий пока нет. Создайте первую встречу.',edit:'Редактировать',review:'Отправить на проверку',
    save:'Сохранить черновик',cancel:'К списку',archive:'В архив',pause:'Снять с публикации',published:'Опубликовано',
    draft:'Черновик',submitted:'На проверке',changes_requested:'Нужны изменения',paused:'Снято с публикации',
    suspended:'Приостановлено',archived:'В архиве',titleLabel:'Название',description:'Описание',
    date:'Начало',ends:'Окончание (необязательно)',zone:'Часовой пояс',format:'Формат',inPerson:'Очно',online:'Онлайн',
    category:'Тема',city:'Город',venue:'Место / адрес',registration:'Ссылка регистрации (HTTPS или страница сайта)',
    pricing:'Стоимость',free:'Бесплатно',fixed:'Фиксированная цена',contact:'Уточнить у организатора',amount:'Сумма',
    photo:'Обложка',titleHelp:'Достаточно заполнить один язык. Для остальных будет показан исходный текст.',
    registrationHelp:'Добавьте ссылку записи или регистрации. Не размещайте данные клиентов в публичном описании.',
    sent:'Отправлено на проверку.',saved:'Черновик сохранён.',pausedNotice:'Мероприятие скрыто из публичного списка.',
    archivedNotice:'Мероприятие перемещено в архив.',error:'Не удалось сохранить мероприятие.',
    dateError:'Укажите корректную дату и время начала.',timeError:'Такого времени нет в часовом поясе (переход на летнее/зимнее время).',
    confirm:'Отправить мероприятие в архив?',locationHelp:'Для очной встречи укажите адрес.',
    overview:'Черновики, модерация и опубликованные встречи в одном разделе.',preview:'Публичный календарь',
    'somatic':'Тело и безопасность','connection':'Сердце и контакт','reiki':'Рейки и энергия','temple':'Храмовые практики',
  },
  es: {
    title:'Mis eventos',intro:'Publica talleres, encuentros y sesiones en línea. Los eventos se revisan antes de aparecer en la web.',
    new:'Añadir evento',empty:'Todavía no hay eventos.',edit:'Editar',review:'Enviar a revisión',
    save:'Guardar borrador',cancel:'Volver',archive:'Archivar',pause:'Retirar',published:'Publicado',
    draft:'Borrador',submitted:'En revisión',changes_requested:'Cambios solicitados',paused:'Retirado',
    suspended:'Suspendido',archived:'Archivado',titleLabel:'Título',description:'Descripción',
    date:'Inicio',ends:'Fin (opcional)',zone:'Zona horaria',format:'Formato',inPerson:'Presencial',online:'En línea',
    category:'Tema',city:'Ciudad',venue:'Lugar / dirección',registration:'Enlace de inscripción',
    pricing:'Precio',free:'Gratis',fixed:'Precio fijo',contact:'Consultar',amount:'Importe',
    photo:'Portada',titleHelp:'Basta con un idioma; se mostrará el original si falta una traducción.',
    registrationHelp:'Usa una página de registro. No incluyas información privada de clientes.',
    sent:'Evento enviado a revisión.',saved:'Borrador guardado.',pausedNotice:'Evento retirado del calendario.',
    archivedNotice:'Evento archivado.',error:'No se pudo guardar.',dateError:'Introduce una fecha y hora válida.',
    timeError:'La hora no existe en esta zona horaria.',confirm:'¿Archivar evento?',locationHelp:'Indica un lugar.',
    overview:'Borradores, revisión y eventos públicos.',preview:'Calendario público',
    'somatic':'Cuerpo y seguridad','connection':'Corazón y conexión','reiki':'Reiki y energía','temple':'Estudios del templo',
  },
}

const zonedParts = (timestamp, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(new Date(timestamp))
  const obj = Object.fromEntries(parts.map(part=>[part.type,part.value]))
  return Date.UTC(Number(obj.year),Number(obj.month)-1,Number(obj.day),Number(obj.hour),Number(obj.minute))
}
function toEventTimestamp(local, timeZone) {
  if (!local) return ''
  const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(local)
  if (!m) throw new Error('INVALID_EVENT_DATE')
  const desired = Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]))
  let utc=desired
  for (let i=0;i<4;i++) {
    const diff=desired-zonedParts(utc,timeZone)
    utc+=diff
    if (diff===0) break
  }
  if (zonedParts(utc,timeZone)!==desired) throw new Error('NONEXISTENT_LOCAL_TIME')
  const minutes=Math.round((desired-utc)/60000)
  const pad=n=>String(n).padStart(2,'0')
  return local+':00'+(minutes>=0?'+':'-')+pad(Math.floor(Math.abs(minutes)/60))+':'+pad(Math.abs(minutes)%60)
}

async function request(path='', body) {
  const response = await fetch('/api/app/practice/events'+path,{
    credentials:'same-origin',cache:'no-store',method:body?'POST':'GET',
    headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,
  })
  const data=await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(data.error||'EVENT_REQUEST_FAILED')
  return data
}

const titleOf = item => {
  const title=item.draft?.title||item.published?.title||{}
  return languages.map(lang=>title[lang]).find(Boolean)||'Untitled event'
}

export default function PracticeEvents({locale='en', accountId}) {
  const t=copy[locale]||copy.en
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(emptyDraft)
  const [language,setLanguage]=useState(languages.includes(locale)?locale:'en')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  async function refresh() {
    const data=await request()
    setItems(data.items||[])
  }
  useEffect(()=>{
    let active=true
    request().then(data=>{if(active)setItems(data.items||[])})
      .catch(err=>{if(active)setError(err.message)})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[accountId])

  function open(item) {
    setError('');setMessage('')
    setEditing(item||'new')
    const draft=item?.draft||emptyDraft()
    setForm({
      ...emptyDraft(),...draft,
      title:{...emptyDraft().title,...draft.title},
      description:{...emptyDraft().description,...draft.description},
      startsAt:(draft.startsAt||'').slice(0,16),
      endsAt:(draft.endsAt||'').slice(0,16),
      priceAmount:draft.priceAmount??'',
    })
    setLanguage(languages.includes(locale)?locale:'en')
  }
  function close() {setEditing(null);setError('')}
  const change=(key,value)=>setForm(prev=>({...prev,[key]:value}))
  const changeText=(key,value)=>setForm(prev=>({...prev,[key]:{...prev[key],[language]:value}}))
  const reportError=err=>{
    if(err.message==='INVALID_EVENT_DATE')return t.dateError
    if(err.message==='NONEXISTENT_LOCAL_TIME')return t.timeError
    return t.error+' ('+err.message+')'
  }
  async function save(submit=false) {
    if(busy)return
    setBusy(true);setError('');setMessage('')
    try {
      const draft={
        ...form, startsAt:toEventTimestamp(form.startsAt,form.timeZone),
        endsAt:toEventTimestamp(form.endsAt,form.timeZone),
      }
      const item=editing==='new'?null:editing
      const saved=await request(item?'/'+item.id:'',{draft,expectedRevision:item?.revision})
      if(submit)await request('/'+saved.id,{action:'submit',expectedRevision:saved.revision})
      await refresh()
      setMessage(submit?t.sent:t.saved)
      close()
    }catch(err){setError(reportError(err))}
    finally{setBusy(false)}
  }
  async function action(item,kind) {
    if(busy)return
    if(kind==='archive'&&!window.confirm(t.confirm))return
    setBusy(true);setError('');setMessage('')
    try {
      await request('/'+item.id,{action:kind,expectedRevision:item.revision})
      await refresh()
      setMessage(kind==='pause'?t.pausedNotice:t.archivedNotice)
    }catch(err){setError(reportError(err))}
    finally{setBusy(false)}
  }

  return <div className={styles.root}>
    <div className={styles.header}>
      <div><p className={styles.kicker}>HOLISTIC HOUSE · EVENTS</p>
        <h3>{t.title}</h3><p>{t.intro}</p></div>
      <a className={styles.calendarLink} href={'/'+locale+'/events'} target="_blank" rel="noopener noreferrer">{t.preview} <ExternalLink size={14}/></a>
    </div>
    {message&&<p className={styles.success} role="status">{message}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {editing ? <div className={styles.editor}>
      <div className={styles.editorHead}>
        <button type="button" onClick={close} className={styles.back} disabled={busy}><ArrowLeft size={15}/>{t.cancel}</button>
        <strong>{editing==='new'?t.new:titleOf(editing)}</strong>
      </div>
      <div className={styles.languageTabs} role="group" aria-label="Event language">
        {languages.map(lang=><button type="button" key={lang} aria-pressed={language===lang} onClick={()=>setLanguage(lang)}>{lang.toUpperCase()}</button>)}
      </div>
      <div className={styles.fields}>
        <label className={styles.full}>{t.titleLabel}<input value={form.title[language]} maxLength={160} onChange={e=>changeText('title',e.target.value)} /></label>
        <label className={styles.full}>{t.description}<textarea rows={4} maxLength={2500} value={form.description[language]} onChange={e=>changeText('description',e.target.value)} /></label>
        <p className={styles.helper+' '+styles.full}>{t.titleHelp}</p>
        <label>{t.category}<select value={form.category} onChange={e=>change('category',e.target.value)}>
          {['somatic','connection','reiki','temple'].map(name=><option value={name} key={name}>{t[name]}</option>)}
        </select></label>
        <label>{t.format}<select value={form.format} onChange={e=>change('format',e.target.value)}>
          <option value="in_person">{t.inPerson}</option><option value="online">{t.online}</option>
        </select></label>
        <label>{t.date}<input type="datetime-local" value={form.startsAt} onChange={e=>change('startsAt',e.target.value)} /></label>
        <label>{t.ends}<input type="datetime-local" value={form.endsAt} onChange={e=>change('endsAt',e.target.value)} /></label>
        <label>{t.zone}<input type="text" list="event-timezones" value={form.timeZone} onChange={e=>change('timeZone',e.target.value)} />
          <datalist id="event-timezones">{['America/Toronto','America/New_York','America/Los_Angeles','America/Mexico_City','Europe/London','Europe/Kyiv','Europe/Berlin','UTC'].map(name=><option value={name} key={name}/>)}</datalist>
        </label>
        <label>{t.city}<input value={form.city} maxLength={150} onChange={e=>change('city',e.target.value)}/></label>
        {form.format==='in_person'&&<label className={styles.full}>{t.venue}<input value={form.location} maxLength={250} onChange={e=>change('location',e.target.value)}/><small>{t.locationHelp}</small></label>}
        <div className={styles.full}>
          <PracticePhotoUpload mode="event" value={form.posterUrl} onChange={url=>change('posterUrl',url)} locale={locale} disabled={busy} />
        </div>
        <label className={styles.full}>{t.registration}<input type="url" value={form.registrationHref} onChange={e=>change('registrationHref',e.target.value)} placeholder="https://..." /><small>{t.registrationHelp}</small></label>
        <label>{t.pricing}<select value={form.pricingMode} onChange={e=>change('pricingMode',e.target.value)}>
          <option value="free">{t.free}</option><option value="fixed">{t.fixed}</option><option value="contact">{t.contact}</option>
        </select></label>
        {form.pricingMode==='fixed'&&<label>{t.amount}
          <div className={styles.priceRow}><input type="number" min="0" max="100000" step="0.01" value={form.priceAmount} onChange={e=>change('priceAmount',e.target.value)}/>
          <select value={form.currency} onChange={e=>change('currency',e.target.value)}>{['CAD','USD','EUR','GBP'].map(c=><option key={c}>{c}</option>)}</select></div>
        </label>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={busy} onClick={()=>save(false)}><Save size={15}/>{t.save}</button>
        <button type="button" className={styles.primary} disabled={busy} onClick={()=>save(true)}><Send size={15}/>{t.review}</button>
      </div>
    </div>:<>
      <div className={styles.listHead}><span>{t.overview}</span><button type="button" onClick={()=>open(null)} className={styles.primary}><Plus size={16}/>{t.new}</button></div>
      {loading?<p aria-busy="true">Loading…</p>:items.length===0?<p className={styles.empty}>{t.empty}</p>:<div className={styles.list}>
        {items.map(item=><article key={item.id} className={styles.card}>
          {item.draft?.posterUrl||item.published?.posterUrl
            ?<img alt="" src={item.draft?.posterUrl||item.published?.posterUrl} width="112" height="78" loading="lazy" className={styles.thumb}/>
            :<span className={styles.fallback}><CalendarDays size={26}/></span>}
          <div className={styles.cardCopy}>
            <strong>{titleOf(item)}</strong>
            <span className={styles.meta}><CalendarDays size={13}/>{item.draft?.startsAt?new Date(item.draft.startsAt).toLocaleString(locale):'—'}
              {item.draft?.format==='in_person'&&item.draft?.city&&<> · <MapPin size={13}/>{item.draft.city}</>}</span>
            <span className={styles.status}>{t[item.status]||item.status}</span>
            {item.reviewNote&&<small>{item.reviewNote}</small>}
          </div>
          <div className={styles.cardActions}>
            {!['archived','suspended'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>open(item)}>{t.edit}</button>}
            {['published','submitted','changes_requested'].includes(item.status)&&Object.keys(item.published||{}).length>0&&<button type="button" disabled={busy} onClick={()=>action(item,'pause')}>{t.pause}</button>}
            {!['archived','suspended'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>action(item,'archive')}>{t.archive}</button>}
          </div>
        </article>)}
      </div>}
    </>}
  </div>
}
