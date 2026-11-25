'use client'

import { ArrowLeft, ArrowRight, Check, ClipboardList } from 'lucide-react'
import { GROWTH_GOALS } from '@/lib/inner-growth/course-model'
import styles from './course-r3-steps.module.css'

export default function CourseFocusPicker({
  t, locale = 'en', profile, suggested, chosenScales, chosenGoals,
  onToggleScale, onToggleGoal, onSetPrimaryScale, problemLabel, onProblemLabel,
  minScales, busy, onContinue, onBack,
}) {
  const hasScales = profile.eligible.length > 0
  const selectedCount = hasScales ? chosenScales.length : chosenGoals.length
  const total = hasScales ? profile.eligible.length : Object.keys(GROWTH_GOALS).length
  const suggestedKeys = new Set(suggested.map(item => item.id))
  const sufficient = hasScales
    ? selectedCount >= minScales && selectedCount <= Math.min(5, total)
    : selectedCount >= 1 && selectedCount <= 3
  const defaultLabel = profile.eligible.find(item => chosenScales.includes(item.id))?.label ||
    profile.eligible[0]?.label || ''

  return <section className={'hh-panel '+styles.section+' '+styles.focusPicker}
    data-course-scale-picker>
    <header className={styles.pickerHero}>
      <p className={styles.recommendKicker}>{t.nextStage}</p>
      <h2>{hasScales ? t.chooseScales : t.generalFocusTitle}</h2>
      <p>{hasScales ? t.pickerIntro : t.noGoals}</p>
      <div className={styles.pickerCounter} aria-live="polite">
        <span>{selectedCount} / {hasScales ? Math.min(5, total) : 3}</span>
        <strong>{t.selectedFocusCount}</strong>
      </div>
      {hasScales && total < 3 && <p className={styles.small}>{t.chooseScalesShort}</p>}
    </header>

    <section className={styles.pickerListPanel} aria-label={t.allEligibleFocus}>
      <div className={styles.pickerListHeading}>
        <strong>{t.allEligibleFocus}</strong>
        <small>{total} {t.availableFocus}</small>
      </div>
      {hasScales ? <div className={styles.compactScaleList} role="group" aria-label={t.allEligibleFocus}>
        {profile.eligible.map(scale => {
          const selected = chosenScales.includes(scale.id)
          const recommended = suggestedKeys.has(scale.id)
          return <label className={styles.compactScale} key={scale.id}
            data-checked={selected} data-course-scale-option={scale.id}>
            <input type="checkbox" checked={selected}
              disabled={busy || (!selected && chosenScales.length >= 5)}
              onChange={() => onToggleScale(scale.id)}/>
            <span className={styles.compactScaleContent}>
              <span className={styles.compactScaleTitle}>
                <strong>{scale.label}</strong>
                {recommended && <em>{t.suggested}</em>}
              </span>
              <small>{scale.testTitle} · {scale.score} ({scale.min}–{scale.max})</small>
              <span>{scale.practice}</span>
            </span>
            {selected && <Check className={styles.checkedMark} size={17} aria-hidden="true"/>}
          </label>
        })}
      </div> : <div className={styles.compactScaleList} role="group" aria-label={t.generalFocusTitle}>
        {Object.entries(GROWTH_GOALS).map(([key,goal]) => {
          const selected = chosenGoals.includes(key)
          return <label className={styles.compactScale} key={key} data-checked={selected}>
            <input type="checkbox" checked={selected}
              disabled={busy || (!selected && selectedCount >= 3)}
              onChange={() => onToggleGoal(key)}/>
            <span className={styles.compactScaleContent}><strong>{goal.title[locale==='ru'?'ru':'en']}</strong></span>
            {selected && <Check className={styles.checkedMark} size={17} aria-hidden="true"/>}
          </label>
        })}
      </div>}
      {hasScales&&chosenScales.length>0&&<div className={styles.primaryScaleChoice}
        data-course-primary-scale-choice>
        <label htmlFor="course-main-scale">{t.mainSkillTitle}</label>
        <select id="course-main-scale" value={chosenScales[0]} disabled={busy}
          onChange={event=>onSetPrimaryScale?.(event.target.value)}>
          {chosenScales.map(id=>{
            const scale=profile.eligible.find(item=>item.id===id)
            return <option key={id} value={id}>{scale?.label||id}</option>
          })}
        </select>
        <p>{t.mainSkillHelp}</p>
      </div>}
      <p className={styles.pickerDisclaimer}>{t.traitNote}</p>
    </section>

    <section className={styles.trackingSetup}>
      <span className={styles.trackingIcon}><ClipboardList size={21} aria-hidden="true"/></span>
      <div>
        <h3>{t.dailyTrackingTitle}</h3>
        <p>{t.dailyTrackingHelp}</p>
        <label htmlFor="course-r3-target">{t.personal}</label>
        <input id="course-r3-target" maxLength={160} value={problemLabel}
          placeholder={defaultLabel} onChange={event=>onProblemLabel(event.target.value)}/>
        <small>{t.trackingFallback}</small>
      </div>
    </section>

    <div className={styles.pickerFooter}>
      <p>{t.days} · {t.noMedical}</p>
      {!sufficient && <p className={styles.pickerValidation} role="status">{t.requireScales}</p>}
      <div className={styles.focusActions}>
        <button type="button" className={'hh-primary '+styles.burgundyPrimary}
          disabled={busy || !sufficient} onClick={onContinue}
          data-course-confirm-manual-scales>
          <span>{t.continueChosen}</span><ArrowRight size={19} aria-hidden="true"/>
        </button>
        <button type="button" className={styles.whiteSecondary}
          disabled={busy} onClick={onBack} data-course-back-to-suggested>
          <ArrowLeft size={17} aria-hidden="true"/>{t.backToSuggested}
        </button>
      </div>
    </div>
  </section>
}
