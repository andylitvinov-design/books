'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { AcquisitionEventLink } from '@/components/acquisition-event-link'
import { businessConsultingCopy } from '@/data/business-consulting-copy'
import { BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_OUTCOMES, BUSINESS_FINDER_FORMATS, suggestBusinessConsultation } from '@/lib/business-consulting/consultation-finder'
import styles from './business-consultation-finder.module.css'

type Locale = 'en' | 'ru' | 'es'
type Area = 'business' | 'money' | 'personal' | 'project'
type Outcome = 'gentle' | 'one-step' | 'deeper' | 'ongoing'
type Format = 'free' | 'express' | 'full' | 'mentoring'
type Choice = { label: string; detail: string }

const areas: Area[] = ['business', 'money', 'personal', 'project']
const outcomes = BUSINESS_FINDER_OUTCOMES as readonly Outcome[]
const formats = BUSINESS_FINDER_FORMATS as readonly Format[]

const words: Record<Locale, {
  eyebrow: string; title: string; lead: string; steps: string; stepOne: string; stepTwo: string; stepThree: string;
  stepOneHelp: string; stepTwoHelp: string; stepThreeHelp: string; awaiting: string; match: string;
  matchHint: string; approach: string; available: string; selection: string; request: string; detail: string;
  privacy: string; noBooking: string; context: string; concern: string; wanted: string;
  mentoringFee: string; reasons: Record<Format, string>;
  areas: Record<Area, Choice>; issues: Record<string, Choice>; outcomes: Record<Outcome, Choice>;
}> = {
  en: {
    eyebrow: '3 QUICK QUESTIONS',
    title: 'Find your consultation in 1 minute',
    lead: 'Choose a topic and answer two more questions. You can change the suggested format.',
    steps: 'Questions answered', stepOne: 'What is your question mostly about?', stepTwo: 'What feels hardest right now?', stepThree: 'What would help you most?',
    stepOneHelp: 'There is no wrong choice.', stepTwoHelp: 'Choose the closest option; you can explain it in your own words when requesting a session.',
    stepThreeHelp: 'This helps suggest a starting format, not a diagnosis.', awaiting: 'Your suggestion will appear after three short choices.',
    match: 'A possible starting point', matchHint: 'Based only on the options you selected. You remain free to choose any format.',
    approach: 'Focus for your conversation', available: 'Other available formats', selection: 'Selected',
    request: 'Continue to the enquiry form below', detail: 'See the full consultation details',
    privacy: 'Your choices stay on this page until you decide to submit the consent-based enquiry form.',
    noBooking: 'An enquiry is not a confirmed appointment or payment. Andrey confirms details personally. No financial results are promised.',
    context: 'Area', concern: 'Question', wanted: 'Desired next step',
    mentoringFee: 'Price and schedule by arrangement',
    reasons: {
      free: 'A written first look may help you organise the question before choosing a paid conversation. No live call is included.',
      express: 'One focused question is often a good fit for a 30-minute discussion of choices and your next action.',
      full: 'There are several connected parts to explore; 60 minutes leaves more room to map roles, obstacles and practical next steps.',
      mentoring: 'If you would like to review progress over time, you can ask about individually agreed follow-up sessions.'
    },
    areas: {
      business: {label: 'Business & work', detail: 'Strategy, clients, leadership, decisions'},
      money: {label: 'Money & income', detail: 'Pricing, uncertainty, money-related choices'},
      personal: {label: 'For myself', detail: 'Confidence, focus, motivation, balance'},
      project: {label: 'My project / own venture', detail: 'Starting, building, collaborating, moving forward'},
    },
    issues: {
      strategy: {label: 'Where to take the business',detail: 'Too many directions or a difficult decision'},
      sales: {label: 'Sales or positioning',detail: 'Offer, clients, value and market fit'},
      team: {label: 'People, roles and partners',detail: 'Collaboration or repeated friction'},
      decisions: {label: 'Making a clear decision',detail: 'Weighing options and deciding what comes first'},
      income: {label: 'Unstable income',detail: 'Understanding a practical next step'},
      pricing: {label: 'Pricing my work',detail: 'Value, boundaries and talking about price'},
      'money-decisions': {label: 'A money-related decision',detail: 'Different possibilities and uncertainty'},
      'money-pressure': {label: 'Pressure around money',detail: 'How money concerns influence decisions'},
      confidence: {label: 'Confidence in myself',detail: 'Doubt around my professional role'},
      focus: {label: 'Focus and follow-through',detail: 'I plan, but find it difficult to start'},
      'work-balance': {label: 'Pressure and energy',detail: 'Carrying too much responsibility'},
      direction: {label: 'Personal direction',detail: 'Reconsidering goals or next steps'},
      launch: {label: 'Starting something new',detail: 'From an idea to the first real action'},
      priorities: {label: 'A plan and priorities',detail: 'What should I work on first?'},
      partnership: {label: 'My collaborators',detail: 'Roles, responsibilities and expectations'},
      stuck: {label: 'A stalled project',detail: 'Something keeps stopping progress'},
    },
    outcomes: {
      gentle: {label: 'First, a gentle written review',detail: 'I would like to organise my thoughts'},
      'one-step': {label: 'Clarify one decision',detail: 'I want a concrete next action'},
      deeper: {label: 'Explore the whole situation',detail: 'I need more space for patterns and choices'},
      ongoing: {label: 'Support over time',detail: 'I want to revisit goals and progress'},
    },
  },
  ru: {
    eyebrow: '3 КОРОТКИХ ВОПРОСА',
    title: 'Подберите консультацию за минуту',
    lead: 'Выберите тему и ответьте ещё на два вопроса. Рекомендацию можно изменить.',
    steps: 'Ответов на вопросы', stepOne: 'О чём прежде всего ваш запрос?', stepTwo: 'Что сейчас сложнее всего?', stepThree: 'Какая помощь была бы полезнее?',
    stepOneHelp: 'Здесь нет неправильных ответов.', stepTwoHelp: 'Выберите самое близкое; подробнее можно описать ситуацию в заявке.',
    stepThreeHelp: 'Это помогает подобрать стартовый формат, а не поставить диагноз.', awaiting: 'После трёх коротких ответов появится предложение.',
    match: 'Возможный формат для начала', matchHint: 'Подсказка основана только на вашем выборе. Любой формат можно изменить.',
    approach: 'Тема вашей консультации', available: 'Другие доступные форматы', selection: 'Выбрано',
    request: 'Перейти к заявке внизу страницы', detail: 'Подробнее о консультациях',
    privacy: 'Ваши ответы остаются на этой странице, пока вы сами не решите отправить заявку с согласием на связь.',
    noBooking: 'Заявка ещё не означает запись или оплату. Андрей согласует детали лично. Финансовые результаты не гарантируются.',
    context: 'Сфера', concern: 'Вопрос', wanted: 'Ожидаемая помощь',
    mentoringFee: 'Стоимость и график — по договорённости',
    reasons: {
      free: 'Можно начать с бесплатного письменного разбора, чтобы сформулировать вопрос. Живой созвон в него не входит.',
      express: 'Для одного решения часто достаточно 30-минутного разговора о вариантах и ближайшем действии.',
      full: 'Здесь может быть несколько связанных факторов; за 60 минут получится подробнее обсудить роли, препятствия и практические шаги.',
      mentoring: 'Если нужна поддержка в процессе работы, можно договориться об индивидуальных повторных встречах.'
    },
    areas: {
      business: {label: 'Бизнес и работа',detail: 'Стратегия, клиенты, руководство, решения'},
      money: {label: 'Деньги и доход',detail: 'Цена, неопределённость, финансовый выбор'},
      personal: {label: 'Для себя',detail: 'Уверенность, концентрация, мотивация, баланс'},
      project: {label: 'Для своего дела',detail: 'Запуск, развитие, партнёрство, движение вперёд'},
    },
    issues: {
      strategy: {label: 'Куда развивать бизнес',detail: 'Много направлений или сложный выбор'},
      sales: {label: 'Продажи и позиционирование',detail: 'Предложение, клиенты, ценность услуги'},
      team: {label: 'Команда и партнёры',detail: 'Сотрудничество или повторяющиеся конфликты'},
      decisions: {label: 'Принять важное решение',detail: 'Сравнить варианты и выбрать главное'},
      income: {label: 'Нестабильный доход',detail: 'Понять ближайшие практические шаги'},
      pricing: {label: 'Оценить свой труд',detail: 'Цена, личные границы, разговор о деньгах'},
      'money-decisions': {label: 'Денежное решение',detail: 'Несколько вариантов и сомнения'},
      'money-pressure': {label: 'Напряжение из-за денег',detail: 'Как переживания влияют на выбор'},
      confidence: {label: 'Уверенность в себе',detail: 'Сомнения в своей профессиональной роли'},
      focus: {label: 'Фокус и доведение до конца',detail: 'Есть планы, но трудно начать'},
      'work-balance': {label: 'Нагрузка и энергия',detail: 'Слишком много ответственности'},
      direction: {label: 'Личное направление',detail: 'Переосмысление целей и следующих шагов'},
      launch: {label: 'Начать новое дело',detail: 'Перевести идею в реальные действия'},
      priorities: {label: 'План и приоритеты',detail: 'За что взяться в первую очередь'},
      partnership: {label: 'Взаимодействие с партнёрами',detail: 'Роли, ответственность, ожидания'},
      stuck: {label: 'Проект остановился',detail: 'Что мешает перейти к действию'},
    },
    outcomes: {
      gentle: {label: 'Сначала письменный разбор',detail: 'Хочу спокойно сформулировать вопрос'},
      'one-step': {label: 'Прояснить одно решение',detail: 'Нужен конкретный следующий шаг'},
      deeper: {label: 'Разобраться в ситуации глубже',detail: 'Есть несколько связанных факторов'},
      ongoing: {label: 'Поддержка на протяжении времени',detail: 'Хочу возвращаться к целям и результатам'},
    },
  },
  es: {
    eyebrow: '3 PREGUNTAS RÁPIDAS',
    title: 'Encuentra tu consulta en 1 minuto',
    lead: 'Elige un tema y responde dos preguntas. Podrás cambiar la modalidad sugerida.',
    steps: 'Preguntas respondidas', stepOne: '¿De qué trata tu consulta?', stepTwo: '¿Qué te resulta más difícil?', stepThree: '¿Qué tipo de ayuda deseas?',
    stepOneHelp: 'No hay respuestas incorrectas.', stepTwoHelp: 'Elige la opción más cercana; podrás explicar los detalles en tu solicitud.',
    stepThreeHelp: 'Se trata de orientar, no de diagnosticar.', awaiting: 'Después de tres elecciones verás una sugerencia.',
    match: 'Una opción para empezar', matchHint: 'Basada solo en tus elecciones; puedes elegir cualquier modalidad.',
    approach: 'Tema de tu conversación', available: 'Otras modalidades disponibles', selection: 'Elegida',
    request: 'Ir al formulario al final de la página', detail: 'Ver los detalles de la consulta',
    privacy: 'Tus opciones permanecen en esta página hasta que decidas enviar el formulario con consentimiento.',
    noBooking: 'Enviar una solicitud no confirma una cita ni un pago. Andrey acuerda los detalles personalmente. No se garantizan resultados económicos.',
    context: 'Área', concern: 'Pregunta', wanted: 'Ayuda deseada',
    mentoringFee: 'Precio y frecuencia por acuerdo',
    reasons: {
      free: 'Puedes comenzar con una revisión escrita para ordenar tus ideas; no incluye una llamada en directo.',
      express: 'Una decisión concreta suele encajar en una conversación de 30 minutos sobre opciones y próximas acciones.',
      full: 'Hay varias partes relacionadas; 60 minutos permite explorar más a fondo roles, obstáculos y acciones prácticas.',
      mentoring: 'Si deseas revisar los avances con continuidad, pregunta por encuentros de seguimiento acordados individualmente.'
    },
    areas: {
      business: {label: 'Negocios y trabajo',detail: 'Estrategia, clientes, liderazgo y decisiones'},
      money: {label: 'Dinero e ingresos',detail: 'Precios, incertidumbre y decisiones económicas'},
      personal: {label: 'Para mí',detail: 'Confianza, concentración, motivación y equilibrio'},
      project: {label: 'Mi propio proyecto',detail: 'Inicio, crecimiento, equipo y progreso'},
    },
    issues: {
      strategy: {label: 'Hacia dónde llevar mi negocio',detail: 'Demasiadas opciones o una decisión difícil'},
      sales: {label: 'Ventas y posicionamiento',detail: 'Oferta, clientes y valor'},
      team: {label: 'Equipo y socios',detail: 'Colaboración o tensiones recurrentes'},
      decisions: {label: 'Tomar una decisión clara',detail: 'Comparar opciones y establecer prioridades'},
      income: {label: 'Ingresos variables',detail: 'Identificar un siguiente paso realista'},
      pricing: {label: 'El precio de mi trabajo',detail: 'Valor, límites y hablar de dinero'},
      'money-decisions': {label: 'Una decisión económica',detail: 'Dudas entre varias posibilidades'},
      'money-pressure': {label: 'Preocupación por el dinero',detail: 'Cómo influye en mis decisiones'},
      confidence: {label: 'Confiar en mis capacidades',detail: 'Dudas sobre mi papel profesional'},
      focus: {label: 'Concentración y constancia',detail: 'Tengo planes, pero me cuesta empezar'},
      'work-balance': {label: 'Carga de trabajo y energía',detail: 'Demasiadas responsabilidades'},
      direction: {label: 'Mi rumbo personal',detail: 'Repensar mis metas y próximos pasos'},
      launch: {label: 'Empezar algo nuevo',detail: 'Pasar de una idea a una primera acción'},
      priorities: {label: 'Plan y prioridades',detail: 'Qué abordar primero'},
      partnership: {label: 'Mis colaboradores',detail: 'Roles, responsabilidades y expectativas'},
      stuck: {label: 'Un proyecto estancado',detail: 'Qué impide avanzar'},
    },
    outcomes: {
      gentle: {label: 'Primero una revisión escrita',detail: 'Quiero ordenar mis ideas'},
      'one-step': {label: 'Aclarar una decisión',detail: 'Necesito un siguiente paso concreto'},
      deeper: {label: 'Explorar la situación en profundidad',detail: 'Hay distintos elementos relacionados'},
      ongoing: {label: 'Apoyo a lo largo del tiempo',detail: 'Quiero revisar metas y avances'},
    },
  }
}

export function BusinessConsultationFinder({ locale }: { locale: Locale }) {
  const t = words[locale]
  const [area, setArea] = useState<Area | null>(null)
  const [issue, setIssue] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [preferred, setPreferred] = useState<Format | null>(null)
  const suggested = suggestBusinessConsultation({area, issue, outcome}) as Format | null
  const selected = preferred || suggested
  const answered = Number(Boolean(area)) + Number(Boolean(issue)) + Number(Boolean(outcome))
  const offers = businessConsultingCopy[locale].offers
  const offerCopy: Record<Format, {name: string; price: string; description: string}> = {
    free: { name: offers[0].name, price: offers[0].price, description: offers[0].description },
    express: { name: offers[1].name, price: offers[1].price, description: offers[1].description },
    full: { name: offers[2].name, price: offers[2].price, description: offers[2].description },
    mentoring: { name: businessConsultingCopy[locale].mentorTitle, price: t.mentoringFee, description: businessConsultingCopy[locale].mentorText },
  }
  // Only static, editorial choice labels; no typed free text or client identifiers in URLs/analytics.
  const context = area && issue && outcome ?
    t.context + ': ' + t.areas[area].label + '; ' +
    t.concern + ': ' + t.issues[issue].label + '; ' +
    t.wanted + ': ' + t.outcomes[outcome].label + '.' : ''


  const stage = !area ? 'area' : !issue ? 'issue' : !outcome ? 'outcome' : 'result'
  const backLabel = locale === 'ru' ? 'Назад' : locale === 'es' ? 'Atrás' : 'Back'
  const choicesLabel = locale === 'ru' ? 'Другой формат' : locale === 'es' ? 'Otra modalidad' : 'Choose another format'

  return <section className={styles.panel} id="hh-business-finder" data-business-consultation-finder aria-labelledby="hh-business-finder-title">
    <div className={styles.heading}>
      <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true"/>{t.eyebrow}</p>
      <h2 id="hh-business-finder-title">{t.title}</h2>
      <p>{t.lead}</p>
      <div className={styles.progressWrap}>
        <span>{t.steps}: {answered}/3</span>
        <div className={styles.progress} role="progressbar" aria-label={t.steps} aria-valuemin={0} aria-valuemax={3} aria-valuenow={answered}>
          <span style={{width:(answered / 3 * 100) + '%'}}/>
        </div>
      </div>
    </div>

    {area && <nav className={styles.trail} aria-label={t.steps}>
      <button type="button" onClick={() => {setArea(null);setIssue(null);setOutcome(null);setPreferred(null)}}>{t.areas[area].label}</button>
      {issue && <button type="button" onClick={() => {setIssue(null);setOutcome(null);setPreferred(null)}}>{t.issues[issue].label}</button>}
      {outcome && <button type="button" onClick={() => {setOutcome(null);setPreferred(null)}}>{t.outcomes[outcome].label}</button>}
    </nav>}

    <div className={styles.questions}>
      {stage === 'area' && <fieldset className={styles.step} data-business-finder-step="area">
        <legend><span className={styles.number}>1</span>{t.stepOne}</legend>
        <div className={styles.choices}>
          {areas.map(key=><button key={key} type="button" className={styles.choice}
            data-business-area={key} aria-pressed={area===key}
            onClick={()=>{setArea(key);setIssue(null);setOutcome(null);setPreferred(null)}}>
            <span className={styles.mark}><Check size={16} aria-hidden="true"/></span>
            <span><strong>{t.areas[key].label}</strong><small>{t.areas[key].detail}</small></span>
          </button>)}
        </div>
      </fieldset>}

      {stage === 'issue' && area && <fieldset className={styles.step} data-business-finder-step="issue">
        <legend><span className={styles.number}>2</span>{t.stepTwo}</legend>
        <div className={styles.choices}>
          {BUSINESS_FINDER_ISSUES[area].map((key:string)=><button key={key} type="button" className={styles.choice}
            data-business-issue={key} aria-pressed={issue===key}
            onClick={()=>{setIssue(key);setOutcome(null);setPreferred(null)}}>
            <span className={styles.mark}><Check size={16} aria-hidden="true"/></span>
            <span><strong>{t.issues[key].label}</strong><small>{t.issues[key].detail}</small></span>
          </button>)}
        </div>
        <button className={styles.back} type="button" onClick={()=>{setArea(null);setIssue(null);setOutcome(null);setPreferred(null)}}><ArrowLeft size={15} aria-hidden="true"/>{backLabel}</button>
      </fieldset>}

      {stage === 'outcome' && <fieldset className={styles.step} data-business-finder-step="outcome">
        <legend><span className={styles.number}>3</span>{t.stepThree}</legend>
        <div className={styles.choices}>
          {outcomes.map(key=><button key={key} type="button" className={styles.choice}
            data-business-outcome={key} aria-pressed={outcome===key}
            onClick={()=>{setOutcome(key);setPreferred(null)}}>
            <span className={styles.mark}><Check size={16} aria-hidden="true"/></span>
            <span><strong>{t.outcomes[key].label}</strong><small>{t.outcomes[key].detail}</small></span>
          </button>)}
        </div>
        <button className={styles.back} type="button" onClick={()=>{setIssue(null);setOutcome(null);setPreferred(null)}}><ArrowLeft size={15} aria-hidden="true"/>{backLabel}</button>
      </fieldset>}
    </div>

    {stage === 'result' && selected && issue && <div className={styles.recommendation} aria-live="polite" aria-atomic="true" data-business-finder-result>
      <p className={styles.resultEyebrow}>{t.match}</p>
      <div className={styles.resultTitle}><h3>{offerCopy[selected].name}</h3><strong className={styles.selectedPrice}>{offerCopy[selected].price}</strong></div>
      <p className={styles.reason}>{t.reasons[selected]}</p>
      <p className={styles.approach}><strong>{t.approach}:</strong> {t.issues[issue].label}</p>
      <AcquisitionEventLink href="#business-direct-request" event="service_request_start" prefetch={false}
        className={styles.primary} attributes={{
          'data-business-direct-option': selected,
          'data-business-finder-context': context,
          'data-business-finder-start': 'website-form'
        }}>
        {t.request}<ArrowRight size={18} aria-hidden="true"/>
      </AcquisitionEventLink>
      <details className={styles.otherFormats}>
        <summary>{choicesLabel}</summary>
        <div className={styles.formats} role="group" aria-label={t.available}>
          {formats.map(key=><button key={key} type="button" className={styles.format} aria-pressed={selected===key}
            data-business-format-choice={key} onClick={()=>setPreferred(key)}>
            <span>{selected===key ? <Check size={16} aria-hidden="true"/> : null}<strong>{offerCopy[key].name}</strong></span>
            <small>{offerCopy[key].price}</small>
          </button>)}
        </div>
      </details>
      <p className={styles.noBooking}>{t.noBooking}</p>
    </div>}
    <p className={styles.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
  </section>
}
