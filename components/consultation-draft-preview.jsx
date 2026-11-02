'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, FileText, Loader2, X } from 'lucide-react'
import { reportPdfFilename } from '@/lib/documents/report-filename'

const translations = {
  ru: {
    report: 'Просмотреть PDF',
    invoice: 'Просмотреть инвойс',
    viewing: 'Подготавливаем PDF…',
    title: 'Предпросмотр документа',
    unsaved: 'Предпросмотр без сохранения и отправки клиенту.',
    newTab: 'Открыть PDF отдельно',
    save: 'Сохранить PDF',
    close: 'Закрыть',
    error: 'Не получилось подготовить предпросмотр. Проверьте данные и попробуйте ещё раз.',
  },
  en: {
    report: 'Preview PDF',
    invoice: 'Preview invoice',
    viewing: 'Preparing PDF…',
    title: 'Document preview',
    unsaved: 'Private preview. No saving, client link or delivery.',
    newTab: 'Open PDF separately',
    save: 'Save PDF',
    close: 'Close',
    error: 'Could not prepare the preview. Check the fields and try again.',
  },
}

export function ConsultationDraftPreview({ locale = 'en', includeRecommendation, includeInvoice, disabled = false, formId }) {
  const labels = translations[locale === 'ru' ? 'ru' : 'en']
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')
  const objectUrlRef = useRef('')

  function closePreview() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    setPreviewUrl('')
    setPreviewFilename('')
  }

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') closePreview()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  async function handlePreview(event, kind) {
    const form = event.currentTarget.form
    if (!form) return
    setError('')
    setLoading(kind)
    try {
      // Use the current unsaved form values, including React-managed remedy rows.
      const formData = new FormData(form)
      const response = await fetch(`/admin/api/consultations/preview?kind=${kind}`, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) {
        const details = await response.json().catch(() => null)
        throw new Error(details?.error || labels.error)
      }
      const blob = await response.blob()
      if (blob.type !== 'application/pdf' || blob.size < 100) throw new Error(labels.error)
      closePreview()
      const filename = kind === 'recommendation'
        ? reportPdfFilename({ dateIssued: formData.get('dateIssued') }, { preview: true })
        : kind === 'payment' ? 'invoice-preview.pdf' : 'preview.pdf'
      const file = new File([blob], filename, { type: 'application/pdf' })
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setPreviewFilename(filename)
      setPreviewUrl(url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.error)
    } finally {
      setLoading('')
    }
  }

  return <>
    <div className="consultation-preview-actions">
      {includeRecommendation && <button type="button" className="consultation-preview-button" form={formId} disabled={disabled || Boolean(loading)}
        onClick={event => handlePreview(event, 'recommendation')}>
        {loading === 'recommendation' ? <Loader2 size={19} aria-hidden="true" className="animate-spin" /> : <Eye size={19} aria-hidden="true" />}
        {loading === 'recommendation' ? labels.viewing : labels.report}
      </button>}
      {includeInvoice && <button type="button" className="consultation-preview-button consultation-preview-button-secondary" form={formId} disabled={disabled || Boolean(loading)}
        onClick={event => handlePreview(event, 'payment')}>
        {loading === 'payment' ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <FileText size={17} aria-hidden="true" />}
        {loading === 'payment' ? labels.viewing : labels.invoice}
      </button>}
      {error && <p className="consultation-preview-error" role="alert">{error}</p>}
    </div>
    {previewUrl && <div className="consultation-preview-overlay" role="dialog" aria-modal="true" aria-label={labels.title}>
      <div className="consultation-preview-modal">
        <div className="consultation-preview-heading">
          <div><strong>{labels.title}</strong><small>{labels.unsaved}</small></div>
          <button type="button" onClick={closePreview} aria-label={labels.close}><X size={22} aria-hidden="true" /></button>
        </div>
        <iframe title={labels.title} src={previewUrl} className="consultation-preview-frame" />
        <div className="consultation-preview-footer">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">{labels.newTab}</a>
          <a href={previewUrl} download={previewFilename}>{labels.save}</a>
          <button type="button" onClick={closePreview}>{labels.close}</button>
        </div>
      </div>
    </div>}
  </>
}
