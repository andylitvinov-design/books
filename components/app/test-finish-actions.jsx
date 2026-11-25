'use client'
import styles from './test-finish-actions.module.css'

export function TestFinishActions({ locale = 'en', disabled = false, onReport, onNext, onDiscuss = null, temporary = false, courseMode = false, guestScaleOnly = false }) {
  const ru = locale === 'ru'
  return (
    <div className={styles.wrap} role="group" aria-label={ru ? 'Завершить тест' : 'Finish assessment'} data-test-finish-actions>
      {(guestScaleOnly || !courseMode) && <button type="button" className={styles.report} disabled={disabled} onClick={onReport}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <span>{guestScaleOnly ? (ru ? 'Посмотреть шкалы и баллы' : 'See my scores and scales') : (ru ? 'Сохранить результат и получить рекомендации' : 'Save results and get recommendations')}</span>
        <span aria-hidden="true">→</span>
      </button>}
      {!guestScaleOnly && <button type="button" className={courseMode ? styles.courseNext : styles.next} disabled={disabled} onClick={onNext}>
        <span className={styles.icon} aria-hidden="true">✓</span>
        <span>{courseMode
          ? (ru ? 'Сохранить и продолжить тестирование курса' : 'Save and continue my course tests')
          : (ru ? 'Сохранить результат и перейти к следующему тесту' : 'Save results and continue to the next test')}</span>
        <span aria-hidden="true">→</span>
      </button>}
      {!guestScaleOnly && !courseMode && typeof onDiscuss === 'function' && <button type="button"
        className={styles.discuss} data-finish-discuss-test disabled={disabled} onClick={onDiscuss}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <span>{locale === 'ru' ? 'Обсудить этот тест' : locale === 'es' ? 'Comentar esta prueba' : 'Discuss this test'}</span>
        <span aria-hidden="true">→</span>
      </button>}
      {temporary && !guestScaleOnly && <p className={styles.note}>{ru
        ? 'В гостевом режиме результат хранится временно. Добавить его в Google-кабинет можно отдельно, по вашему выбору.'
        : 'Guest results are stored temporarily. Saving a result permanently to your Google Cabinet is a separate, optional step.'}</p>}
    </div>
  )
}
