'use client'

import { useEffect, useState } from 'react'

import { readNativeSavedRemedies, sharePublicRemedyUrl, writeNativeSavedRemedies } from '@/lib/native/client'
import { readPublicReadingState, writePublicReadingState } from '@/lib/public-reading-state'

export function RemedyClientActions({ locale, slug, knownSlugs }: { locale: 'ru' | 'en'; slug: string; knownSlugs: string[] }) {
  const [saved, setSaved] = useState(false)
  const label = locale === 'ru' ? (saved ? 'Сохранено' : 'Сохранить') : (saved ? 'Saved' : 'Save')
  useEffect(() => {
    void readNativeSavedRemedies().then((savedSlugs) => setSaved(savedSlugs.includes(slug)))
  }, [slug])
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
