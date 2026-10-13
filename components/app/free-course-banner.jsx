import Link from 'next/link'
import styles from './free-course-banner.module.css'

const COPY = {
  en: {
    optional: 'An optional next step',
    title: 'A free 14-day practice course',
    intro: 'Explore topics that matter to you with short daily exercises, at your own pace.',
    start: 'Start course for free',
    more: 'More about the course',
    format: 'You choose your topics, tests and practice goals. The course offers daily exercises over 14 days; you can skip or stop a practice.',
    consent: 'Opening the course does not enrol you. Starting and saving your course choices requires your consent in your account. If you already have a course, this opens your current progress.',
    limits: 'Self-guided learning, not a diagnosis, psychotherapy or emergency support. Taking the course is optional and does not change your test results.',
  },
  ru: {
    optional: 'Следующий шаг — по желанию',
    title: 'Бесплатный курс практики на 14 дней',
    intro: 'Изучайте важные для вас темы с короткими ежедневными упражнениями в своём темпе.',
    start: 'Начать курс бесплатно',
    more: 'Подробнее о курсе',
    format: 'Вы сами выбираете темы, тесты и цели практики. Курс предлагает ежедневные упражнения на протяжении 14 дней; любую практику можно пропустить или остановить.',
    consent: 'Открытие курса не записывает вас на него. Начало курса и сохранение вашего выбора в аккаунте требуют вашего согласия. Если курс уже начат, откроется ваш текущий прогресс.',
    limits: 'Самостоятельная практика, а не диагноз, психотерапия или экстренная помощь. Курс необязателен и не меняет результаты теста.',
  },
}

export function FreeCourseBanner({ locale = 'en' }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[language]

  return <aside className={styles.banner} aria-label={t.optional} data-free-course-banner>
    <p className={styles.eyebrow}>{t.optional}</p>
    <h3 className={styles.title}>{t.title}</h3>
    <p className={styles.intro}>{t.intro}</p>
    <div className={styles.actions}>
      <Link className={styles.start} href={'/' + language + '/app/course'} prefetch={false}>{t.start}</Link>
      <details className={styles.more}>
        <summary>{t.more}</summary>
        <div className={styles.information}>
          <p>{t.format}</p>
          <p>{t.consent}</p>
          <p>{t.limits}</p>
        </div>
      </details>
    </div>
  </aside>
}
