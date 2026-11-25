'use client'
import {useMemo,useState} from 'react'
import {CalendarClock,CheckCheck,ClipboardCopy,ExternalLink,ShieldCheck,AlertCircle,ChevronDown,Clock3} from 'lucide-react'
import {manualGrowthPostingInbox,manualGrowthCopyText,manualGrowthDestination} from '@/lib/growth-studio/manual-inbox.mjs'
import styles from './growth-studio.module.css'

const STRINGS={
  ru:{
    title:'Очередь ручных публикаций',
    disclaimer:'Это напоминания, а не очередь API: сайт не отправляет публикации в соцсети. Отметка «выполнено» — ваше сообщение, а не проверка провайдера.',
    overdue:'Просрочено',today:'Сегодня',upcoming:'Позже',manualDone:'Отмечено вручную',
    noPosts:'Ни одной ручной публикации нет. Сначала сохраните, одобрите и добавьте пост в календарь.',
    empty:'В этой группе пока пусто.',
    copy:'Копировать текст с UTM',open:'Открыть площадку',done:'Отметить выполненным',
    more:'Показать все',less:'Свернуть',edit:'Открыть в редакторе',copyOK:'Подготовленный текст скопирован. Размещайте только в выбранном аккаунте.',
    copyFailed:'Скопировать не удалось. Используйте карточку поста.',
    unknown:'Не определено',
    media:'Публичный медиафайл',
    noPublisher:'Официальный адрес нельзя угадать: откройте свой аккаунт вручную.',
    notSent:'Публикация не отправлена через Growth Studio.',
    channel:'Площадка',
  },
  en:{
    title:'Manual publishing inbox',
    disclaimer:'This is an editorial reminder queue, not a provider API queue. No network post is sent from here. “Done” is only your report, not provider verification.',
    overdue:'Overdue',today:'Today',upcoming:'Later',manualDone:'Manually marked done',
    noPosts:'No manual posts yet. Save, approve, then add a post to the manual calendar.',
    empty:'Nothing in this group.',
    copy:'Copy copy + UTM',open:'Open publisher',done:'Mark manually done',
    more:'Show all',less:'Collapse',edit:'Edit post',copyOK:'Prepared text copied. Only post it to the intended account.',
    copyFailed:'Unable to copy. Use the post card.',
    unknown:'Unknown',
    media:'Public media file',
    noPublisher:'No approved generic URL for this provider. Open your own instance.',
    notSent:'Growth Studio did not send this post.',
    channel:'Channel',
  },
}
const CHANNEL_NAMES={
  instagram:'Instagram',facebook:'Facebook',telegram:'Telegram',youtube:'YouTube',
  linkedin:'LinkedIn',threads:'Threads',bluesky:'Bluesky',pinterest:'Pinterest',
  tiktok:'TikTok',eventbrite:'Eventbrite',meetup:'Meetup',
  twitter:'X / Twitter',google_business:'Google Business Profile',
  mastodon:'Mastodon',wordpress:'WordPress',manual:'Manual',
}
const BRANDS={holistic_house:'Holistic House',toronto_tantra:'TorontoTantra',psitrends:'PsiTrends'}
const VISIBLE=12
export default function GrowthStudioManualInbox({records=[],locale='en',ready=false,busy=false,onEdit=()=>{},onMarkDone=()=>{}}){
  const t=STRINGS[locale==='ru'?'ru':'en']
  const result=useMemo(()=>manualGrowthPostingInbox(records,new Date()),[records])
  const [expanded,setExpanded]=useState({})
  const [feedback,setFeedback]=useState('')
  const [copying,setCopying]=useState(null)
  const df=new Intl.DateTimeFormat(locale==='ru'?'ru-RU':'en-CA',{
    timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short',
  })
  const groups=[
    {id:'overdue',title:t.overdue,Icon:AlertCircle},
    {id:'today',title:t.today,Icon:Clock3},
    {id:'upcoming',title:t.upcoming,Icon:CalendarClock},
  ]
  async function copy(post){
    if(copying)return
    setCopying(post.id);setFeedback('')
    try{
      await navigator.clipboard.writeText(manualGrowthCopyText(post))
      setFeedback(t.copyOK)
    }catch{setFeedback(t.copyFailed)}
    finally{setCopying(null)}
  }
  return <section className={styles.manualInbox} aria-label={t.title}>
    <div className={styles.manualInboxHead}>
      <h3><CalendarClock size={20} aria-hidden="true"/>{t.title}</h3>
      <p><ShieldCheck size={16} aria-hidden="true"/>{t.disclaimer}</p>
    </div>
    <div className={styles.manualInboxMetrics}>
      {groups.map(group=><div key={group.id}><group.Icon size={17} aria-hidden="true"/>
        <span>{group.title}</span><strong>{result[group.id].length}</strong></div>)}
      <div><CheckCheck size={17} aria-hidden="true"/><span>{t.manualDone}</span>
        <strong>{result.manuallyCompleted}</strong></div>
    </div>
    {feedback&&<p role="status" className={styles.notice}>{feedback}</p>}
    {result.total===0&&<p className={styles.empty}>{t.noPosts}</p>}
    {result.total>0&&groups.map(group=>{
      const items=result[group.id]||[]
      const opened=expanded[group.id]===true
      const visible=items.slice(0,opened?items.length:VISIBLE)
      return <div className={styles.manualInboxGroup} key={group.id}>
        <h4><group.Icon size={17} aria-hidden="true"/>{group.title}
          <span>{items.length}</span></h4>
        {!items.length&&<p>{t.empty}</p>}
        <div className={styles.manualInboxList}>{visible.map(post=>{
          const destination=manualGrowthDestination(post.channel)
          return <article key={post.id} className={styles.manualInboxItem}>
            <div className={styles.manualInboxItemHeading}>
              <h5>{post.title}</h5>
              <time dateTime={post.scheduledAt}>{df.format(new Date(post.scheduledAt))} · Toronto</time>
            </div>
            <p className={styles.manualInboxMeta}>{BRANDS[post.brand]} · {CHANNEL_NAMES[post.channel]||post.channel} · {post.locale.toUpperCase()}</p>
            <p className={styles.manualInboxExcerpt}>{post.caption.slice(0,230)}{post.caption.length>230?'…':''}</p>
            {post.mediaUrl&&<a className={styles.manualInboxMedia} href={post.mediaUrl} target="_blank" rel="noopener noreferrer">{t.media} ↗</a>}
            <div className={styles.manualInboxButtons}>
              <button type="button" disabled={!ready||busy||copying===post.id} onClick={()=>copy(post)}><ClipboardCopy size={15}/>{t.copy}</button>
              {destination?<a href={destination} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>{t.open}</a>:
                <small>{t.noPublisher}</small>}
              <button type="button" disabled={!ready||busy} onClick={()=>onMarkDone(post)}><CheckCheck size={15}/>{t.done}</button>
              <button type="button" disabled={!ready||busy} onClick={()=>onEdit(post)}>{t.edit}</button>
            </div>
            <small className={styles.manualInboxWarning}>{t.notSent}</small>
          </article>
        })}</div>
        {items.length>VISIBLE&&<button type="button" className={styles.manualInboxToggle}
          onClick={()=>setExpanded(old=>({...old,[group.id]:!opened}))}>
          <ChevronDown size={16} aria-hidden="true"/>{opened?t.less:t.more} · {items.length}
        </button>}
      </div>
    })}
  </section>
}
