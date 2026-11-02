'use client'

import { useEffect } from 'react'
import { capturePwaInstallPrompt, pwaInstalled } from '@/lib/pwa/install-prompt'

export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    // Do this before the user reaches the signed-in Cabinet. Chromium can
    // fire beforeinstallprompt before Google OAuth and onboarding finish.
    const available = (event: Event) => { capturePwaInstallPrompt(event) }
    const completed = () => { pwaInstalled() }
    window.addEventListener('beforeinstallprompt', available)
    window.addEventListener('appinstalled', completed)
    return () => {
      window.removeEventListener('beforeinstallprompt', available)
      window.removeEventListener('appinstalled', completed)
    }
  }, [])
  return null
}
