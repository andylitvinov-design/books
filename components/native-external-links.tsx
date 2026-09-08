'use client'

import { useEffect } from 'react'

import { classifyNativeLink } from '@/lib/native/deep-link-policy'
import { isNativePsiAlchemy, openExternalNativeUrl } from '@/lib/native/client'

const publicHost = 'codex-public-book-library.vercel.app'

export function NativeExternalLinks() {
  useEffect(() => {
    if (!isNativePsiAlchemy()) return
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      let url: URL
      try { url = new URL(anchor.href) } catch { return }
      if (!/^https?:$/.test(url.protocol)) return
      if (url.host === publicHost) {
        if (classifyNativeLink(url.toString()).kind === 'private-blocked') event.preventDefault()
        return
      }
      event.preventDefault()
      void openExternalNativeUrl(url.toString())
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
