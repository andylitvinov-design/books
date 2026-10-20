import { BookOpen, ChevronDown, Clock3, Leaf } from 'lucide-react'
import { coursePreEnrolmentPlan } from '@/lib/inner-growth/course-pre-enrolment'
import { antiStressBlueprint } from '@/lib/inner-growth/anti-stress-blueprint'
import { oporaRecoveryStages, OPORA_ENTRY_AND_EXIT } from '@/lib/inner-growth/antistress-recovery-pathway'
import { moduleDayMeta } from '@/lib/inner-growth/antistress-module-lessons'
import { antistressModuleTitle } from '@/lib/inner-growth/antistress-module-router'
import styles from './course-14-day-overview.module.css'

const COPY = {
  en: {
    eyebrow: 'THE 14-DAY JOURNEY',
    title: 'What happens during the 14 days?',
    intro: 'A clear journey from understanding your reactions to practising small, useful choices in everyday life.',
    daily: 'One lesson each day · 8–12 min',
    days: 'Days',
    day: 'Day',
    allDays: 'See the plan for each of the 14 days',
    allDaysHint: 'Short topics for each daily lesson',
    optional: 'Each day includes a before/after 0–10 self-rating, a gentle practice and an optional real-life step. At the end of day 14, you can repeat the same tests you chose before starting to review comparable scores. Participation and retesting are optional.',
    notTreatment: 'Self-guided education and reflection, not diagnosis or a substitute for professional care.',
  },
  ru: {
    eyebrow: 'ПРОГРАММА · 14 ДНЕЙ',
    title: 'Что вас ждёт за 14 дней?',
    intro: 'Понятный путь от изучения своих реакций к небольшим полезным действиям в повседневной жизни.',
    daily: 'Один урок в день · 8–12 минут',
    days: 'Дни',
    day: 'День',
    allDays: 'Посмотреть план каждого из 14 дней',
    allDaysHint: 'Краткая тема каждого ежедневного урока',
    optional: 'Каждый день: добровольный замер до и после по шкале 0–10, небольшая практика и шаг в жизни. В конце 14-го дня предлагаем повторить те же тесты, что были выбраны перед началом, и сравнить совместимые результаты. Повторение — по желанию.',
    notTreatment: 'Самостоятельное обучение и рефлексия, не диагноз и не замена профессиональной помощи.',
  },
}

const STRESS = {
  en: { title:'Seven practical skills · 14 days',
    intro:'Learn seven core skills during week one, then use each again with greater independence in week two. Other specialist routes keep their own lesson sequence.',
    allDays:'All 14 daily exercises and results',
    hint:'Exercises, outcomes and related measurements',
    practice:'Exercise', result:'Observable learning result', scales:'Related scales', check:'Skill check',
    screens:'15 short interactive steps per lesson', tests:'Measurement: Weekly Pulse (8 questions) before and after; optional eligible GAD-7. Practice choices are tracked separately from symptom scores.' },
  ru: { title:'7 практических навыков · 14 занятий',
    intro:'Первая неделя — семь ключевых навыков. Вторая — повтор тех же навыков с большей самостоятельностью. Остальные специализированные маршруты сохраняют собственную последовательность.',
    allDays:'Практики и результаты всех 14 дней',
    hint:'Упражнения, результаты и связанные шкалы',
    practice:'Упражнение',result:'Ожидаемый результат',scales:'Связанные шкалы',check:'Проверка навыка',
    screens:'15 коротких интерактивных экранов в каждом уроке', tests:'Измерение: Weekly Pulse (8 вопросов) до и после курса, GAD-7 дополнительно при подходящем языке и сроке. Навыки оцениваются отдельно от симптомов.' },
  es: { title:'Siete habilidades prácticas · 14 días',
    intro:'Primera semana: aprende siete habilidades. Segunda semana: practícalas con mayor autonomía. Las otras rutas mantienen su propio plan.',
    allDays:'Ejercicios y resultados de los 14 días',
    hint:'Ejercicios, resultados y medidas relacionadas',
    practice:'Ejercicio',result:'Resultado observable',scales:'Escalas relacionadas',check:'Prueba de habilidad',
    screens:'15 pantallas interactivas breves por lección', tests:'Medición: Weekly Pulse antes y después; GAD-7 opcional cuando corresponda. Las habilidades no se confunden con los síntomas.' },
}
export default function Course14DayOverview({ locale = 'en', compact = false, programId = '', moduleId = '', routerVersion = '' }) {
  const t = COPY[locale] || COPY.en
  const st=STRESS[locale]||STRESS.en
  const stress=programId==='stress'
  const blueprint=stress?antiStressBlueprint(locale):null
  // The old NAV-1.3 module-specific curriculum and labels remain pinned for existing cycles.
  const legacyModulePreview=stress&&Boolean(moduleId)&&moduleId!=='AS2'
  const groups=stress ? (legacyModulePreview
    ? oporaRecoveryStages(locale).map(stage=>({id:stage.id,start:stage.days[0],end:stage.days[1],title:stage.title,summary:stage.description}))
    : blueprint.skills.map(skill=>({id:skill.id,start:skill.days[0],end:skill.days[1],title:skill.title,summary:skill.description})))
    : coursePreEnrolmentPlan(locale)
  const chosenTitle=stress&&moduleId?antistressModuleTitle(moduleId,locale,routerVersion):null
  const days=stress ? blueprint.days.map(day=>{
    const adapted=legacyModulePreview?moduleDayMeta(moduleId,day.day,locale,routerVersion):null
    return adapted?{...day,title:adapted.title,exercise:adapted.exercise,skill:legacyModulePreview?groups[Math.floor((day.day-1)/2)]?.title||day.skill:day.skill,adapted:true}:day
  }) : groups.flatMap(group=>group.days)
  return <section className={styles.overview} data-course-14-day-overview
    data-course-before-signup={compact ? 'guest' : 'intro'}
    aria-label={stress?st.title:t.title}>
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <span className={styles.kicker}><Leaf size={14} aria-hidden="true"/>{t.eyebrow}</span>
        <h2>{stress?st.title:t.title}</h2>
        <p>{stress?st.intro:t.intro}</p>
      </div>
      <span className={styles.duration}><Clock3 size={16} aria-hidden="true"/>{t.daily}</span>
    </header>
    {stress&&<p className={styles.assessmentRail} data-antistress-baseline-before-days><strong>00 · {OPORA_ENTRY_AND_EXIT.entry[locale]||OPORA_ENTRY_AND_EXIT.entry.en}</strong>{chosenTitle&&<span>{locale==='ru'?'Выбранный маршрут':locale==='es'?'Ruta elegida':'Selected route'}: {chosenTitle}</span>}</p>}
    <div className={styles.phases} role={stress ? undefined : 'list'} aria-label={t.title}>
      {groups.map((group, index) => stress ? (
        <details className={`${styles.phase} ${styles.phaseExpandable}`} key={group.id}
          data-course-phase={group.id} data-course-skill-accordion={index + 1}>
          <summary className={styles.phaseSummary}>
            <span className={styles.phaseNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.phaseBody}>
              <span className={styles.phaseRange}>{legacyModulePreview?t.days:t.day} {group.start} {legacyModulePreview?'–':'+'} {group.end}</span>
              <strong>{group.title}</strong>
            </span>
            <ChevronDown className={styles.phaseChevron} size={18} aria-hidden="true" />
          </summary>
          <div className={styles.phaseDetails}>
            <p>{group.summary}</p>
            <div className={styles.phaseLessons}>
              {days.filter(day => day.day === group.start || day.day === group.end).map(day => (
                <p key={day.day}>
                  <span>{t.day} {day.day}</span><strong>{day.title}</strong>
                </p>
              ))}
            </div>
          </div>
        </details>
      ) : (
        <article role="listitem" className={styles.phase} key={group.id} data-course-phase={group.id}>
          <div className={styles.phaseTop}>
            <span className={styles.phaseRange}>{t.days} {group.start}–{group.end}</span>
            <span className={styles.phaseIndex} aria-hidden="true">{index + 1}<span>/{groups.length}</span></span>
          </div>
          <h3>{group.title}</h3><p>{group.summary}</p>
        </article>
      ))}
    </div>
    <details className={styles.dayDisclosure} data-course-14-day-list>
      <summary className={styles.dayToggle}>
        <BookOpen size={19} aria-hidden="true"/>
        <span><strong>{stress?st.allDays:t.allDays}</strong><small>{stress?st.hint:t.allDaysHint}</small></span>
        <ChevronDown size={18} className={styles.toggleIcon} aria-hidden="true"/>
      </summary>
      <ol className={styles.daysList}>
        {days.map(day=><li key={day.day} data-course-day={day.day} className={stress?styles.stressDay:undefined}>
          {stress ? <details className={styles.dayExercise} data-antistress-day-schema={day.day}>
            <summary><span className={styles.dayNumber}>{String(day.day).padStart(2,'0')}</span>
              <span className={styles.dayName}>{day.title}<small>{day.skill}</small></span>
              {day.checkDay&&<span className={styles.dayCheck}>{st.check}</span>}
              <ChevronDown size={15} aria-hidden="true"/>
            </summary>
            <div className={styles.dayExerciseContent}>
              <p><strong>{st.practice}:</strong> {day.exercise}</p>
              <p><strong>{st.result}:</strong> {day.adapted?(locale==='ru'?'Опробовать подходящий способ и выбрать: продолжить, упростить, отдохнуть или пропустить.':locale==='es'?'Probar una opción adecuada y poder continuar, simplificar, descansar u omitir.':'Try an acceptable choice and decide to continue, simplify, rest or skip.'):day.result}</p>
              {!day.adapted&&<p data-methods-for-day={day.day}><strong>{locale==='ru'?'Методики занятия':locale==='es'?'Métodos de la lección':'Lesson methods'}:</strong> {day.methodNames.slice(0,3).join(' · ')}</p>}
              {!day.adapted&&day.methodStatus!=='implemented'&&<small>{locale==='ru'?'Разные упражнения внедряются поэтапно; текущие уроки уже содержат основную практику и самостоятельный выбор.':locale==='es'?'Los formatos interactivos avanzados se añaden progresivamente.':'Additional interactive formats are being introduced progressively.'}</small>}
              {!day.adapted&&<div className={styles.axisList} aria-label={st.scales}>
                {day.scales.map(axis=><span key={axis.id}>{axis.label}</span>)}
              </div>}
              {!day.adapted&&!compact&&<details className={styles.screenDetails}>
                <summary>{st.screens}</summary>
                <ol>{day.screens.map(screen=><li key={screen.number}>
                  <span>{screen.number}</span><span>{screen.expected}</span>
                </li>)}</ol>
              </details>}
            </div>
          </details> : <>
            <span className={styles.dayNumber}>{String(day.day).padStart(2,'0')}</span>
            <span className={styles.dayName}>{day.title}</span>
          </>}
        </li>)}
      </ol>
    </details>
    {stress&&<p className={styles.assessmentRail} data-antistress-retest-after-days><strong>08 · {OPORA_ENTRY_AND_EXIT.exit[locale]||OPORA_ENTRY_AND_EXIT.exit.en}</strong><span>{OPORA_ENTRY_AND_EXIT.note[locale]||OPORA_ENTRY_AND_EXIT.note.en}</span></p>}
    <p className={styles.footnote}>{stress?st.tests:t.optional} <span>{t.notTreatment}</span></p>
  </section>
}
