'use client'

import { useEffect, useState } from 'react'

import { isNativePsiAlchemy, readNativeSavedRemedies, sharePublicRemedyUrl, writeNativeSavedRemedies } from '@/lib/native/client'
import { mergeSavedRemedySlugs, readPublicReadingState, writePublicReadingState } from '@/lib/public-reading-state'

export function RemedyClientActions({ locale, slug, knownSlugs }: { locale: 'ru' | 'en'; slug: string; knownSlugs: string[] }) {
  const [saved, setSaved] = useState(false)
  const label = locale === 'ru' ? (saved ? 'Сохранено' : 'Сохранить') : (saved ? 'Saved' : 'Save')
  useEffect(() => {
    const known = new Set(knownSlugs)
    const browserState = readPublicReadingState(known)
    setSaved(browserState.savedSlugs.includes(slug))
    if (!isNativePsiAlchemy()) return

    let cancelled = false
    void readNativeSavedRemedies().then((nativeSlugs) => {
      if (cancelled) return
      const savedSlugs = mergeSavedRemedySlugs(browserState.savedSlugs, nativeSlugs, known)
      writePublicReadingState({ ...browserState, savedSlugs })
      setSaved(savedSlugs.includes(slug))
    })
    return () => { cancelled = true }
  }, [knownSlugs, slug])
  async function toggle() {
    const state = readPublicReadingState(new Set(knownSlugs))
    const savedSlugs = state.savedSlugs.includes(slug) ? state.savedSlugs.filter((item) => item !== slug) : [...state.savedSlugs, slug]
    writePublicReadingState({ ...state, savedSlugs })
    await writeNativeSavedRemedies(savedSlugs)
    setSaved(savedSlugs.includes(slug))
  }
  async function share() {
    if (await sharePublicRemedyUrl(window.location.href, slug)) return
    if (navigator.share) await navigator.share({ url: window.location.href })
    else await navigator.clipboard?.writeText(window.location.href)
  }
  return <div className="remedy-client-actions"><button onClick={() => void toggle()} type="button">{label}</button><button onClick={() => void share()} type="button">{locale === 'ru' ? 'Поделиться' : 'Share'}</button></div>
}
