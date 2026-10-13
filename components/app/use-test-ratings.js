'use client'
import { useEffect, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
export function useTestRatings() {
  const [data, setData] = useState({ summaries: {}, loading: true, unavailable: false })
  useEffect(() => {
    let live = true, generation = 0
    async function refresh() {
      const current = ++generation
      try {
        const response = await appFetch('test-ratings')
        if (live && current === generation) setData({ summaries: response.summaries, loading: false, unavailable: false })
      } catch {
        if (live && current === generation) setData({ summaries: {}, loading: false, unavailable: true })
      }
    }
    refresh()
    window.addEventListener('hh-test-ratings-updated', refresh)
    return () => { live = false; window.removeEventListener('hh-test-ratings-updated', refresh) }
  }, [])
  return data
}
