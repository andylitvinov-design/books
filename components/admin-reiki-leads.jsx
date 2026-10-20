'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardList, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { energyworkSlides } from '@/data/academy/energywork-ai-curriculum'
import styles from './admin-reiki-leads.module.css'

const TEXT = {
  ru: {
    title:'Reiki Practitioner · CRM',
    subtitle:'Два лида на ученика: начало курса и отдельная заявка на личную инициацию.',
    privacy:'Только с явного согласия ученика. Ответы и письма зашифрованы и доступны в закрытом кабинете. Отправки email или маркетинговых рассылок нет.',
    reload:'Обновить', all:'Все', starts:'Начали курс', applications:'Заявки на инициацию',
    new:'Новый', contacted:'Связались', closed:'Закрыт', filter:'Поиск по имени или email',
    started:'Лид 1 · Начало обучения', applied:'Лид 2 · Запрос на инициацию',
    learning:'Обучается', completed:'Завершил(а)', letter:'Письмо о личной инициации',
    answers:'Ответы, отзывы и материалы', none:'Пока нет сохранённых ответов',
    noLead:'Пока нет лидов. Они появятся после согласия ученика на передачу материалов.',
    error:'Не удалось загрузить заявки. Проверьте доступ и состояние базы.',
    status:'Статус', updated:'Обновлено', source:'Курс', noLetter:'Письмо ещё не отправлено',
    startDate:'Начало', requestDate:'Заявка', step:'Шаг', total:'Лидов', students:'Учеников',
    use:'Ответы показаны на языке курса; слова ученика не редактируются преподавателем.',
    emptySearch:'Ничего не найдено', progress:'Прогресс', note:'Личные материалы не публикуются автоматически.',
    moderation:'Отзывы для лендинга', moderationHint:'Только после отдельного согласия ученика. Проверьте, нет ли в тексте контактов или частной информации.',
    pending:'Ожидает проверки', approved:'Опубликован', rejected:'Отклонён', approve:'Опубликовать', reject:'Отклонить',unpublish:'Снять с публикации',reviewEmpty:'Пока нет заявок на публикацию.',
  },
  en: {
    title:'Reiki Practitioner · CRM',
    subtitle:'Two stages per learner: course start and a separate personal initiation application.',
    privacy:'Visible only after the learner gives consent. Answers and letters are encrypted and available only in this protected cabinet. No automated email or marketing.',
    reload:'Refresh', all:'All', starts:'Course starts', applications:'Initiation requests',
    new:'New', contacted:'Contacted', closed:'Closed', filter:'Search name or email',
    started:'Lead 1 · Course started', applied:'Lead 2 · Initiation requested',
    learning:'Learning', completed:'Completed', letter:'Personal initiation letter',
    answers:'Lesson answers and meditation feedback', none:'No saved answers yet',
    noLead:'No leads yet. A lead appears only when a learner consents to sharing their materials.',
    error:'Unable to load requests. Check access and database readiness.',
    status:'Status', updated:'Updated', source:'Course', noLetter:'No initiation letter submitted',
    startDate:'Started', requestDate:'Applied', step:'Slide', total:'Leads', students:'Learners',
    use:'Answers are shown in the course language; student text cannot be edited here.',
    emptySearch:'No matches', progress:'Progress', note:'Private course materials are never auto-published.',
    moderation:'Course landing reviews', moderationHint:'Learners opt in separately. Check that a review contains no contact details or private information before approving.',
    pending:'Pending approval', approved:'Published', rejected:'Rejected', approve:'Publish', reject:'Reject',unpublish:'Unpublish',reviewEmpty:'No public review submissions yet.',
  },
}
const SENTENCE = /^Feeling:(10|[0-9])\/10\n([\s\S]*)$/
const titles = new Map(energyworkSlides().map((s) => [s.id,s.title]))
function when(iso, locale) {
  const parsed = typeof iso === 'string' ? Date.parse(iso) : NaN
  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-CA',{dateStyle:'medium',timeStyle:'short'})
    : ''
}
function CourseAnswers({ answers, locale, copy }) {
  const entries = Object.entries(answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {})
    .filter(([id,value]) => id !== 'end-01' && typeof value === 'string' && value.trim())
  return <details className={styles.materials}>
    <summary><BookOpen size={18} aria-hidden="true"/>{copy.answers} <span>({entries.length})</span></summary>
    {entries.length ? <div className={styles.answerList}>
      {entries.map(([id,value]) => {
        const match = SENTENCE.exec(value)
        return <section className={styles.answer} key={id}>
          <span className={styles.answerLabel}>{titles.get(id)?.[locale] || id}</span>
          {match ? <>
            <strong>{locale==='ru'?'Ощущения':'Experience'}: {match[1]}/10</strong>
            <p>{match[2]}</p>
          </> : <p>{value}</p>}
        </section>
      })}
    </div> : <p className={styles.muted}>{copy.none}</p>}
    <p className={styles.footnote}>{copy.use}</p>
  </details>
}
function LeadStatus({ lead, label, copy, busy, update }) {
  if (!lead) return null
  return <div className={styles.stage}>
    <div className={styles.stageHead}>
      <strong>{label}</strong>
      <span className={styles.stageDate}>{when(lead.createdAt,copy===TEXT.ru?'ru':'en')}</span>
    </div>
    <div className={styles.stageMeta}>
      <span className={styles.chip}>{lead.courseStatus==='completed'?copy.completed:copy.learning}</span>
      <span>{copy.status}: <b>{copy[lead.status]||lead.status}</b></span>
    </div>
    <div className={styles.statusActions} role="group" aria-label={copy.status}>
      {['new','contacted','closed'].map(status=><button key={status} type="button"
        aria-pressed={lead.status===status} disabled={busy||lead.status===status}
        onClick={()=>update(lead,status)}>{copy[status]}</button>)}
    </div>
  </div>
}
export default function AdminReikiLeads() {
  const [locale,setLocale] = useState('ru')
  const [leads,setLeads] = useState([])
  const [publicReviews,setPublicReviews] = useState([])
  const [filter,setFilter] = useState('all')
  const [search,setSearch] = useState('')
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const copy = TEXT[locale]
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response=await fetch('/admin/reiki-leads/data',{cache:'no-store',credentials:'same-origin'})
      if(!response.ok) throw new Error('LOAD_FAILED')
      const data=await response.json()
      setLeads(Array.isArray(data.leads)?data.leads:[])
      setPublicReviews(Array.isArray(data.reviews)?data.reviews:[])
    } catch {
      setLeads([])
      setPublicReviews([])
      setError('fetch')
    } finally {setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  const groups=useMemo(()=>{
    const map=new Map()
    for(const lead of leads){
      if(!lead || !['start','application'].includes(lead.stage))continue
      const item=map.get(lead.accountId)||{accountId:lead.accountId,start:null,application:null}
      item[lead.stage]=lead
      map.set(lead.accountId,item)
    }
    return [...map.values()].sort((a,b)=>String(b.application?.createdAt||b.start?.createdAt||'')
      .localeCompare(String(a.application?.createdAt||a.start?.createdAt||'')))
  },[leads])
  const visible=groups.filter(group=>{
    if(filter==='start'&&!group.start)return false
    if(filter==='application'&&!group.application)return false
    const contact=group.start?.contact||group.application?.contact||{}
    return [contact.displayName,contact.email].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  })
  async function update(lead,status){
    if(busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/admin/reiki-leads/data',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:lead.id,status,expectedRevision:lead.revision}),
      })
      if(!response.ok) throw new Error('UPDATE_FAILED')
      await load()
    }catch{setError('update')}finally{setBusy(false)}
  }
  async function moderateReview(review,status){
    if(busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/admin/reiki-leads/data',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'moderate-review',id:review.id,status,
          expectedRevision:review.revision}),
      })
      if(!response.ok)throw new Error('REVIEW_CHANGED')
      await load()
    }catch{setError('review')}finally{setBusy(false)}
  }
  return <main className={styles.page}>
    <nav className={styles.nav}>
      <a href="/admin"><ArrowLeft size={17} aria-hidden="true"/>{locale==='ru'?'Кабинет практика':'Practitioner cabinet'}</a>
      <button onClick={()=>setLocale(locale==='ru'?'en':'ru')} aria-label="Language">{locale==='ru'?'EN':'RU'}</button>
    </nav>
    <header className={styles.hero}>
      <div className={styles.symbol}><ClipboardList size={26} aria-hidden="true"/></div>
      <h1>{copy.title}</h1>
      <p>{copy.subtitle}</p>
    </header>
    <div className={styles.stats}>
      <div><b>{groups.length}</b><span>{copy.students}</span></div>
      <div><b>{leads.length}</b><span>{copy.total}</span></div>
      <div><b>{groups.filter(g=>g.application).length}</b><span>{copy.applications}</span></div>
    </div>
    <p className={styles.privacy}><ShieldCheck size={18} aria-hidden="true"/>{copy.privacy}</p>
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label={copy.status}>
        {[['all',copy.all],['start',copy.starts],['application',copy.applications]].map(([value,label])=>
          <button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}
      </div>
      <label className={styles.search}>{copy.filter}<input value={search} onChange={e=>setSearch(e.target.value)} maxLength={120} type="search"/></label>
      <button className={styles.refresh} onClick={()=>void load()} disabled={loading||busy}><RefreshCw size={16} aria-hidden="true"/>{copy.reload}</button>
    </div>
    <section className={styles.publicReviewSection} aria-labelledby="reiki-public-queue-title" data-reiki-review-moderation>
      <h2 id="reiki-public-queue-title">{copy.moderation} ({publicReviews.filter(item=>item.status==='pending').length})</h2>
      <p>{copy.moderationHint}</p>
      {!loading && (publicReviews.length ? <div className={styles.publicReviewGrid}>
        {publicReviews.map(review=><article className={styles.publicReviewCard} key={review.id}>
          <div className={styles.publicReviewHead}>
            <strong>{titles.get(review.slideId)?.[locale] || review.slideId}</strong>
            <small>{copy[review.status] || review.status} · {review.locale?.toUpperCase()}</small>
          </div>
          <p className={styles.publicReviewText}>{review.review}</p>
          {review.status==='pending' ? <div className={styles.publicReviewActions}>
            <button type="button" disabled={busy}
              onClick={()=>void moderateReview(review,'approved')}>{copy.approve}</button>
            <button type="button" disabled={busy} onClick={()=>void moderateReview(review,'rejected')}>{copy.reject}</button>
          </div> : review.status==='approved' ? <button type="button" disabled={busy}
            className={styles.unpublishButton} onClick={()=>void moderateReview(review,'rejected')}>{copy.unpublish}</button> : null}
        </article>)}
      </div> : <p>{copy.reviewEmpty}</p>)}
    </section>
    {error&&<p className={styles.alert} role="alert">{copy.error}</p>}
    {loading?<p className={styles.muted}>{locale==='ru'?'Загрузка…':'Loading…'}</p>:
      visible.length?visible.map(group=>{
        const contact=group.start?.contact||group.application?.contact||{}
        const snapshot=group.application||group.start
        return <article className={styles.card} key={group.accountId}>
          <header className={styles.client}>
            <div className={styles.avatar} aria-hidden="true">{(contact.displayName||contact.email||'?').slice(0,1).toUpperCase()}</div>
            <div className={styles.clientInfo}>
              <h2>{contact.displayName|| (locale==='ru'?'Участник курса':'Course learner')}</h2>
              {contact.email?<p><Mail size={14} aria-hidden="true"/>{contact.email}</p>:null}
            </div>
            {group.application?<span className={styles.highlight}><CheckCircle2 size={15} aria-hidden="true"/>{copy.applied}</span>:null}
          </header>
          <div className={styles.stages}>
            <LeadStatus lead={group.start} label={copy.started} copy={copy} busy={busy} update={update}/>
            <LeadStatus lead={group.application} label={copy.applied} copy={copy} busy={busy} update={update}/>
          </div>
          <p className={styles.progress}>{copy.step}: <strong>{titles.get(snapshot?.slideId)?.[locale]||snapshot?.slideId||'—'}</strong></p>
          {group.application?.reason?<section className={styles.letter}>
            <h3>{copy.letter}</h3><blockquote>{group.application.reason}</blockquote>
          </section>:null}
          <CourseAnswers answers={snapshot?.answers} locale={locale} copy={copy}/>
        </article>
      }):<p className={styles.muted}>{search?copy.emptySearch:copy.noLead}</p>}
    <footer className={styles.footer}>
      <span><ShieldCheck size={15} aria-hidden="true"/>{copy.note}</span>
      <a href="/en/academy/principles-of-energywork/learn">{copy.source}<ArrowRight size={16} aria-hidden="true"/></a>
    </footer>
  </main>
}
