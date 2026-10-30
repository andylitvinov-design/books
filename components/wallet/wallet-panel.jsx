'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, Gift, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { WALLET_PRESETS_MINOR } from '@/lib/wallet/model'
import styles from './wallet-panel.module.css'

const COPY = {
  ru: {
    eyebrow: 'HOLISTIC HOUSE · МОЙ СЧЁТ', title: 'Мой баланс',
    intro: 'Пополняйте баланс для будущих цифровых материалов и услуг Holistic House.',
    amount: 'Сумма пополнения', currency: 'Все суммы в канадских долларах (CAD).',
    own: 'Или укажите свою сумму', presets: 'Быстрое пополнение', paypal: 'PayPal · перевод',
    square: 'Банковская карта · Square', pay: 'Продолжить к оплате', loading: 'Загружаем баланс…',
    loadingPay: 'Готовим безопасную оплату…', total: 'Доступный баланс',
    unavailable: 'Пополнение временно недоступно.', signIn: 'Для пополнения нужен вход в личный кабинет.',
    receipt: 'После оплаты вернитесь сюда и укажите номер транзакции PayPal. Сумма зачисляется после проверки поступления.',
    report: 'Отправить ID транзакции', reportPlaceholder: 'Номер транзакции из PayPal',
    reportDone: 'Отправлено на проверку. Баланс изменится после подтверждения.',
    check: 'Обновить баланс', checkSquare: 'Проверить платёж Square', orderTitle: 'История пополнений',
    noOrders: 'Пополнений пока нет.', pending: 'Ожидается платёж', checkout_ready: 'Ожидается оплата картой',
    reported: 'Проверяется поступление', credited: 'Зачислено', rejected: 'Отклонено',
    reversed: 'Возврат / списание', error: 'Не удалось выполнить операцию. Проверьте данные и попробуйте снова.',
    processing: 'Проверяем поступление…',
    notice: 'Предоплаченный баланс: без переводов другим пользователям и снятия наличных. PayPal.Me не подтверждает платёж автоматически; Square зачисляет после проверки провайдера. Сумму и получателя проверьте до оплаты. Возврат — через поддержку по исходной транзакции.',
    onlyPaypal: 'Сейчас доступно пополнение через PayPal. Оплата картой включится после подключения торгового Square API.',
  },
  en: {
    eyebrow: 'HOLISTIC HOUSE · MY ACCOUNT', title: 'My balance',
    intro: 'Add credit to your balance for future Holistic House digital materials and services.',
    amount: 'Top-up amount', currency: 'All amounts are in Canadian dollars (CAD).',
    own: 'Or enter your amount', presets: 'Quick top-up', paypal: 'PayPal · transfer',
    square: 'Bank card · Square', pay: 'Continue to payment', loading: 'Loading balance…',
    loadingPay: 'Preparing secure payment…', total: 'Available balance',
    unavailable: 'Top-ups are temporarily unavailable.', signIn: 'Sign in to your cabinet to top up.',
    receipt: 'After paying, return and enter the PayPal transaction ID. Credit is added only after checking the incoming payment.',
    report: 'Submit transaction ID', reportPlaceholder: 'PayPal transaction ID',
    reportDone: 'Sent for review. Your balance changes after confirmation.',
    check: 'Refresh balance', checkSquare: 'Check Square payment', orderTitle: 'Top-up history',
    noOrders: 'No top-ups yet.', pending: 'Awaiting payment', checkout_ready: 'Awaiting card payment',
    reported: 'Receipt under review', credited: 'Credited', rejected: 'Rejected',
    reversed: 'Refund / reversal', error: 'Action failed. Check the details and try again.',
    processing: 'Verifying payment…',
    notice: 'Prepaid credit: non-transferable and not redeemable for cash. PayPal.Me requires manual receipt verification; Square credits after provider verification. Check payee and final amount before paying. Refund requests are handled through support against the original transaction.',
    onlyPaypal: 'PayPal top-ups are available now. Card checkout will activate after the Square merchant API is connected.',
  },
}
const money = value => new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
}).format(Number(value) / 100)
const validAmount = value => /^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,2})?$/.test(value) &&
  Number(value) >= 1 && Number(value) <= 1000

export default function WalletPanel({ accountId, locale = 'en' }) {
  const t = COPY[locale] || COPY.en
  const [state, setState] = useState(null)
  const [amount, setAmount] = useState('40.00')
  const [provider, setProvider] = useState('paypal_personal')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [receipts, setReceipts] = useState({})
  const [success, setSuccess] = useState('')
  const operation = useRef(null)
  const isMounted = useRef(true)
  const fetchWallet = useCallback(async () => {
    const response = await fetch('/api/app/wallet/status', {
      credentials: 'same-origin', cache: 'no-store',
      headers: { 'x-hh-account-id': accountId },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'WALLET_UNAVAILABLE')
    return data
  }, [accountId])
  const reload = useCallback(async () => {
    try {
      const next = await fetchWallet()
      if (!isMounted.current) return
      setState(next); setError('')
      return next
    } catch (error) {
      if (isMounted.current) setError(error.message || t.error)
      return null
    }
  }, [fetchWallet, t.error])
  const post = useCallback(async (action, body) => {
    const response = await fetch('/api/app/wallet/' + action, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-hh-account-id': accountId },
      body: JSON.stringify(body),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'WALLET_UNAVAILABLE')
    return result
  }, [accountId])
  useEffect(() => {
    isMounted.current = true
    setState(null); setError(''); setSuccess(''); operation.current = null
    reload().then(() => {
      if (!isMounted.current) return
      const order = new URLSearchParams(window.location.search).get('squareTopup')
      if (order && /^[0-9a-f-]{36}$/i.test(order)) {
        post('refresh', { topupId: order }).then(reload).catch(() => reload())
      }
    })
    return () => { isMounted.current = false }
  }, [accountId, reload, post])
  const providers = state?.providers || []
  const selectedProvider = providers.includes(provider) ? provider : providers[0] || null
  async function createTopup() {
    if (busy || !selectedProvider || !validAmount(amount)) return
    setBusy('create'); setError(''); setSuccess('')
    const key = amount + ':' + selectedProvider
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() }
    try {
      const result = await post('create', {
        operationId: operation.current.id, amount, provider: selectedProvider, locale,
      })
      await reload()
      if (typeof result.redirectUrl !== 'string') {
        setError('WALLET_PAYMENT_RECONCILIATION_REQUIRED')
        return
      }
      const target = new URL(result.redirectUrl)
      const isPayPal = target.protocol === 'https:' && target.hostname === 'paypal.me' &&
        /^\/psitrends\/[0-9]+(?:\.[0-9]{2})?CAD$/.test(target.pathname)
      const isSquare = target.protocol === 'https:' &&
        (target.hostname === 'square.link' || target.hostname === 'checkout.square.site' ||
          target.hostname === 'sandbox.square.link' || target.hostname === 'staging.square.link')
      if (selectedProvider === 'paypal_personal' ? !isPayPal : !isSquare)
        throw new Error('WALLET_PROVIDER_MISMATCH')
      window.location.assign(target.href)
    } catch (e) { setError(e.message || t.error) }
    finally { setBusy('') }
  }
  async function report(topupId) {
    if (busy) return
    setBusy(topupId); setError(''); setSuccess('')
    try {
      await post('report', { topupId, transactionId: receipts[topupId] || '' })
      setReceipts(current => ({ ...current, [topupId]: '' }))
      setSuccess(t.reportDone)
      await reload()
    } catch (e) { setError(e.message || t.error) }
    finally { setBusy('') }
  }
  async function refreshSquare(topupId) {
    if (busy) return
    setBusy(topupId); setError(''); setSuccess('')
    try { await post('refresh', { topupId }); await reload() }
    catch (e) { setError(e.message || t.error) }
    finally { setBusy('') }
  }
  return <section className={styles.shell} data-wallet-account={accountId}>
    <div className={styles.heading}><div>
      <p className={styles.eyebrow}><Wallet size={17}/> {t.eyebrow}</p>
      <h1>{t.title}</h1><p>{t.intro}</p>
    </div><div className={styles.balance} data-wallet-balance>
      <span>{t.total}</span><strong>{state ? money(state.balanceMinor) : '—'}</strong>
      <small>CAD</small>
    </div></div>
    {!state && <p role="status">{t.loading}</p>}
    {error && <p className={styles.error} role="alert">{error === 'WALLET_UNAVAILABLE' ? t.unavailable : error}</p>}
    {success && <p className={styles.success} role="status">{success}</p>}
    {state && !state.enabled && <p className={styles.notice}>{t.unavailable}</p>}
    {state?.enabled && <>
      <div className={styles.card}>
        <div className={styles.sectionHeading}><Gift size={22}/><div>
          <h2>{t.amount}</h2><p>{t.currency}</p>
        </div></div>
        <p className={styles.label}>{t.presets}</p>
        <div className={styles.presets}>
          {WALLET_PRESETS_MINOR.map(value => <button key={value} type="button"
            className={amount === (value / 100).toFixed(2) ? styles.presetActive : styles.preset}
            onClick={() => setAmount((value / 100).toFixed(2))}>{money(value)}</button>)}
        </div>
        <label className={styles.field}><span>{t.own}</span>
          <div className={styles.amountInput}><b>CA$</b><input value={amount} onChange={event => setAmount(event.target.value)}
            type="text" inputMode="decimal" placeholder="40.00" aria-label={t.own} maxLength={7}/></div>
        </label>
        <div className={styles.providers} role="group" aria-label={t.amount}>
          {providers.includes('square_api') && <button type="button" className={selectedProvider === 'square_api' ? styles.methodSelected : styles.method}
            onClick={() => setProvider('square_api')}><CreditCard size={18}/>{t.square}</button>}
          {providers.includes('paypal_personal') && <button type="button" className={selectedProvider === 'paypal_personal' ? styles.methodSelected : styles.method}
            onClick={() => setProvider('paypal_personal')}><Wallet size={18}/>{t.paypal}</button>}
        </div>
        {!providers.includes('square_api') && <p className={styles.small}>{t.onlyPaypal}</p>}
        {selectedProvider === 'paypal_personal' && <p className={styles.small}>{t.receipt}</p>}
        <button className={styles.primary} disabled={Boolean(busy) || !validAmount(amount) || !selectedProvider}
          type="button" onClick={createTopup}>
          {busy === 'create' ? t.loadingPay : t.pay + ' · ' + (validAmount(amount) ? money(Math.round(Number(amount) * 100)) : '—')}
        </button>
      </div>
      <p className={styles.notice}><ShieldCheck size={18} aria-hidden="true"/> {t.notice}</p>
      <div className={styles.historyHeading}><h2>{t.orderTitle}</h2><button type="button"
        className={styles.secondary} onClick={reload} disabled={Boolean(busy)}><RefreshCw size={15}/>{t.check}</button></div>
      {!state.topups?.length && <p>{t.noOrders}</p>}
      <div className={styles.orderList}>
        {(state.topups || []).map(order => <article className={styles.order} key={order.id}>
          <div><strong>{money(order.amountMinor)}</strong>
            <span className={styles.status} data-wallet-status={order.status}>{t[order.status] || order.status}</span>
            <small>{new Date(order.createdAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-CA')} · {order.provider === 'paypal_personal' ? 'PayPal' : 'Square'}</small>
          </div>
          {order.provider === 'paypal_personal' && order.status === 'pending' && <div className={styles.receiptForm}>
            <label>{t.reportPlaceholder}<input value={receipts[order.id] || ''}
              onChange={event => setReceipts(value => ({ ...value, [order.id]: event.target.value }))}
              maxLength={80} autoComplete="off" /></label>
            <button type="button" className={styles.secondary} onClick={() => report(order.id)}
              disabled={Boolean(busy) || !/^[A-Za-z0-9-]{8,80}$/.test((receipts[order.id] || '').trim())}>{t.report}</button>
          </div>}
          {order.provider === 'square_api' && order.status === 'checkout_ready' &&
            <button type="button" className={styles.secondary} onClick={() => refreshSquare(order.id)}
              disabled={Boolean(busy)}>{busy === order.id ? t.processing : t.checkSquare}</button>}
        </article>)}
      </div>
    </>}
  </section>
}
