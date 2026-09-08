'use client'

import { useEffect } from 'react'

export function PrescriptionActions({ locale, publicId, autoPrint = false }) {
  const labels = locale === 'ru'
    ? { download: 'Скачать PDF', print: 'Печать' }
    : { download: 'Download PDF', print: 'Print' }

  useEffect(() => { if (autoPrint) window.print() }, [autoPrint])

  return (
    <div className="prescription-actions" aria-label={locale === 'ru' ? 'Действия с документом' : 'Document actions'}>
      <a href={`/api/prescriptions/${publicId}/pdf?locale=${locale}`} download>{labels.download}</a>
      <button type="button" onClick={() => window.print()}>{labels.print}</button>
    </div>
  )
}
