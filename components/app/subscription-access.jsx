'use client'

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { Check, ShieldCheck, Sparkles, X } from 'lucide-react'
import { canShowHousePromotion, canStartCheckout, EMPTY_LESSON_OFFERS, lessonCompletionKey, lessonOfferReducer, normalizeBillingStatus, PAID_PLAN_KEYS, SUBSCRIPTION_PLANS } from '@/lib/billing/public-plan'
import { requestBilling, requestBillingStatus, verifiedBillingRedirect } from '@/lib/billing/client-session'
import { billingReadLifecycle } from '@/lib/billing/read-lifecycle'
import { SUBSCRIPTION_COPY } from './subscription-copy'
import styles from './subscription-access.module.css'

const noAction = () => {}
const SubscriptionContext = createContext({
  locale: 'en', status: null, phase: 'unavailable', busy: '', error: '', offerKey: null,
  offerAfterCompletion: noAction, notifyLessonSaved: noAction, dismissOffer: noAction,
  showOffer: noAction, startCheckout: noAction, cancelRenewal: noAction,
  openPortal: noAction, requestSession: noAction, refresh: noAction,
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
  const statusController = useRef(null), reconciledReturn = useRef(null)
  currentAccount.current = accountId
  const lang = locale === 'ru' ? 'ru' : 'en'
  const readLifecycle = typeof window === 'undefined' ? null : billingReadLifecycle(window, document)

  const loadStatus = useCallback(async ({ reconcile = false } = {}) => {
    if (!mounted.current || currentAccount.current !== accountId || !readLifecycle?.canRead()) return false
    const version = ++requestVersion.current
    statusController.current?.abort()
    if (!accountId) {
      setStatus(null); setPhase('unavailable')
      return false
    }
    const controller = new AbortController()
    statusController.current = controller
    try {
      if (reconcile) await requestBilling(accountId, 'reconcile', {})
      if (!mounted.current || currentAccount.current !== accountId || requestVersion.current !== version || controller.signal.aborted) return false
      const next = normalizeBillingStatus(await requestBillingStatus(accountId, { signal: controller.signal }))
      if (!mounted.current || currentAccount.current !== accountId || requestVersion.current !== version || controller.signal.aborted) return false
      setStatus(next); setPhase('ready')
      if (next.entitlement.active || next.entitlement.adFree) {
        dispatch({ type: 'suppress' }); setManualOffer(false)
      }
      return next
    } catch {
      if (mounted.current && currentAccount.current === accountId && requestVersion.current === version) setPhase('error')
      return false
    } finally { if (statusController.current === controller) statusController.current = null }
  }, [accountId, readLifecycle])

  useEffect(() => {
    mounted.current = true; lifecycle.current += 1
    inFlight.current = false; setBusy('')
    setStatus(null); setPhase('loading'); setManualOffer(false)
    dispatch({ type: 'reset' }); operationIds.current = {}
    const returned = new URLSearchParams(window.location.search).get('billing')
    const isReturn = returned === 'success' || returned === 'returned'
    const returnKey = JSON.stringify([accountId, returned])
    const reconcileReturn = isReturn && reconciledReturn.current !== returnKey
    const pollDeadline = Date.now() + 60000
    let pollTimer, stopped = false, paused = false
    // Reconcile once on return. Later attempts are bounded, cancellable status
    // reads only: an uncertain checkout or mutation is never retried here.
    const scheduleRead = next => {
      clearTimeout(pollTimer)
      if (!isReturn || stopped || currentAccount.current !== accountId || paused || !readLifecycle?.canRead() || document.visibilityState === 'hidden' || Date.now() >= pollDeadline ||
          (returned === 'success' && next?.entitlement?.active)) return
      pollTimer = setTimeout(async () => {
        if (stopped || Date.now() >= pollDeadline) return
        scheduleRead(await loadStatus())
      }, 2000)
    }
    const read = () => {
      if (stopped || currentAccount.current !== accountId || !readLifecycle?.canRead()) return
      const reconcile = reconcileReturn && reconciledReturn.current !== returnKey
      if (reconcile) reconciledReturn.current = returnKey
      void loadStatus({ reconcile }).then(scheduleRead)
    }
    const stopStatus = () => {
      paused = true; requestVersion.current += 1; statusController.current?.abort(); clearTimeout(pollTimer)
    }
    const recheck = allowed => {
      if (!allowed) stopStatus()
      else { paused = false; clearTimeout(pollTimer); read() }
    }
    const unsubscribe = readLifecycle?.subscribe(recheck)
    read()
    return () => {
      stopped = true; clearTimeout(pollTimer)
      mounted.current = false; lifecycle.current += 1; requestVersion.current += 1
      statusController.current?.abort()
      unsubscribe?.()
    }
  }, [loadStatus, accountId, readLifecycle])

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
  const runAction = useCallback(async (action, run, planId) => {
    if (inFlight.current || !accountId) return false
    inFlight.current = true; setBusy(action); setError('')
    const generation = lifecycle.current
    const isCurrent = () => mounted.current && lifecycle.current === generation && currentAccount.current === accountId
    try { await run(isCurrent); return isCurrent() } catch (failure) {
      if (isCurrent()) {
        if (['BILLING_OPERATION_CLOSED', 'BILLING_CHECKOUT_FINISHED'].includes(failure.code) && planId) delete operationIds.current.checkout?.[planId]
        if (failure.code === 'ACCOUNT_CHANGED') { setStatus(null); setPhase('error') }
        setError(['BILLING_CHECKOUT_PLAN_CONFLICT', 'BILLING_PLAN_CONFLICT'].includes(failure.code) ? 'checkoutConflict' : 'action')
      }
      return false
    } finally {
      if (isCurrent()) { inFlight.current = false; setBusy('') }
    }
  }, [accountId])
  const startCheckout = useCallback((planId) => {
    if (!PAID_PLAN_KEYS.includes(planId) || !canStartCheckout(status, phase, planId)) return Promise.resolve(false)
    return runAction('checkout', async isCurrent => {
      operationIds.current.checkout ||= {}
      operationIds.current.checkout[planId] ||= crypto.randomUUID()
      const result = await requestBilling(accountId, 'checkout', { operationId: operationIds.current.checkout[planId], locale: lang, planId })
      const url = await verifiedBillingRedirect({ accountId, value: result.redirectUrl, kind: 'checkout', isCurrent })
      if (url && isCurrent()) window.location.assign(url)
    }, planId)
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
  const requestSession = useCallback(() => {
    const benefit = status?.sessionBenefit
    if (phase !== 'ready' || !status?.available || status.entitlement.tier !== 'premium' || benefit?.status !== 'available') return Promise.resolve(false)
    return runAction('sessionRequest', async isCurrent => {
      operationIds.current.sessions ||= {}
      operationIds.current.sessions[benefit.periodEnd] ||= crypto.randomUUID()
      await requestBilling(accountId, 'sessionRequest', {
        operationId: operationIds.current.sessions[benefit.periodEnd], periodEnd: benefit.periodEnd, confirmed: true,
      })
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
    startCheckout, cancelRenewal, openPortal, requestSession, refresh,
  }), [lang, status, phase, busy, error, offers.pending, manualOffer, offerAfterCompletion,
    notifyLessonSaved, dismissOffer, startCheckout, cancelRenewal, openPortal, requestSession, refresh])
  return <SubscriptionContext.Provider value={value}>
    {children}
    <SubscriptionOffer />
  </SubscriptionContext.Provider>
}

/** Use status.entitlement for display only; server routes enforce access. */
export function useSubscription() { return useContext(SubscriptionContext) }

/** Call only after the lesson save succeeds, never on click or optimistic state. */
export function useLessonCompletionOffer() { return useSubscription().notifyLessonSaved }

function Benefits({ t, planId }) {
  return <ul className={styles.benefits}>{t.plans[planId].benefits.map(text =>
    <li key={text}><Check size={17} aria-hidden="true"/><span>{text}</span></li>)}</ul>
}

function Price({ t, status, planId }) {
  return <><p className={styles.price}>{t.plans[planId].price}</p>
    {status?.sandbox && <p className={styles.testMode}>{t.sandbox}</p>}</>
}

function CheckoutAction({ t, planId }) {
  const { status, phase, busy, startCheckout } = useSubscription()
  if (planId === 'free') return <p className={styles.fine} role="status">{t.freeSelected}</p>
  return <div className={styles.purchase}>
    <p className={styles.selectedPrice} aria-live="polite">{t.plans[planId].name}: {t.plans[planId].price}</p>
    <p className={styles.fine}>{t.terms}</p>
    {!canStartCheckout(status, phase, planId) && <p className={styles.notice}>{t.planUnavailable}</p>}
    <button type="button" className={'hh-primary ' + styles.primary}
      disabled={Boolean(busy) || !canStartCheckout(status, phase, planId)} onClick={() => startCheckout(planId)}>
      {busy === 'checkout' ? t.working : t.subscribe + ' · ' + t.plans[planId].name}
    </button>
  </div>
}

function PlanSelection({ t }) {
  const { status, busy } = useSubscription()
  const [planId, setPlanId] = useState('start')
  const groupId = useId(), historyId = useId()
  return <div className={styles.planSelection}>
    <fieldset className={styles.planFieldset} disabled={Boolean(busy)} aria-describedby={historyId}>
      <legend>{t.choosePlan}</legend>
      <div className={styles.planGrid}>{Object.keys(SUBSCRIPTION_PLANS).map(key => {
        const plan = t.plans[key], descriptionId = groupId + '-' + key
        return <label key={key} className={styles.planCard} data-selected={planId === key}>
          <span className={styles.planHeading}>
            <input type="radio" name={groupId} value={key} checked={planId === key}
              aria-labelledby={descriptionId + '-name ' + descriptionId + '-price'} aria-describedby={descriptionId} onChange={() => setPlanId(key)}/>
            <span id={descriptionId + '-name'} className={styles.planName}>{plan.name}</span>
            <span id={descriptionId + '-price'} className={styles.planPrice}>{plan.price}</span>
          </span>
          <span id={descriptionId} className={styles.planDescription}>
            {plan.benefits.map(benefit => <span key={benefit}>{benefit}</span>)}
            {key === 'premium' && <span>{t.scheduling}</span>}
          </span>
        </label>
      })}</div>
    </fieldset>
    <p id={historyId} className={styles.fine}>{t.history}</p>
    {status?.sandbox && <p className={styles.testMode}>{t.sandbox}</p>}
    <CheckoutAction t={t} planId={planId}/>
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
    <PlanSelection t={t}/>
    <details className={styles.details}><summary>{t.showDetails}</summary>
      <p className={styles.fine}>{t.retest}</p><p className={styles.fine}>{t.safety}</p>
    </details>
    {error && <p role="alert" className={styles.error}>{error === 'checkoutConflict' ? t.checkoutConflict : t.actionError}</p>}
    <button type="button" className={styles.secondary} onClick={dismiss}>{t.dismiss}</button>
  </aside>
}

function paidDate(status, locale) {
  const value = status?.entitlement.paidThrough || status?.subscription?.periodEnd
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value)) : null
}

function SessionBenefit({ t }) {
  const { status, busy, requestSession } = useSubscription()
  const [confirming, setConfirming] = useState(false)
  const confirmId = useId(), requestRef = useRef(null), backRef = useRef(null)
  const benefit = status?.sessionBenefit
  useEffect(() => { if (confirming) backRef.current?.focus() }, [confirming])
  const close = () => { setConfirming(false); requestRef.current?.focus() }
  return <div className={styles.sessionBenefit}>
    <h3>{t.sessionTitle}</h3>
    <p role="status">{benefit ? t.sessionStates[benefit.status] : t.sessionUnavailable}</p>
    <p className={styles.fine}>{t.scheduling}</p>
    {benefit?.status === 'available' && status.available && <button ref={requestRef} type="button" className={styles.secondary}
      disabled={Boolean(busy)} aria-expanded={confirming} aria-controls={confirmId} onClick={() => setConfirming(true)}>{t.requestSession}</button>}
    {confirming && benefit?.status === 'available' && <div id={confirmId} className={styles.confirm} role="group" aria-label={t.sessionConfirmTitle}
      onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); close() } }}>
      <p>{t.sessionConfirmText}</p>
      <div className={styles.actions}>
        <button ref={backRef} type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={close}>{t.sessionBack}</button>
        <button type="button" className={styles.primary} disabled={Boolean(busy)} onClick={async () => {
          if (await requestSession()) setConfirming(false)
        }}>{busy === 'sessionRequest' ? t.working : t.sessionConfirm}</button>
      </div>
    </div>}
  </div>
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
  const planId = status?.entitlement.tier || 'free'
  const manageable = phase === 'ready' && status?.available && subscription && status.provider === 'stripe'
  const cancellable = manageable && !subscription.cancelAtPeriodEnd && !['canceled', 'incomplete_expired'].includes(subscription.status)
  return <section className={'hh-panel ' + styles.settings} aria-labelledby={headingId} data-subscription-settings="true">
    <p className={styles.kicker}><ShieldCheck size={17} aria-hidden="true"/>Holistic House</p>
    <h2 id={headingId}>{t.settings}</h2>
    {phase === 'loading' ? <p role="status">{t.loading}</p> : phase !== 'ready' ?
      <><p role="status">{t.statusError}</p><button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={refresh}>{t.retry}</button></> : <>
      <p className={styles.status} role="status">{status.entitlement.active ? t.plans[planId].name + ' ' + t.active : t.basic}</p>
      <Price t={t} status={status} planId={planId}/>
      <Benefits t={t} planId={planId}/>
      <p className={styles.fine}>{t.history}</p>
      {status.entitlement.adFree && <p>{t.adFree}</p>}
      {status.entitlement.monthlySessions > 0 && <SessionBenefit key={status.sessionBenefit?.periodEnd || status.entitlement.paidThrough} t={t}/>}
      {subscription?.cancelAtPeriodEnd ? <p>{date ? t.renewalEnds + ' ' + date + '.' : t.scheduled}</p> :
        date && status.entitlement.active ? <p>{t.paidThrough} {date}.</p> : null}
      {subscription?.status === 'canceled' && !status.entitlement.active && <p>{t.canceledState}</p>}
      {subscription && !['active', 'trialing', 'canceled'].includes(subscription.status) && <p className={styles.notice}>{t.attention}</p>}
      <p className={styles.fine}>{t.free}</p>
      <p className={styles.fine}>{t.retest}</p><p className={styles.fine}>{t.safety}</p>
      {!status.entitlement.active && (!subscription || ['canceled', 'incomplete_expired'].includes(subscription.status)) && <PlanSelection t={t}/>}
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
    {error && <p role="alert" className={styles.error}>{error === 'checkoutConflict' ? t.checkoutConflict : t.actionError}</p>}
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
    <h3 id={headingId}>{t.promoTitle}</h3><p>{t.promoText}</p><p className={styles.fine}>{t.pricesSummary}</p>
    <button type="button" className={styles.secondary} onClick={showOffer}>{t.showDetails}</button>
    <p className={styles.fine}>{t.privacy}</p>
  </aside>
}
