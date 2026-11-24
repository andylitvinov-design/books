'use client'

import { useEffect } from 'react'
import { capturePwaInstallPrompt, pwaInstalled } from '@/lib/pwa/install-prompt'

export function PwaRegistration() {
  useEffect(() => {
    // The critical page/hero should finish downloading before the service
    // worker starts its installation and pre-caches public offline documents.
    // Preserve install prompt listeners immediately: they are not tied to SW.
    const available = (event: Event) => { capturePwaInstallPrompt(event) }
    const completed = () => { pwaInstalled() }
    window.addEventListener('beforeinstallprompt', available)
    window.addEventListener('appinstalled', completed)

    let cancelled = false
    let idleId: number | null = null
    let fallbackId: ReturnType<typeof setTimeout> | null = null
    const register = () => {
      if (cancelled || !('serviceWorker' in navigator)) return
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
    const afterLoad = () => {
      if (cancelled) return
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(register, { timeout: 4000 })
      } else {
        // iOS Safari: wait until load plus a small idle opportunity.
        fallbackId = setTimeout(register, 1200)
      }
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', afterLoad)
      if (idleId !== null && typeof window.cancelIdleCallback === 'function')
        window.cancelIdleCallback(idleId)
      if (fallbackId !== null) clearTimeout(fallbackId)
      window.removeEventListener('beforeinstallprompt', available)
      window.removeEventListener('appinstalled', completed)
    }
  }, [])
  return null
}
