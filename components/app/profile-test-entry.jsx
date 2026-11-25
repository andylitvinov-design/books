import Link from 'next/link'
import { Activity, ArrowRight, Brain, ClipboardList, FileText, LockKeyhole, UserRound } from 'lucide-react'
import { ProfileHubTabs } from './profile-hub-tabs'
import ProfileLegacyHashRedirect from './profile-legacy-hash-redirect'
import styles from './profile-test-entry.module.css'

const COPY = {
  en: {
    eyebrow: 'START FREE · NO SIGN-IN REQUIRED',
    title: 'Discover yourself with a test',
    intro: 'Choose a short self-check or explore the full catalogue. You can take tests without adding anything to your account.',
    start: 'Choose a test',
    state: 'Check my state',
    stateDetail: 'A quick check-in with yourself',
    traits: 'Personality traits',
    traitsDetail: 'Short questionnaire · English',
    all: 'Browse all tests',
    allDetail: 'Select the topics that matter to you',
    profile: 'Create my profile',
    profileDetail: 'Choose life areas and build your profile step by step',
    results: 'My saved results',
    resultsDetail: 'Open private reports and previous tests',
    privacy: 'Guest test results are temporary. Saving a result to your personal Cabinet requires a separate, explicit action.',
  },
  ru: {
    eyebrow: 'НАЧНИТЕ БЕСПЛАТНО · БЕЗ РЕГИСТРАЦИИ',
    title: 'Начните знакомство с собой с теста',
    intro: 'Выберите короткий тест или откройте каталог. Для прохождения не нужно входить в аккаунт или добавлять результаты в кабинет.',
    start: 'Выберите тест',
    state: 'Оценить состояние',
    stateDetail: 'Короткая проверка самочувствия',
    traits: 'Особенности личности',
    traitsDetail: 'Краткий опросник · на английском',
    all: 'Все тесты',
    allDetail: 'Подберите интересующие темы',
    profile: 'Заполнить мой профиль',
    profileDetail: 'Выберите области жизни и создайте личный профиль',
    results: 'Мои результаты',
    resultsDetail: 'Открыть сохранённые тесты и отчёты',
    privacy: 'Результаты гостевых тестов временные. Добавление в личный кабинет происходит только после отдельного подтверждения.',
  },
}

export default function ProfileTestEntry({ locale = 'en' }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[language]
  const publicClient = '/' + language + '/client'
  const choices = [
    { id: 'state', icon: Activity, title: t.state, detail: t.stateDetail, href: publicClient + '?startTests=state' },
    { id: 'traits', icon: Brain, title: t.traits, detail: t.traitsDetail, href: publicClient + '?startTests=trait' },
    { id: 'all', icon: ClipboardList, title: t.all, detail: t.allDetail, href: '/' + language + '/client/tests?catalog=full' },
  ]

  return <main className="hh-app hh-app--profile-tests-first" lang={language} data-profile-tests-first>
    <ProfileLegacyHashRedirect locale={language} />
    <ProfileHubTabs locale={language} active="tests" publicEntry />
    <section className={styles.panel} id="profile-free-tests" aria-labelledby="profile-guest-first-title">
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h1 id="profile-guest-first-title">{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>
      <h2 className={styles.label}>{t.start}</h2>
      <nav className={styles.choices} aria-label={t.start}>
        {choices.map(({ id, icon: Icon, title, detail, href }) => <Link
          key={id} href={href} prefetch={false} data-guest-test-choice={id} className={styles.testCard}>
          <span className={styles.icon}><Icon size={23} strokeWidth={1.9} aria-hidden="true" /></span>
          <span className={styles.cardText}><strong>{title}</strong><small>{detail}</small></span>
          <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
        </Link>)}
      </nav>
      <div className={styles.nextSteps}>
        <Link href={'/' + language + '/personality-profiles'} prefetch={false} className={styles.profileAction}
          data-profile-create-link>
          <UserRound size={20} aria-hidden="true" />
          <span><strong>{t.profile}</strong><small>{t.profileDetail}</small></span>
        </Link>
        <Link href={'/' + language + '/app/portrait?space=reports'} prefetch={false} className={styles.resultsAction}
          data-profile-results-link>
          <FileText size={20} aria-hidden="true" />
          <span><strong>{t.results}</strong><small>{t.resultsDetail}</small></span>
        </Link>
      </div>
      <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true" />{t.privacy}</p>
    </section>
  </main>
}
