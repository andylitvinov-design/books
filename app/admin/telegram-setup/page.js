import Link from 'next/link'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {getAppConfig} from '@/lib/app/config'
import {ownerTelegramSetupStatus} from '@/lib/practitioners/telegram-owner-setup'
import {modelSettings} from '@/lib/practitioners/council-free-models.mjs'
import {sendDailyCouncilReportAction,saveOwnerFreeProviderAction,
  disableOwnerFreeProviderAction} from './actions'
import {ownerAiProviderReadiness} from '@/lib/practitioners/owner-ai-provider-settings'
import {
  checkTelegramConnectionAction,connectAndTestTelegramAction
} from './actions'
import styles from './telegram-setup.module.css'

export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
export const metadata={
  title:'Telegram · Holistic House',
  robots:{index:false,follow:false},
}

const notes={
  not_started:{ru:'Ожидает первой проверки',en:'Waiting for first check'},
  paired:{ru:'Личный чат подтверждён',en:'Private chat verified'},
  wrong_bot:{ru:'Токен не от @Andydotbot',en:'Token is not for @Andydotbot'},
  webhook_active:{ru:'У бота уже активен webhook',en:'Bot already has an active webhook'},
  awaiting_new_start:{ru:'Нужна свежая команда /start',en:'Fresh /start required'},
  chat_identity_unverified:{ru:'Личный чат не подтверждён',en:'Private chat could not be verified'},
  telegram_unavailable:{ru:'Не удалось обратиться к Telegram',en:'Telegram API unavailable'},
  token_missing:{ru:'Токен BotFather не добавлен',en:'BotFather token missing'},
  already_configured:{ru:'Личный чат сохранён в Vercel',en:'Private chat configured in Vercel'},
}
const resultNotes={
  accepted:{ru:'Тестовое сообщение принято Telegram. Проверь чат Dot.',en:'Telegram accepted one test message. Check Dot.'},
  already_accepted:{ru:'Тест уже был успешно принят, повторно не отправляется.',en:'Test already accepted. No duplicate sent.'},
  webhook_active:{ru:'Поиск остановлен: не будем заменять существующий webhook.',en:'Discovery stopped; existing webhook is preserved.'},
  awaiting_new_start:{ru:'Отправь /start боту Dot, затем снова нажми проверку.',en:'Send /start to Dot, then check again.'},
  wrong_bot:{ru:'Нужен токен именно существующего @Andydotbot.',en:'The token must belong to @Andydotbot.'},
  delivery_unconfirmed:{ru:'Результат тестовой отправки неизвестен. Повтор заблокирован, чтобы избежать дубля.',en:'Delivery is uncertain. Retry blocked to avoid duplicate.'},
  identity_unavailable:{ru:'Проверка Telegram временно недоступна.',en:'Telegram identity check unavailable.'},
  identity_mismatch:{ru:'Имя бота или владельца чата не совпадает. Отправка заблокирована.',en:'Bot or private owner chat mismatch. Sending blocked.'},
  sender_disabled:{ru:'Отправка выключена на сервере.',en:'Server delivery switch is off.'},
  setup_unavailable:{ru:'Сервис проверки временно недоступен.',en:'Connection verification temporarily unavailable.'},
  council_sent:{ru:'AI-отчёт принят Telegram. Проверь чат Dot.',en:'AI report accepted by Telegram. Check Dot.'},
  council_duplicate:{ru:'Этот отчёт уже отправлен или выполняется. Без дубля.',en:'Already sent or running. No duplicate.'},
  council_missing_keys:{ru:'Подтверди Gemini Free Tier и подключи бесплатный Mistral (OpenRouter или Studio Free mode).',en:'Confirm Gemini Free Tier and connect Mistral via OpenRouter free or Studio Free mode.'},
  council_no_archive:{ru:'Публичный HTML-аудит ещё не создан.',en:'Public HTML audit not archived yet.'},
  council_not_paired:{ru:'Личный чат ещё не подтверждён.',en:'Private Telegram chat not verified.'},
  council_unavailable:{ru:'Доставка не подтверждена. Проверь статус отчёта.',en:'Delivery unconfirmed. Check report status.'},
  gemini_free_saved:{ru:'Подтверждение бесплатного Gemini сохранено. Теперь модель сможет запускаться в пределах Free Tier.',en:'Free Gemini confirmation saved. The model may now run within Free Tier.'},
  mistral_free_saved:{ru:'Ключ Mistral сохранён зашифрованным. Free mode подтверждён. Доступность модели проверяется при запуске.',en:'Mistral key saved encrypted. Free mode confirmed. Model availability is checked on every run.'},
  gemini_disabled:{ru:'Разрешение Gemini отключено.',en:'Gemini Free Tier permission disabled.'},
  mistral_disabled:{ru:'Доступ Mistral отключён, сохранённый ключ удалён.',en:'Mistral disabled and its stored key cleared.'},
  free_setup_confirmation_required:{ru:'Поставь обе галочки подтверждения бесплатного тарифа и отсутствия платного биллинга.',en:'Please confirm both the free plan and no paid billing.'},
  free_setup_invalid_key:{ru:'Ключ Mistral неверного формата. Вставь ключ из Studio целиком.',en:'Mistral key has an invalid format. Paste the whole Studio key.'},
  free_setup_unavailable:{ru:'Настройка временно недоступна. Ничего платного не запускалось.',en:'Setup temporarily unavailable. No paid model was started.'},
}

export default async function TelegramSetupPage({searchParams}){
  if(!await requireAdminRequest())redirect('/admin/login')
  const ru=(await cookies()).get(uiLocaleCookie)?.value==='ru'
  const models=modelSettings(process.env)
  const lang=ru?'ru':'en'
  let provider={geminiKeyPresent:models.geminiKeyPresent,
    geminiFreeConfirmed:models.geminiFreeConfirmed,
    mistralStudioKeyPresent:models.mistralDirectKeyPresent,
    mistralFreeConfirmed:models.mistralDirectFreeConfirmed,
    mistralOpenRouterKeyPresent:models.mistralOpenRouterKeyPresent}
  const result=(await searchParams)?.result||''
  let state={token_saved:false,telegram_enabled:false,pairing:'not_started',
    test:'not_sent',test_accepted:false}
  let unavailable=false
  try{
    const config=getAppConfig()
    const [telegramState,providerState]=await Promise.all([
      ownerTelegramSetupStatus(config),ownerAiProviderReadiness(config)
    ])
    state=telegramState
    provider=providerState
  }catch{unavailable=true}
  const pairing=notes[state.pairing]||notes.not_started
  const statusText=state.test_accepted
    ?ru?'Telegram принял тестовое сообщение':'Test message accepted by Telegram'
    :state.pairing==='paired'
      ?ru?'Личный чат привязан, тест ещё не отправлен':'Private chat paired; test not yet sent'
      :pairing[lang]
  const returned=resultNotes[result]
  const displayResult=['accepted','already_accepted'].includes(result)&&!state.test_accepted
    ?resultNotes.setup_unavailable[lang]
    :returned?.[lang]
  const canCheck=state.token_saved&&!unavailable
  // The main ChatGPT daily report is always deliverable when archived:
  // no Gemini/Mistral Free Tier attestation is required for Telegram transport.
  const canCouncil=canCheck&&state.pairing==='paired'&&state.telegram_enabled&&
    state.council?.status!=='sending'
  const canSend=canCheck&&state.telegram_enabled&&!state.test_accepted&&
    !['sending','uncertain'].includes(state.test)

  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader title={{ru:'Telegram · подключение',en:'Telegram · setup'}}
      description={{
        ru:'Один бот для уведомлений Holistic House, статистики My Practice и ежедневных отчётов.',
        en:'One bot for Holistic House notifications, My Practice statistics and daily reports.'
      }}/>
    <div className={styles.layout}>
      <section className={styles.card} aria-labelledby="telegram-setup-title">
        <div className={styles.eyebrow}>@Andydotbot → @AndyTherapist</div>
        <h2 id="telegram-setup-title">{ru?'Проверка безопасного подключения':'Secure connection check'}</h2>
        <p className={styles.lead}>
          {ru?'Токен остаётся только на сервере Holistic House. Числовой chat ID определяется автоматически по подтверждённому личному сообщению /start.':
            'The bot token stays on the Holistic House server. Your numeric chat ID is verified from a private /start message.'}
        </p>
        <dl className={styles.statusList}>
          <div><dt>{ru?'Токен BotFather':'BotFather token'}</dt>
            <dd>{state.token_saved?'● '+(ru?'Сохранён в Vercel':'Saved in Vercel'):
              '○ '+(ru?'Не настроен':'Not configured')}</dd></div>
          <div><dt>{ru?'Личный чат':'Private chat'}</dt><dd>{statusText}</dd></div>
          <div><dt>{ru?'Ежедневная отправка':'Daily delivery'}</dt>
            <dd>{state.telegram_enabled?(ru?'Разрешена только после проверки получателя':'Only with verified recipient'):
              ru?'Выключена':'Disabled'}</dd></div>
        </dl>
        {displayResult&&<p className={styles.result} role="status">{displayResult}</p>}
        {state.test==='uncertain'&&<p className={styles.warning} role="status">
          {ru?'Предыдущий тест мог быть доставлен. Повтор заблокирован до проверки журнала.':
            'The previous attempt might have delivered. No repeat until reviewed.'}
        </p>}
        {state.pairing==='webhook_active'&&<p className={styles.warning}>
          {ru?'У бота уже есть webhook. Сайт не будет удалять его или перехватывать чужие сообщения. Для привязки нужен разрешённый путь через действующий обработчик.':
            'A webhook already exists. It will not be deleted or replaced. Authorized integration with its existing handler is required.'}
        </p>}
        <div className={styles.controls}>
          <form action={connectAndTestTelegramAction}>
            <button type="submit" className={styles.primary} disabled={!canSend}>
              {state.test_accepted
                ?ru?'Тест успешно пройден':'Test completed'
                :ru?'Проверить и отправить один тест':'Verify and send one test'}
            </button>
          </form>
          <form action={checkTelegramConnectionAction}>
            <button type="submit" className={styles.secondary} disabled={!canCheck}>
              {ru?'Только проверить · без сообщения':'Check only · do not send'}
            </button>
          </form>
        </div>
        <p className={styles.footnote}>
          {ru?'Повторное нажатие не отправит второй тест. Telegram подтверждает приём сообщения, но не факт прочтения.':
            'A second click cannot resend an accepted test. Telegram confirms acceptance, not reading.'}
        </p>
      </section>
      <aside className={styles.card} aria-labelledby="telegram-guide-title">
        <h2 id="telegram-guide-title">{ru?'Что может потребоваться':'What you may need'}</h2>
        <p>{ru?'Всё подключается из этого кабинета. Дополнительные токены или сторонние боты не нужны.':
          'This cabinet is the only setup screen. No extra bots or duplicate credentials needed.'}</p>
        <p>{ru?'Если система пишет «Нужна свежая команда /start», открой своего бота и отправь /start ещё раз. После этого нажми проверку выше.':
          'If a fresh /start is needed, open Dot and send /start again, then retry the check.'}</p>
        <Link prefetch={false} href="https://t.me/Andydotbot" target="_blank" rel="noopener noreferrer"
          className={styles.external}>@Andydotbot ↗</Link>
        <p>{ru?'Если токен отсутствует, его можно добавить как Sensitive · Production в Vercel. Не присылай его в сообщения ChatGPT.':
          'If the token is missing, save it as Sensitive · Production in Vercel. Never paste it into ChatGPT.'}</p>
        <Link prefetch={false}
          href="https://vercel.com/super10/codex-public-book-library/settings/environment-variables"
          target="_blank" rel="noopener noreferrer" className={styles.external}>
          {ru?'Vercel · защищённые переменные ↗':'Vercel · protected environment ↗'}
        </Link>
        <div className={styles.modelSetup} aria-label={ru?'Доступность AI-отчётов':'AI audit readiness'}>
          <h3>{ru?'Ежедневный анализ сайта':'Daily website review'}</h3>
          <p>{ru?'Gemini:':'Gemini:'} <strong>{
            provider.geminiKeyPresent&&provider.geminiFreeConfirmed
              ?ru?'Ключ сохранён, бесплатный тариф подтверждён':'Key saved, Free Tier confirmed'
              :provider.geminiKeyPresent
                ?ru?'Ключ сохранён; требуется подтверждение Free Tier':'Key saved; Free Tier confirmation required'
                :ru?'API-ключ не подключён':'API key missing'
          }</strong></p>
          <p>Mistral · OpenRouter: <strong>{
            provider.mistralOpenRouterKeyPresent
              ?ru?'Ключ сохранён; модель :free и цена проверяются при запуске':
                'Key saved; :free model and price checked per run'
              :ru?'Нет ключа':'No key'
          }</strong></p>
          <p>Mistral · Studio Free mode: <strong>{
            provider.mistralStudioKeyPresent
              ?provider.mistralFreeConfirmed
                ?ru?'Ключ сохранён; Free mode подтверждён владельцем; доступность модели проверяется при запуске':
                  'Key saved; owner-confirmed Free mode; model access checked per run'
                :ru?'Ключ сохранён; требуется подтверждение Free mode без pay-as-you-go':
                  'Key saved; confirm Free mode with pay-as-you-go disabled'
              :ru?'Не подключён':'Not connected'
          }</strong></p>
          <p className={styles.footnote}>{
            ru?'Аудиты выполняются только по публичным страницам; платные модели автоматически не используются.':
              'Public-site evidence only. Paid model fallback is strictly disabled.'
          }</p>
          <div className={styles.ownerAiSetup}>
            <h3>{ru?'Подключение AI — один экран':'AI setup — one screen'}</h3>
            <p className={styles.footnote}>{
              ru?'Никаких настроек Vercel или новых Telegram-ботов. Сначала проверь тарифы в личных кабинетах, затем подтверди их здесь. Ключ Mistral вводи только на этом защищённом экране — не в ChatGPT.':
                'No Vercel settings or additional Telegram bots. Verify your provider plans first, then confirm here. Enter the Mistral key only on this secured screen, never in a chat.'
            }</p>
            <form action={saveOwnerFreeProviderAction} className={styles.providerForm}>
              <input type="hidden" name="provider" value="gemini"/>
              <strong>1. Gemini · Google AI Studio</strong>
              <a href="https://aistudio.google.com/app/projects" target="_blank" rel="noopener noreferrer">
                {ru?'Проверить Free Tier своего проекта ↗':'Verify the Free Tier for this project ↗'}
              </a>
              <label className={styles.checkLine}>
                <input name="free_confirmed" type="checkbox" value="yes" required/>
                <span>{ru?'Проверил: именно проект моего существующего ключа Gemini — Free Tier.':
                  'I checked: the project of my existing Gemini key is on Free Tier.'}</span>
              </label>
              <label className={styles.checkLine}>
                <input name="no_paid_billing" type="checkbox" value="yes" required/>
                <span>{ru?'Платный биллинг этого проекта не включён.':
                  'This project does not have paid billing enabled.'}</span>
              </label>
              <button type="submit" className={styles.primary}
                disabled={!provider.geminiKeyPresent||provider.geminiFreeConfirmed||unavailable}>
                {provider.geminiFreeConfirmed
                  ?ru?'Gemini подтверждён':'Gemini confirmed'
                  :ru?'Подтвердить бесплатный Gemini':'Confirm free Gemini'}
              </button>
            </form>
            {provider.geminiFreeConfirmed&&<form action={disableOwnerFreeProviderAction}
              className={styles.disableForm}>
              <input type="hidden" name="provider" value="gemini"/>
              <button type="submit" className={styles.secondary}>
                {ru?'Отключить разрешение Gemini':'Disable Gemini permission'}
              </button>
            </form>}
            <form action={saveOwnerFreeProviderAction} className={styles.providerForm}>
              <input type="hidden" name="provider" value="mistral"/>
              <strong>2. Mistral · Studio Free mode</strong>
              <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer">
                {ru?'Открыть Mistral Studio → API Keys ↗':'Open Mistral Studio → API Keys ↗'}
              </a>
              <label htmlFor="owner-mistral-key">
                {ru?'Вставить API-ключ из Mistral Studio':'Paste Mistral Studio API key'}
              </label>
              <input id="owner-mistral-key" name="mistral_key" type="password"
                minLength={24} maxLength={512} autoComplete="off" spellCheck={false}
                className={styles.secretInput} placeholder={ru?'Секретный API-ключ':'Private API key'}
                required/>
              <label className={styles.checkLine}>
                <input name="free_confirmed" type="checkbox" value="yes" required/>
                <span>{ru?'Проверил: мой Mistral Workspace находится в Free mode.':
                  'I checked: my Mistral workspace is in Free mode.'}</span>
              </label>
              <label className={styles.checkLine}>
                <input name="no_paid_billing" type="checkbox" value="yes" required/>
                <span>{ru?'Pay-as-you-go отключён; платный тариф не включён.':
                  'Pay-as-you-go is off; no paid plan is enabled.'}</span>
              </label>
              <button type="submit" className={styles.primary} disabled={unavailable}>
                {ru?'Безопасно сохранить ключ Mistral':'Safely save Mistral key'}
              </button>
            </form>
            {provider.mistralStudioKeyPresent&&<form action={disableOwnerFreeProviderAction}
              className={styles.disableForm}>
              <input type="hidden" name="provider" value="mistral"/>
              <button type="submit" className={styles.secondary}>
                {ru?'Удалить ключ и отключить Mistral':'Delete key and disable Mistral'}
              </button>
            </form>}
          </div>
          <p>{ru?'Последний AI-отчёт':'Latest AI report'}: <strong>{
            state.council
              ?state.council.date+' · '+state.council.status+
                ' · Gemini '+state.council.gemini+' / Mistral '+state.council.mistral
              :ru?'Нет подтверждённого отчёта':'No confirmed report yet'
          }</strong></p>
          <p className={styles.footnote}>
            {ru?'Можно отправить отчёт ChatGPT без подключения Mistral и Gemini. Ответы независимых моделей добавляются только после подтверждения бесплатных тарифов и реальной проверки API. Повтор того же отчёта не отправляется.':
              'You can send a ChatGPT report without Gemini or Mistral credentials. Independent model answers are included only after verified free-tier setup and real API responses. The same daily report cannot be resent.'}
          </p>
          <form action={sendDailyCouncilReportAction} className={styles.sendForm}>
            <button type="submit" className={styles.primary} disabled={!canCouncil}>
              {ru?'Отправить доступный отчёт сегодня':'Send available daily report now'}
            </button>
          </form>
          <div className={styles.setupLinks}>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
              Gemini · Google AI Studio ↗</a>
            <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">
              Mistral · OpenRouter (:free) ↗</a>
            <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer">
              Mistral · Studio Free mode ↗</a>
            <a href="https://vercel.com/super10/codex-public-book-library/settings/environment-variables"
               target="_blank" rel="noopener noreferrer">
              {ru?'Настроить ключи и Free mode в Vercel ↗':'Configure keys and Free mode in Vercel ↗'}</a>
          </div>
        </div>
        <p className={styles.footnote}>
          {ru?'Автоматические Gemini/Mistral заключения появятся только при отдельно подключённых бесплатных API. Личный Muse пока добавляется вручную.':
            'Gemini/Mistral reviews require separate approved free-tier APIs. Personal Muse remains manual.'}
        </p>
      </aside>
    </div>
  </main>
}
