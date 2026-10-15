import { ANTISTRESS_MODULE_GOALS } from '@/lib/inner-growth/antistress-module-router'
import styles from './antistress-module-journey.module.css'

// Six educational learning phases; stage AS4 requires qualified clinical care.
// Public content deliberately contains no scores, diagnosis or individual data.
const WORDS = {
  ru: {
    overline: 'ОДНА ПРОГРАММА · ШЕСТЬ ЭТАПОВ',
    title: 'Сначала тесты — затем ваш Антистресс',
    intro: 'После регистрации пройдите недельный опрос о состоянии и восемь коротких вопросов о навыках. Система предложит подходящий 14-дневный модуль, объяснит почему и спросит ваше согласие. Курс предлагается по целям и доступности навыков; нагрузка влияет на темп. Четвёртый этап доступен только с квалифицированным специалистом.',
    process: [
      ['01', 'Знакомство', 'Запись в одну программу «Антистресс»'],
      ['02', 'Стартовые тесты', 'HH Weekly Pulse — 8 вопросов, затем Module Finder — 8'],
      ['03', 'Ваш выбор', 'Рекомендованный модуль + причина + другой вариант'],
      ['04', 'Практика 14 дней', 'Свои упражнения, навыки, итог и следующий шаг'],
    ],
    duration: '14 дней практик',
    special: 'Подбор не является диагнозом и не заменяет профессиональную помощь.',
    example: 'Ниже — подробный пример модуля «Антистресс 2». Остальные модули имеют собственные темы и упражнения.',
  },
  en: {
    overline: 'ONE PROGRAMME · SIX COURSES',
    title: 'Assess first. Then find your Anti-Stress module.',
    intro: 'After enrolling, complete your seven-day self-report and eight short skill questions. The system suggests a 14-day module, explains why and asks for your choice. The six courses address learning goals, not diagnosed trauma stages; the fourth requires qualified clinician support.',
    process: [
      ['01', 'Join', 'One Anti-Stress programme enrollment'],
      ['02', 'Starting assessments', '8 Weekly Pulse questions, then 8 Module Finder items'],
      ['03', 'Choose your module', 'A suggestion, the reasons and a safe alternative'],
      ['04', 'Practise for 14 days', 'Distinct exercises, learning goals and a follow-up option'],
    ],
    duration: '14 practice days',
    special: 'Suggestions are educational, not a diagnosis or a substitute for professional care.',
    example: 'The detailed 14-day curriculum below previews Anti-Stress 2. Each other module has its own exercises and themes.',
  },
  es: {
    overline: 'UN PROGRAMA · SEIS CURSOS',
    title: 'Primero evalúa tus necesidades. Después elige tu módulo.',
    intro: 'Tras inscribirte, completa ocho preguntas sobre la última semana y ocho sobre habilidades. El sistema sugiere un módulo de 14 días, explica por qué y te pide confirmación. Los seis cursos se eligen según habilidades y objetivos; el cuarto requiere especialista.',
    process: [
      ['01', 'Inscripción', 'Un solo programa de Antiestrés'],
      ['02', 'Evaluaciones', '8 preguntas Weekly Pulse y 8 de Module Finder'],
      ['03', 'Tu elección', 'Una sugerencia explicada y una alternativa'],
      ['04', '14 días de prácticas', 'Ejercicios propios y evaluación final opcional'],
    ],
    duration: '14 días de prácticas',
    special: 'Las sugerencias son educativas, no diagnósticos ni sustituyen la atención profesional.',
    example: 'El plan detallado siguiente muestra el módulo Antiestrés 2. Los demás tienen prácticas y temas distintos.',
  },
}
export default function AntiStressModuleJourney({locale='en',sectionId='antistress-modules'}) {
  const lang = ['ru','en','es'].includes(locale) ? locale : 'en'
  const t = WORDS[lang]
  return (
    <section className={styles.root} id={sectionId} aria-labelledby={sectionId+'-heading'} data-opora-six-modules>
      <header className={styles.header}>
        <p className={styles.overline}>{t.overline}</p>
        <h2 id={sectionId+'-heading'}>{t.title}</h2>
        <p>{t.intro}</p>
      </header>
      <ol className={styles.process} aria-label={t.title}>
        {t.process.map(([number,title,description])=>
          <li className={styles.step} key={number}>
            <span className={styles.stepNumber} aria-hidden="true">{number}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </li>
        )}
      </ol>
      <div className={styles.modules}>
        {ANTISTRESS_MODULE_GOALS.map((item,index)=>
          <article className={styles.module} key={item.id} data-opora-module-id={item.id}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleNumber}>{String(index+1).padStart(2,'0')}</span>
              <span className={styles.moduleDuration}>{t.duration}</span>
            </div>
            <h3>{item.title[lang]||item.title.en}</h3>
            <p>{item.short[lang]||item.short.en}</p>
          </article>
        )}
      </div>
      <p className={styles.boundary}>{t.special}</p>
      <p className={styles.example}>{t.example}</p>
    </section>
  )
}
