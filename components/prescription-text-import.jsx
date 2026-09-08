'use client'

import { useState } from 'react'
import { parsePrescriptionText } from '@/lib/prescriptions/text-import'

export function PrescriptionTextImport({ remedies, onApply, onUndo, canUndo }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [applied, setApplied] = useState(false)
  return <details className="prescription-import" open>
    <summary>Вставить текст рецепта</summary>
    <p className="prescription-form-hint">Текст на русском или английском, либо строки из Excel. Разбор выполняется на вашем устройстве.</p>
    <textarea aria-label="Текст для авторазбора" value={text} maxLength={30000} rows={3} onChange={(event) => { setText(event.target.value); setPreview(null); setApplied(false) }} placeholder={'Клиент: Анна\nДата: 08.09.2026\nПрепарат | Потенция | Доза | Частота | Курс | Заметки'} />
    <p className="prescription-form-hint">Один препарат на строку. Можно указывать поля явно: «доза: …; частота: …; курс: …».</p>
    <div className="prescription-import-controls">
      <button type="button" disabled={!text.trim()} onClick={() => { setPreview(parsePrescriptionText(text, remedies)); setApplied(false) }}>Разобрать текст</button>
      {canUndo && <button type="button" onClick={() => { onUndo(); setApplied(false) }}>Отменить заполнение</button>}
    </div>
    {preview && <section className="prescription-import-preview" aria-label="Предпросмотр разбора" aria-live="polite">
      <strong>Распознано препаратов: {preview.items.length}</strong>
      {(preview.patientName || preview.dateIssued) && <p>{preview.patientName} {preview.dateIssued}</p>}
      {preview.items.length > 0 && <ol>{preview.items.map((item, index) => <li key={index}><strong>{item.query}</strong><span>{[['Потенция', item.potency], ['Доза', item.dosage], ['Частота', item.frequency], ['Курс', item.duration], ['Инструкции', item.instructions]].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join(' · ') || 'Дозировка не указана'}</span></li>)}</ol>}
      {preview.generalInstructions && <p>Общие инструкции: {preview.generalInstructions}</p>}
      {preview.warnings.length > 0 && <div className="prescription-import-warnings"><strong>Проверьте перед сохранением</strong><ul>{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
      <p className="prescription-form-hint">Заполненные строки сохранятся, новые добавятся к ним. Имя и дата заменятся, если они указаны в тексте. Проверьте все дозировки перед сохранением.</p>
      <button type="button" disabled={applied || !(preview.items.length || preview.patientName || preview.dateIssued || preview.generalInstructions)} onClick={() => { onApply(preview); setApplied(true) }}>{applied ? 'Форма заполнена' : 'Заполнить форму'}</button>
    </section>}
  </details>
}
