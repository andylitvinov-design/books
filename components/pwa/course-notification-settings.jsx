'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { detectPushCapability, endpointFingerprint, requestPushPermission, registerDevicePush } from '../../lib/notifications/browser'
import { defaultNotificationPreferences, validateNotificationPreferences, NOTIFICATION_CONSENT_VERSION } from '../../lib/notifications/contracts'
import { NOTIFICATION_COPY } from './notification-copy'
import styles from './course-notification-settings.module.css'

export default function CourseNotificationSettings({ locale = 'en', accountId }) {
  const words = NOTIFICATION_COPY[locale] || NOTIFICATION_COPY.en, id = useId()
  const [capability, setCapability] = useState(null), [settings, setSettings] = useState(null), [preferences, setPreferences] = useState(defaultNotificationPreferences())
  const [workerReady, setWorkerReady] = useState(false)
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [installPrompt, setInstallPrompt] = useState(null)
  const active = useRef(null), working = useRef(false), registration = useRef(null)
  async function api(method = 'GET', body, fingerprint, signal) {
    const response = await fetch(`/api/app/notifications${fingerprint ? `?device=${fingerprint}` : ''}`, { method, credentials: 'same-origin', cache: 'no-store', signal, headers: { 'X-HH-Account-Id': accountId, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const result = await response.json()
    if (!response.ok || result.error) throw new Error(result.error || 'NOTIFICATIONS_UNAVAILABLE')
    return result
  }
  useEffect(() => {
    if (!accountId) return
    const controller = new AbortController(), session = { accountId, controller }
    active.current = session
    working.current = false
    setBusy(false); setConsent(false); setMessage(''); setSettings(null); setWorkerReady(false)
    setCapability(detectPushCapability())
    const receiveInstall = event => { event.preventDefault(); setInstallPrompt(event) }
    const installed = () => { setInstallPrompt(null); setCapability(detectPushCapability()) }
    window.addEventListener('beforeinstallprompt', receiveInstall)
    window.addEventListener('appinstalled', installed)
    async function load() {
      let fingerprint
      if (window.isSecureContext && 'serviceWorker' in navigator) {
        try {
          registration.current = await navigator.serviceWorker.register('/sw.js')
          const subscription = await registration.current.pushManager?.getSubscription()
          if (subscription) fingerprint = await endpointFingerprint(subscription.endpoint)
          navigator.serviceWorker.ready.then(ready => { if (active.current === session) { registration.current = ready; setWorkerReady(true) } })
        } catch { registration.current = null }
      }
      const value = await api('GET', undefined, fingerprint, controller.signal)
      if (active.current !== session) return
      setSettings(value)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      setPreferences(value.preferencesStored ? value.preferences : { ...value.preferences, timezone, locale: NOTIFICATION_COPY[locale] ? locale : 'en' })
    }
    load().catch(error => { if (!controller.signal.aborted) setMessage(error.message === 'REMINDER_WITHIN_QUIET_HOURS' ? words.quietError : words.issue) })
    return () => { controller.abort(); if (active.current === session) active.current = null; window.removeEventListener('beforeinstallprompt', receiveInstall); window.removeEventListener('appinstalled', installed) }
    // Account/locale changes create a fresh state; no settings cross accounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, locale])
  async function action(task) {
    if (working.current || !active.current) return
    const session = active.current
    working.current = true; setBusy(true); setMessage('')
    try { await task(session) } catch (error) { if (active.current === session) setMessage(error.message === 'REMINDER_WITHIN_QUIET_HOURS' ? words.quietError : words.issue) }
    finally { if (active.current === session) { working.current = false; setBusy(false); setCapability(detectPushCapability()) } }
  }
  function enable() {
    if (!consent || !settings?.available || !workerReady || working.current) return
    let patch
    try { patch = { ...validateNotificationPreferences(preferences) }; delete patch.enabled }
    catch (error) { setMessage(error.message === 'REMINDER_WITHIN_QUIET_HOURS' ? words.quietError : words.issue); return }
    // Keep the permission call in the original trusted click, before any await.
    const permission = requestPushPermission().catch(() => 'denied')
    action(async session => {
      if (await permission !== 'granted' || active.current !== session) { if (active.current === session) setMessage(words.off); return }
      let device
      try {
        await api('PATCH', patch, undefined, session.controller.signal)
        if (active.current !== session) return
        const ready = registration.current
        if (!ready?.active) throw new Error('PUSH_UNAVAILABLE')
        if (active.current !== session) return
        device = await registerDevicePush(settings.publicKey, ready)
        if (active.current !== session) { if (device.created) await device.subscription.unsubscribe(); return }
        await api('POST', { subscription: device.subscription.toJSON(), consentVersion: NOTIFICATION_CONSENT_VERSION }, undefined, session.controller.signal)
        if (active.current !== session) return
        setSettings(value => ({ ...value, currentDevice: true, deviceCount: Math.max(1, value.deviceCount) }))
        setPreferences(value => ({ ...value, enabled: true })); setMessage(words.enabled)
      } catch (error) {
        // New browser subscriptions are rolled back if the server rejects storage.
        // A timeout may have committed: never assert server unsubscribe succeeded.
        if (device?.created) await device.subscription.unsubscribe().catch(() => false)
        throw error
      }
    })
  }
  function disable(scope) {
    action(async session => {
      const subscription = await registration.current?.pushManager?.getSubscription()
      const fingerprint = subscription ? await endpointFingerprint(subscription.endpoint) : null
      if (active.current !== session) return
      if (scope === 'device' && !fingerprint) throw new Error('PUSH_DEVICE_UNKNOWN')
      await api('DELETE', { scope, ...(fingerprint ? { fingerprint } : {}) }, undefined, session.controller.signal)
      const removed = subscription ? await subscription.unsubscribe() : true
      if (active.current !== session) return
      setSettings(value => ({ ...value, currentDevice: false, deviceCount: scope === 'all' ? 0 : Math.max(0, value.deviceCount - 1) }))
      if (scope === 'all') setPreferences(value => ({ ...value, enabled: false }))
      setConsent(false); setMessage(removed ? words.off : words.partial)
    })
  }
  function save(event) {
    event.preventDefault()
    action(async session => {
      const value = validateNotificationPreferences(preferences)
      const patch = { ...value }; delete patch.enabled
      const result = await api('PATCH', patch, undefined, session.controller.signal)
      if (active.current === session) { setPreferences(result.preferences); setMessage(words.saved) }
    })
  }
  if (!accountId) return null
  return <section className={styles.card} aria-labelledby={`${id}-title`} lang={NOTIFICATION_COPY[locale] ? locale : 'en'}>
    <h2 id={`${id}-title`}>{words.title}</h2><p>{words.intro}</p>
    <p>{capability?.ios ? words.ios : words.android}</p>
    {installPrompt && <button type="button" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null) }}>{words.install}</button>}
    {!settings && !message && <p>{words.loading}</p>}
    {settings && !settings.available && <p>{words.unavailable}</p>}
    {settings?.available && !settings.deliveryEnabled && <p>{words.deliveryOff}</p>}
    {capability && !capability.supported && !capability.needsInstall && <p>{words.unsupported}</p>}
    {capability?.permission === 'denied' && <p>{words.denied}</p>}
    {settings?.available && capability?.supported && !settings.currentDevice && capability.permission !== 'denied' && <>
      <label className={styles.choice}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />{words.consent}</label>
      <button type="button" onClick={enable} disabled={!consent || !workerReady || busy}>{words.enable}</button>
    </>}
    {settings?.currentDevice && <><p>{words.enabled}</p><button type="button" onClick={() => disable('device')} disabled={busy}>{words.disable}</button></>}
    {settings?.deviceCount > 0 && <button type="button" onClick={() => disable('all')} disabled={busy}>{words.allOff}</button>}
    {settings?.available && <form onSubmit={save}>
      <fieldset disabled={busy} className={styles.fields}><legend>{words.dailyAt}</legend>
        <label htmlFor={`${id}-time`}>{words.dailyAt}</label><input id={`${id}-time`} type="time" required value={preferences.dailyAt} onChange={event => setPreferences(value => ({ ...value, dailyAt: event.target.value }))} />
        <label htmlFor={`${id}-zone`}>{words.timezone}</label><input id={`${id}-zone`} aria-describedby={`${id}-zone-hint`} maxLength={100} required value={preferences.timezone} onChange={event => setPreferences(value => ({ ...value, timezone: event.target.value }))} /><small id={`${id}-zone-hint`}>{words.timezoneHint}</small>
        <label className={styles.choice}><input type="checkbox" checked={preferences.quietHoursEnabled} onChange={event => setPreferences(value => ({ ...value, quietHoursEnabled: event.target.checked }))} />{words.quiet}</label>
        {preferences.quietHoursEnabled && <><label htmlFor={`${id}-start`}>{words.quietStart}</label><input id={`${id}-start`} type="time" required value={preferences.quietStart} onChange={event => setPreferences(value => ({ ...value, quietStart: event.target.value }))} /><label htmlFor={`${id}-end`}>{words.quietEnd}</label><input id={`${id}-end`} type="time" required value={preferences.quietEnd} onChange={event => setPreferences(value => ({ ...value, quietEnd: event.target.value }))} /></>}
        <button type="submit">{busy ? words.busy : words.save}</button>
      </fieldset>
    </form>}
    <p>{words.subscribedOnly}</p><small>{words.privacy}</small><p role="status" aria-live="polite">{message}</p>
  </section>
}
