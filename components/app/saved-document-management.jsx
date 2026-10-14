'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { appFetch } from '@/lib/app/client-fetch'

// A secondary, deliberate action; never interrupts first-screen report reading.
export function SavedDocumentManagement({ id, locale }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const ru = locale === 'ru'

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await appFetch('documents/' + encodeURIComponent(id) + '/remove', {})
      router.replace('/' + locale + '/app/portrait#personal-reports')
    } catch {
      setError(ru ? 'Не удалось убрать документ. Повторите попытку.' : 'Could not remove the document. Please retry.')
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={remove}>
        {busy ? (ru ? 'Удаляем…' : 'Removing…') : (ru ? 'Убрать из моего кабинета' : 'Remove from my Cabinet')}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
