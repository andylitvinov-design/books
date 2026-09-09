'use client'

import { useEffect } from 'react'

export function PrescriptionActions({ locale, selector, autoPrint = false }) {
  const labels = locale === 'ru'
    ? { download: 'Скачать PDF', print: 'Печать', close: 'Закрыть доступ' }
    : { download: 'Download PDF', print: 'Print', close: 'Close access' }

  useEffect(() => { if (autoPrint) window.print() }, [autoPrint])

  const closeAccess = async () => {
    await fetch('/api/prescription-access/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    window.location.replace(`/${locale}/prescriptions/${selector}`)
  }

  return (
    <div className="prescription-actions" aria-label={locale === 'ru' ? 'Действия с документом' : 'Document actions'}>
      <a href={`/api/prescriptions/${selector}/pdf?locale=${locale}`} download>{labels.download}</a>
      <button type="button" onClick={() => window.print()}>{labels.print}</button>
      <button type="button" onClick={closeAccess}>{labels.close}</button>
    </div>
  )
}
