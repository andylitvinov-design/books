'use client'

import Link from 'next/link'
import {useEffect, useMemo, useState} from 'react'
import {CalendarDays, Check, CircleAlert, Copy, Download, Edit3, FileText, Megaphone, Plus, RefreshCcw, Send, ShieldCheck, Trash2} from 'lucide-react'
import {listGrowthStudioPostsAction,updateGrowthStudioPostAction} from '@/app/admin/growth-studio/actions'
import {GROWTH_BRANDS,GROWTH_CHANNELS,GROWTH_LANGUAGES,publicCampaignLink,orderGrowthPosts} from '@/lib/growth-studio/model.mjs'
import styles from './growth-studio.module.css'

const BRANDS={holistic_house:'Holistic House',toronto_tantra:'TorontoTantra',psitrends:'PsiTrends'}
const CHANNELS={
  instagram:'Instagram',facebook:'Facebook',telegram:'Telegram',youtube:'YouTube',
  linkedin:'LinkedIn',threads:'Threads',bluesky:'Bluesky',pinterest:'Pinterest',
  tiktok:'TikTok',eventbrite:'Eventbrite',meetup:'Meetup',manual:'Manual / Other',
}
const COPY={
  en:{
    heading:'Content command center',sub:'One place to prepare posts for your channels, with explicit approvals.',
    draft:'Draft',approved:'Approved',planned_manual:'Manual plan',archived:'Archived',
    pending:'For review',planned:'Planned for manual posting',noAuto:'No automatic posts will be sent from this version.',
    unavailable:'Durable storage is not available. Editing is disabled to prevent losing your work.',
    reload:'Refresh',new:'New post',compose:'Editor',calendar:'Calendar',library:'Media',export:'Export CSV',
    brand:'Brand',channel:'Channel',language:'Post language',title:'Internal title',caption:'Caption / post text',
    source:'Public landing URL',campaign:'Campaign code (optional)',schedule:'Planned time',scheduleNote:'Input uses your device timezone; calendar is shown in Toronto time.',
    sourceHint:'Use public site URLs only; never include client information in these posts or links.',
    captionHint:'Write platform-specific copy. AI drafting and translation will be added after approvals and account setup.',
    preview:'Post preview',tracking:'Tracked public link',copy:'Copy link',copyPost:'Copy post',copyPostOk:'Post text copied.',save:'Save draft',approve:'Approve saved draft',
    plan:'Add to manual calendar',edit:'Edit',archive:'Archive',reopen:'Reopen draft',
    sourceLabel:'Source',noPosts:'No posts here yet. Create your first draft.',
    notes:'Planning does not publish. Post manually or use the verified YouTube/Metricool workflow.',
    selected:'Editing',newDraft:'New draft',clear:'Clear editor',saved:'Draft saved.',
    approvedNotice:'Approved for preparation — not published.',plannedNotice:'Added to the manual calendar, not sent to a social platform.',
    archivedNotice:'Archived.',reopened:'Back in draft.',tryAgain:'Could not save. Refresh and try again.',
    unauthorized:'Admin session expired. Sign in again.',conflict:'This post changed. Refresh before editing again.',
    invalid_transition:'Save and approve the post first; the planned date must be in the future.',
    invalid_post:'Check the required fields, URL, text length and campaign code.',
    storage_unavailable:'Storage is unavailable. No changes were saved.',
    capacity_reached:'The editorial calendar has reached its record limit.',
    not_found:'This post was not found.',invalid_action:'Unsupported action.',
    filter:'Filter',all:'All statuses',allBrands:'All brands',today:'Today',
    next:'Next month',previous:'Previous month',monthItems:'manual plans',
    other:'Unscheduled / drafts',draftCount:'Drafts',approvedCount:'Approved',
    planCount:'Manual plans',publishedCount:'Confirmed online',notMeasured:'Not integrated',
    links:'Existing tools',youtube:'YouTube upload',videos:'Website videos',materials:'Material library',
    localTime:'Toronto',createGuide:'Choose a public page, prepare the text, save, approve, then add it to your manual calendar.',
    copyOk:'Link copied.',copyFail:'Could not copy automatically.',downloaded:'CSV prepared on your device.',
    unsafe:'Do not paste diagnoses, client data, test responses or private material into marketing content.',
    duplicate:'Duplicate into draft',
  },
  ru:{
    heading:'Центр управления контентом',sub:'Готовьте публикации для разных площадок и согласовывайте их перед размещением.',
    draft:'Черновик',approved:'Одобрено',planned_manual:'Ручной план',archived:'Архив',
    pending:'На согласование',planned:'Запланировано вручную',noAuto:'Эта версия не отправляет публикации автоматически.',
    unavailable:'Серверное хранилище недоступно. Редактор отключён, чтобы не потерять изменения.',
    reload:'Обновить',new:'Новая публикация',compose:'Редактор',calendar:'Календарь',library:'Медиа',export:'Экспорт CSV',
    brand:'Проект',channel:'Площадка',language:'Язык публикации',title:'Внутреннее название',caption:'Текст публикации',
    source:'Публичная ссылка',campaign:'Код кампании (необязательно)',schedule:'Планируемое время',scheduleNote:'Ввод времени по часовому поясу устройства; календарь — по Торонто.',
    sourceHint:'Только открытые страницы сайта. Никаких личных данных клиентов в публикации и ссылке.',
    captionHint:'Пишите текст для конкретной соцсети. AI-генерацию и переводы добавим после настройки аккаунтов.',
    preview:'Предпросмотр',tracking:'Ссылка с UTM',copy:'Копировать ссылку',copyPost:'Копировать пост',copyPostOk:'Текст публикации скопирован.',save:'Сохранить черновик',approve:'Одобрить сохранённый',
    plan:'В ручной календарь',edit:'Редактировать',archive:'В архив',reopen:'Вернуть в черновики',
    sourceLabel:'Источник',noPosts:'Публикаций пока нет. Создайте первый черновик.',
    notes:'Календарь не публикует посты. Размещайте вручную или через подтверждённую интеграцию YouTube/Metricool.',
    selected:'Редактирование',newDraft:'Новый черновик',clear:'Очистить форму',saved:'Черновик сохранён.',
    approvedNotice:'Одобрено для подготовки, но ещё не опубликовано.',
    plannedNotice:'Добавлено в ручной календарь. В соцсети ничего не отправлено.',
    archivedNotice:'В архиве.',reopened:'Снова черновик.',tryAgain:'Не удалось сохранить. Обновите список и повторите.',
    unauthorized:'Сессия администратора истекла. Войдите ещё раз.',conflict:'Публикация изменилась. Обновите список перед редактированием.',
    invalid_transition:'Сначала сохраните и одобрите текст; дата должна быть в будущем.',
    invalid_post:'Проверьте поля, ссылку, длину текста и код кампании.',
    storage_unavailable:'Хранилище недоступно. Изменения не сохранены.',
    capacity_reached:'Достигнут лимит записей календаря.',not_found:'Запись не найдена.',invalid_action:'Недоступное действие.',
    filter:'Фильтр',all:'Все статусы',allBrands:'Все проекты',today:'Сегодня',
    next:'Следующий месяц',previous:'Предыдущий месяц',monthItems:'планов вручную',
    other:'Без даты / черновики',draftCount:'Черновики',approvedCount:'Одобрено',
    planCount:'Ручной план',publishedCount:'Подтверждено онлайн',notMeasured:'Не подключено',
    links:'Готовые инструменты',youtube:'Загрузка YouTube',videos:'Видео сайта',materials:'Медиатека',
    localTime:'Торонто',createGuide:'Выберите открытую страницу, напишите текст, сохраните, одобрите и добавьте в ручной календарь.',
    copyOk:'Ссылка скопирована.',copyFail:'Не удалось скопировать.',downloaded:'CSV подготовлен на устройстве.',
    unsafe:'Не вставляйте диагнозы, результаты тестов, клиентские данные и частные материалы в рекламный контент.',
    duplicate:'Скопировать как черновик',
  },
}
const empty = () => ({
  brand:'holistic_house',channel:'instagram',locale:'en',title:'',caption:'',
  sourceUrl:'',campaign:'',scheduledAt:'',
})
const isoFromLocal = input => {
  if (!input) return ''
  const value=new Date(input)
  return Number.isNaN(value.getTime()) ? '' : value.toISOString()
}
const localFromIso = input => {
  if (!input) return ''
  const date=new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  const offset=date.getTimezoneOffset()*60000
  return new Date(date.getTime()-offset).toISOString().slice(0,16)
}
function torontoKey(iso) {
  if (!iso) return ''
  const fields=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(new Date(iso))
  const part=type=>fields.find(x=>x.type===type)?.value||''
  return part('year')+'-'+part('month')+'-'+part('day')
}
function formatTime(iso, locale) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':'en-CA',{
    timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short',
  }).format(new Date(iso))
}
function csvCell(value) {
  const text=String(value??'')
  const escaped=/^[\s]*[=+\-@]/.test(text)?"'"+text:text
  return '"'+escaped.replaceAll('"','""')+'"'
}
function saveCsv(records) {
  const cols=['id','brand','channel','locale','title','caption','sourceUrl','campaign','scheduledAt','status','updatedAt']
  const raw='\ufeff'+[cols.join(','),...records.map(x=>cols.map(key=>csvCell(x[key])).join(','))].join('\r\n')
  const url=URL.createObjectURL(new Blob([raw],{type:'text/csv;charset=utf-8;'}))
  const link=document.createElement('a');link.href=url;link.download='hh-growth-studio-editorial.csv'
  document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export default function GrowthStudio({initialLocale='en',initialRecords=[],storageReady=false}) {
  const [locale,setLocale]=useState(initialLocale==='ru'?'ru':'en')
  const t=COPY[locale]
  const [records,setRecords]=useState(initialRecords)
  const [ready,setReady]=useState(storageReady)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(empty)
  const [tab,setTab]=useState('compose')
  const [filter,setFilter]=useState('active')
  const [brandFilter,setBrandFilter]=useState('all')
  const [month,setMonth]=useState(()=>torontoKey(new Date().toISOString()).slice(0,7))
  useEffect(()=>{
    const onLocale=event=>setLocale(event.detail==='ru'?'ru':'en')
    window.addEventListener('holistic-house-ui-locale',onLocale)
    return()=>window.removeEventListener('holistic-house-ui-locale',onLocale)
  },[])
  const sorted=useMemo(()=>orderGrowthPosts(records),[records])
  const visible=useMemo(()=>sorted.filter(post=>{
    if (brandFilter!=='all' && post.brand!==brandFilter) return false
    return filter==='all'||(filter==='active'?post.status!=='archived':post.status===filter)
  }),[sorted,filter,brandFilter])
  const scheduled=useMemo(()=>visible.filter(post=>post.status==='planned_manual'),[visible])
  const counts=useMemo(()=>({
    draft:records.filter(x=>x.status==='draft').length,
    approved:records.filter(x=>x.status==='approved').length,
    planned_manual:records.filter(x=>x.status==='planned_manual').length,
  }),[records])
  const trackingLink=useMemo(()=>{
    try {return publicCampaignLink({...form,scheduledAt:isoFromLocal(form.scheduledAt)})} catch {return ''}
  },[form])
  const isEditing=Boolean(editing)
  const set=field=>event=>setForm(old=>({...old,[field]:event.target.value}))
  const reset=()=>{setEditing(null);setForm(empty());setNotice('');setTab('compose')}
  const edit=post=>{
    setEditing({id:post.id,revision:post.revision})
    setForm({...post,scheduledAt:localFromIso(post.scheduledAt)})
    setTab('compose');setNotice('')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const duplicate=post=>{
    setEditing(null)
    setForm({...post,title:post.title+' copy',scheduledAt:'',campaign:post.campaign})
    setTab('compose');setNotice('')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  async function refresh(){
    setBusy(true);setNotice('')
    try {
      const result=await listGrowthStudioPostsAction()
      if (result.ok){setRecords(result.records);setReady(true);setEditing(null)}
      else {setReady(false);setNotice(t[result.error]||t.tryAgain)}
    } catch {setNotice(t.tryAgain)}
    finally {setBusy(false)}
  }
  async function execute(action,post){
    if (!ready||busy) return
    setBusy(true);setNotice('')
    try {
      const result=await updateGrowthStudioPostAction(action==='save'
        ? {action:'save',id:editing?.id??null,expectedRevision:editing?.revision??0,
          fields:{brand:form.brand,channel:form.channel,locale:form.locale,title:form.title,
            caption:form.caption,sourceUrl:form.sourceUrl,campaign:form.campaign,
            scheduledAt:isoFromLocal(form.scheduledAt)}}
        : {action,id:post.id,expectedRevision:post.revision})
      if (!result.ok){setNotice(t[result.error]||t.tryAgain);return}
      const saved=result.record
      setRecords(previous=>orderGrowthPosts([...previous.filter(item=>item.id!==saved.id),saved]))
      if (action==='save'){
        setEditing({id:saved.id,revision:saved.revision})
        setForm({...saved,scheduledAt:localFromIso(saved.scheduledAt)})
      } else if (editing?.id===saved.id) setEditing({id:saved.id,revision:saved.revision})
      setNotice(action==='save'?t.saved:action==='approve'?t.approvedNotice:
        action==='plan'?t.plannedNotice:action==='archive'?t.archivedNotice:t.reopened)
    } catch {setNotice(t.tryAgain)}
    finally {setBusy(false)}
  }
  async function copyPost(post){
    try {
      const link=publicCampaignLink(post)
      await navigator.clipboard.writeText([post.caption,link].filter(Boolean).join('\n\n'))
      setNotice(t.copyPostOk)
    } catch {setNotice(t.copyFail)}
  }
  async function copyLink(post){
    try {
      const url=publicCampaignLink(post)
      if (!url) throw new Error('missing_url')
      await navigator.clipboard.writeText(url)
      setNotice(t.copyOk)
    } catch {setNotice(t.copyFail)}
  }
  const [year,number]=month.split('-').map(Number)
  const firstDay=new Date(Date.UTC(year,number-1,1,12))
  const offset=(firstDay.getUTCDay()+6)%7
  const daysInMonth=new Date(Date.UTC(year,number,0)).getUTCDate()
  const weekLabels=locale==='ru'?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const monthTitle=new Intl.DateTimeFormat(locale==='ru'?'ru-RU':'en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(firstDay)
  const shiftMonth=delta=>{
    const next=new Date(Date.UTC(year,number-1+delta,1,12))
    setMonth(next.toISOString().slice(0,7))
  }
  const today=torontoKey(new Date().toISOString())
  const scheduledByDay=new Map()
  for(const post of scheduled){
    const day=torontoKey(post.scheduledAt)
    scheduledByDay.set(day,[...(scheduledByDay.get(day)||[]),post])
  }
  return <section className={styles.studio} aria-label="HH Growth Studio">
    <div className={styles.intro}>
      <div><p className={styles.eyebrow}>HOLISTIC HOUSE · GROWTH STUDIO</p>
        <h2>{t.heading}</h2><p>{t.sub}</p></div>
      <div className={styles.safetyBadge}><ShieldCheck size={18} aria-hidden="true"/>{t.noAuto}</div>
    </div>
    {!ready&&<p className={styles.warning} role="alert"><CircleAlert size={18}/>{t.unavailable}</p>}
    <p className={styles.privacyNote}><ShieldCheck size={15} aria-hidden="true"/>{t.unsafe}</p>
    <div className={styles.metrics}>
      <div><span>{t.draftCount}</span><strong>{counts.draft}</strong></div>
      <div><span>{t.approvedCount}</span><strong>{counts.approved}</strong></div>
      <div><span>{t.planCount}</span><strong>{counts.planned_manual}</strong></div>
      <div><span>{t.publishedCount}</span><strong className={styles.notMeasured}>{t.notMeasured}</strong></div>
    </div>
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="group" aria-label={t.filter}>
        <button type="button" aria-pressed={tab==='compose'} onClick={()=>setTab('compose')}><Edit3 size={17}/>{t.compose}</button>
        <button type="button" aria-pressed={tab==='calendar'} onClick={()=>setTab('calendar')}><CalendarDays size={17}/>{t.calendar}</button>
        <button type="button" aria-pressed={tab==='posts'} onClick={()=>setTab('posts')}><FileText size={17}/>{t.pending}</button>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={refresh} title={t.reload}><RefreshCcw size={16}/>{t.reload}</button>
        <button type="button" disabled={!records.length} onClick={()=>{saveCsv(records);setNotice(t.downloaded)}}><Download size={16}/>{t.export}</button>
      </div>
    </div>
    {notice&&<p className={styles.notice} role="status" aria-live="polite">{notice}</p>}
    {tab==='compose'&&<div className={styles.columns}>
      <div className={styles.editor}>
        <div className={styles.sectionHead}><h3>{isEditing?t.selected:t.newDraft}</h3>
          <button type="button" onClick={reset}><Plus size={15}/>{t.new}</button></div>
        <p className={styles.hint}>{t.createGuide}</p>
        <div className={styles.pair}>
          <label>{t.brand}<select disabled={!ready||busy} value={form.brand} onChange={set('brand')}>
            {Object.keys(GROWTH_BRANDS).map(brand=><option key={brand} value={brand}>{BRANDS[brand]}</option>)}</select></label>
          <label>{t.channel}<select disabled={!ready||busy} value={form.channel} onChange={set('channel')}>
            {GROWTH_CHANNELS.map(channel=><option key={channel} value={channel}>{CHANNELS[channel]}</option>)}</select></label>
          <label>{t.language}<select disabled={!ready||busy} value={form.locale} onChange={set('locale')}>
            {GROWTH_LANGUAGES.map(language=><option key={language} value={language}>{language.toUpperCase()}</option>)}</select></label>
          <label>{t.campaign}<input disabled={!ready||busy} type="text" maxLength={64} pattern="[a-zA-Z0-9_-]*"
            placeholder="academy_intro_202610" value={form.campaign} onChange={set('campaign')}/></label>
        </div>
        <label>{t.title}<input disabled={!ready||busy} type="text" maxLength={120} required
          placeholder={locale==='ru'?'Образовательный пост':'Education post'}
          value={form.title} onChange={set('title')}/></label>
        <label>{t.caption}<textarea disabled={!ready||busy} maxLength={3500} rows={6} value={form.caption}
          placeholder={locale==='ru'?'Напишите короткий текст публикации...':'Write your post caption...'} onChange={set('caption')}/></label>
        <p className={styles.hint}>{t.captionHint}</p>
        <label>{t.source}<input disabled={!ready||busy} type="text" maxLength={500} value={form.sourceUrl}
          placeholder={GROWTH_BRANDS[form.brand]+'/en/academy'} onChange={set('sourceUrl')}/></label>
        <p className={styles.hint}>{t.sourceHint}</p>
        <label>{t.schedule}<input disabled={!ready||busy} type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')}/></label>
        <p className={styles.hint}>{t.scheduleNote}</p>
        <div className={styles.editorActions}>
          <button className={styles.primary} disabled={!ready||busy||!form.title.trim()} type="button" onClick={()=>execute('save')}><Check size={16}/>{t.save}</button>
          {isEditing&&<button type="button" disabled={!ready||busy} onClick={reset}>{t.clear}</button>}
        </div>
        {isEditing&&<p className={styles.hint}>{t.draft}: #{editing.revision}. {t.notes}</p>}
      </div>
      <div className={styles.previewColumn}>
        <div className={styles.preview}>
          <div className={styles.previewTop}><span className={styles.brandDot}>H</span><div><strong>{BRANDS[form.brand]}</strong><small>{CHANNELS[form.channel]} · {form.locale.toUpperCase()}</small></div></div>
          <h3>{form.title||'—'}</h3><p className={styles.previewCopy}>{form.caption||'…'}</p>
          {trackingLink&&<div className={styles.tracking}>
            <span>{t.tracking}</span><code>{trackingLink}</code>
          </div>}
        </div>
        <div className={styles.help}>
          <h3>{t.links}</h3>
          <Link href="/admin/youtube-upload"><Send size={16}/>{t.youtube}</Link>
          <Link href="/admin/videos"><Megaphone size={16}/>{t.videos}</Link>
          <Link href="/admin/materials"><FileText size={16}/>{t.materials}</Link>
          <p>{t.notes}</p>
        </div>
      </div>
    </div>}
    {(tab==='posts'||tab==='calendar')&&<div className={styles.filters}>
      <label>{t.brand}<select value={brandFilter} onChange={event=>setBrandFilter(event.target.value)}>
        <option value="all">{t.allBrands}</option>{Object.keys(BRANDS).map(key=><option key={key} value={key}>{BRANDS[key]}</option>)}</select></label>
      <label>{t.filter}<select value={filter} onChange={event=>setFilter(event.target.value)}>
        <option value="active">{t.all}</option><option value="all">{t.all} + {t.archived}</option>
        {['draft','approved','planned_manual','archived'].map(status=><option key={status} value={status}>{t[status]}</option>)}
      </select></label>
    </div>}
    {tab==='calendar'&&<div className={styles.calendar}>
      <div className={styles.calendarHead}>
        <button type="button" aria-label={t.previous} onClick={()=>shiftMonth(-1)}>‹</button>
        <h3>{monthTitle}</h3>
        <button type="button" aria-label={t.next} onClick={()=>shiftMonth(1)}>›</button>
      </div>
      <div className={styles.calendarGrid}>
        {weekLabels.map(x=><span className={styles.weekday} key={x}>{x}</span>)}
        {Array.from({length:offset},(_,i)=><span key={'pad'+i} className={styles.emptyDay}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const key=month+'-'+String(i+1).padStart(2,'0')
          const items=scheduledByDay.get(key)||[]
          return <div className={key===today?styles.today:styles.day} key={key}>
            <span>{i+1}</span>
            {items.slice(0,3).map(post=><button key={post.id} title={post.title} onClick={()=>edit(post)} type="button">{CHANNELS[post.channel]} · {post.title}</button>)}
            {items.length>3&&<small>+{items.length-3}</small>}
          </div>
        })}
      </div>
      <p className={styles.hint}>{scheduled.length} {t.monthItems}. {t.notes}</p>
    </div>}
    {tab==='posts'&&<div className={styles.postList}>
      {!visible.length&&<p className={styles.empty}>{t.noPosts}</p>}
      {visible.map(post=><article key={post.id} className={styles.post}>
        <div className={styles.postHeading}><div><span className={styles.status} data-state={post.status}>{t[post.status]}</span>
          <h3>{post.title}</h3><p>{BRANDS[post.brand]} · {CHANNELS[post.channel]} · {post.locale.toUpperCase()}</p>
          {post.scheduledAt&&<small>{formatTime(post.scheduledAt,locale)} · {t.localTime}</small>}</div>
          <button type="button" disabled={busy} onClick={()=>edit(post)}><Edit3 size={15}/>{t.edit}</button></div>
        <p className={styles.postExcerpt}>{post.caption||'—'}</p>
        <div className={styles.postButtons}>
          {post.status==='draft'&&<button type="button" disabled={busy||!ready} onClick={()=>execute('approve',post)}><Check size={15}/>{t.approve}</button>}
          {post.status==='approved'&&<button type="button" disabled={busy||!ready} onClick={()=>execute('plan',post)}><CalendarDays size={15}/>{t.plan}</button>}
          {['approved','planned_manual','archived'].includes(post.status)&&<button type="button" disabled={busy||!ready} onClick={()=>execute('reopen',post)}><RefreshCcw size={15}/>{t.reopen}</button>}
          {post.status!=='archived'&&<button type="button" disabled={busy||!ready} onClick={()=>execute('archive',post)}><Trash2 size={15}/>{t.archive}</button>}
          <button type="button" onClick={()=>copyPost(post)}><Copy size={15}/>{t.copyPost}</button>
          {post.sourceUrl&&<button type="button" onClick={()=>copyLink(post)}><Copy size={15}/>{t.copy}</button>}
          <button type="button" onClick={()=>duplicate(post)}><Plus size={15}/>{t.duplicate}</button>
        </div>
      </article>)}
    </div>}
  </section>
}
