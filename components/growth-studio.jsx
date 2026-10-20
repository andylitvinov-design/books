'use client'

import Link from 'next/link'
import {useEffect, useMemo, useState} from 'react'
import {CalendarDays, Check, CircleAlert, Copy, Download, Edit3, FileText, Megaphone, Plus, RefreshCcw, Send, ShieldCheck, Trash2} from 'lucide-react'
import {listGrowthStudioPostsAction,updateGrowthStudioPostAction,publishGrowthTelegramNowAction} from '@/app/admin/growth-studio/actions'
import GrowthStudioBulk from './growth-studio-bulk'
import GrowthStudioSourcePicker from './growth-studio-source-picker'
import {nextManualSlot,findManualTimeConflicts,buildManualCalendarIcs} from '@/lib/growth-studio/manual-calendar.mjs'
import GrowthStudioConnections from './growth-studio-connections'
import {CHANNEL_CAPABILITIES,reviewGrowthPublication,publicationStatusLabel} from '@/lib/growth-studio/channel-capabilities.mjs'
import {GROWTH_BRANDS,GROWTH_CHANNELS,GROWTH_LANGUAGES,publicCampaignLink,orderGrowthPosts} from '@/lib/growth-studio/model.mjs'
import styles from './growth-studio.module.css'

const BRANDS={holistic_house:'Holistic House',toronto_tantra:'TorontoTantra',psitrends:'PsiTrends'}
const CHANNELS={
  instagram:'Instagram',facebook:'Facebook',telegram:'Telegram',youtube:'YouTube',
  linkedin:'LinkedIn',threads:'Threads',bluesky:'Bluesky',pinterest:'Pinterest',
  tiktok:'TikTok',eventbrite:'Eventbrite',meetup:'Meetup',manual:'Manual / Other',
  twitter:'X / Twitter',google_business:'Google Business Profile',mastodon:'Mastodon',wordpress:'WordPress',
}
const COPY={
  en:{
    heading:'Content command center',sub:'One place to prepare posts for your channels, with explicit approvals.',
    draft:'Draft',approved:'Approved',planned_manual:'Manual plan',archived:'Archived',
    sending:'Sending — do not retry',published:'Published (provider confirmed)',delivery_unknown:'Delivery uncertain — verify in Telegram',
    pending:'For review',planned:'Planned for manual posting',noAuto:'No posts are published automatically. Telegram requires a separate confirmed send.',
    telegramReady:'Telegram channel ready',telegramDisabled:'Telegram is not connected. Add the dedicated bot settings.',
    telegramSend:'Publish now to Telegram',telegramConfirm:'Publish this exact post now to the configured public Telegram channel?',
    telegramSent:'Telegram confirmed publication.',telegram_delivery_unknown:'The result is uncertain. Check your channel before taking further action. Do NOT retry.',telegram_unconfigured:'Telegram is not configured.',telegram_invalid_post:'This Telegram post is not ready.',telegram_media_unsupported:'This media format requires manual publication.',telegram_text_too_long:'Telegram caption is too long.',telegram_permission_unverified:'The bot does not have confirmed posting rights for the configured public channel. Check Connections first.',
    unavailable:'Durable storage is not available. Editing is disabled to prevent losing your work.',
    reload:'Refresh',new:'New post',compose:'Editor',calendar:'Calendar',library:'Media',bulk:'Bulk / CSV',export:'Export CSV',
    brand:'Brand',channel:'Channel',language:'Post language',title:'Internal title',caption:'Caption / post text',media:'Public photo/video URL',mediaAlt:'Image description (alt text)',mediaHint:'Use a public JPG, PNG, WEBP, GIF or MP4 file on the selected brand website. Never use private client files.',
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
    copyOk:'Link copied.',copyFail:'Could not copy automatically.',downloaded:'CSV prepared on your device.',calendarExport:'Export manual reminders (.ics)',calendarDone:'Manual posting calendar saved to your device. Import into your calendar app to receive reminders; this does not publish posts.',planNext:'Find free Toronto time',planNextFound:'Suggested Toronto editorial slot',planNoFree:'No suitable free weekday slot in the next 45 days.',planCollision:'Another manual post for this brand and network is planned within 15 minutes.',
    unsafe:'Do not paste diagnoses, client data, test responses or private material into marketing content.',
    duplicate:'Duplicate into draft',
  },
  ru:{
    heading:'Центр управления контентом',sub:'Готовьте публикации для разных площадок и согласовывайте их перед размещением.',
    draft:'Черновик',approved:'Одобрено',planned_manual:'Ручной план',archived:'Архив',
    sending:'Отправка — не повторять',published:'Опубликовано (подтверждено)',delivery_unknown:'Доставка неясна — проверьте Telegram',
    pending:'На согласование',planned:'Запланировано вручную',noAuto:'Автопубликация отключена. Для Telegram требуется отдельное подтверждение отправки.',
    telegramReady:'Канал Telegram подключён',telegramDisabled:'Telegram не подключён — настройте отдельного бота.',
    telegramSend:'Опубликовать сейчас в Telegram',telegramConfirm:'Опубликовать этот точный текст сейчас в настроенном публичном Telegram-канале?',
    telegramSent:'Telegram подтвердил публикацию.',telegram_delivery_unknown:'Результат неизвестен. Проверьте канал. НЕ повторяйте отправку автоматически.',telegram_unconfigured:'Telegram не настроен.',telegram_invalid_post:'Пост не готов к отправке в Telegram.',telegram_media_unsupported:'Этот формат медиа нужно опубликовать вручную.',telegram_text_too_long:'Слишком длинная подпись для Telegram.',telegram_permission_unverified:'У бота нет подтверждённых прав публикации в заданном канале. Проверьте Подключения.',
    unavailable:'Серверное хранилище недоступно. Редактор отключён, чтобы не потерять изменения.',
    reload:'Обновить',new:'Новая публикация',compose:'Редактор',calendar:'Календарь',library:'Медиа',bulk:'Массово / CSV',export:'Экспорт CSV',
    brand:'Проект',channel:'Площадка',language:'Язык публикации',title:'Внутреннее название',caption:'Текст публикации',media:'Публичная ссылка на фото/видео',mediaAlt:'Описание изображения (alt)',mediaHint:'Публичный JPG, PNG, WEBP, GIF или MP4 на сайте выбранного проекта. Не используйте личные файлы клиентов.',
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
    copyOk:'Ссылка скопирована.',copyFail:'Не удалось скопировать.',downloaded:'CSV подготовлен на устройстве.',calendarExport:'Скачать напоминания (.ics)',calendarDone:'Календарь ручных публикаций сохранён на устройстве. Импортируйте его в приложение-календарь для напоминаний. Автопубликации нет.',planNext:'Найти свободное время в Торонто',planNextFound:'Предлагаемое время по Торонто',planNoFree:'За 45 дней подходящего рабочего слота не найдено.',planCollision:'Другая ручная публикация того же проекта и канала запланирована в пределах 15 минут.',
    unsafe:'Не вставляйте диагнозы, результаты тестов, клиентские данные и частные материалы в рекламный контент.',
    duplicate:'Скопировать как черновик',
  },
}

const CHANNEL_WARNINGS={
  en:{media_required:'Attach a public photo or video.',video_required:'This platform requires MP4 video.',text_too_long:'Text plus tracked link exceeds the supported single-post limit.',pinterest_board_not_configured:'Select a Pinterest board in an authorized publisher.',business_location_not_configured:'A verified business location is needed.',event_details_required:'Real event date, venue and organizer must be verified.',media_type_unsupported:'Unsupported media format.',telegram_media_unsupported:'Telegram supports JPG/PNG photo or MP4 video in this adapter.',telegram_brand_not_configured:'Telegram is configured only for Holistic House.',telegram_not_configured:'Telegram bot environment settings are missing.',telegram_channel_not_verified:'Verify posting rights in Connections.'},
  ru:{media_required:'Добавьте публичное фото или видео.',video_required:'Для этого канала требуется MP4-видео.',text_too_long:'Текст вместе с UTM-ссылкой превышает ограничение площадки.',pinterest_board_not_configured:'Выберите доску в авторизованном Pinterest.',business_location_not_configured:'Нужен подтверждённый адрес организации.',event_details_required:'Нужна проверенная дата события, место и организатор.',media_type_unsupported:'Неподдерживаемый формат медиа.',telegram_media_unsupported:'Для Telegram разрешены JPG/PNG фото или MP4 видео.',telegram_brand_not_configured:'Бот Telegram настроен только на Holistic House.',telegram_not_configured:'Серверные настройки бота не заданы.',telegram_channel_not_verified:'Проверьте права в разделе подключений.'},
}
const METHOD_LABELS={en:{telegram_opt_in:'Telegram · separate owner approval',existing_uploader:'Separate YouTube uploader, OAuth not verified',manual:'Manual posting; no API connected',event_adapter:'Event publisher / manual event listing'},ru:{telegram_opt_in:'Telegram · отдельное подтверждение',existing_uploader:'Загрузчик YouTube, OAuth ещё не подтверждён',manual:'Ручное размещение; API не подключён',event_adapter:'Модуль событий / ручное размещение'}}
const empty = () => ({
  brand:'holistic_house',channel:'instagram',locale:'en',title:'',caption:'',
  sourceUrl:'',campaign:'',scheduledAt:'',mediaUrl:'',mediaAlt:'',
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
function saveManualReminders(records) {
  const text=buildManualCalendarIcs(records)
  const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}))
  const link=document.createElement('a');link.href=url;link.download='hh-growth-studio-manual-calendar.ics'
  document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function saveCsv(records) {
  const cols=['id','brand','channel','locale','title','caption','sourceUrl','campaign','scheduledAt','mediaUrl','mediaAlt','status','updatedAt']
  const raw='\ufeff'+[cols.join(','),...records.map(x=>cols.map(key=>csvCell(x[key])).join(','))].join('\r\n')
  const url=URL.createObjectURL(new Blob([raw],{type:'text/csv;charset=utf-8;'}))
  const link=document.createElement('a');link.href=url;link.download='hh-growth-studio-editorial.csv'
  document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export default function GrowthStudio({initialLocale='en',initialRecords=[],storageReady=false,telegram={ready:false,channel:null}}) {
  const [locale,setLocale]=useState(initialLocale==='ru'?'ru':'en')
  const t=COPY[locale]
  const [records,setRecords]=useState(initialRecords)
  const [ready,setReady]=useState(storageReady)
  const [telegramVerified,setTelegramVerified]=useState(false)
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
  const library=useMemo(()=>{
    const byUrl=new Map()
    for(const post of records)if(post.mediaUrl && !byUrl.has(post.brand+':'+post.mediaUrl))
      byUrl.set(post.brand+':'+post.mediaUrl,{brand:post.brand,url:post.mediaUrl,alt:post.mediaAlt||post.title})
    return [...byUrl.values()]
  },[records])
  const onCreated=items=>{
    const added=new Set(items.map(item=>item.id))
    setRecords(previous=>orderGrowthPosts([...previous.filter(item=>!added.has(item.id)),...items]))
  }
  const counts=useMemo(()=>({
    draft:records.filter(x=>x.status==='draft').length,
    approved:records.filter(x=>x.status==='approved').length,
    planned_manual:records.filter(x=>x.status==='planned_manual').length,
  }),[records])
  const trackingLink=useMemo(()=>{
    try {return publicCampaignLink({...form,scheduledAt:isoFromLocal(form.scheduledAt)})} catch {return ''}
  },[form])
  const plannedConflict=form.scheduledAt?findManualTimeConflicts({records,brand:form.brand,channel:form.channel,
    scheduledAt:isoFromLocal(form.scheduledAt),excludeId:editing?.id}).length:0
  const suggestManualTime=()=>{
    const result=nextManualSlot({brand:form.brand,channel:form.channel,records,excludeId:editing?.id})
    if(!result){setNotice(t.planNoFree);return}
    setForm(old=>({...old,scheduledAt:localFromIso(result.scheduledAt)}))
    setNotice(t.planNextFound+': '+result.localDate+' '+result.localTime+' America/Toronto')
  }
  const applyPublicSource=preview=>{
    if((form.title.trim()||form.caption.trim())&& !window.confirm(locale==='ru'
      ?'Заменить название и текст текущего черновика данными открытой страницы? После изменения ранее одобренного текста потребуется новое согласование.'
      :'Replace the current draft title and caption with public-page metadata? Previously approved content requires review again after an edit.'))return
    setForm(old=>({...old,title:preview.title,caption:preview.description||'',
      sourceUrl:preview.sourceUrl,locale:preview.language||old.locale}))
    setNotice(locale==='ru'
      ?'Текст добавлен только в редактор. Проверьте факты, язык и права на материалы, затем сохраните черновик. В соцсети ничего не отправлено.'
      :'Text copied to editor only. Review facts, language and media rights, then save the draft. Nothing was published.')
  }
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
            scheduledAt:isoFromLocal(form.scheduledAt),mediaUrl:form.mediaUrl,mediaAlt:form.mediaAlt}}
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
  async function sendTelegram(post){
    if(!telegram.ready||!telegramVerified||busy)return
    const destination=telegram.channel||'the configured channel'
    const exactText=[post.caption,publicCampaignLink(post)].filter(Boolean).join('\n\n')
    const confirmation=[t.telegramConfirm,destination,post.title,exactText,post.mediaUrl||''].filter(Boolean).join('\n\n')
    if(!window.confirm(confirmation))return
    setBusy(true);setNotice('')
    try{
      const result=await publishGrowthTelegramNowAction({id:post.id,expectedRevision:post.revision,confirmed:true})
      if(result.record)onCreated([result.record])
      if(result.ok)setNotice(t.telegramSent)
      else setNotice(t[result.error]||t.tryAgain)
    }catch{setNotice(t.telegram_delivery_unknown)}
    finally{setBusy(false)}
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
    <p className={telegramVerified?styles.connectionReady:styles.connectionUnavailable}>
      <ShieldCheck size={15}/>{telegramVerified?(locale==='ru'?'Права бота Telegram подтверждены':'Telegram bot posting permissions verified'):
        telegram.ready?(locale==='ru'?'Настройки Telegram найдены — сначала проверьте права ниже':'Telegram settings found — verify posting permissions below'):t.telegramDisabled}
    </p>
    <p className={styles.privacyNote}><ShieldCheck size={15} aria-hidden="true"/>{t.unsafe}</p>
    <GrowthStudioConnections locale={locale} telegram={telegram} onTelegramVerified={setTelegramVerified}/>
    <div className={styles.metrics}>
      <div><span>{t.draftCount}</span><strong>{counts.draft}</strong></div>
      <div><span>{t.approvedCount}</span><strong>{counts.approved}</strong></div>
      <div><span>{t.planCount}</span><strong>{counts.planned_manual}</strong></div>
      <div><span>{t.publishedCount}</span><strong>{records.filter(x=>x.status==='published'&&x.delivery?.messageId).length}</strong></div>
    </div>
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="group" aria-label={t.filter}>
        <button type="button" aria-pressed={tab==='compose'} onClick={()=>setTab('compose')}><Edit3 size={17}/>{t.compose}</button>
        <button type="button" aria-pressed={tab==='bulk'} onClick={()=>setTab('bulk')}><Plus size={17}/>{t.bulk}</button>
        <button type="button" aria-pressed={tab==='calendar'} onClick={()=>setTab('calendar')}><CalendarDays size={17}/>{t.calendar}</button>
        <button type="button" aria-pressed={tab==='posts'} onClick={()=>setTab('posts')}><FileText size={17}/>{t.pending}</button>
        <button type="button" aria-pressed={tab==='library'} onClick={()=>setTab('library')}><FileText size={17}/>{t.library}</button>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={refresh} title={t.reload}><RefreshCcw size={16}/>{t.reload}</button>
        <button type="button" disabled={!records.length} onClick={()=>{saveCsv(records);setNotice(t.downloaded)}}><Download size={16}/>{t.export}</button>
        <button type="button" disabled={!records.some(post=>post.status==='planned_manual')} onClick={()=>{saveManualReminders(records);setNotice(t.calendarDone)}}><CalendarDays size={16}/>{t.calendarExport}</button>
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
        <div className={styles.pair}>
          <label>{t.media}<input disabled={!ready||busy} type="text" maxLength={500} value={form.mediaUrl||''}
            placeholder={GROWTH_BRANDS[form.brand]+'/images/photo.webp'} onChange={set('mediaUrl')}/></label>
          <label>{t.mediaAlt}<input disabled={!ready||busy} type="text" maxLength={240} value={form.mediaAlt||''}
            placeholder={locale==='ru'?'Описание изображения':'What the image shows'} onChange={set('mediaAlt')}/></label>
        </div>
        <p className={styles.hint}>{t.mediaHint}</p>
        <label>{t.source}<input disabled={!ready||busy} type="text" maxLength={500} value={form.sourceUrl}
          placeholder={GROWTH_BRANDS[form.brand]+'/en/academy'} onChange={set('sourceUrl')}/></label>
        <p className={styles.hint}>{t.sourceHint}</p>
        <GrowthStudioSourcePicker brand={form.brand} sourceUrl={form.sourceUrl}
          locale={locale} disabled={!ready||busy} onApply={applyPublicSource}/>
        <label>{t.schedule}<input disabled={!ready||busy} type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')}/></label>
        <p className={styles.hint}>{t.scheduleNote}</p>
        <div className={styles.manualSlotActions}>
          <button type="button" disabled={!ready||busy} onClick={suggestManualTime}><CalendarDays size={15}/>{t.planNext}</button>
          <span>{locale==='ru'?'Пн–Пт · 10:00/17:00 по Торонто. Не прогноз лучшего времени.':'Mon–Fri · 10:00/17:00 Toronto. Editorial preset, not an analytics-based best time.'}</span>
        </div>
        {plannedConflict>0&&<p className={styles.manualSlotConflict} role="alert">{t.planCollision}</p>}
        <div className={styles.publisherDiagnostics} role="status" aria-live="polite">
          <strong>{CHANNEL_CAPABILITIES[form.channel]?.name || form.channel} · {METHOD_LABELS[locale]?.[CHANNEL_CAPABILITIES[form.channel]?.mode] || METHOD_LABELS.en.manual}</strong>
          {reviewGrowthPublication({...form,status:'draft'},{telegramConfigured:telegram.ready,telegramChannelVerified:telegramVerified}).issues.length>0
            && <ul>{reviewGrowthPublication({...form,status:'draft'},{telegramConfigured:telegram.ready,telegramChannelVerified:telegramVerified}).issues.map(code=>
              <li key={code}>{CHANNEL_WARNINGS[locale]?.[code]||CHANNEL_WARNINGS.en[code]||code}</li>)}</ul>}
        </div>
        <div className={styles.editorActions}>
          <button className={styles.primary} disabled={!ready||busy||!form.title.trim()} type="button" onClick={()=>execute('save')}><Check size={16}/>{t.save}</button>
          {isEditing&&<button type="button" disabled={!ready||busy} onClick={reset}>{t.clear}</button>}
        </div>
        {isEditing&&<p className={styles.hint}>{t.draft}: #{editing.revision}. {t.notes}</p>}
      </div>
      <div className={styles.previewColumn}>
        <div className={styles.preview}>
          <div className={styles.previewTop}><span className={styles.brandDot}>H</span><div><strong>{BRANDS[form.brand]}</strong><small>{CHANNELS[form.channel]} · {form.locale.toUpperCase()}</small></div></div>
          {form.mediaUrl && /\.(?:jpe?g|png|webp|gif)$/i.test(form.mediaUrl)
            && <img className={styles.previewMedia} src={form.mediaUrl} alt={form.mediaAlt||''} loading="lazy" referrerPolicy="no-referrer" />}
          {form.mediaUrl && /\.mp4$/i.test(form.mediaUrl)
            && <div className={styles.previewVideo}>Video reference: {form.mediaUrl.split('/').pop()}</div>}
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
    {tab==='bulk'&&<GrowthStudioBulk locale={locale} base={form} ready={ready} onCreated={onCreated}/>}
    {tab==='library'&&<section className={styles.library}>
      <h3>{t.library} · {library.length}</h3>
      <p className={styles.hint}>{t.mediaHint} <Link href="/admin/materials">{t.materials}</Link></p>
      {!library.length&&<p className={styles.empty}>{t.noPosts}</p>}
      <div className={styles.libraryGrid}>{library.map(item=><article key={item.brand+item.url} className={styles.libraryItem}>
        {/\.(?:jpe?g|png|webp|gif)$/i.test(item.url)
          ?<img src={item.url} alt={item.alt} loading="lazy" referrerPolicy="no-referrer"/>
          :<div className={styles.previewVideo}>Video: {item.url.split('/').pop()}</div>}
        <p>{BRANDS[item.brand]} · {item.alt}</p>
        <button type="button" onClick={()=>{
          setForm(old=>({...old,brand:item.brand,sourceUrl:old.brand===item.brand?old.sourceUrl:'',mediaUrl:item.url,mediaAlt:item.alt}))
          setEditing(null);setTab('compose');setNotice('')
        }}>{t.edit}</button></article>)}</div>
    </section>}
    {(tab==='posts'||tab==='calendar')&&<div className={styles.filters}>
      <label>{t.brand}<select value={brandFilter} onChange={event=>setBrandFilter(event.target.value)}>
        <option value="all">{t.allBrands}</option>{Object.keys(BRANDS).map(key=><option key={key} value={key}>{BRANDS[key]}</option>)}</select></label>
      <label>{t.filter}<select value={filter} onChange={event=>setFilter(event.target.value)}>
        <option value="active">{t.all}</option><option value="all">{t.all} + {t.archived}</option>
        {['draft','approved','planned_manual','sending','published','delivery_unknown','archived'].map(status=><option key={status} value={status}>{t[status]}</option>)}
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
        <div className={styles.postHeading}><div><span className={styles.status} data-state={post.status}>{publicationStatusLabel(post.status,locale)}</span>
          <h3>{post.title}</h3><p>{BRANDS[post.brand]} · {CHANNELS[post.channel]} · {post.locale.toUpperCase()}</p>
          {post.scheduledAt&&<small>{formatTime(post.scheduledAt,locale)} · {t.localTime}</small>}</div>
          {!['sending','published','delivery_unknown'].includes(post.status)
            && <button type="button" disabled={busy} onClick={()=>edit(post)}><Edit3 size={15}/>{t.edit}</button>}</div>
        <p className={styles.postExcerpt}>{post.caption||'—'}</p>
        <div className={styles.postButtons}>
          {post.status==='draft'&&<button type="button" disabled={busy||!ready} onClick={()=>execute('approve',post)}><Check size={15}/>{t.approve}</button>}
          {post.status==='approved'&&<button type="button" disabled={busy||!ready} onClick={()=>execute('plan',post)}><CalendarDays size={15}/>{t.plan}</button>}
          {post.channel==='telegram'&&post.brand==='holistic_house'&&['approved','planned_manual'].includes(post.status)&&
            <button type="button" disabled={busy||!ready||!telegramVerified}
              title={telegramVerified?t.telegramSend:locale==='ru'?'Сначала проверьте права бота в разделе подключений':'Verify bot posting rights under Connections first'} onClick={()=>sendTelegram(post)}>
              <Send size={15}/>{t.telegramSend}</button>}
          {post.status==='published'&&post.delivery?.url&&
            <a className={styles.deliveryLink} href={post.delivery.url} target="_blank" rel="noopener noreferrer">Telegram #{post.delivery.messageId} ↗</a>}
          {['approved','planned_manual','archived'].includes(post.status)&&<button type="button" disabled={busy||!ready} onClick={()=>execute('reopen',post)}><RefreshCcw size={15}/>{t.reopen}</button>}
          {!['archived','sending','published','delivery_unknown'].includes(post.status)&&
            <button type="button" disabled={busy||!ready} onClick={()=>execute('archive',post)}><Trash2 size={15}/>{t.archive}</button>}
          <button type="button" onClick={()=>copyPost(post)}><Copy size={15}/>{t.copyPost}</button>
          {post.sourceUrl&&<button type="button" onClick={()=>copyLink(post)}><Copy size={15}/>{t.copy}</button>}
          <button type="button" onClick={()=>duplicate(post)}><Plus size={15}/>{t.duplicate}</button>
        </div>
      </article>)}
    </div>}
  </section>
}
