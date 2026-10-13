'use client'

import Link from 'next/link'
import { ArrowRight, Check, Pencil } from 'lucide-react'
import styles from './course-r3-steps.module.css'

// The same verified, account-owned result summary appears at course completion
// and after returning from the optional manual focus picker. No fake measurements.
export default function CourseCompletionReview({
  t, root, confirmedStatuses, optionByKey, profile, suggested,
  onSuggested, onAlternative, onEditTests, busy = false,
}) {
  return <section className={'hh-panel '+styles.section+' '+styles.completeScreen}
    data-course-testing-complete>
    <header className={styles.completeHero} role="status">
      <span className={styles.completeSymbol}><Check size={25} aria-hidden="true"/></span>
      <h2>{t.congratulations}</h2>
      <p>{t.completeDescription}</p>
      <strong>{confirmedStatuses.length} / {confirmedStatuses.length} {t.completed.toLowerCase()}</strong>
      {onEditTests && <button type="button" className={styles.textEdit}
        disabled={busy} onClick={onEditTests}><Pencil size={14} aria-hidden="true"/>{t.reviseSelection}</button>}
    </header>

    <section className={styles.briefSummary} aria-label={t.briefSummary}>
      <h3>{t.briefSummary}</h3>
      <p className={styles.small}>{t.scaleGuide}</p>
      {confirmedStatuses.map(item => {
        const scales = profile.scales.filter(scale => scale.testKey === item.key)
        const meta = optionByKey.get(item.key)
        return <article key={item.key} className={styles.summaryTest}>
          <div className={styles.summaryHeading}>
            <strong>{meta?.title || item.key}</strong>
            {item.resultId && <Link href={root+'/results/'+encodeURIComponent(item.resultId)}
              prefetch={false}>{t.report}<ArrowRight size={13} aria-hidden="true"/></Link>}
          </div>
          {scales.length ? <ul className={styles.briefScales}>
            {scales.map(scale => <li key={scale.id}
              data-course-screening-scale={scale.testKey === 'asrs-6' && scale.type === 'screening_count' ? 'true' : undefined}>
              <span>{scale.label}</span>
              {scale.testKey === 'asrs-6' && scale.type === 'screening_count'
                ? <span data-course-screening-count>{scale.observation} {t.noMedical}</span>
                : <meter min={scale.min} max={scale.max} value={scale.score}
                    aria-label={scale.label+': '+scale.score+' ('+scale.min+'–'+scale.max+')'}/>}
              <strong>{scale.score}<small> / {scale.min}–{scale.max}</small></strong>
            </li>)}
          </ul> : <p className={styles.small}>{t.noMeasuredScales}</p>}
        </article>
      })}
    </section>

    <section className={styles.recommendedPanel} aria-label={t.recommendedFocusTitle}
      data-course-recommended-focus>
      <div className={styles.recommendedHeader}>
        <p className={styles.recommendKicker}>{t.nextStage}</p>
        <h3>{t.recommendedFocusTitle}</h3>
        <p>{suggested.length ? t.recommendedFocusIntro : t.noGoals}</p>
      </div>
      {suggested.length > 0 && <ol className={styles.suggestedScales}>
        {suggested.map((scale, index) => <li key={scale.id} data-course-suggested-scale={scale.id}>
          <span className={styles.suggestNumber} aria-hidden="true">{index + 1}</span>
          <div>
            <strong>{scale.label}</strong>
            {index===0&&<small className={styles.recommendKicker}>{t.mainSkillTitle}</small>}
            <small>{scale.testTitle} · {scale.score} ({scale.min}–{scale.max})</small>
            <p>{scale.practice}</p>
          </div>
        </li>)}
      </ol>}
      {suggested.length > 0 && <p className={styles.recommendNote}>{t.mainSkillHelp}</p>}
      {suggested.length > 0 && <p className={styles.recommendNote}>{t.recommendationSafety}</p>}
    </section>

    <div className={styles.focusActions} data-course-completion-actions>
      {suggested.length > 0 && <button type="button"
        className={'hh-primary '+styles.burgundyPrimary} disabled={busy}
        onClick={onSuggested} data-course-use-suggested>
        <span>{t.acceptSuggested.replace('{count}', String(suggested.length))}</span>
        <ArrowRight size={19} aria-hidden="true"/>
      </button>}
      <button type="button" className={styles.whiteSecondary} disabled={busy}
        onClick={onAlternative} data-course-choose-other-scales>
        {t.chooseDifferent}<ArrowRight size={17} aria-hidden="true"/>
      </button>
    </div>
  </section>
}
