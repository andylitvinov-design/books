'use client'

import { useState } from 'react'

export function MaterialCopyButton({ url, locale = 'en' }) {
  const [state, setState] = useState('')
  const ru = locale === 'ru'
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState(ru ? 'Ссылка скопирована' : 'Link copied')
    } catch {
      setState(ru ? 'Не удалось скопировать' : 'Could not copy')
    }
  }
  return <span className="master-material-copy">
    <button type="button" onClick={copy} aria-label={ru ? 'Скопировать ссылку на материал' : 'Copy material link'}>
      {ru ? 'Копировать' : 'Copy link'}
    </button>
    {state && <small role="status">{state}</small>}
  </span>
}
