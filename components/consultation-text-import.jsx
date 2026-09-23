'use client'

import { useState } from 'react'
import { parseConsultationText } from '@/lib/consultations/text-import'

export function ConsultationTextImport({ remedies, onApply, uiLocale = 'ru' }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const ru = uiLocale === 'ru'

  const labels = ru ? {
    title: 'Авторазбор назначения',
    hint: 'Вставьте текст: препараты, потенции и дозы. Бах можно помечать «Бах: Mimulus» или отдельным разделом «Эссенции Баха».',
    placeholder: 'Aconitum 30, 5 гранул, 3 раза в день\nБах: Mimulus',
    parse: 'Разобрать и заполнить',
    found: 'Распознано',
    warning: 'Проверьте',
  } : {
    title: 'Auto-parse prescription',
    hint: 'Paste remedies, potencies and doses. Mark Bach items as “Bach: Mimulus” or use a “Bach essences” section.',
    placeholder: 'Aconitum 30, 5 granules, 3 times a day\nBach: Mimulus',
    parse: 'Parse and fill',
    found: 'Recognized',
    warning: 'Check',
  }

  function run() {
    const parsed = parseConsultationText(text, remedies)
    setPreview(parsed)
    if (parsed.items.length || parsed.patientName || parsed.dateIssued || parsed.generalInstructions) onApply(parsed)
  }

  return <section className="consultation-text-import">
    <div className="consultation-text-import-head">
      <strong>{labels.title}</strong>
      <span>{labels.hint}</span>
    </div>
    <div className="consultation-text-import-row">
      <textarea aria-label={labels.title} rows={2} maxLength={30000} value={text} onChange={(event) => { setText(event.target.value); setPreview(null) }} placeholder={labels.placeholder} />
      <button type="button" disabled={!text.trim()} onClick={run}>{labels.parse}</button>
    </div>
    {preview && <div className="consultation-text-import-status" role="status">
      <span>{labels.found}: {preview.items.length}</span>
      {preview.warnings.length > 0 && <span>{labels.warning}: {preview.warnings.length}</span>}
    </div>}
  </section>
}
