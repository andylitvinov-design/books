'use client'

import { useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './my-coaching-plan.module.css'

const labels = {
  en: ['Review an action for future sessions', 'Action to save', 'Save to my Life Plan', 'Dismiss', 'No new actions to review.', 'Could not save or load this action.', 'Saved to your Life Plan.'],
  ru: ['Проверить действие для будущих сессий', 'Действие для сохранения', 'Сохранить в мой план', 'Пропустить', 'Нет новых действий для проверки.', 'Не удалось загрузить или сохранить действие.', 'Действие сохранено в вашем плане.'],
  es: ['Revisar una acción para futuras sesiones', 'Acción para guardar', 'Guardar en mi plan de vida', 'Descartar', 'No hay acciones nuevas para revisar.', 'No se pudo cargar o guardar la acción.', 'Guardado en tu plan de vida.'],
}

export default function CoachMemoryReview({ accountId, reportId, areaKey, locale, importedKeys, onSaved }) {
  const [review, action, save, dismiss, empty, error, saved] = labels[locale] || labels.en
  const [candidates, setCandidates] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const current = candidates?.[0]

  async function load() {
    setBusy(true)
    setStatus('')
    try {
      const result = await appFetch('personal-coaching-reports/' + encodeURIComponent(reportId) + '/memory-candidates',
        undefined, 'GET', { accountId })
      setCandidates(result.candidates.filter(item => !importedKeys.has(reportId + '|' + item.candidateId)))
    } catch {
      setStatus(error)
    } finally {
      setBusy(false)
    }
  }

  async function saveCurrent() {
    if (!current?.text.trim() || busy) return
    setBusy(true)
    setStatus('')
    try {
      await appFetch('coaching-life-plan/import', {
        reportId, reportRevision: current.sourceRevision, areaKey,
        candidateIds: [current.candidateId], planConsent: true, reviewedActionText: current.text,
      }, 'POST', { accountId })
      setCandidates(rows => rows.slice(1))
      setStatus(saved)
      await onSaved()
    } catch {
      setStatus(error)
    } finally {
      setBusy(false)
    }
  }

  return <div className={styles.contextPanel} aria-busy={busy}>
    {candidates === null && <button type="button" disabled={busy} onClick={load}>{review}</button>}
    {current && <fieldset disabled={busy}>
      <label>{action}<textarea rows={3} maxLength={240} value={current.text}
        onChange={event => {
          const text = event.target.value
          setCandidates(([first, ...rest]) => [{ ...first, text }, ...rest])
        }}/></label>
      <div className={styles.contextControls}>
        <button type="button" disabled={!current.text.trim()} onClick={saveCurrent}>{save}</button>
        <button type="button" onClick={() => setCandidates(rows => rows.slice(1))}>{dismiss}</button>
      </div>
    </fieldset>}
    <p role="status">{status || (candidates?.length === 0 ? empty : '')}</p>
  </div>
}
