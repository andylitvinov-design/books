'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, Gift, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { WALLET_PRESETS_MINOR, walletSafePaymentUrl } from '@/lib/wallet/model'
import styles from './wallet-panel.module.css'
import WalletConfirmation from './wallet-confirmation'
import XpPanel from '@/components/xp/xp-panel'

const COPY = {
  ru: {
    eyebrow: 'HOLISTIC HOUSE · МОЙ СЧЁТ', title: 'Пополнить баланс',
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
    onlyPaypal: 'Банковская карта временно недоступна: ожидается подключение торгового Square API.',
    notConnected: 'Ожидает подключения', paypalManual: 'Подтверждение вручную', squareAuto: 'Автоматическая проверка',
    choose: 'Выберите способ оплаты', ready: 'Заявка создана. Откройте платёжную страницу, проверьте сумму и получателя.',
    openPay: 'Открыть защищённую оплату', review: 'PayPal зачисляется после подтверждения поступления.',
    noMethods: 'Ни один способ пополнения сейчас не подключён. Платёж не будет создан.',
    invalidAmount: 'Введите сумму от CA$1 до CA$1 000, максимум два знака после запятой.',
    successHint: 'Возвращайтесь в этот кабинет после оплаты. Здесь можно продолжить или проверить заказ.',
  },
  en: {
    eyebrow: 'HOLISTIC HOUSE · MY ACCOUNT', title: 'Top up balance',
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
    onlyPaypal: 'Card checkout is unavailable until the Square merchant API is connected.',
    notConnected: 'Not connected', paypalManual: 'Manual verification', squareAuto: 'Provider-verified',
    choose: 'Choose payment method', ready: 'Top-up created. Open the secure payment page and check the amount and merchant.',
    openPay: 'Open secure payment', review: 'PayPal credit is added after the payment is independently verified.',
    noMethods: 'No wallet payment method is connected. No payment will be created.',
    invalidAmount: 'Enter CA$1 to CA$1,000, with no more than two decimal places.',
    successHint: 'Return to your account after payment. Your order can be resumed or checked here.',
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
  const [readyPayment, setReadyPayment] = useState(null)
  const [confirmationId, setConfirmationId] = useState(null)
  const [returnChecking, setReturnChecking] = useState(false)
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
    setState(null); setError(''); setSuccess(''); setReadyPayment(null)
    setConfirmationId(null); setReturnChecking(false); operation.current = null
    reload().then(async () => {
      if (!isMounted.current) return
      const order = new URLSearchParams(window.location.search).get('squareTopup')
      if (order && /^[0-9a-f-]{36}$/i.test(order)) {
        // The return URL is never proof of payment. A signed-in owner-scoped
        // server request reads Square's actual payment status first.
        setConfirmationId(order)
        setReturnChecking(true)
        try { await post('refresh', { topupId: order }) }
        catch { /* A pending/unknown status is shown, never a false paid receipt. */ }
        finally {
          if (isMounted.current) {
            await reload()
            if (isMounted.current) setReturnChecking(false)
          }
        }
      }
    })
    return () => { isMounted.current = false }
  }, [accountId, reload, post])
  const providers = state?.providers || []
  const selectedProvider = providers.includes(provider) ? provider : providers[0] || null
  async function createTopup() {
    if (busy || !selectedProvider || !validAmount(amount)) return
    setBusy('create'); setError(''); setSuccess(''); setReadyPayment(null); setConfirmationId(null)
    const key = amount + ':' + selectedProvider
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() }
    try {
      const result = await post('create', {
        operationId: operation.current.id, amount, provider: selectedProvider, locale,
      })
      await reload()
      if (['reported', 'credited', 'reversed'].includes(result.topup?.status)) {
        setConfirmationId(result.topup.id)
        if (result.topup.status === 'reported') setSuccess(t.reportDone)
        return
      }
      const url = walletSafePaymentUrl(selectedProvider, result.redirectUrl)
      if (!url) throw new Error('WALLET_PAYMENT_RECONCILIATION_REQUIRED')
      setReadyPayment({ url, provider: selectedProvider, id: result.topup.id })
      setSuccess(t.ready)
    } catch (e) { setError(e.message || t.error) }
    finally { setBusy('') }
  }
  async function report(topupId) {
    if (busy) return
    setBusy(topupId); setError(''); setSuccess('')
    try {
      await post('report', { topupId, transactionId: receipts[topupId] || '' })
      setConfirmationId(topupId)
      setReceipts(current => ({ ...current, [topupId]: '' }))
      setSuccess(t.reportDone)
      await reload()
    } catch (e) { setError(e.message || t.error) }
    finally { setBusy('') }
  }
  async function refreshSquare(topupId) {
    if (busy) return
    setBusy(topupId); setError(''); setSuccess('')
    try {
      setConfirmationId(topupId)
      setReturnChecking(true)
      await post('refresh', { topupId })
      await reload()
    }
    catch (e) { setError(e.message || t.error) }
    finally { setBusy(''); setReturnChecking(false) }
  }
  const confirmationOrder = state?.topups?.find(order => order.id === confirmationId)
  return <section className={styles.shell} data-wallet-account={accountId}>
    <XpPanel accountId={accountId} locale={locale} />
    <div className={styles.heading}><div>
      <p className={styles.eyebrow}><Wallet size={17}/> {t.eyebrow}</p>
      <h1>{t.title}</h1><p>{t.intro}</p>
    </div><div className={styles.balance} data-wallet-balance>
      <span>{t.total}</span><strong>{state && Number.isSafeInteger(state.balanceMinor) ? money(state.balanceMinor) : '—'}</strong>
      <small>CAD</small>
    </div></div>
    {!state && <p role="status">{t.loading}</p>}
    {error && <p className={styles.error} role="alert">{error === 'WALLET_UNAVAILABLE' ? t.unavailable : error}</p>}
    {success && <p className={styles.success} role="status">{success}</p>}
    {state && !state.enabled && <p className={styles.notice}>{t.unavailable}</p>}
    {state?.enabled && <>
      <div className={styles.card} id="wallet-topup">
        <div className={styles.sectionHeading}><Gift size={22}/><div>
          <h2>{t.amount}</h2><p>{t.currency}</p>
        </div></div>
        <p className={styles.label}>{t.presets}</p>
        <div className={styles.presets}>
          {WALLET_PRESETS_MINOR.map(value => <button key={value} type="button"
            className={amount === (value / 100).toFixed(2) ? styles.presetActive : styles.preset}
            onClick={() => { setAmount((value / 100).toFixed(2)); setReadyPayment(null) }}>{money(value)}</button>)}
        </div>
        <label className={styles.field}><span>{t.own}</span>
          <div className={styles.amountInput}><b>CA$</b><input value={amount} onChange={event => { setAmount(event.target.value.replace(',', '.')); setReadyPayment(null) }}
            type="text" inputMode="decimal" placeholder="40.00" aria-label={t.own} maxLength={7}/></div>
        </label>
        <p className={styles.label}>{t.choose}</p>
        <div className={styles.providers} role="group" aria-label={t.choose} data-wallet-payment-methods>
          <button type="button" data-wallet-method="square_api" aria-pressed={selectedProvider === 'square_api'}
            disabled={!providers.includes('square_api')} className={selectedProvider === 'square_api' ? styles.methodSelected : styles.method}
            onClick={() => { setProvider('square_api'); setReadyPayment(null) }}>
            <CreditCard size={22}/><span><strong>{t.square}</strong>
              <small>{providers.includes('square_api') ? t.squareAuto : t.notConnected}</small></span>
          </button>
          <button type="button" data-wallet-method="paypal_personal" aria-pressed={selectedProvider === 'paypal_personal'}
            disabled={!providers.includes('paypal_personal')} className={selectedProvider === 'paypal_personal' ? styles.methodSelected : styles.method}
            onClick={() => { setProvider('paypal_personal'); setReadyPayment(null) }}>
            <Wallet size={22}/><span><strong>{t.paypal}</strong>
              <small>{providers.includes('paypal_personal') ? t.paypalManual : t.notConnected}</small></span>
          </button>
        </div>
        {!providers.includes('square_api') && <p className={styles.small}>{t.onlyPaypal}</p>}
        {!providers.length && <p className={styles.small} role="status">{t.noMethods}</p>}
        {selectedProvider === 'paypal_personal' && <p className={styles.small}>{t.receipt}</p>}
        {!validAmount(amount) && <p className={styles.small} role="alert">{t.invalidAmount}</p>}
        <button className={styles.primary} disabled={Boolean(busy) || !validAmount(amount) || !selectedProvider}
          type="button" onClick={createTopup} data-wallet-create>
          {busy === 'create' ? t.loadingPay : t.pay + ' · ' + (validAmount(amount) ? money(Math.round(Number(amount) * 100)) : '—')}
        </button>
        {readyPayment && <div className={styles.ready} data-wallet-payment-ready>
          <p role="status">{t.ready}</p>
          <a className={styles.primary} href={readyPayment.url} target="_blank" rel="noopener noreferrer"
            referrerPolicy="no-referrer" data-wallet-open-payment>
            {t.openPay} · {readyPayment.provider === 'square_api' ? t.square : 'PayPal'}
          </a>
          <p className={styles.small}>{t.successHint}</p>
        </div>}
      </div>
      <WalletConfirmation locale={locale} order={confirmationOrder}
        verifying={returnChecking} requested={Boolean(confirmationId)} />
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
          {(order.status === 'pending' || order.status === 'checkout_ready') &&
            walletSafePaymentUrl(order.provider, order.paymentUrl || order.checkoutUrl) && (
              <a className={styles.secondary} data-wallet-resume-payment
                href={walletSafePaymentUrl(order.provider, order.paymentUrl || order.checkoutUrl)}
                target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                {t.openPay}
              </a>
            )}
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
          {(order.status === 'credited' || order.status === 'reversed') &&
            <details className={styles.receiptDetails} data-wallet-verified-receipt>
              <summary>{locale === 'ru' ? 'Подтверждение зачисления' : 'View account credit confirmation'}</summary>
              <WalletConfirmation locale={locale} order={order} requested />
            </details>}
        </article>)}
      </div>
    </>}
  </section>
}
