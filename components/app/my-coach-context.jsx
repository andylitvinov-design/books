'use client'

import { useEffect, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './my-coaching-plan.module.css'

const copy = {
  en: ['Provider', 'Life Plan item', 'Review', 'Allow sharing', 'Revoke', 'Saved', 'Could not update context.', 'Ali may send this text to the selected external provider during coaching.', 'Loading…', 'No saved goals or actions.'],
  ru: ['Провайдер', 'Элемент плана', 'Проверить', 'Разрешить передачу', 'Отозвать', 'Сохранено', 'Не удалось обновить контекст.', 'Во время коучинга Али может передать этот текст выбранному внешнему провайдеру.', 'Загрузка…', 'Нет сохранённых целей или действий.'],
  es: ['Proveedor', 'Elemento del plan', 'Revisar', 'Permitir compartir', 'Revocar', 'Guardado', 'No se pudo actualizar el contexto.', 'Ali puede enviar este texto al proveedor externo seleccionado durante el coaching.', 'Cargando…', 'No hay metas ni acciones guardadas.'],
}
const path = 'coaching-context/consent'
const names = { groq: 'Groq', gemini_free: 'Gemini Free', gemini_paid: 'Gemini Paid', openrouter: 'OpenRouter' }
const grantCopy = {
  en: ['Saved permissions', 'Item no longer in plan', 'Revoke a permission to see more.'],
  ru: ['Сохранённые разрешения', 'Элемента больше нет в плане', 'Отзовите разрешение, чтобы увидеть остальные.'],
  es: ['Permisos guardados', 'Elemento ausente del plan', 'Revoca un permiso para ver más.'],
}

export default function MyCoachContext({ accountId, locale, domains }) {
  const [providerLabel, itemLabel, reviewLabel, allowLabel, revokeLabel, saved, error,
    disclosure, loading, empty] = copy[locale] || copy.en
  const [providers, setProviders] = useState(null)
  const [assessmentChoices, setAssessmentChoices] = useState([])
  const [grants, setGrants] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [provider, setProvider] = useState('')
  const [itemId, setItemId] = useState('')
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const items = domains.flatMap(area => (area.goals || []).filter(goal => goal.status === 'active')
    .flatMap(goal => [
      { itemId: goal.id, category: 'goals', topicKey: area.areaKey, label: goal.title },
      ...(goal.actions || []).filter(action => ['accepted', 'active'].includes(action.status))
        .map(action => ({ itemId: action.id, category: 'actions', topicKey: area.areaKey, label: action.description })),
    ]))
  items.push(...assessmentChoices.flatMap(result => result.scales.map(scale => ({
    itemId: result.resultId, category: 'test_results', topicKey: 'personal_growth', scaleKey: scale.key,
    label: `${result.instrument} · ${result.measuredOn} · ${scale.label}`,
  }))))
  const keyFor = row => row.itemId + ':' + (row.scaleKey || '')
  const item = items.find(candidate => keyFor(candidate) === itemId)
  const canGrant = providers?.find(candidate => candidate.provider === provider)?.canGrant

  useEffect(() => {
    let active = true
    appFetch(path, undefined, 'GET', { accountId }).then(result => {
      if (active) {
        setProviders(result.providers)
        setAssessmentChoices(result.assessmentChoices || [])
        setGrants(result.grants)
      }
    }).catch(() => { if (active) setStatus(error) })
    return () => { active = false }
  }, [accountId, error, refresh])

  async function submit(operation, target = item && { ...item, provider }) {
    if (!target?.provider || busy) return
    setBusy(true)
    setStatus('')
    const { category, topicKey, itemId, scaleKey, provider: recipient } = target
    try {
      const result = await appFetch(path, { operation, provider: recipient, itemId, category, topicKey, scaleKey,
        ...(operation === 'grant' && { confirmed: true, sourceRevision: preview.item.sourceRevision,
          policyVersion: preview.policyVersion, reviewToken: preview.reviewToken }),
      }, 'POST', { accountId })
      setPreview(operation === 'review' ? result : null)
      if (operation !== 'review') {
        setStatus(saved)
        setRefresh(value => value + 1)
      }
    } catch {
      setPreview(null)
      setStatus(error)
    } finally {
      setBusy(false)
    }
  }

  return <section id="coach-context-panel" role="tabpanel" aria-labelledby="coach-context-tab"
    className={styles.contextPanel} aria-busy={busy}>
    <fieldset disabled={busy}>
      <label>{providerLabel} <select value={provider} onChange={event => {
        setProvider(event.target.value); setPreview(null)
      }}>
        <option value="">—</option>
        {(providers || []).map(({ provider: id }) => <option key={id} value={id}>{names[id]}</option>)}
      </select></label>
      <label>{itemLabel} <select value={itemId} onChange={event => {
        setItemId(event.target.value); setPreview(null)
      }}>
        <option value="">—</option>
        {items.map(row => <option key={keyFor(row)} value={keyFor(row)}>{row.label}</option>)}
      </select></label>
      <p>{disclosure}</p>
      <div className={styles.contextControls}>
        <button type="button" disabled={!item || !canGrant} onClick={() => submit('review')}>{reviewLabel}</button>
      </div>
      {preview && <div>
        <p>{names[preview.provider]} · {preview.policyLabel}</p>
        <p>{preview.notices[locale] || preview.notices.en}</p>
        <blockquote>{preview.item.score
          ? `${preview.item.score.instrument} · ${preview.item.score.scale} · ${preview.item.score.score} (${preview.item.score.min}–${preview.item.score.max}) · ${preview.item.score.measuredOn}`
          : preview.item.text}</blockquote>
        <button type="button" onClick={() => submit('grant')}>{allowLabel}</button>
      </div>}
      {grants?.items?.length > 0 && <section>
        <h3>{(grantCopy[locale] || grantCopy.en)[0]}</h3>
        <ul>
          {grants.items.map(grant => <li key={grant.provider + ':' + grant.category + ':' + keyFor(grant)}>
            <p>{names[grant.provider]} · {items.find(row => keyFor(row) === keyFor(grant))?.label ||
              (grantCopy[locale] || grantCopy.en)[1]}</p>
            <button type="button" onClick={() => submit('revoke', grant)}>{revokeLabel}</button>
          </li>)}
        </ul>
        {grants.truncated && <p>{(grantCopy[locale] || grantCopy.en)[2]}</p>}
      </section>}
    </fieldset>
    <p role="status">{status || (busy || !providers ? loading : items.length ? '' : empty)}</p>
  </section>
}
