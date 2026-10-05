'use client'

import { useEffect, useId, useRef, useState } from 'react'

const MOOD_COPY = {
  en: {
    welcome: 'Welcome Home',
    question: 'How are you feeling today?',
    sad: { id: 'sad', emoji: '😔', label: 'Sad', prompt: 'Thanks for telling me. What feels hardest right now?' },
    neutral: { id: 'neutral', emoji: '😐', label: 'Neutral', prompt: 'Thanks for checking in. What feels most noticeable right now?' },
    happy: { id: 'happy', emoji: '🙂', label: 'Happy', prompt: 'Glad to hear it. What feels good today?' },
    category: 'What feels most connected to this?',
    categories: [
      ['body', 'Body'],
      ['energy', 'Energy'],
      ['emotions', 'Emotions'],
      ['relationships', 'Relationships'],
      ['work-money', 'Work & money'],
      ['other', 'Something else'],
    ],
    quick: 'Do a quick check-in',
    latest: 'Latest',
    notNow: 'Not now',
    close: 'Close',
  },
  ru: {
    welcome: 'Добро пожаловать домой',
    question: 'Как вы себя чувствуете сегодня?',
    sad: { id: 'sad', emoji: '😔', label: 'Грустно', prompt: 'Спасибо, что сказали. Что сейчас ощущается самым трудным?' },
    neutral: { id: 'neutral', emoji: '😐', label: 'Нейтрально', prompt: 'Спасибо, что отметили своё состояние. Что сейчас ощущается заметнее всего?' },
    happy: { id: 'happy', emoji: '🙂', label: 'Весело', prompt: 'Рад это слышать. Что сегодня ощущается особенно хорошо?' },
    category: 'С чем это сейчас больше всего связано?',
    categories: [
      ['body', 'Тело'],
      ['energy', 'Энергия'],
      ['emotions', 'Эмоции'],
      ['relationships', 'Отношения'],
      ['work-money', 'Работа и деньги'],
      ['other', 'Другое'],
    ],
    quick: 'Сделать быстрый check-in',
    latest: 'Последнее',
    notNow: 'Не сейчас',
    close: 'Закрыть',
  },
}

export function MoodCheckIn({ locale = 'en', compact = false, disabled = false, latestMood = null, onMoodChange, onDismiss, onQuickCheckin }) {
  const c = MOOD_COPY[locale] || MOOD_COPY.en
  const moods = [c.sad, c.neutral, c.happy]
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('')
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const moodOperationRef = useRef(null)
  const titleId = useId()
  const promptId = useId()
  const activeMood = moods.find((item) => item.id === selected)

  useEffect(() => {
    if (!activeMood) return undefined
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      )

    dialog?.querySelector('[data-mood-close]')?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismissDialog()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      trigger?.focus?.()
    }
  }, [activeMood])

  function emitMoodChange(payload) {
    if (!onMoodChange) return
    Promise.resolve(onMoodChange(payload)).catch(() => {})
  }

  function openMood(mood, event) {
    triggerRef.current = event.currentTarget
    const operationId = crypto.randomUUID()
    moodOperationRef.current = operationId
    setCategory('')
    setSelected(mood.id)
    emitMoodChange({ mood: mood.id, category: null, operationId })
  }

  function closeDialog() {
    setCategory('')
    setSelected(null)
    moodOperationRef.current = null
  }

  function dismissDialog() {
    if (selected && moodOperationRef.current)
      onDismiss?.({ mood: selected, category: category || null, operationId: moodOperationRef.current })
    closeDialog()
  }

  function chooseCategory(id) {
    setCategory(id)
    if (selected && moodOperationRef.current)
      emitMoodChange({ mood: selected, category: id, operationId: moodOperationRef.current })
  }

  function startQuickCheckin() {
    const payload = { mood: selected, category: category || null, operationId: moodOperationRef.current }
    closeDialog()
    onQuickCheckin?.(payload)
  }

  return (
    <>
      <section
        className={'hh-mood-checkin' + (compact ? ' hh-mood-checkin--compact' : '')}
        aria-labelledby={titleId}
      >
        <p className="hh-mood-kicker">{c.welcome}</p>
        {compact ? (
          <h2 className="hh-mood-title" id={titleId}>{c.question}</h2>
        ) : (
          <h1 className="hh-mood-title" id={titleId}>{c.question}</h1>
        )}
        <div className="hh-mood-row" role="group" aria-label={c.question}>
          {moods.map((mood) => (
            <button
              key={mood.id}
              type="button"
              className="hh-mood-button"
              aria-label={mood.label}
              aria-haspopup="dialog"
              disabled={disabled}
              onClick={(event) => openMood(mood, event)}
            >
              <span className="hh-mood-emoji" aria-hidden="true">{mood.emoji}</span>
              <span>{mood.label}</span>
            </button>
          ))}
        </div>
        {latestMood && (
          <p className="hh-mood-latest">
            {c.latest}: {moods.find((mood) => mood.id === latestMood.mood)?.emoji || ''}{' '}
            {moods.find((mood) => mood.id === latestMood.mood)?.label || latestMood.mood}
            {latestMood.occurredAt
              ? ' · ' + new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(latestMood.occurredAt))
              : ''}
          </p>
        )}
      </section>

      {activeMood && (
        <div
          className="hh-mood-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismissDialog()
          }}
        >
          <section
            ref={dialogRef}
            className="hh-mood-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={promptId}
          >
            <button
              type="button"
              className="hh-mood-close"
              data-mood-close
              aria-label={c.close}
              onClick={dismissDialog}
            >
              ×
            </button>
            <p className="hh-mood-dialog-state">
              <span aria-hidden="true">{activeMood.emoji}</span> {activeMood.label}
            </p>
            <h3 id={promptId}>{activeMood.prompt}</h3>
            <p className="hh-mood-category-title">{c.category}</p>
            <div className="hh-mood-categories">
              {c.categories.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={category === id}
                  onClick={() => chooseCategory(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hh-mood-actions">
              <button type="button" className="hh-mood-primary" onClick={startQuickCheckin}>
                {c.quick}
              </button>
              <button type="button" onClick={dismissDialog}>{c.notNow}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
