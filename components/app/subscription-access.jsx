'use client'

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { Check, ShieldCheck, Sparkles, X } from 'lucide-react'
import { canShowHousePromotion, canStartCheckout, EMPTY_LESSON_OFFERS, lessonCompletionKey, lessonOfferReducer, normalizeBillingStatus } from '@/lib/billing/public-plan'
import { requestBilling, verifiedBillingRedirect } from '@/lib/billing/client-session'
import { SUBSCRIPTION_COPY } from './subscription-copy'
import styles from './subscription-access.module.css'

const noAction = () => {}
const SubscriptionContext = createContext({
  locale: 'en', status: null, phase: 'unavailable', busy: '', error: '', offerKey: null,
  offerAfterCompletion: noAction, notifyLessonSaved: noAction, dismissOffer: noAction,
  showOffer: noAction, startCheckout: noAction, cancelRenewal: noAction,
  openPortal: noAction, refresh: noAction,
})

/** Mount once around signed-in content with key={accountId}; never gate children.
 * Status is authenticated and server-authoritative. No browser storage is used.
 * offerAfterCompletion(key) is for a successful saved completion only. Pass a
 * stable opaque key; never send answers, concerns, or notes to this hook.
 */
export function SubscriptionProvider({ accountId, locale = 'en', children }) {
  const [status, setStatus] = useState(null), [phase, setPhase] = useState('loading')
  const [busy, setBusy] = useState(''), [error, setError] = useState('')
  const [offers, dispatch] = useReducer(lessonOfferReducer, EMPTY_LESSON_OFFERS)
  const [manualOffer, setManualOffer] = useState(false)
  const mounted = useRef(false), requestVersion = useRef(0), inFlight = useRef(false)
  const operationIds = useRef({}), lifecycle = useRef(0), currentAccount = useRef(accountId)
  currentAccount.current = accountId
  const lang = locale === 'ru' ? 'ru' : 'en'

  const loadStatus = useCallback(async ({ reconcile = false } = {}) => {
    const version = ++requestVersion.current
    if (!accountId) {
      setStatus(null); setPhase('unavailable')
      return false
    }
    try {
      if (reconcile) await requestBilling(accountId, 'reconcile', {})
      const next = normalizeBillingStatus(await requestBilling(accountId, 'status'))
      if (!mounted.current || requestVersion.current !== version) return false
      setStatus(next); setPhase('ready')
      if (next.entitlement.active || next.entitlement.adFree) {
        dispatch({ type: 'suppress' }); setManualOffer(false)
      }
      return true
    } catch {
      if (mounted.current && requestVersion.current === version) setPhase('error')
      return false
    }
  }, [accountId])

  useEffect(() => {
    mounted.current = true; lifecycle.current += 1
    inFlight.current = false; setBusy('')
    setStatus(null); setPhase('loading'); setManualOffer(false)
    dispatch({ type: 'reset' }); operationIds.current = {}
    const returned = new URLSearchParams(window.location.search).get('billing')
    void loadStatus({ reconcile: returned === 'success' || returned === 'returned' })
    const recheck = () => {
      if (document.visibilityState !== 'hidden') void loadStatus()
    }
    window.addEventListener('focus', recheck)
    window.addEventListener('pageshow', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      mounted.current = false; lifecycle.current += 1; requestVersion.current += 1
      window.removeEventListener('focus', recheck)
      window.removeEventListener('pageshow', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [loadStatus])

  const offerAfterCompletion = useCallback((key) => {
    dispatch({ type: 'saved', key, suppressed: Boolean(status?.entitlement.active || status?.entitlement.adFree) })
  }, [status])
  const notifyLessonSaved = useCallback((completion) => {
    offerAfterCompletion(lessonCompletionKey(completion))
  }, [offerAfterCompletion])
  const dismissOffer = useCallback(() => {
    if (offers.pending[0]) dispatch({ type: 'dismiss', key: offers.pending[0] })
    else setManualOffer(false)
    setError('')
  }, [offers.pending])
  const runAction = useCallback(async (action, run) => {
    if (inFlight.current || !accountId) return false
    inFlight.current = true; setBusy(action); setError('')
    const generation = lifecycle.current
    const isCurrent = () => mounted.current && lifecycle.current === generation && currentAccount.current === accountId
    try { await run(isCurrent); return isCurrent() } catch (failure) {
      if (isCurrent()) {
        if (['BILLING_OPERATION_CLOSED', 'BILLING_CHECKOUT_FINISHED'].includes(failure.code)) operationIds.current.checkout = null
        if (failure.code === 'ACCOUNT_CHANGED') { setStatus(null); setPhase('error') }
        setError('action')
      }
      return false
    } finally {
      if (isCurrent()) { inFlight.current = false; setBusy('') }
    }
  }, [accountId])
  const startCheckout = useCallback(() => {
    if (!canStartCheckout(status, phase)) return Promise.resolve(false)
    return runAction('checkout', async isCurrent => {
      operationIds.current.checkout ||= crypto.randomUUID()
      const result = await requestBilling(accountId, 'checkout', { operationId: operationIds.current.checkout, locale: lang })
      const url = await verifiedBillingRedirect({ accountId, value: result.redirectUrl, kind: 'checkout', isCurrent })
      if (url && isCurrent()) window.location.assign(url)
    })
  }, [status, phase, runAction, lang, accountId])
  const openPortal = useCallback(() => {
    if (phase !== 'ready' || !status?.available || !status.subscription) return Promise.resolve(false)
    return runAction('portal', async isCurrent => {
      const result = await requestBilling(accountId, 'portal', { locale: lang })
      const url = await verifiedBillingRedirect({ accountId, value: result.redirectUrl, kind: 'portal', isCurrent })
      if (url && isCurrent()) window.location.assign(url)
    })
  }, [status, phase, runAction, lang, accountId])
  const cancelRenewal = useCallback(() => {
    if (phase !== 'ready' || !status?.available || !status.subscription || status.subscription.cancelAtPeriodEnd) return Promise.resolve(false)
    return runAction('cancel', async isCurrent => {
      operationIds.current.cancel ||= crypto.randomUUID()
      await requestBilling(accountId, 'cancel', { operationId: operationIds.current.cancel, confirmed: true })
      // A cancellation response never edits entitlement optimistically.
      if (isCurrent()) await loadStatus()
    })
  }, [status, phase, runAction, loadStatus, accountId])
  const refresh = useCallback(() => runAction('refresh', async () => {
    const returned = new URLSearchParams(window.location.search).get('billing')
    const ok = await loadStatus({ reconcile: Boolean(status?.available || returned === 'success' || returned === 'returned') })
    if (!ok) throw new Error('BILLING_UNAVAILABLE')
  }), [runAction, loadStatus, status])
  const value = useMemo(() => ({
    locale: lang, status, phase, busy, error,
    offerKey: offers.pending[0] || (manualOffer ? 'manual' : null),
    offerAfterCompletion, notifyLessonSaved, dismissOffer,
    showOffer: () => { setError(''); setManualOffer(true) },
    startCheckout, cancelRenewal, openPortal, refresh,
  }), [lang, status, phase, busy, error, offers.pending, manualOffer, offerAfterCompletion,
    notifyLessonSaved, dismissOffer, startCheckout, cancelRenewal, openPortal, refresh])
  return <SubscriptionContext.Provider value={value}>
    {children}
    <SubscriptionOffer />
  </SubscriptionContext.Provider>
}

/** Use status.entitlement for display only; server routes enforce access. */
export function useSubscription() { return useContext(SubscriptionContext) }

/** Call only after the lesson save succeeds, never on click or optimistic state. */
export function useLessonCompletionOffer() { return useSubscription().notifyLessonSaved }

function Benefits({ t }) {
  return <ul className={styles.benefits}>{t.benefits.map(text =>
    <li key={text}><Check size={17} aria-hidden="true"/><span>{text}</span></li>)}</ul>
}

function Price({ t, status }) {
  return <><p className={styles.price}>{t.price}</p>
    {status?.sandbox && <p className={styles.testMode}>{t.sandbox}</p>}</>
}

function CheckoutAction({ t }) {
  const { status, phase, busy, startCheckout } = useSubscription()
  return <div className={styles.purchase}>
    <p className={styles.fine}>{t.terms}</p>
    {!canStartCheckout(status, phase) && <p className={styles.notice}>{t.unavailable}</p>}
    <button type="button" className={'hh-primary ' + styles.primary}
      disabled={Boolean(busy) || !canStartCheckout(status, phase)} onClick={startCheckout}>
      {busy === 'checkout' ? t.working : t.subscribe}
    </button>
  </div>
}

/** Nonmodal offer: no backdrop, scroll lock, focus trap, or requirement to buy.
 * Escape dismisses while focus is within the offer. Course controls remain usable.
 */
export function SubscriptionOffer() {
  const { locale, status, phase, offerKey, dismissOffer, error } = useSubscription()
  const t = SUBSCRIPTION_COPY[locale], titleId = useId()
  const previousFocus = useRef(null), panelRef = useRef(null)
  useEffect(() => {
    if (offerKey) {
      if (!panelRef.current?.contains(document.activeElement)) previousFocus.current = document.activeElement
      if (offerKey === 'manual') panelRef.current?.focus()
    }
  }, [offerKey])
  const dismiss = () => {
    const focusedInside = panelRef.current?.contains(document.activeElement)
    dismissOffer()
    if (focusedInside && previousFocus.current?.isConnected) previousFocus.current.focus?.()
  }
  if (!offerKey || !canShowHousePromotion(status, phase)) return null
  return <aside ref={panelRef} tabIndex={-1} className={styles.offer} role="region" aria-labelledby={titleId}
    data-subscription-offer="true" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() }
    }}>
    <div className={styles.offerHeader}>
      <p className={styles.kicker}><Sparkles size={16} aria-hidden="true"/>{t.name}</p>
      <button type="button" className={styles.close} aria-label={t.close} onClick={dismiss}><X size={19} aria-hidden="true"/></button>
    </div>
    <h2 id={titleId}>{offerKey === 'manual' ? t.title : t.offerTitle}</h2>
    <p key={offerKey} role="status" className={styles.srOnly}>{offerKey === 'manual' ? t.title : t.offerTitle}</p>
    <p className={styles.fine}>{t.free}</p>
    <Price t={t} status={status}/><Benefits t={t}/>
    <details className={styles.details}><summary>{t.showDetails}</summary>
      <p className={styles.fine}>{t.retest}</p><p className={styles.fine}>{t.safety}</p>
    </details>
    <CheckoutAction t={t}/>
    {error && <p role="alert" className={styles.error}>{t.actionError}</p>}
    <button type="button" className={styles.secondary} onClick={dismiss}>{t.dismiss}</button>
  </aside>
}

function paidDate(status, locale) {
  const value = status?.entitlement.paidThrough || status?.subscription?.periodEnd
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value)) : null
}

/** Mount in authenticated account settings; cancellation has a separate confirm. */
export function SubscriptionSettings() {
  const { locale, status, phase, busy, error, cancelRenewal, openPortal, refresh } = useSubscription()
  const t = SUBSCRIPTION_COPY[locale], headingId = useId(), confirmId = useId()
  const [confirming, setConfirming] = useState(false), [cancelled, setCancelled] = useState(false)
  const cancelRef = useRef(null), keepRef = useRef(null)
  useEffect(() => { if (confirming) keepRef.current?.focus() }, [confirming])
  const closeConfirm = () => { setConfirming(false); cancelRef.current?.focus() }
  const date = paidDate(status, locale)
  const subscription = status?.subscription
  const manageable = phase === 'ready' && status?.available && subscription && status.provider === 'stripe'
  const cancellable = manageable && !subscription.cancelAtPeriodEnd && !['canceled', 'incomplete_expired'].includes(subscription.status)
  return <section className={'hh-panel ' + styles.settings} aria-labelledby={headingId} data-subscription-settings="true">
    <p className={styles.kicker}><ShieldCheck size={17} aria-hidden="true"/>Holistic House</p>
    <h2 id={headingId}>{t.settings}</h2>
    {phase === 'loading' ? <p role="status">{t.loading}</p> : phase !== 'ready' ?
      <><p role="status">{t.statusError}</p><button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={refresh}>{t.retry}</button></> : <>
      <p className={styles.status} role="status">{status.entitlement.active ? t.active : t.basic}</p>
      <Price t={t} status={status}/>
      {status.entitlement.active && <p>{t.adFree}</p>}
      {subscription?.cancelAtPeriodEnd ? <p>{date ? t.renewalEnds + ' ' + date + '.' : t.scheduled}</p> :
        date && status.entitlement.active ? <p>{t.paidThrough} {date}.</p> : null}
      {subscription?.status === 'canceled' && !status.entitlement.active && <p>{t.canceledState}</p>}
      {subscription && !['active', 'trialing', 'canceled'].includes(subscription.status) && <p className={styles.notice}>{t.attention}</p>}
      <p className={styles.fine}>{t.free}</p>
      {!status.entitlement.active && <><Benefits t={t}/><p className={styles.fine}>{t.retest}</p><p className={styles.fine}>{t.safety}</p>
        {(!subscription || ['canceled', 'incomplete_expired'].includes(subscription.status)) && <CheckoutAction t={t}/>}</>}
      {status.entitlement.active && !status.available && <p className={styles.notice}>{t.unavailable}</p>}
      <div className={styles.actions}>
        {manageable && <button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={openPortal}>{busy === 'portal' ? t.working : t.manage}</button>}
        {cancellable && <button ref={cancelRef} type="button" className={styles.secondary} disabled={Boolean(busy)}
          aria-expanded={confirming} aria-controls={confirmId} onClick={() => { setConfirming(true); setCancelled(false) }}>{t.cancel}</button>}
        <button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={refresh}>{busy === 'refresh' ? t.working : t.refresh}</button>
      </div>
      {confirming && cancellable && <div id={confirmId} className={styles.confirm} role="group" aria-label={t.confirmTitle}
        onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); closeConfirm() } }}>
        <h3>{t.confirmTitle}</h3><p>{t.confirmText}</p>
        {date && <p>{t.paidThrough} {date}.</p>}
        <div className={styles.actions}>
          <button ref={keepRef} type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={closeConfirm}>{t.keep}</button>
          <button type="button" className={styles.cancelConfirm} disabled={Boolean(busy)} onClick={async () => {
            if (await cancelRenewal()) { setConfirming(false); setCancelled(true) }
          }}>{busy === 'cancel' ? t.working : t.confirmCancel}</button>
        </div>
      </div>}
      <p className={styles.fine}>{t.pending}</p>
    </>}
    {cancelled && <p role="status">{t.cancelled}</p>}
    {error && <p role="alert" className={styles.error}>{t.actionError}</p>}
  </section>
}

/** Optional first-party promo, with no personalization, pixels, or external links. */
export function SubscriptionHousePromo() {
  const { locale, status, phase, showOffer } = useSubscription()
  const t = SUBSCRIPTION_COPY[locale], [dismissed, setDismissed] = useState(false), headingId = useId()
  if (dismissed || !canShowHousePromotion(status, phase)) return null
  return <aside className={styles.promo} aria-labelledby={headingId} data-house-promotion="true">
    <div className={styles.offerHeader}><p className={styles.kicker}>{t.promoLabel}</p>
      <button type="button" className={styles.close} aria-label={t.close} onClick={() => setDismissed(true)}><X size={18} aria-hidden="true"/></button></div>
    <h3 id={headingId}>{t.promoTitle}</h3><p>{t.promoText}</p><Price t={t} status={status}/>
    <button type="button" className={styles.secondary} onClick={showOffer}>{t.showDetails}</button>
    <p className={styles.fine}>{t.privacy}</p>
  </aside>
}
