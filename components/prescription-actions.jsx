'use client'

import { useEffect } from 'react'

export function PrescriptionActions({ locale, selector, autoPrint = false, mobilePdf = false }) {
  const labels = locale === 'ru'
    ? { read: 'Читать крупным текстом', download: 'Скачать PDF A4', print: 'Печать', close: 'Закрыть доступ' }
    : { read: 'Read in large type', download: 'Download A4 PDF', print: 'Print', close: 'Close access' }

  useEffect(() => {
    const scrub = () => window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    scrub()
    window.addEventListener('hashchange', scrub)
    if (autoPrint) window.print()
    return () => window.removeEventListener('hashchange', scrub)
  }, [autoPrint])

  const closeAccess = async () => {
    await fetch('/api/prescription-access/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    window.location.replace(`/${locale}/prescriptions/${selector}`)
  }

  return (
    <div className="prescription-actions" aria-label={locale === 'ru' ? 'Действия с документом' : 'Document actions'}>
      {mobilePdf && <a href={`/api/prescriptions/${selector}/pdf?locale=${locale}&preview=1`}>{labels.read}</a>}
      <a href={`/api/prescriptions/${selector}/pdf?locale=${locale}`} download>{labels.download}</a>
      <button type="button" onClick={() => window.print()}>{labels.print}</button>
      <button type="button" onClick={closeAccess}>{labels.close}</button>
    </div>
  )
}
