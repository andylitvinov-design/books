'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookmarkCheck, Check, CheckCircle2, ChevronDown,
  Clock3, Compass, Heart, Leaf, LockKeyhole, ShieldCheck,
  SkipForward, Sparkles, Star, Target, Trophy, Waves, X,
} from 'lucide-react'
import CourseGuidedTimer from './course-guided-timer'
import styles from './course-slide-player.module.css'

const WORDS = {
  en: {
    day: 'Day', step: 'Step', of: 'of', close: 'Return to my course',
    next: 'Continue', back: 'Back', skip: 'Skip this step', saveNext: 'Save & continue',
    save: 'Save today’s practice', saveError: 'Saving did not work. Nothing was marked complete. Please try again.',
    saved: 'Your observation was saved privately.', retry: 'Try again',
    checkin: 'Notice your day', checkinQuestion: 'How difficult was this concern during the last 24 hours?',
    ratingHint: 'There is no correct number. This voluntary self-rating is not a clinical test.',
    low: '0 · Not difficult', high: '10 · Very difficult', skipRating: 'Skip this check-in',
    idea: 'A thought to take with you', ideaLabel: 'Today’s thought',
    recall: 'Remember a familiar skill', recallHint: 'Try recalling it without pressure, or simply continue.',
    phrase: 'A more flexible thought', phraseHint: 'This is a possible phrase, not something you must believe.',
    guided: 'A moment of practice', gentle: 'Eyes can remain open; breathe naturally. Pause or skip anything uncomfortable.',
    short: 'Short', standard: 'Standard', noImagery: 'No imagery', optionalTimer: 'Optional timer',
    ritual: 'One little action', transfer: 'Try it in ordinary life', transferHint: 'Choose a safe, very small action. No challenge is required.',
    symbol: 'A resource image', words: 'Plain words', imagery: 'Optional image', symbolHint: 'A metaphor for reflection, never diagnosis or treatment.',
    reflection: 'One thought worth keeping', reflectionHint: 'One sentence is enough. You can leave this empty.',
    note: 'My private reflection', feedback: 'How was the practice for you?', feedbackHint: 'Any honest response is welcome.',
    helped: 'Helpful', neutral: 'Neutral', uncomfortable: 'Uncomfortable', preferNot: 'Prefer not to say',
    moment: 'One optional comparison', momentHint: 'Two separate momentary impressions, not a clinical improvement score.',
    before: 'Just before the practice', after: 'Just after the practice', none: 'Not rated',
    finish: 'Finish and save', finished: 'A little step forward!',
    completed: 'Practice saved', celebration: 'You took time to practise. That counts.',
    earned: '+20 XP', xpNote: 'XP represents saved participation, not symptoms or “right answers”.',
    seeMap: 'Back to my learning path', replay: 'Read the lesson again', private: 'Private to your account',
    safety: 'Self-guided learning, not a diagnosis or monitored clinical care.',
    pictureCredit: 'An invitation to slow down', todaySkill: 'My focus for today',
    needSave: 'Saved only when the server confirms your lesson.',
    noLesson: 'This part is optional. You can continue whenever you wish.',
  },
  ru: {
    day: 'День', step: 'Шаг', of: 'из', close: 'Вернуться к моему курсу',
    next: 'Продолжить', back: 'Назад', skip: 'Пропустить шаг', saveNext: 'Сохранить и продолжить',
    save: 'Сохранить практику дня', saveError: 'Не получилось сохранить. Ничего не отмечено выполненным. Попробуйте ещё раз.',
    saved: 'Наблюдение сохранено приватно.', retry: 'Повторить',
    checkin: 'Заметьте свой день', checkinQuestion: 'Насколько эта трудность ощущалась за последние 24 часа?',
    ratingHint: 'Правильных чисел нет. Это добровольная самооценка, не клинический тест.',
    low: '0 · Не беспокоила', high: '10 · Очень сильно', skipRating: 'Пропустить замер',
    idea: 'Мысль, которую можно взять с собой', ideaLabel: 'Мысль дня',
    recall: 'Вспомните знакомый навык', recallHint: 'Попробуйте вспомнить без напряжения — или просто продолжайте.',
    phrase: 'Более гибкая мысль', phraseHint: 'Это возможная формулировка. Не обязательно верить в неё.',
    guided: 'Момент практики', gentle: 'Можно не закрывать глаза и не менять дыхание. Неудобный шаг пропускайте.',
    short: 'Короткая', standard: 'Обычная', noImagery: 'Без образов', optionalTimer: 'Таймер — по желанию',
    ritual: 'Одно небольшое действие', transfer: 'Перенесите в обычную жизнь',
    transferHint: 'Выберите безопасное маленькое действие. Испытания не обязательны.',
    symbol: 'Образ ресурса', words: 'Простыми словами', imagery: 'Через образ',
    symbolHint: 'Это метафора для размышления, а не диагностика или лечение.',
    reflection: 'Одна мысль на память', reflectionHint: 'Достаточно одного предложения. Можно оставить пустым.',
    note: 'Моя личная заметка', feedback: 'Как вам было во время практики?',
    feedbackHint: 'Любой честный ответ подходит.',
    helped: 'Помогло', neutral: 'Нейтрально', uncomfortable: 'Было некомфортно', preferNot: 'Не хочу отвечать',
    moment: 'Необязательное сравнение', momentHint: 'Два впечатления в разные моменты, а не медицинский показатель улучшения.',
    before: 'Непосредственно перед практикой', after: 'Непосредственно после практики', none: 'Нет оценки',
    finish: 'Завершить и сохранить', finished: 'Маленький шаг вперёд!',
    completed: 'Практика сохранена', celebration: 'Вы нашли время для себя. Это уже важный шаг.',
    earned: '+20 XP', xpNote: 'XP — за сохранённую практику, не за симптомы или «правильные» ответы.',
    seeMap: 'Вернуться к карте курса', replay: 'Перечитать занятие', private: 'Приватно в вашем кабинете',
    safety: 'Самостоятельное обучение, не диагноз и не медицинское наблюдение.',
    pictureCredit: 'Время для небольшой паузы', todaySkill: 'Мой навык сегодня',
    needSave: 'Практика отмечается завершённой только после подтверждения сервера.',
    noLesson: 'Этот шаг необязателен. Можно продолжать в своём темпе.',
  },
}

const SCENE = {
  checkin: Target,
  idea: Feather,
  recall: Compass,
  phrase: Sparkles,
  guided: Waves,
  ritual: Leaf,
  transfer: ArrowRight,
  symbol: Star,
  reflection: BookmarkCheck,
  moment: Clock3,
  feedback: Heart,
}

function buildSlides(lesson) {
  const guided = (lesson.sections || []).filter(section => ['arrive', 'meditation', 'finish'].includes(section.kind))
  return [
    { key: 'checkin', kind: 'checkin' },
    { key: 'idea', kind: 'idea' },
    ...(lesson.practiceV3?.recall ? [{ key: 'recall', kind: 'recall' }] : []),
    ...(lesson.workbook?.workingPosition ? [{ key: 'phrase', kind: 'phrase' }] : []),
    ...guided.map((section, index) => ({ key: 'guided-' + index, kind: 'guided', section })),
    { key: 'ritual', kind: 'ritual' },
    ...(lesson.workbook?.microPractice ? [{ key: 'transfer', kind: 'transfer' }] : []),
    ...(lesson.practiceV4 ? [{ key: 'symbol', kind: 'symbol' }] : []),
    { key: 'reflection', kind: 'reflection' },
    { key: 'moment', kind: 'moment' },
    { key: 'feedback', kind: 'feedback' },
  ]
}

function OptionalNumber({ label, value, onChange, words }) {
  return <label className={styles.optionalNumber}><span>{label}</span>
    <select value={value === null ? '' : String(value)}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}>
      <option value="">{words.none}</option>
      {Array.from({length:11}, (_, i) => <option key={i} value={i}>{i}/10</option>)}
    </select>
  </label>
}

function IllustratedMoment({ variant = 'calm', photo = false }) {
  if (photo) return <div className={styles.photoMoment} data-photo={variant} aria-hidden="true">
    <span className={styles.photoSparkle}><Sparkles size={21}/></span>
  </div>
  return <div className={styles.illustration} data-art={variant} aria-hidden="true">
    <img src={variant === 'celebration'
      ? '/images/holistic-house/course-celebration.svg'
      : '/images/holistic-house/course-calm-illustration.svg'} alt="" width={280} height={200} loading="lazy"/>
  </div>
}

export default function CourseSlidePlayer({
  locale = 'en', data, busy = false, onClose, onCheckin, onSession, onPreferences,
}) {
  const words = WORDS[locale] || WORDS.en
  const cycle = data.cycle || {}
  const lesson = data.lesson || {}
  const today = data.currentCheckin
  const session = data.currentSession
  const alreadyDone = Boolean(session)
  const slides = useMemo(() => buildSlides(lesson), [lesson])
  const [index, setIndex] = useState(alreadyDone ? slides.length : 0)
  const [severity, setSeverity] = useState(today?.severity ?? null)
  const [reflection, setReflection] = useState(session?.reflection || '')
  const [feedback, setFeedback] = useState(session?.feedback || 'skip')
  const [beforeNow, setBeforeNow] = useState(session?.beforeNow ?? null)
  const [afterNow, setAfterNow] = useState(session?.afterNow ?? null)
  const [symbolMode, setSymbolMode] = useState('words')
  const [earned, setEarned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const checkinOp = useRef(null)
  const sessionOp = useRef(null)
  const submitting = useRef(false)
  const frame = useRef(null)
  const headingRef = useRef(null)
  const closeRef = useRef(onClose)
  const locked = busy || saving
  const slide = slides[Math.min(index, slides.length - 1)]
  const finished = index >= slides.length
  closeRef.current = () => { if (!submitting.current && !locked) onClose() }

  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    frame.current?.querySelector('button')?.focus()
    const trap = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const nodes = [...(frame.current?.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), summary') || [])]
        .filter(node => node.getClientRects().length)
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  useEffect(() => {
    frame.current?.querySelector('[data-slide-scroller]')?.scrollTo({top:0,behavior:'instant'})
    headingRef.current?.focus()
  }, [index])

  function goNext() { setError(''); setIndex(current => Math.min(current + 1, slides.length)) }
  function goBack() { setError(''); setIndex(current => Math.max(0, current - 1)) }

  async function saveCheckin() {
    if (!Number.isInteger(severity) || (today && severity === today.severity)) { goNext(); return }
    if (submitting.current) return
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!checkinOp.current) checkinOp.current = crypto.randomUUID()
      const response = await onCheckin({
        severity, interference: today?.interference ?? null,
        resource: today?.resource ?? null,
        note: today?.note || '',
        operationId: checkinOp.current,
        ...(today ? {expectedRevision:today.revision} : {}),
      })
      if (response) { checkinOp.current = null; goNext() }
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  async function updatePreferences(change) {
    if (submitting.current) return
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!await onPreferences(change)) setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  async function finishLesson() {
    if (alreadyDone) { setIndex(slides.length); return }
    if (submitting.current) return
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!sessionOp.current) sessionOp.current = crypto.randomUUID()
      const response = await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:sessionOp.current,
        feedback,beforeNow,afterNow,reflection,
      })
      if (response) { sessionOp.current = null; setEarned(true); setIndex(slides.length) }
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  const title = finished ? words.finished : slide.kind === 'guided' ? (slide.section.title || words.guided) : words[slide.kind]
  const Icon = finished ? Trophy : (SCENE[slide.kind] || Sparkles)
  const progress = finished ? 100 : Math.round((index / slides.length) * 100)

  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={words.day + ' ' + cycle.day + ': ' + title}
    data-course-slide-player ref={frame}>
    <div className={styles.frame}>
      <header className={styles.header}>
        <button type="button" className={styles.close} onClick={onClose} disabled={locked}
          aria-label={words.close}><X size={23}/></button>
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={progress} aria-label={words.step}>
            <div className={styles.progressValue} style={{width:progress + '%'}} />
          </div>
          <small>{finished ? words.completed : words.step + ' ' + (index + 1) + ' ' + words.of + ' ' + slides.length}</small>
        </div>
        <div className={styles.dayPill}>{cycle.day}/14</div>
      </header>
      <main className={styles.content} data-slide-scroller>
        {finished ? <div className={styles.finished} data-course-slide-completion>
          <IllustratedMoment variant="celebration"/>
          <h2 tabIndex={-1} ref={headingRef}>{alreadyDone && !earned ? words.completed : words.finished}</h2>
          <p>{words.celebration}</p>
          {earned && <div className={styles.xpReward}><Star size={21} fill="currentColor"/>{words.earned}</div>}
          <div className={styles.finalTiles}>
            <span><CheckCircle2 size={22}/>{words.completed}</span>
            <span><Target size={22}/>{words.todaySkill}</span>
            <span><Sparkles size={22}/>{words.private}</span>
          </div>
          <small>{words.xpNote}</small>
          <button type="button" className={styles.textAction} onClick={() => setIndex(1)}>{words.replay}</button>
        </div> : <>
          <div className={styles.slideIdentity}>
            <span className={styles.identityTag}><Icon size={17} aria-hidden="true"/>{words.day} {cycle.day}</span>
            <span className={styles.identityLabel}>{lesson.title}</span>
          </div>
          <h2 className={styles.slideTitle} ref={headingRef} tabIndex={-1}>{title}</h2>

          {slide.kind === 'checkin' && <>
            <IllustratedMoment variant="calm"/>
            <p className={styles.prompt}>{data.target?.label || words.todaySkill}</p>
            <p className={styles.instruction}>{words.checkinQuestion}</p>
            <div className={styles.numberGrid} role="group" aria-label={words.checkinQuestion}>
              {Array.from({length:11}, (_, i) => <button key={i} type="button" disabled={locked}
                aria-pressed={severity === i} onClick={() => setSeverity(i)}>{i}</button>)}
            </div>
            <div className={styles.rangeCaption}><span>{words.low}</span><span>{words.high}</span></div>
            <p className={styles.helper}>{words.ratingHint}</p>
            {today && <p className={styles.confirmed}><CheckCircle2 size={16}/>{words.saved}</p>}
          </>}

          {slide.kind === 'idea' && <>
            <IllustratedMoment photo/>
            <blockquote className={styles.quote}>“{lesson.aphorism}”</blockquote>
            <p className={styles.instruction}>{lesson.sections?.find(part => part.kind === 'learn')?.text}</p>
          </>}

          {slide.kind === 'recall' && <>
            <IllustratedMoment variant="calm"/>
            <p className={styles.prompt}>{lesson.practiceV3?.recall}</p>
            <p className={styles.helper}>{words.recallHint}</p>
          </>}

          {slide.kind === 'phrase' && <>
            <IllustratedMoment photo variant="books"/>
            <blockquote className={styles.quote}>{lesson.workbook?.workingPosition}</blockquote>
            <p className={styles.helper}>{words.phraseHint}</p>
          </>}

          {slide.kind === 'guided' && <>
            <IllustratedMoment variant="calm"/>
            <p className={styles.prompt}>{slide.section.text}</p>
            <p className={styles.helper}>{words.gentle}</p>
            <div className={styles.preferenceRow} role="group" aria-label={words.guided}>
              <button type="button" disabled={locked}
                aria-pressed={cycle.preferences?.length === 'quick'}
                onClick={() => void updatePreferences({length:'quick'})}>{words.short}</button>
              <button type="button" disabled={locked}
                aria-pressed={cycle.preferences?.length !== 'quick'}
                onClick={() => void updatePreferences({length:'standard'})}>{words.standard}</button>
              <button type="button" disabled={locked}
                aria-pressed={cycle.preferences?.imagery === 'no_imagery'}
                onClick={() => void updatePreferences({imagery:cycle.preferences?.imagery === 'no_imagery' ? 'optional' : 'no_imagery'})}>{words.noImagery}</button>
            </div>
            <details className={styles.timerDetails}><summary><Clock3 size={16}/>{words.optionalTimer}<ChevronDown size={15}/></summary>
              <CourseGuidedTimer key={String(cycle.id) + ':' + String(cycle.day) + ':' + slide.key + ':' + (cycle.preferences?.length || 'standard')}
                seconds={slide.section.seconds || 60} locale={locale}/>
            </details>
          </>}

          {slide.kind === 'ritual' && <>
            <div className={styles.bigIcon}><Leaf size={63} strokeWidth={1.35}/></div>
            <p className={styles.prompt}>{lesson.ritual}</p>
            <p className={styles.helper}>{words.transferHint}</p>
          </>}

          {slide.kind === 'transfer' && <>
            <div className={styles.bigIcon}><ArrowRight size={59} strokeWidth={1.5}/></div>
            <p className={styles.prompt}>{lesson.workbook?.microPractice}</p>
            <p className={styles.helper}>{words.transferHint}</p>
          </>}

          {slide.kind === 'symbol' && <>
            <IllustratedMoment variant="calm"/>
            <div className={styles.modeTabs} role="group" aria-label={words.symbol}>
              <button type="button" aria-pressed={symbolMode === 'words' || cycle.preferences?.imagery === 'no_imagery'}
                onClick={() => setSymbolMode('words')}>{words.words}</button>
              <button type="button" disabled={cycle.preferences?.imagery === 'no_imagery'}
                aria-pressed={symbolMode === 'image' && cycle.preferences?.imagery !== 'no_imagery'}
                onClick={() => setSymbolMode('image')}>{words.imagery}</button>
            </div>
            <p className={styles.prompt}>{symbolMode === 'image' && cycle.preferences?.imagery !== 'no_imagery'
              ? lesson.practiceV4?.invitation : lesson.practiceV4?.withoutImagery}</p>
            <p className={styles.helper}>{words.symbolHint}</p>
          </>}

          {slide.kind === 'reflection' && <>
            <div className={styles.bigIcon}><BookmarkCheck size={61} strokeWidth={1.35}/></div>
            <p className={styles.prompt}>{lesson.workbook?.question || lesson.reflection}</p>
            <label className={styles.noteField}><span>{words.note}</span>
              <textarea maxLength={500} rows={4} value={reflection}
                placeholder={lesson.workbook?.sentenceStarter || ''}
                onChange={event => setReflection(event.target.value)} disabled={locked}/>
            </label>
            <p className={styles.helper}><LockKeyhole size={15}/>{words.reflectionHint}</p>
          </>}

          {slide.kind === 'moment' && <>
            <div className={styles.bigIcon}><Waves size={61} strokeWidth={1.4}/></div>
            <p className={styles.helper}>{words.momentHint}</p>
            <div className={styles.momentFields}>
              <OptionalNumber words={words} value={beforeNow} onChange={setBeforeNow} label={words.before}/>
              <OptionalNumber words={words} value={afterNow} onChange={setAfterNow} label={words.after}/>
            </div>
          </>}

          {slide.kind === 'feedback' && <>
            <IllustratedMoment variant="calm"/>
            <p className={styles.helper}>{words.feedbackHint}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.feedback}>
              {[
                ['helped',words.helped,Heart],
                ['neutral',words.neutral,Leaf],
                ['uncomfortable',words.uncomfortable,ShieldCheck],
                ['skip',words.preferNot,SkipForward],
              ].map(([key,label,ChoiceIcon]) => <button type="button" key={key}
                disabled={locked} aria-pressed={feedback === key}
                onClick={() => setFeedback(key)}>
                <ChoiceIcon size={20} aria-hidden="true"/><span>{label}</span>
                {feedback === key && <Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            <small className={styles.helper}>{words.needSave}</small>
          </>}
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </main>
      <footer className={styles.footer}>
        {!finished && <div className={styles.subactions}>
          {index > 0 && <button type="button" disabled={locked} className={styles.back} onClick={goBack}>
            <ArrowLeft size={16}/>{words.back}</button>}
          {['checkin','guided','ritual','transfer','symbol','moment','reflection'].includes(slide.kind) && <button
            type="button" className={styles.skip} disabled={locked} onClick={goNext}>
            {slide.kind === 'checkin' ? words.skipRating : words.skip}<SkipForward size={14}/></button>}
        </div>}
        <button type="button" className={styles.primary} disabled={locked}
          onClick={finished ? onClose
            : slide.kind === 'checkin' ? () => void saveCheckin()
            : index === slides.length - 1 ? () => void finishLesson()
            : goNext}>
          <span>{finished ? words.seeMap
            : index === slides.length - 1 ? words.finish
            : slide.kind === 'checkin' && Number.isInteger(severity) ? words.saveNext : words.next}</span>
          {finished ? <CheckCircle2 size={19}/> : <ArrowRight size={19}/>}
        </button>
        <p>{words.safety}</p>
      </footer>
    </div>
  </div>
}
