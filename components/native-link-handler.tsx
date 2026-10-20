'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { classifyNativeLink, classifyHolisticHouseNativeLink, classifyHolisticHouseNativeAuth } from '@/lib/native/deep-link-policy'
import { isNativePsiAlchemy, isNativeHolisticHouse } from '@/lib/native/client'

export function NativeLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePsiAlchemy()) return
    let listener: { remove: () => Promise<void> } | undefined
    let active = true
    const handled = new Set<string>()
    function navigate(url: string) {
      if (!active || handled.has(url)) return
      handled.add(url)
      if (isNativeHolisticHouse()) {
        const callback = classifyHolisticHouseNativeAuth(url)
        if (callback.kind === 'hh-auth' && callback.path) {
          // A one-time code returns to the WebView with its existing PKCE
          // verifier cookie. The HTTPS server performs the actual exchange.
          void import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => {})
          window.location.assign(callback.path)
          return
        }
        const link = classifyHolisticHouseNativeLink(url)
        if (link.kind === 'hh-consultation' && link.path) router.push(link.path)
        return
      }
      const publicLink = classifyNativeLink(url)
      if (publicLink.kind === 'public-remedy' && publicLink.path) router.push(publicLink.path)
      // PsiAlchemy private prescriptions remain native-blocked.
    }
    void import('@capacitor/app').then(async ({ App }) => {
      const next = await App.addListener('appUrlOpen', ({ url }) => navigate(url))
      if (!active) { await next.remove(); return }
      listener = next
      // A cold start from a link can precede JavaScript listener registration.
      const initial = await App.getLaunchUrl()
      if (initial?.url) navigate(initial.url)
    }).catch(() => {})
    return () => { active = false; void listener?.remove() }
  }, [router])

  return null
}
