'use client'

import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CheckCircle2, ClipboardList, RotateCcw, ShieldCheck } from 'lucide-react'
import styles from './course-final-retest.module.css'

const COPY = {
  en: {
    eyebrow: 'DAY 14 · FINAL CHECK-IN', heading: 'See what changed in 14 days',
    intro: 'Repeat the same tests you selected before your course. We will compare only compatible original scores. You may take them at your own pace.',
    status: 'repeated', of: 'of', start: 'Repeat this test', done: 'Retest saved',
    baseline: 'Before the course', final: 'After the course', changed: 'Your comparable scores',
    version: 'The new result uses a different version. Open your reports to view them separately.',
    unavailable: 'The original version is no longer available for retesting. Your earlier result stays in My Tests.',
    noBaseline: 'No comparable original result is available for this cycle.',
    suggested: 'This questionnaire recommends waiting at least {days} days between measurements. Consider returning later.',
    private: 'Only you can view these saved results in your account. Ratings do not prove the course caused a change.',
    openBefore: 'Open original report', openAfter: 'Open final report',
    doneAll: 'You have repeated all available comparable tests. Review your results and reflections.',
    none: 'This cycle has no confirmed start-of-course test list. Your reports are still available in My Tests.',
    allTests: 'My Tests', pleaseWait: 'Opening your test…',
  },
  ru: {
    eyebrow: 'ДЕНЬ 14 · ИТОГОВЫЙ ЗАМЕР', heading: 'Что изменилось за 14 дней?',
    intro: 'Предлагаем повторить те же тесты, которые вы выбрали перед курсом. Сравним только совместимые исходные шкалы. Тесты можно проходить в своём темпе.',
    status: 'повторено', of: 'из', start: 'Повторить тест', done: 'Повтор сохранён',
    baseline: 'До курса', final: 'После курса', changed: 'Сопоставимые показатели',
    version: 'Новый результат использует другую версию. Посмотрите два отчёта отдельно.',
    unavailable: 'Исходная версия больше недоступна для повторения. Старый результат сохранён в «Моих тестах».',
    noBaseline: 'Для этого цикла нет сопоставимого начального результата.',
    suggested: 'Для этого опросника рекомендован интервал от {days} дней. Возможно, полезнее вернуться к нему позже.',
    private: 'Результаты доступны только в вашем кабинете. Разница баллов не доказывает, что её вызвал курс.',
    openBefore: 'Исходный отчёт', openAfter: 'Итоговый отчёт',
    doneAll: 'Повторные тесты завершены. Можно посмотреть результаты и личные наблюдения.',
    none: 'У этого цикла нет подтверждённого стартового набора тестов. Отчёты доступны в «Моих тестах».',
    allTests: 'Мои тесты', pleaseWait: 'Открываем тест…',
  },
}

export default function CourseFinalRetest({ locale='en', plan, onStart, busyKey='', error='' }) {
  if (!plan?.ready) return null
  const t=COPY[locale]||COPY.en
  const root='/' + locale + '/app'
  const tests=plan.tests||[]
  return <section className={styles.panel} id="course-final-retest" data-course-final-retest aria-labelledby="course-retest-heading">
    <header className={styles.header}>
      <div className={styles.emblem}><BookOpenCheck size={28} aria-hidden="true"/></div>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="course-retest-heading">{t.heading}</h2>
        <p className={styles.intro}>{t.intro}</p></div>
    </header>
    {tests.length ? <>
      <div className={styles.counter}><span>{plan.completedCount} {t.of} {plan.totalCount} · {t.status}</span>
        <progress max={plan.totalCount||1} value={plan.completedCount||0} aria-label={t.status}/></div>
      <div className={styles.list}>
        {tests.map((item, i)=><article key={item.key} className={styles.item} data-test-retest={item.key}>
          <div className={styles.itemHeading}>
            <span className={styles.number}>{String(i+1).padStart(2,'0')}</span>
            <h3>{item.title}</h3>
            {item.completed && <CheckCircle2 size={21} aria-label={t.done} className={styles.check}/>}
          </div>
          <div className={styles.resultDates}>
            <span>{t.baseline}: <strong>{item.baselineDate?.slice(0,10)||'—'}</strong></span>
            <span>{t.final}: <strong>{item.afterDate?.slice(0,10)||'—'}</strong></span>
          </div>
          {item.comparison?.length>0 && <div className={styles.comparison} aria-label={t.changed}>
            {item.comparison.slice(0,3).map(scale=><div key={scale.key}>
              <span>{scale.label}</span>
              <strong>{scale.from} <ArrowRight size={14} aria-hidden="true"/> {scale.to}</strong>
            </div>)}
          </div>}
          {item.versionChanged && <p className={styles.hint}>{t.version}</p>}
          {!item.baselineResultId && <p className={styles.hint}>{t.noBaseline}</p>}
          {item.baselineResultId && !item.canRepeat && !item.completed &&
            <p className={styles.hint}>{t.unavailable}</p>}
          {item.repeatSuggestedLater && !item.completed && <p className={styles.hint}>
            {t.suggested.replace('{days}',String(item.suggestedRepeatDays))}</p>}
          <div className={styles.actions}>
            {item.completed ? <span className={styles.saved}><CheckCircle2 size={17}/>{t.done}</span>
              : item.canRepeat && <button type="button" className={styles.start}
                  onClick={()=>onStart(item.key)} disabled={Boolean(busyKey)}>
                  <RotateCcw size={16} aria-hidden="true"/>{busyKey===item.key?t.pleaseWait:t.start}
                </button>}
            {item.baselineResultId && <Link href={root+'/results/'+encodeURIComponent(item.baselineResultId)} prefetch={false}>{t.openBefore}</Link>}
            {item.afterResultId && <Link href={root+'/results/'+encodeURIComponent(item.afterResultId)} prefetch={false}>{t.openAfter}</Link>}
          </div>
        </article>)}
      </div>
      {plan.fullyRetested && <p className={styles.complete}><CheckCircle2 size={18}/>{t.doneAll}</p>}
    </>:<div className={styles.noTests}><p>{t.none}</p><Link href={root+'/tests'}>{t.allTests}<ArrowRight size={16}/></Link></div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p className={styles.privacy}><ShieldCheck size={16}/>{t.private}</p>
  </section>
}
