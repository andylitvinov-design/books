'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {CheckCircle2, AlertCircle, CircleHelp, RefreshCcw, ShieldCheck} from 'lucide-react'
import {GROWTH_PUBLICATION_NETWORKS,CHANNEL_CAPABILITIES} from '@/lib/growth-studio/channel-capabilities.mjs'
import {checkGrowthTelegramPublisherAction,checkGrowthStudioStorageAction} from '@/app/admin/growth-studio/actions'
import styles from './growth-studio.module.css'

const messages={
  ru:{
    quickTitle:'Начните здесь',quickIntro:'Одна страница для работы с публикациями. Проверка сохранения выполняется автоматически.',
    quickReady:'Сохранение проверено · можно создавать черновики',quickChecking:'Проверяем сохранение на сервере…',
    quickFailed:'Сохранение пока не подтверждено. Ничего не будет потеряно или опубликовано.',
    quickStart:'Создать черновик',quickPosts:'Мои материалы',quickRetry:'Повторить проверку',
    quickExternal:'Размещение в соцсетях — вручную, пока доступы не подтверждены. Ни один пост не отправится сам.',
    quickDetails:'Подключения и дополнительные настройки (необязательно)',
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
    storageTitle:'Хранилище черновиков · Redis',
    storageNotChecked:'Ещё не проверено', storageChecking:'Проверка…',
    storageCheck:'Проверить сохранение',storageRecheck:'Проверить ещё раз',
    storageOk:'Redis: запись, чтение, изменение и защита от повторной записи проверены',
    storageRunning:'Redis: проверяем…',storageFailShort:'Redis: нужна проверка',storagePassShort:'Redis: проверен',channelCount:'каналов',
    storageInfo:'При входе автоматически проверяются операции сохранения, чтения и обновления тестового черновика в отдельном Redis-ключе (TTL 30 сек), затем ключ удаляется. Реальные черновики и клиенты не затрагиваются.',
    storageError:'Не удалось проверить Redis. Сохранение черновиков в этой проверке не подтверждено. Проверьте серверное подключение.',
    direct:'Перейти в YouTube-загрузчик', existing:'Открыть медиатеку',
    guidelines:'Готовность определяется по реальному разрешению и ответу провайдера, а не по наличию кнопки.',
    warning:'Для Instagram/TikTok/YouTube нужен подходящий медиафайл, для Pinterest — доска, для мероприятий — подтверждённые дата и организатор.',
    verificationNeeded:'Тест соединения ещё не проводился.',recheck:'Проверить снова',
    ownerConnectTitle:'Что делать дальше: запуск публикаций',ownerConnectNote:'Сначала проверьте серверное сохранение, затем подключите только нужные каналы. Бот и соцсети авторизуются у их владельцев — не в чате ChatGPT.',
    setupStorage:'1. Проверить черновики',setupStorageHelp:'Выше нажмите «Проверить сохранение». Дождитесь надписи Redis: проверен. Эта проверка ничего не публикует.',
    setupTelegram:'2. Подключить Telegram (бесплатный Bot API)',setupTelegramHelp:'Создайте отдельного бота через BotFather, назначьте его администратором СВОЕГО публичного канала с правом «Публиковать сообщения». Затем задайте три переменные ниже в Vercel → Production. После применения настроек и нового деплоя нажмите «Проверить Telegram» выше.',
    setupBotFather:'Открыть BotFather',setupVercel:'Открыть переменные Vercel',setupTelegramKeys:'Три серверные переменные — НЕ вводите их значения в ChatGPT',
    setupEnvEnabled:'true',setupEnvToken:'секретный токен, выданный BotFather',setupEnvChat:'точный @username публичного канала или проверенный -100… ID',
    setupYouTube:'3. Проверить YouTube',setupYouTubeHelp:'Откройте загрузчик, войдите через Google и подтвердите точный канал. RU и EN каналы проверяются отдельно. Само открытие ссылки ничего не загружает.',setupYouTubeLink:'Открыть загрузчик YouTube',
    setupOthers:'4. Остальные сети: подготовить аккаунты',setupOthersHelp:'Откройте Metricool и Meta Business Suite, убедитесь, что ваши страницы Facebook/Instagram подключены. Это НЕ даёт автоматический доступ Holistic House: для прямой публикации потребуются отдельные разрешения приложения или API Metricool Advanced/Custom.',
    setupMetricool:'Открыть Metricool',setupMeta:'Открыть Meta Business Suite',setupHelp:'Подробная инструкция подключения',
    setupAdsTitle:'5. Отдельно: SEO и рекламные аккаунты (НЕ автопубликация)',
    setupAdsBody:'Подключение HYPD даёт доступ к статистике выбранного аккаунта в ChatGPT, но не передаёт его OAuth-права сайту. GA4 уже подключена; Search Console, Google Ads и Meta Ads по последней проверке недоступны. Не покупайте тариф и не запускайте рекламу без отдельного подтверждения.',
    setupGsc:'Подключить Search Console',setupGoogleAds:'Подключить Google Ads',setupMetaAds:'Подключить Meta Ads',
    setupEventsTitle:'6. Eventbrite и Meetup — существующий Event Publisher',
    setupEventsBody:'В системе TorontoTantra уже есть защищённый механизм Eventbrite. Его токен пока не настроен; не создавайте второй публикатор. Токен — только в приватных GitHub Actions Secrets. После авторизации проверьте статус на issue #71. Meetup требует отдельного Pro/API-доступа и письменного разрешения на коммерческое использование; до этого публикация только вручную.',
    setupEventbriteToken:'Как получить Eventbrite API token',setupEventbriteSecrets:'GitHub Secrets · TorontoTantra',setupEventPublisher:'Проверка Event Publisher',
    setupDirectoryTitle:'Каталоги мероприятий и Google Business',
    setupDirectoryNote:'Luma/AllEvents — ручное размещение, пока нет проверенных writer-прав. Google Business Profile возможен только при соответствии правилам и подтверждённом владении профилем; создание профиля и публикации не выполняются автоматически.',setupNoSecrets:'Пароли, OAuth-коды и токены держите у провайдера или в закрытых переменных Vercel. Не пересылайте их в чате и не публикуйте скриншоты.',
    bridgeTitle:'Metricool — отдельный сервис публикации',bridgeNote:'Подключение Metricool к ChatGPT не даёт прав сайту Holistic House. Для прямого API, по текущим правилам Metricool, нужен тариф Advanced/Custom и серверные ключи. Без этого размещение остаётся ручным.',bridgeHelp:'Требования Metricool API',
  },
  en:{
    quickTitle:'Start here',quickIntro:'One page to manage your posts. Your saved-draft storage is checked automatically.',
    quickReady:'Storage verified · draft editor available',quickChecking:'Checking saved drafts on the server…',
    quickFailed:'Storage could not be verified. No post will be lost or published.',
    quickStart:'Create a draft',quickPosts:'My posts',quickRetry:'Retry connection',
    quickExternal:'Social publishing remains manual until your account permissions are verified. Nothing is posted automatically.',
    quickDetails:'Connections and advanced setup (optional)',
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
    storageTitle:'Draft storage · Redis',
    storageNotChecked:'Not yet verified',storageChecking:'Checking…',
    storageCheck:'Test draft storage',storageRecheck:'Test again',
    storageOk:'Redis: synthetic editor save, readback, update and conflict protection verified',
    storageRunning:'Redis: checking…',storageFailShort:'Redis: check failed',storagePassShort:'Redis: verified',channelCount:'channels',
    storageInfo:'On opening the owner workspace, checks a synthetic draft using the editor\'s Redis write, read and update path. Its isolated 30-second key is deleted. No real drafts or client data are touched.',
    storageError:'Redis could not be verified. Draft persistence is not confirmed by this test. Check the server connection.',
    direct:'Open YouTube uploader',existing:'Open material library',
    guidelines:'Readiness requires real provider permission and delivery evidence, not a button in this app.',
    warning:'Instagram/TikTok/YouTube need media; Pinterest requires a board; event listings need verified dates and organizer.',
    verificationNeeded:'No connection test completed yet.',recheck:'Check again',
    ownerConnectTitle:'What to do next: enable publishing',ownerConnectNote:'First verify draft storage, then authorize only the channels you need. Provider access is granted in the provider account, not in ChatGPT.',
    setupStorage:'1. Verify draft storage',setupStorageHelp:'Above, click Test draft storage and wait for Redis: verified. This never publishes.',
    setupTelegram:'2. Connect Telegram (free Bot API)',setupTelegramHelp:'Create a dedicated bot in BotFather, add it as an administrator of YOUR PUBLIC channel with Post Messages permission, then set the three Production variables below in Vercel. After a new deployment, click Check Telegram access above.',
    setupBotFather:'Open BotFather',setupVercel:'Open Vercel variables',setupTelegramKeys:'Three server-only variables — NEVER share values in ChatGPT',
    setupEnvEnabled:'true',setupEnvToken:'private token from BotFather',setupEnvChat:'exact public channel @username or verified -100… channel ID',
    setupYouTube:'3. Verify YouTube',setupYouTubeHelp:'Open the uploader, authorize Google, and confirm the exact channel. RU and EN targets are checked independently. Opening the link does not upload a video.',setupYouTubeLink:'Open YouTube uploader',
    setupOthers:'4. Other networks: prepare accounts',setupOthersHelp:'Open Metricool and Meta Business Suite to check your actual Facebook/Instagram Pages. This does NOT grant Holistic House publishing access: it still needs separate app permissions or Metricool API Advanced/Custom.',
    setupMetricool:'Open Metricool',setupMeta:'Open Meta Business Suite',setupHelp:'Detailed connection guide',
    setupAdsTitle:'5. Separately: SEO and ad accounts (NOT social publishing)',
    setupAdsBody:'Connecting HYPD enables authorized ChatGPT account reporting, but does not give this website posting rights. GA4 is already connected; Search Console, Google Ads and Meta Ads were still unavailable at last check. Do not buy a plan or launch paid campaigns without separate approval.',
    setupGsc:'Connect Search Console',setupGoogleAds:'Connect Google Ads',setupMetaAds:'Connect Meta Ads',
    setupEventsTitle:'6. Eventbrite and Meetup — existing Event Publisher',
    setupEventsBody:'TorontoTantra already has a guarded Eventbrite publishing workflow; do not duplicate it. The required token has not been configured. Store it only in private GitHub Actions Secrets, then check real provider status via issue #71. Meetup requires Pro/API access and written commercial-use permission; otherwise use manual publishing.',
    setupEventbriteToken:'Eventbrite API token instructions',setupEventbriteSecrets:'GitHub Secrets · TorontoTantra',setupEventPublisher:'Event Publisher status',
    setupDirectoryTitle:'Event directories and Google Business',
    setupDirectoryNote:'Luma/AllEvents currently require manual listing without verified writer access. A Google Business Profile must be owner-controlled and eligible; no automatic account creation or publication is implied.',setupNoSecrets:'Keep passwords, OAuth codes and tokens with the provider or in secret Vercel variables. Never post them in chat or screenshots.',
    bridgeTitle:'Metricool — separate publishing service',bridgeNote:'Connecting Metricool to ChatGPT does not authorize the Holistic House server. Metricool currently requires Advanced/Custom for direct API access, plus reviewed server-side credentials. Until then publishing is manual.',bridgeHelp:'Metricool API requirements',
  },
}
const RU_REQUIREMENTS={
  facebook:'Требуются разрешения Meta на публикацию от имени страницы; личный профиль и группы могут требовать ручной отправки.',
  instagram:'Профессиональный Instagram и проверенные разрешения публикации, подходящее фото или видео.',
  youtube:'Используйте отдельный загрузчик RU/EN; OAuth, канал и фактическую видимость нужно подтвердить.',
  twitter:'Требуются официальный API и подходящий тариф; длина текста зависит от подписки.',
  linkedin:'Нужны разрешения личного или корпоративного аккаунта и официальный API.',
  pinterest:'Нужно изображение или видео и конкретная доска Pinterest; в редакторе доска ещё не задаётся.',
  google_business:'Нужны подтверждённая бизнес-локация, API-разрешения и тип публикации.',
  tiktok:'Нужен одобренный Content Posting API и совместимое фото или видео.',
  telegram:'Только после явного согласования и проверки прав бота на публикацию в публичном канале.',
  mastodon:'Нужны OAuth и конкретный сервер Mastodon, лимиты зависят от сервера.',
  threads:'Нужен официальный API, текст отдельной публикации — до 500 символов.',
  bluesky:'Нужен доступ приложения, текст отдельной публикации — до 300 символов.',
  wordpress:'Необходимо отдельное подключение WordPress и проверка прав публикации.',
  eventbrite:'Требуется настоящее мероприятие с подтверждённой датой, организатором и Eventbrite-доступом.',
  meetup:'Нужны права организатора и доступное официальное подключение Meetup.',
  manual:'Готовый контент копируется владельцем вручную, без автоматической отправки.',
}
const modes={telegram_opt_in:'telegramOptIn',existing_uploader:'existingUploader',event_adapter:'eventAdapter',manual:'manual'}
export default function GrowthStudioConnections({locale='en',telegram={ready:false,channel:null},
  onTelegramVerified=()=>{},onStart=()=>{},onShowPosts=()=>{},postCount=0}){
  const t=messages[locale==='ru'?'ru':'en']
  const [verified,setVerified]=useState(false)
  const [checking,setChecking]=useState(false)
  const [error,setError]=useState('')
  const [storageState,setStorageState]=useState('untested')
  const [storageChecking,setStorageChecking]=useState(false)
  const storageProbeInFlight=useRef(false)
  const all=useMemo(()=>GROWTH_PUBLICATION_NETWORKS.map(id=>({id,...CHANNEL_CAPABILITIES[id]})),[])
  async function verify(){
    if(!telegram.ready||checking)return
    setChecking(true);setError('');setVerified(false);onTelegramVerified(false)
    try{
      const result=await checkGrowthTelegramPublisherAction()
      if(result.ok&&result.verified===true){setVerified(true);onTelegramVerified(true)}
      else setError(result.error||'unverified')
    }catch{setError('unverified')}
    finally{setChecking(false)}
  }
  const verifyStorage=useCallback(async()=>{
    if(storageProbeInFlight.current)return
    storageProbeInFlight.current=true
    setStorageChecking(true)
    setStorageState('untested')
    try {
      const result=await checkGrowthStudioStorageAction()
      setStorageState(result?.ok===true&&result?.verified===true?'verified':'failed')
    } catch {
      setStorageState('failed')
    } finally {
      storageProbeInFlight.current=false
      setStorageChecking(false)
    }
  },[])
  // Executes once when an already-authenticated owner opens this workspace.
  // The server action checks the real admin session first. No provider posts.
  useEffect(()=>{void verifyStorage()},[verifyStorage])
  return <>
    <section className={styles.quickLaunch} aria-label={t.quickTitle}>
      <div className={styles.quickLaunchCopy}>
        <div className={styles.quickLaunchHeading}><CheckCircle2 size={20} aria-hidden="true"/><h3>{t.quickTitle}</h3></div>
        <p>{t.quickIntro}</p>
        <p className={storageState==='verified'?styles.quickLaunchVerified:styles.quickLaunchWaiting}
          role="status" aria-live="polite">
          {storageChecking||storageState==='untested'?t.quickChecking:
            storageState==='verified'?t.quickReady:t.quickFailed}
        </p>
      </div>
      <div className={styles.quickLaunchActions}>
        <button className={styles.quickLaunchPrimary} type="button" onClick={onStart}
          disabled={storageState!=='verified'}>{t.quickStart}</button>
        {postCount>0&&<button type="button" className={styles.quickLaunchSecondary} onClick={onShowPosts}>
          {t.quickPosts} · {postCount}</button>}
        {storageState==='failed'&&<button type="button" onClick={verifyStorage}
          disabled={storageChecking} className={styles.quickLaunchSecondary}>{t.quickRetry}</button>}
      </div>
      <p className={styles.quickLaunchFootnote}>{t.quickExternal}</p>
    </section>
    <details className={styles.connectionPanel}>
    <summary><ShieldCheck size={19} aria-hidden="true"/><span>{t.quickDetails}</span>
      <span className={storageState==='verified'?styles.verifiedText:styles.notVerifiedText} role="status">
        {storageChecking?t.storageRunning:storageState==='verified'?t.storagePassShort:
          storageState==='failed'?t.storageFailShort:t.storageNotChecked}
      </span>
    </summary>
    <div className={styles.connectionAdvanced}>
    <details className={styles.connectionTechnical}>
      <summary>{t.summary} · {verified?'1':'0'} / {all.length}</summary>
      <p>{t.explanation}</p>
      <div className={styles.connectionBox}>
        <div className={styles.connectionBoxTitle}><strong>Telegram · Holistic House</strong>
          <span className={verified?styles.verifiedText:styles.notVerifiedText}>
            {verified?t.verified:telegram.ready?t.configured:t.unconfigured}
          </span>
        </div>
        <p>{telegram.ready?t.verificationNeeded:t.notSet}</p>
        <button type="button" onClick={verify} disabled={!telegram.ready||checking}>{checking?t.checking:t.check}</button>
        {error&&<p className={styles.connectionError} role="alert">{t.mismatch}</p>}
      </div>
    </details>

    <div className={styles.connectionBox}>
      <div className={styles.connectionBoxTitle}>
        <strong>{t.storageTitle}</strong>
        <span className={storageState==='verified'?styles.verifiedText:styles.notVerifiedText}>
          {storageState==='verified'?t.storageOk:storageChecking?t.storageChecking:t.storageNotChecked}
        </span>
      </div>
      <p>{t.storageInfo}</p>
      <button type="button" onClick={verifyStorage} disabled={storageChecking}>
        {storageChecking?<RefreshCcw size={16} aria-hidden="true"/>:
          storageState==='verified'?<CheckCircle2 size={16} aria-hidden="true"/>:
            <CircleHelp size={16} aria-hidden="true"/>}
        {storageChecking?t.storageChecking:storageState==='untested'?t.storageCheck:t.storageRecheck}
      </button>
      {storageState==='failed'&&<p role="alert" className={styles.connectionError}><AlertCircle size={15} aria-hidden="true"/>{t.storageError}</p>}
      {storageState==='verified'&&<p role="status" className={styles.verifiedText}>{t.storageOk}</p>}
    </div>

    <div className={styles.connectionBox}>
      <div className={styles.connectionBoxTitle}><strong>{t.bridgeTitle}</strong><span className={styles.notVerifiedText}>{t.external}</span></div>
      <p>{t.bridgeNote}</p>
      <a href="https://help.metricool.com/basic-guide-for-api-integration-r97af" target="_blank" rel="noopener noreferrer">{t.bridgeHelp} ↗</a>
    </div>
    <div className={styles.connectionBox}>
      <div className={styles.connectionBoxTitle}><strong>{t.ownerConnectTitle}</strong></div>
      <p>{t.ownerConnectNote}</p>
      <div className={styles.growthSetupSteps}>
        <section>
          <h4>{t.setupStorage}</h4>
          <p>{t.setupStorageHelp}</p>
        </section>
        <section>
          <h4>{t.setupTelegram}</h4>
          <p>{t.setupTelegramHelp}</p>
          <div className={styles.connectionNav}>
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">{t.setupBotFather} ↗</a>
            <a href="https://vercel.com/super10/codex-public-book-library/settings/environment-variables" target="_blank" rel="noopener noreferrer">{t.setupVercel} ↗</a>
          </div>
          <p>{t.setupTelegramKeys}</p>
          <div className={styles.growthSetupEnv} aria-label={t.setupTelegramKeys}>
            <div><code>HH_GROWTH_TELEGRAM_ENABLED</code><span>{t.setupEnvEnabled}</span></div>
            <div><code>HH_GROWTH_TELEGRAM_BOT_TOKEN</code><span>{t.setupEnvToken}</span></div>
            <div><code>HH_GROWTH_TELEGRAM_CHAT_ID</code><span>{t.setupEnvChat}</span></div>
          </div>
        </section>
        <section>
          <h4>{t.setupYouTube}</h4>
          <p>{t.setupYouTubeHelp}</p>
          <div className={styles.connectionNav}>
            <Link href="/admin/youtube-upload">{t.setupYouTubeLink} ↗</Link>
          </div>
        </section>
        <section>
          <h4>{t.setupOthers}</h4>
          <p>{t.setupOthersHelp}</p>
          <div className={styles.connectionNav}>
            <a href="https://app.metricool.com/" target="_blank" rel="noopener noreferrer">{t.setupMetricool} ↗</a>
            <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">{t.setupMeta} ↗</a>
            <a href="https://github.com/andylitvinov-design/books/blob/codex/public-book-library/docs/growth-studio/START_HERE_RU_2026-10-20.md" target="_blank" rel="noopener noreferrer">{t.setupHelp} ↗</a>
          </div>
        </section>
        <section>
          <h4>{t.setupAdsTitle}</h4>
          <p>{t.setupAdsBody}</p>
          <div className={styles.connectionNav}>
            <a href="https://app.hypd.ai/sources?manage=search-console" target="_blank" rel="noopener noreferrer">{t.setupGsc} ↗</a>
            <a href="https://app.hypd.ai/sources?manage=google-ads" target="_blank" rel="noopener noreferrer">{t.setupGoogleAds} ↗</a>
            <a href="https://app.hypd.ai/sources?manage=meta" target="_blank" rel="noopener noreferrer">{t.setupMetaAds} ↗</a>
          </div>
        </section>
        <section>
          <h4>{t.setupEventsTitle}</h4>
          <p>{t.setupEventsBody}</p>
          <div className={styles.connectionNav}>
            <a href="https://www.eventbrite.com/help/en-us/articles/849962/generate-an-api-key/" target="_blank" rel="noopener noreferrer">{t.setupEventbriteToken} ↗</a>
            <a href="https://github.com/andylitvinov-design/torontotantra/settings/secrets/actions" target="_blank" rel="noopener noreferrer">{t.setupEventbriteSecrets} ↗</a>
            <a href="https://github.com/andylitvinov-design/torontotantra/issues/71" target="_blank" rel="noopener noreferrer">{t.setupEventPublisher} ↗</a>
          </div>
          <p><strong>{t.setupDirectoryTitle}:</strong> {t.setupDirectoryNote}</p>
        </section>
      </div>
      <p className={styles.growthSetupPrivacy}><ShieldCheck size={15} aria-hidden="true"/>{t.setupNoSecrets}</p>
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
              <td>{locale==='ru'?RU_REQUIREMENTS[item.id]||item.description:item.description}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
    <p className={styles.connectionNote}>{t.warning}</p>
    <p className={styles.connectionNote}>{t.guidelines}</p>
    <div className={styles.connectionNav}><Link href="/admin/youtube-upload">{t.direct} ↗</Link><Link href="/admin/materials">{t.existing} ↗</Link></div>
    </div>
    </details>
  </>
}
