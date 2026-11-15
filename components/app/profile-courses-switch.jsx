'use client'
import Link from 'next/link'
import { ArrowRight, BookOpen, BookOpenCheck, GraduationCap, LockKeyhole, RotateCw, Sparkles } from 'lucide-react'
import styles from './profile-courses-switch.module.css'

const COPY = {
  en: {
    label: 'My Space · course choices', discover: 'Find a course', saved: 'My courses',
    heading: 'Choose how to learn', intro: 'Explore courses by interest. Starting and saving a programme require your own choice.',
    opora: 'OPORA · Stress Relief', oporaText: '14 short lessons and an eight-question check-in',
    reiki: 'Reiki Practitioner', reikiText: 'Free introductory lessons and practices',
    academy: 'Explore all courses', academyText: 'The full Academy catalogue',
    savedHeading: 'Continue your courses', savedIntro: 'Sign in to see courses you started or completed, saved lessons and your progress. Nothing restarts automatically.',
    google: 'Continue with Google', telegram: 'Continue with Telegram', private: 'Your learning history is private.',
    error: 'Your account could not be checked. The public catalogue is still available.', retry: 'Try again',
  },
  ru: {
    label: 'Моё пространство · выбор курсов', discover: 'Подобрать курс', saved: 'Мои курсы',
    heading: 'Выберите своё направление', intro: 'Изучите программы по интересам. Начало обучения и сохранение прогресса — только по вашему выбору.',
    opora: 'ОПОРА · Антистресс', oporaText: '14 коротких занятий и стартовый самоотчёт из 8 вопросов',
    reiki: 'Практик Рейки', reikiText: 'Бесплатные вводные занятия и практики',
    academy: 'Все курсы Академии', academyText: 'Полный каталог и другие направления',
    savedHeading: 'Продолжить мои курсы', savedIntro: 'Войдите, чтобы увидеть начатые и завершённые курсы, сохранённые уроки и прогресс. Ничего не запустится заново автоматически.',
    google: 'Войти через Google', telegram: 'Войти через Telegram', private: 'История обучения доступна только вам.',
    error: 'Сейчас не удалось проверить кабинет. Публичный каталог по-прежнему доступен.', retry: 'Повторить',
  },
  es: {
    label: 'Mi espacio · cursos', discover: 'Elegir curso', saved: 'Mis cursos',
    heading: 'Elige tu camino', intro: 'Explora programas por interés. Guardar y comenzar requieren tu propia elección.',
    opora: 'OPORA · Antiestrés', oporaText: '14 lecciones breves y ocho preguntas iniciales',
    reiki: 'Reiki Practitioner', reikiText: 'Lecciones y prácticas introductorias gratuitas',
    academy: 'Todos los cursos', academyText: 'El catálogo completo de la Academia',
    savedHeading: 'Continúa tus cursos', savedIntro: 'Inicia sesión para ver los cursos empezados o terminados y tu progreso. Nada se reinicia automáticamente.',
    google: 'Entrar con Google', telegram: 'Entrar con Telegram', private: 'Tu historial es privado.',
    error: 'No se pudo comprobar tu cuenta. El catálogo público sigue disponible.', retry: 'Reintentar',
  },
}
export function ProfileCoursesSwitch({ locale = 'en', mode = 'saved' }) {
  const t = COPY[locale] || COPY.en
  const root = '/' + (locale === 'es' ? 'en' : locale) + '/app/course'
  return <nav className={styles.switch} aria-label={t.label} data-profile-courses-switch>
    <Link href={root + '?view=discover'} prefetch={false} className={mode === 'discover' ? styles.active : styles.tab}
      aria-current={mode === 'discover' ? 'page' : undefined} data-course-switch="discover">
      <Sparkles size={19} aria-hidden="true" />{t.discover}</Link>
    <Link href={root + '?view=courses'} prefetch={false} className={mode === 'saved' ? styles.active : styles.tab}
      aria-current={mode === 'saved' ? 'page' : undefined} data-course-switch="saved">
      <BookOpenCheck size={19} aria-hidden="true" />{t.saved}</Link>
  </nav>
}
export function ProfileCoursesGuest({locale = 'en', mode = 'saved', busy = false, telegramAvailable = false,
  onSignin, onTelegramSignin, loadingError = false, onRetry, errorMessage}) {
  const t = COPY[locale] || COPY.en
  const accountLocale = locale === 'es' ? 'en' : locale
  return <section className={styles.guest} data-profile-courses-guest-content data-course-view={mode}>
    {loadingError && <p className={styles.notice} role="status">{t.error}
      {onRetry && <button type="button" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />{t.retry}</button>}</p>}
    {mode === 'saved' ? <div className={styles.signin}>
      <BookOpenCheck size={35} className={styles.mark} aria-hidden="true" />
      <h2>{t.savedHeading}</h2><p>{t.savedIntro}</p>
      <button type="button" className={styles.primary} onClick={onSignin} disabled={busy} data-profile-courses-google>
        <LockKeyhole size={17} aria-hidden="true" />{t.google}<ArrowRight size={17} aria-hidden="true" /></button>
      {telegramAvailable && <button type="button" className={styles.secondary} onClick={onTelegramSignin}
        disabled={busy} data-profile-courses-telegram>{t.telegram}</button>}
      <small><LockKeyhole size={14} aria-hidden="true" />{t.private}</small>
    </div> : <>
      <header className={styles.discovery}><p className={styles.eyebrow}>HOLISTIC HOUSE · ACADEMY</p>
        <h2>{t.heading}</h2><p>{t.intro}</p></header>
      <div className={styles.cards}>
        <Link href={'/' + locale + '/courses/antistress'} prefetch={false} className={styles.card}>
          <BookOpen size={23} aria-hidden="true" /><span><strong>{t.opora}</strong><small>{t.oporaText}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
        <Link href={'/' + accountLocale + '/academy/principles-of-energywork/learn'} prefetch={false} className={styles.card}>
          <Sparkles size={23} aria-hidden="true" /><span><strong>{t.reiki}</strong><small>{t.reikiText}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
        <Link href={'/' + locale + '/academy'} prefetch={false} className={styles.card}>
          <GraduationCap size={23} aria-hidden="true" /><span><strong>{t.academy}</strong><small>{t.academyText}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </>}
    {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
  </section>
}
