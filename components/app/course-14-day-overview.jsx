import { BookOpen, ChevronDown, Clock3, Leaf } from 'lucide-react'
import { coursePreEnrolmentPlan } from '@/lib/inner-growth/course-pre-enrolment'
import { antiStressBlueprint } from '@/lib/inner-growth/anti-stress-blueprint'
import styles from './course-14-day-overview.module.css'

const COPY = {
  en: {
    eyebrow: 'THE 14-DAY JOURNEY',
    title: 'What happens during the 14 days?',
    intro: 'A clear journey from understanding your reactions to practising small, useful choices in everyday life.',
    daily: 'One lesson each day · 5–12 min',
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
    daily: 'Один урок в день · 5–12 минут',
    days: 'Дни',
    day: 'День',
    allDays: 'Посмотреть план каждого из 14 дней',
    allDaysHint: 'Краткая тема каждого ежедневного урока',
    optional: 'Каждый день: добровольный замер до и после по шкале 0–10, небольшая практика и шаг в жизни. В конце 14-го дня предлагаем повторить те же тесты, что были выбраны перед началом, и сравнить совместимые результаты. Повторение — по желанию.',
    notTreatment: 'Самостоятельное обучение и рефлексия, не диагноз и не замена профессиональной помощи.',
  },
}

const STRESS = {
  en: { title:'Seven skills for steadier days',
    intro:'Every two days explore one skill. Open a stage to preview the two lessons, or see all 14 exercises below.',
    allDays:'All 14 daily exercises and results',
    hint:'Exercises, outcomes and related measurements',
    practice:'Exercise', result:'Observable learning result', scales:'Related scales', check:'Skill check',
    screens:'The 15 learning + 3 closing screens', tests:'Measurement: Weekly Pulse (8 questions) before and after; optional eligible GAD-7. Practice choices are tracked separately from symptom scores.' },
  ru: { title:'Ваши 7 навыков опоры',
    intro:'Каждые два дня — один навык. Раскройте этап, чтобы увидеть занятия, или посмотрите упражнения всех 14 дней ниже.',
    allDays:'Практики и результаты всех 14 дней',
    hint:'Упражнения, результаты и связанные шкалы',
    practice:'Упражнение',result:'Ожидаемый результат',scales:'Связанные шкалы',check:'Проверка навыка',
    screens:'15 учебных + 3 завершающих интерактивных слайда', tests:'Измерение: Weekly Pulse (8 вопросов) до и после курса, GAD-7 дополнительно при подходящем языке и сроке. Навыки оцениваются отдельно от симптомов.' },
  es: { title:'Siete habilidades de apoyo',
    intro:'Dos días para cada habilidad. Abre una etapa para ver sus lecciones y ejercicios.',
    allDays:'Ejercicios y resultados de los 14 días',
    hint:'Ejercicios, resultados y medidas relacionadas',
    practice:'Ejercicio',result:'Resultado observable',scales:'Escalas relacionadas',check:'Prueba de habilidad',
    screens:'15 pasos de práctica + 3 de cierre', tests:'Medición: Weekly Pulse antes y después; GAD-7 opcional cuando corresponda. Las habilidades no se confunden con los síntomas.' },
}
export default function Course14DayOverview({ locale = 'en', compact = false, programId = '' }) {
  const t = COPY[locale] || COPY.en
  const st=STRESS[locale]||STRESS.en
  const stress=programId==='stress'
  const blueprint=stress?antiStressBlueprint(locale):null
  const groups=stress ? blueprint.skills.map(skill=>({
    id:skill.id,start:skill.days[0],end:skill.days[1],title:skill.title,summary:skill.description,
  })) : coursePreEnrolmentPlan(locale)
  const days=stress ? blueprint.days : groups.flatMap(group=>group.days)
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
    <div className={styles.phases} role={stress ? undefined : 'list'} aria-label={stress ? st.title : t.title}>
      {groups.map((group, index) => stress ? (
        <details className={`${styles.phase} ${styles.phaseExpandable}`} key={group.id}
          data-course-phase={group.id} data-course-skill-accordion={index + 1}>
          <summary className={styles.phaseSummary}>
            <span className={styles.phaseNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.phaseBody}>
              <span className={styles.phaseRange}>{t.days} {group.start}–{group.end}</span>
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
              <p><strong>{st.result}:</strong> {day.result}</p>
              <p data-methods-for-day={day.day}><strong>{locale==='ru'?'Методики занятия':locale==='es'?'Métodos de la lección':'Lesson methods'}:</strong> {day.methodNames.slice(0,3).join(' · ')}</p>
              {day.methodStatus!=='implemented'&&<small>{locale==='ru'?'Разные упражнения внедряются поэтапно; текущие уроки уже содержат основную практику и самостоятельный выбор.':locale==='es'?'Los formatos interactivos avanzados se añaden progresivamente.':'Additional interactive formats are being introduced progressively.'}</small>}
              <div className={styles.axisList} aria-label={st.scales}>
                {day.scales.map(axis=><span key={axis.id}>{axis.label}</span>)}
              </div>
              {!compact&&<details className={styles.screenDetails}>
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
    <p className={styles.footnote}>{stress?st.tests:t.optional} <span>{t.notTreatment}</span></p>
  </section>
}
