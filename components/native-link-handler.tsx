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
    let pushListener: { remove: () => Promise<void> } | undefined
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
    if (isNativeHolisticHouse()) {
      void import('@capacitor/core').then(async ({ registerPlugin }) => {
        const PushNotifications = registerPlugin<{
          addListener:(event:string,callback:(value:{notification?:{data?:{kind?:string,requestId?:string,locale?:string}}})=>void)=>Promise<{remove:()=>Promise<void>}>
        }>('PushNotifications')
        const subscribed = await PushNotifications.addListener(
          'pushNotificationActionPerformed',({notification}) => {
            const data=notification?.data
            if(data?.kind!=='client-message'||typeof data.requestId!=='string')return
            const lang=data.locale==='ru'?'ru':'en'
            const link=classifyHolisticHouseNativeLink(
              'holistichouse://app/consultations?lang='+lang+'&request='+encodeURIComponent(data.requestId))
            if(active&&link.kind==='hh-consultation'&&link.path)router.push(link.path)
          })
        if(!active){await subscribed.remove();return}
        pushListener=subscribed
      }).catch(() => {})
    }
    return () => { active = false; void listener?.remove(); void pushListener?.remove() }
  }, [router])

  return null
}
