'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { catalogDescription, catalogTitle } from '@/data/assessments/catalog'

const MOOD_COPY = {
  en: {
    welcome: 'Welcome Home',
    question: 'How are you feeling today?',
    sad: {
      id: 'sad',
      emoji: '😔',
      label: 'Sad',
      prompt: 'It looks like today may be a difficult day. Would you like a quick check of what may be affecting you most?',
    },
    neutral: {
      id: 'neutral',
      emoji: '😐',
      label: 'Neutral',
      prompt: 'Neutral is useful information too. Would you like to see what may be keeping your state where it is?',
    },
    happy: {
      id: 'happy',
      emoji: '🙂',
      label: 'Happy',
      prompt: 'Good to hear. Would you like to see what may be supporting this state and helping you maintain it?',
    },
    category: 'What feels most connected to this?',
    categories: [
      ['body', 'Body'],
      ['energy', 'Energy'],
      ['emotions', 'Emotions'],
      ['relationships', 'Relationships'],
      ['work-money', 'Work & money'],
      ['other', 'Something else'],
    ],
    suggestions: 'Choose one if it feels useful',
    notNow: 'Not now',
    allTests: 'All tests',
    close: 'Close',
    saved: 'Mood saved to your private history.',
    temporary: 'You can choose a test now. This mood is not stored until you have a private guest session or account.',
    saveError: 'The mood could not be saved. You can still choose a test.',
    questions: 'questions',
  },
  ru: {
    welcome: 'Добро пожаловать домой',
    question: 'Как вы себя чувствуете сегодня?',
    sad: {
      id: 'sad',
      emoji: '😔',
      label: 'Грустно',
      prompt: 'Похоже, сегодня непростой день. Хотите за минуту понять, что сейчас больше влияет на состояние?',
    },
    neutral: {
      id: 'neutral',
      emoji: '😐',
      label: 'Нейтрально',
      prompt: 'Нейтрально — тоже важный сигнал. Хотите посмотреть, что сейчас удерживает состояние именно таким?',
    },
    happy: {
      id: 'happy',
      emoji: '🙂',
      label: 'Хорошо',
      prompt: 'Здорово. Хотите увидеть, что сейчас поддерживает это состояние — и что помогает его сохранять?',
    },
    category: 'С чем это сейчас больше всего связано?',
    categories: [
      ['body', 'Тело'],
      ['energy', 'Энергия'],
      ['emotions', 'Эмоции'],
      ['relationships', 'Отношения'],
      ['work-money', 'Работа и деньги'],
      ['other', 'Другое'],
    ],
    suggestions: 'Выберите один вариант, если это сейчас полезно',
    notNow: 'Не сейчас',
    allTests: 'Все тесты',
    close: 'Закрыть',
    saved: 'Настроение сохранено в вашей приватной истории.',
    temporary: 'Можно выбрать тест сейчас. Настроение не сохраняется, пока нет приватной гостевой сессии или аккаунта.',
    saveError: 'Не удалось сохранить настроение. Тест всё равно можно выбрать.',
    questions: 'вопросов',
  },
}

export function MoodCheckIn({
  locale = 'en',
  compact = false,
  disabled = false,
  getRecommendations,
  onMoodSelected,
  onDismissMood,
  onStartTest,
  onAllTests,
}) {
  const c = MOOD_COPY[locale] || MOOD_COPY.en
  const moods = [c.sad, c.neutral, c.happy]
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('')
  const [saveState, setSaveState] = useState('')
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const titleId = useId()
  const promptId = useId()
  const activeMood = moods.find((item) => item.id === selected)
  const recommendations = useMemo(
    () =>
      activeMood
        ? getRecommendations?.({ mood: activeMood.id, category: category || null }) || []
        : [],
    [activeMood, category, getRecommendations],
  )

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
        onDismissMood?.()
        setSelected(null)
        setCategory('')
        setSaveState('')
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

  function closeDialog({ dismiss = true } = {}) {
    if (dismiss) onDismissMood?.()
    setCategory('')
    setSelected(null)
    setSaveState('')
  }

  function openMood(mood, event) {
    triggerRef.current = event.currentTarget
    setCategory('')
    setSelected(mood.id)
    setSaveState('saving')
    Promise.resolve(onMoodSelected?.({ mood: mood.id, category: null }))
      .then((value) => setSaveState(value?.persisted === false ? 'temporary' : 'saved'))
      .catch(() => setSaveState('error'))
  }

  function chooseTest(candidate) {
    closeDialog({ dismiss: false })
    onStartTest?.(candidate)
  }

  function showAllTests() {
    closeDialog({ dismiss: false })
    onAllTests?.()
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
      </section>

      {activeMood && (
        <div
          className="hh-mood-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog()
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
              onClick={closeDialog}
            >
              ×
            </button>
            <p className="hh-mood-dialog-state">
              <span aria-hidden="true">{activeMood.emoji}</span> {activeMood.label}
            </p>
            <h3 id={promptId}>{activeMood.prompt}</h3>
            {saveState === 'saved' && <p className="hh-mood-save-state">{c.saved}</p>}
            {saveState === 'temporary' && <p className="hh-mood-save-state">{c.temporary}</p>}
            {saveState === 'error' && <p className="hh-mood-save-state" role="status">{c.saveError}</p>}

            <p className="hh-mood-category-title">{c.category}</p>
            <div className="hh-mood-categories">
              {c.categories.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={category === id}
                  onClick={() => setCategory(category === id ? '' : id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="hh-mood-category-title">{c.suggestions}</p>
            <div className="hh-mood-test-options">
              {recommendations.map((candidate) => (
                <button
                  type="button"
                  className="hh-mood-test-option"
                  key={candidate.key}
                  onClick={() => chooseTest(candidate)}
                >
                  <span>
                    <strong>{catalogTitle(candidate.entry, locale)}</strong>
                    <small>
                      {candidate.entry.questionCount
                        ? `${candidate.entry.questionCount} ${c.questions} · ${candidate.entry.duration}`
                        : candidate.entry.duration || ''}
                    </small>
                    <em>{candidate.reason || catalogDescription(candidate.entry, locale)}</em>
                  </span>
                  <b aria-hidden="true">›</b>
                </button>
              ))}
              {!recommendations.length && (
                <p className="hh-mood-save-state">
                  {locale === 'ru'
                    ? 'На сегодня дополнительный тест не нужен.'
                    : 'No additional check is due right now.'}
                </p>
              )}
            </div>

            <div className="hh-mood-actions">
              <button type="button" onClick={closeDialog}>{c.notNow}</button>
              {onAllTests && <button type="button" onClick={showAllTests}>{c.allTests}</button>}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
