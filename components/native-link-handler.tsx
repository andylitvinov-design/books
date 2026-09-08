'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { classifyNativeLink } from '@/lib/native/deep-link-policy'
import { isNativePsiAlchemy } from '@/lib/native/client'

export function NativeLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePsiAlchemy()) return
    let listener: { remove: () => Promise<void> } | undefined
    void import('@capacitor/app').then(({ App }) => App.addListener('appUrlOpen', ({ url }) => {
      const link = classifyNativeLink(url)
      if (link.kind === 'public-remedy' && link.path) router.push(link.path)
      // `private-blocked` is deliberately a no-op: no native prescription URL
      // is retained, opened, or routed before privacy instrumentation exists.
    }).then((nextListener) => { listener = nextListener }))
    return () => { void listener?.remove() }
  }, [router])

  return null
}
