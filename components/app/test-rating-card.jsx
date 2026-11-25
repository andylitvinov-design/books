'use client'

import { useEffect, useState } from 'react'
import styles from './test-rating-card.module.css'

const MESSAGES = {
  en: {
    title: 'How useful was this test?',
    description: 'Rate your experience, not the scientific validity of the questionnaire. Your scores and answers are never published.',
    star: 'stars', saved: 'Thanks for your rating!', changed: 'Your rating was updated.',
    saving: 'Saving your rating…', error: 'Could not save the rating. Please try again.',
    group: 'Rate test usefulness from one to five stars',
  },
  ru: {
    title: 'Насколько полезен был этот тест?',
    description: 'Оцените удобство и пользу для себя — не научную достоверность методики. Ваши ответы и результаты не публикуются.',
    star: 'звёзд', saved: 'Спасибо за вашу оценку!', changed: 'Оценка обновлена.',
    saving: 'Сохраняем оценку…', error: 'Не удалось сохранить оценку. Попробуйте ещё раз.',
    group: 'Оцените пользу теста от одной до пяти звёзд',
  },
  es: {
    title: '¿Te resultó útil esta prueba?',
    description: 'Valora tu experiencia, no la validez científica. Tus respuestas y resultados nunca se publican.',
    star: 'estrellas', saved: '¡Gracias por tu valoración!', changed: 'Valoración actualizada.',
    saving: 'Guardando…', error: 'No se pudo guardar. Inténtalo de nuevo.',
    group: 'Valora la utilidad de la prueba de una a cinco estrellas',
  },
}

/** Voluntary, account/guest-session-scoped feedback shown only after a saved result. */
export function TestRatingCard({ locale = 'en', definitionKey, guest = false }) {
  const copy = MESSAGES[locale] || MESSAGES.en
  const [rating, setRating] = useState(null)
  const [hovered, setHovered] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const apiPath = `/api/app/${guest ? 'guest/' : ''}test-ratings`

  useEffect(() => {
    if (!definitionKey) return
    let live = true
    setRating(null)
    setMessage('')
    fetch(`${apiPath}/${encodeURIComponent(definitionKey)}`, {
      credentials: 'same-origin', cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) return null
      return response.json()
    }).then((value) => {
      if (live && Number.isInteger(value?.rating)) setRating(value.rating)
    }).catch(() => {})
    return () => { live = false }
  }, [apiPath, definitionKey])

  async function rate(value) {
    if (busy || !definitionKey) return
    const previous = rating
    setBusy(true)
    setMessage(copy.saving)
    try {
      const response = await fetch(apiPath, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definitionKey, rating: value }),
      })
      if (!response.ok) throw new Error('RATING_SAVE_FAILED')
      const saved = await response.json()
      setRating(saved.rating)
      setMessage(previous ? copy.changed : copy.saved)
    } catch {
      setMessage(copy.error)
    } finally {
      setBusy(false)
      setHovered(0)
    }
  }

  return <section className={styles.card} data-test-rating-card aria-label={copy.title}>
    <div className={styles.copy}>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
    </div>
    <div className={styles.stars} role="group" aria-label={copy.group} onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button key={value} className={styles.star} type="button" disabled={busy}
          aria-label={`${value} / 5 ${copy.star}`} aria-pressed={rating === value}
          onMouseEnter={() => setHovered(value)} onFocus={() => setHovered(value)}
          onBlur={() => setHovered(0)} onClick={() => rate(value)}>
          <span aria-hidden="true" data-filled={(hovered || rating || 0) >= value}>★</span>
        </button>
      ))}
    </div>
    <p className={styles.status} role="status" aria-live="polite">{message || (rating ? `${rating} / 5 ★` : ' ')}</p>
  </section>
}
