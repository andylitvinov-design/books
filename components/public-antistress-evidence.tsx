import { BookOpenCheck, ArrowUpRight, Brain, ChartNoAxesCombined, ClipboardList, Clock3, HeartHandshake, Leaf, ShieldCheck, Target } from 'lucide-react'
import { antiStressBlueprint } from '@/lib/inner-growth/anti-stress-blueprint'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './public-antistress-evidence.module.css'

const COPY={
  ru:{
    science:'НА ЧЁМ ОСНОВАН КУРС',title:'Семь подходов. Один бережный процесс.',
    intro:'Авторская последовательность образовательных упражнений на основе известных психологических подходов. ОПОРА не представляет собой отдельный клинически валидированный протокол и не заменяет очную помощь.',
    source:'Об источнике',dimensions:'ЧТО ИМЕННО МЫ ИЗМЕРЯЕМ',metricTitle:'Не «процент здоровья», а понятные отдельные параметры',
    metricIntro:'Первый результат — субъективная стрессовая нагрузка за последнюю неделю. Остальные параметры помогают увидеть изменения в восстановлении, повседневных делах, состоянии и доступности поддержки. Направление желательных изменений — лишь ориентир.',
    primary:'ГЛАВНЫЙ ПОКАЗАТЕЛЬ',next:'Дополнительные и контекстные показатели',lower:'меньше обычно желательнее',higher:'больше обычно желательнее',
    battery:'ТЕСТЫ КУРСА',batteryTitle:'Какие тесты предлагаем пройти',batteryIntro:'Тесты выбираются до начала измеряемого курса. Их результаты не подменяются субъективной оценкой одного слайда.',
    core:'Основной',optional:'По желанию',questions:'вопросов',
    timing:'КАЛЕНДАРЬ ИЗМЕРЕНИЙ',timingTitle:'Когда появляются точки сравнения',
    disclosures:'HH Weekly Pulse и HH Resource Pulse — авторские невалидированные опросники самонаблюдения. GAD‑7 — отдельный стандартизированный скрининг тревожных симптомов, а не диагноз. Русский авторский перевод GAD‑7 уже есть в реестре сайта, но не прошёл самостоятельную психометрическую валидацию; результаты должны отображаться с этой оговоркой. Повторение GAD‑7 возможно не раньше чем через 14 суток. Зачисление в измеряемый курс сохраняет действующие правила выбора и прохождения тестов.',
    learning:'ПРОВЕРЯЕМ НЕ ТОЛЬКО БАЛЛЫ',learningTitle:'Как фиксируем семь учебных навыков',
    learningText:'На занятиях 2, 4, 6, 8, 10, 12 и 14 предусмотрены короткие интерактивные пробы. Отдельно отмечаем выбор, подсказку и добровольный самоотчёт о попытке. Сам факт прохождения занятия не является доказательством освоения навыка.',
    disclaimer:'Программа самостоятельной самоподдержки при повседневном стрессе, без экспозиции к травматическим воспоминаниям. При устойчивом, тяжёлом или нарастающем дистрессе обратитесь к квалифицированному специалисту.',
  },
  en:{
    science:'THE FOUNDATIONS',title:'Seven approaches. One gentle learning process.',
    intro:'An original educational sequence inspired by established psychological approaches. OPORA is not itself a clinically validated treatment protocol or a replacement for professional care.',
    source:'Background source',dimensions:'WHAT WE MEASURE',metricTitle:'Clear separate measures, not a “mental health percentage”',
    metricIntro:'The primary outcome is perceived stress load over the previous seven days. Other measures show separate patterns in recovery, everyday functioning, emotions and available support. Desired directions are not promised results.',
    primary:'PRIMARY OUTCOME',next:'Additional and contextual measures',lower:'a lower value is generally preferred',higher:'a higher value is generally preferred',
    battery:'COURSE QUESTIONNAIRES',batteryTitle:'Which tests are used',batteryIntro:'Assessments are chosen before the measurable course begins. A quick daily choice never replaces a validated questionnaire.',
    core:'Core',optional:'Optional',questions:'questions',
    timing:'MEASUREMENT SCHEDULE',timingTitle:'When scores may be compared',
    disclosures:'HH Weekly Pulse and HH Resource Pulse are original, non-validated self-observation instruments. GAD‑7 is an independent standardised anxiety symptom screener, not a diagnosis. The site also has an original Russian translation, but it has not been independently psychometrically validated. GAD‑7 cannot be repeated as a comparable measure sooner than 14 days. Existing test-selection and completion requirements still apply to measurable courses.',
    learning:'SKILLS ARE NOT TEST SCORES',learningTitle:'How the seven educational skills are checked',
    learningText:'Short practice checks are planned on days 2, 4, 6, 8, 10, 12 and 14. Choices, optional hints and self-reported attempts are recorded separately. Finishing a lesson alone does not demonstrate skill mastery.',
    disclaimer:'Self-guided learning for everyday stress, without exposure to traumatic memories. Seek qualified care for severe, persistent or worsening distress.',
  },
  es:{
    science:'FUNDAMENTOS',title:'Siete enfoques. Un proceso amable.',
    intro:'Una secuencia educativa original inspirada en enfoques psicológicos existentes. OPORA no es por sí misma un tratamiento clínico validado ni reemplaza la atención profesional.',
    source:'Fuente',dimensions:'QUÉ MEDIMOS',metricTitle:'Medidas separadas, no un porcentaje de salud mental',
    metricIntro:'El indicador principal es la sobrecarga de estrés en los últimos siete días. Las demás escalas muestran recuperación, vida cotidiana, emociones y apoyo disponible.',
    primary:'INDICADOR PRINCIPAL',next:'Otras medidas',lower:'menor suele ser preferible',higher:'mayor suele ser preferible',
    battery:'CUESTIONARIOS',batteryTitle:'Qué pruebas utilizamos',batteryIntro:'Las pruebas se eligen antes del curso medible. Los ejercicios diarios no sustituyen cuestionarios.',
    core:'Principal',optional:'Opcional',questions:'preguntas',
    timing:'CALENDARIO',timingTitle:'Cuándo comparar resultados',
    disclosures:'HH Weekly Pulse y HH Resource Pulse son autoinformes originales no validados. GAD‑7 es un cribado de síntomas, no un diagnóstico, y tiene una traducción rusa original no validada de forma independiente. GAD‑7 requiere al menos 14 días antes de una repetición comparable. Se mantienen las condiciones actuales de inicio del curso.',
    learning:'MÁS QUE PUNTUACIONES',learningTitle:'Cómo observamos las siete habilidades',
    learningText:'Hay pequeñas prácticas de habilidad en los días 2, 4, 6, 8, 10, 12 y 14. Se distinguen las elecciones, las pistas y los intentos descritos por el participante.',
    disclaimer:'Educación para manejar el estrés cotidiano sin volver a recuerdos traumáticos. Consulta a un profesional ante síntomas intensos o persistentes.',
  },
} as const
const approachIcons=[ShieldCheck,Leaf,Brain,BookOpenCheck,HeartHandshake,Target,ChartNoAxesCombined] as const

export function PublicAntistressEvidence({locale}:{locale:PublicLocale}){
  const lang=locale==='ru'||locale==='es'?locale:'en'
  const text=COPY[lang],data=antiStressBlueprint(lang)
  const prim=data.metrics.find(item=>item.tier==='primary')
  const other=data.metrics.filter(item=>item.tier!=='primary')
  return <>
    <section className={styles.section} id="methodologies" data-antistress-methodologies aria-labelledby="opora-methodology-title">
      <header className={styles.heading}>
        <p>{text.science}</p><h2 id="opora-methodology-title">{text.title}</h2><span>{text.intro}</span>
      </header>
      <div className={styles.approachGrid}>
        {data.approaches.map((approach,index)=>{
          const Icon=approachIcons[index]||Leaf
          return <article className={styles.approachCard} key={approach.id} data-method={approach.id}>
            <div className={styles.approachHeader}>
              <span className={styles.approachIcon}><Icon size={22} aria-hidden="true"/></span>
              <span className={styles.approachIndex}>{String(index+1).padStart(2,'0')}</span>
            </div>
            <h3>{approach.title}</h3>
            <p>{approach.explanation}</p>
            <a href={approach.reference} rel="noopener noreferrer" target="_blank">
              {text.source}<ArrowUpRight size={15} aria-hidden="true"/>
            </a>
          </article>
        })}
      </div>
      <p className={styles.safetyLine}><ShieldCheck size={18} aria-hidden="true"/>{text.disclaimer}</p>
    </section>

    <section className={styles.section} id="measurements" data-antistress-measurements aria-labelledby="opora-measure-title">
      <header className={styles.heading}>
        <p>{text.dimensions}</p><h2 id="opora-measure-title">{text.metricTitle}</h2><span>{text.metricIntro}</span>
      </header>
      {prim&&<div className={styles.primaryMetric} data-metric-primary={prim.id}>
        <Target size={28} aria-hidden="true"/><div><small>{text.primary}</small><h3>{prim.label}</h3><p>{prim.why}</p></div>
      </div>}
      <h3 className={styles.subheading}>{text.next}</h3>
      <div className={styles.metricGrid}>
        {other.map(metric=><article className={styles.metricCard} key={metric.id} data-measured-axis={metric.id}>
          <span className={metric.direction==='down'?styles.arrowDown:styles.arrowUp} aria-hidden="true">{metric.direction==='down'?'↘':'↗'}</span>
          <div><h4>{metric.label}</h4><p>{metric.why}</p><small>{metric.direction==='down'?text.lower:text.higher}</small></div>
        </article>)}
      </div>
      <header className={styles.heading}>
        <p>{text.battery}</p><h2>{text.batteryTitle}</h2><span>{text.batteryIntro}</span>
      </header>
      <div className={styles.tests}>
        {data.tests.map(test=><article className={styles.testCard} key={test.key} data-antistress-test={test.key}>
          <div className={styles.testTop}><ClipboardList size={21}/><span>{test.role==='core'?text.core:text.optional}</span></div>
          <h3>{test.title}</h3>
          <p>{test.note}</p>
          <span className={styles.questionCount}>{test.count} {text.questions}</span>
        </article>)}
      </div>
      <section className={styles.timeline} aria-label={text.timing}>
        <header><Clock3 size={23} aria-hidden="true"/><div><small>{text.timing}</small><h3>{text.timingTitle}</h3></div></header>
        <ol>{data.schedule.map((point,index)=><li key={index}><strong>{point.when}</strong><span>{point.what}</span></li>)}</ol>
      </section>
      <section className={styles.skillCheck}>
        <div className={styles.skillIcon}><BookOpenCheck size={28} aria-hidden="true"/></div>
        <div><small>{text.learning}</small><h3>{text.learningTitle}</h3><p>{text.learningText}</p></div>
      </section>
      <p className={styles.disclaimer}>{text.disclosures}</p>
    </section>
  </>
}
