'use client'

import { useState } from 'react'

import { readPublicReadingState, writePublicReadingState } from '@/lib/public-reading-state'

export function RemedyClientActions({ locale, slug, knownSlugs }: { locale: 'ru' | 'en'; slug: string; knownSlugs: string[] }) {
  const [saved, setSaved] = useState(false)
  const label = locale === 'ru' ? (saved ? 'Сохранено' : 'Сохранить') : (saved ? 'Saved' : 'Save')
  function toggle() {
    const state = readPublicReadingState(new Set(knownSlugs))
    const savedSlugs = state.savedSlugs.includes(slug) ? state.savedSlugs.filter((item) => item !== slug) : [...state.savedSlugs, slug]
    writePublicReadingState({ ...state, savedSlugs })
    setSaved((value) => !value)
  }
  async function share() {
    if (navigator.share) await navigator.share({ url: window.location.href })
    else await navigator.clipboard?.writeText(window.location.href)
  }
  return <div className="remedy-client-actions"><button onClick={toggle} type="button">{label}</button><button onClick={() => void share()} type="button">{locale === 'ru' ? 'Поделиться' : 'Share'}</button></div>
}
