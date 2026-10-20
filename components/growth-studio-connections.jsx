'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
import {CheckCircle2, AlertCircle, CircleHelp, RefreshCcw, ShieldCheck} from 'lucide-react'
import {GROWTH_PUBLICATION_NETWORKS,CHANNEL_CAPABILITIES} from '@/lib/growth-studio/channel-capabilities.mjs'
import {checkGrowthTelegramPublisherAction} from '@/app/admin/growth-studio/actions'
import styles from './growth-studio.module.css'

const messages={
  ru:{
    summary:'Подключения и способы публикации',
    explanation:'Наличие соцсети в редакторе означает только возможность подготовить черновик. Автопубликация в неё не считается подключённой без OAuth, разрешений и подтверждённого поста.',
    channel:'Канал',mode:'Доставка',connection:'Доступ',what:'Требуется',
    telegramOptIn:'Только явное подтверждение владельца',existingUploader:'Отдельный YouTube-загрузчик',
    eventAdapter:'Модуль мероприятий',manual:'Ручное размещение',
    unconfigured:'Не подключён',configured:'Настройки есть, проверка не пройдена',
    verified:'Проверены канал и права бота', external:'Отдельный инструмент — OAuth ещё не подтверждён',
    manualOnly:'Публичный API пока не подключён',check:'Проверить Telegram',checking:'Проверяем…',
    mismatch:'Канал не найден или бот не имеет права публиковать. Проверьте настройки и разрешения.',
    notSet:'Нужны серверные HH_GROWTH_TELEGRAM_ENABLED / BOT_TOKEN / CHAT_ID и права администратора канала.',
    noTests:'Проверка не создаёт и не публикует сообщений.',
    direct:'Перейти в YouTube-загрузчик', existing:'Открыть медиатеку',
    guidelines:'Готовность определяется по реальному разрешению и ответу провайдера, а не по наличию кнопки.',
    warning:'Для Instagram/TikTok/YouTube нужен подходящий медиафайл, для Pinterest — доска, для мероприятий — подтверждённые дата и организатор.',
    verificationNeeded:'Тест соединения ещё не проводился.',recheck:'Проверить снова',
  },
  en:{
    summary:'Connections and publishing methods',
    explanation:'Selecting a social network in the editor prepares a draft only. It does not mean publishing access is connected until OAuth, account permissions and provider delivery are verified.',
    channel:'Channel',mode:'Delivery',connection:'Access',what:'Requirements',
    telegramOptIn:'Explicit owner-confirmed send only',existingUploader:'Separate YouTube uploader',
    eventAdapter:'Event publisher workflow',manual:'Manual handoff',
    unconfigured:'Not connected',configured:'Settings present; access not verified',
    verified:'Bot channel and posting rights verified',external:'Separate tool — OAuth not verified here',
    manualOnly:'No publishing API connected',check:'Check Telegram access',checking:'Checking…',
    mismatch:'The channel is inaccessible or the bot cannot post. Review bot settings and permissions.',
    notSet:'Requires server-side HH_GROWTH_TELEGRAM_ENABLED / BOT_TOKEN / CHAT_ID and channel admin rights.',
    noTests:'This check does not create or publish any message.',
    direct:'Open YouTube uploader',existing:'Open material library',
    guidelines:'Readiness requires real provider permission and delivery evidence, not a button in this app.',
    warning:'Instagram/TikTok/YouTube need media; Pinterest requires a board; event listings need verified dates and organizer.',
    verificationNeeded:'No connection test completed yet.',recheck:'Check again',
  },
}
const modes={telegram_opt_in:'telegramOptIn',existing_uploader:'existingUploader',event_adapter:'eventAdapter',manual:'manual'}
export default function GrowthStudioConnections({locale='en',telegram={ready:false,channel:null},onTelegramVerified=()=>{}}){
  const t=messages[locale==='ru'?'ru':'en']
  const [tested,setTested]=useState(false)
  const [verified,setVerified]=useState(false)
  const [checking,setChecking]=useState(false)
  const [error,setError]=useState('')
  const all=useMemo(()=>GROWTH_PUBLICATION_NETWORKS.map(id=>({id,...CHANNEL_CAPABILITIES[id]})),[])
  async function verify(){
    if(!telegram.ready||checking)return
    setChecking(true);setError('');setTested(true);setVerified(false);onTelegramVerified(false)
    try{
      const result=await checkGrowthTelegramPublisherAction()
      if(result.ok&&result.verified===true){setVerified(true);onTelegramVerified(true)}
      else setError(result.error||'unverified')
    }catch{setError('unverified')}
    finally{setChecking(false)}
  }
  return <details className={styles.connectionPanel}>
    <summary><ShieldCheck size={19} aria-hidden="true"/><span>{t.summary}</span><span className={styles.connectionSummaryCount}>{verified?'1': '0'} / {all.length}</span></summary>
    <p>{t.explanation}</p>
    <div className={styles.connectionBox}>
      <div className={styles.connectionBoxTitle}>
        <strong>Telegram · Holistic House</strong>
        <span className={verified?styles.verifiedText:styles.notVerifiedText}>
          {verified?t.verified:telegram.ready?t.configured:t.unconfigured}
        </span>
      </div>
      <p>{telegram.ready?t.verificationNeeded:t.notSet}</p>
      <button type="button" onClick={verify} disabled={!telegram.ready||checking}>
        {checking?<RefreshCcw size={16} aria-hidden="true"/>:verified?<CheckCircle2 size={16} aria-hidden="true"/>:<CircleHelp size={16} aria-hidden="true"/>}
        {checking?t.checking:tested?t.recheck:t.check}
      </button>
      {error&&<p className={styles.connectionError} role="alert"><AlertCircle size={15}/>{t.mismatch}</p>}
      <small>{t.noTests}</small>
    </div>
    <div className={styles.connectionScroller}>
      <table className={styles.connectionTable}>
        <thead><tr><th>{t.channel}</th><th>{t.mode}</th><th>{t.connection}</th><th>{t.what}</th></tr></thead>
        <tbody>
          {all.map(item=>{
            const isTelegram=item.id==='telegram',isYoutube=item.id==='youtube'
            return <tr key={item.id}>
              <th scope="row">{item.name}</th>
              <td>{t[modes[item.mode]]}</td>
              <td>{isTelegram?(verified?t.verified:telegram.ready?t.configured:t.unconfigured)
                :isYoutube?t.external:t.manualOnly}</td>
              <td>{item.description}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
    <p className={styles.connectionNote}>{t.warning}</p>
    <p className={styles.connectionNote}>{t.guidelines}</p>
    <div className={styles.connectionNav}><Link href="/admin/youtube-upload">{t.direct} ↗</Link><Link href="/admin/materials">{t.existing} ↗</Link></div>
  </details>
}
