'use client'
import styles from './test-finish-actions.module.css'

export function TestFinishActions({ locale = 'en', disabled = false, onReport, onNext, temporary = false }) {
  const ru = locale === 'ru'
  return (
    <div className={styles.wrap} role="group" aria-label={ru ? 'Завершить тест' : 'Finish assessment'} data-test-finish-actions>
      <button type="button" className={styles.report} disabled={disabled} onClick={onReport}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <span>{ru ? 'Сохранить результат и получить рекомендации' : 'Save results and get recommendations'}</span>
        <span aria-hidden="true">→</span>
      </button>
      <button type="button" className={styles.next} disabled={disabled} onClick={onNext}>
        <span className={styles.icon} aria-hidden="true">✓</span>
        <span>{ru ? 'Сохранить результат и перейти к следующему тесту' : 'Save results and continue to the next test'}</span>
        <span aria-hidden="true">→</span>
      </button>
      {temporary && <p className={styles.note}>{ru
        ? 'В гостевом режиме результат хранится временно. Добавить его в Google-кабинет можно отдельно, по вашему выбору.'
        : 'Guest results are stored temporarily. Saving a result permanently to your Google Cabinet is a separate, optional step.'}</p>}
    </div>
  )
}
