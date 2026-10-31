'use client'
import { useEffect } from 'react'

// A valid referral is claimed after account activation, regardless of which
// cabinet tab the new member opens. This changes no wallet balances in JS.
export default function XpAccountSync({accountId}) {
  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    const marker = 'hh-xp-sync-v1:' + accountId
    try { if (sessionStorage.getItem(marker)) return } catch { /* private browsing */ }
    void (async () => {
      const response = await fetch('/api/app/xp/catalog', {
        credentials:'same-origin', cache:'no-store',
      })
      if (!response.ok || !(await response.json()).enabled) return
      const sync = await fetch('/api/app/xp/sync', {
        method:'POST', credentials:'same-origin', cache:'no-store',
        headers:{'Content-Type':'application/json','x-hh-account-id':accountId},
        body:'{}',
      })
      if (!sync.ok) return
      const data = await sync.json()
      // A newly signed-up user may verify email later in the same session.
      // Preserve the invite cookie and retry on their next cabinet visit.
      if (data?.referral?.reason === 'email-unverified' || cancelled) return
      try { sessionStorage.setItem(marker,'1') } catch { /* browser setting only */ }
    })().catch(() => { /* retry on next authenticated cabinet visit */ })
    return () => { cancelled = true }
  }, [accountId])
  return null
}
