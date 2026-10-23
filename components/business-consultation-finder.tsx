'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Lightbulb, RotateCcw, ShieldCheck } from 'lucide-react'
import { AcquisitionEventLink } from '@/components/acquisition-event-link'
import { businessConsultingCopy } from '@/data/business-consulting-copy'
import { BUSINESS_FINDER_FORMATS, suggestBusinessConsultation } from '@/lib/business-consulting/consultation-finder'
import { BUSINESS_TOPIC_GUIDE, BUSINESS_QUESTION_TOPICS, businessNeedForTopic, inferBusinessTopic } from '@/lib/business-consulting/question-guide'
import styles from './business-consultation-finder.module.css'

type Locale = 'en' | 'ru' | 'es'
type Need = 'clarity' | 'income' | 'growth'
type Format = 'free' | 'express' | 'full' | 'mentoring'
type PaidFormat = Exclude<Format, 'free'>
type Choice = { label: string; help: string }
type BusinessTopic = 'all' | 'money' | 'clients' | 'start' | 'strategy' | 'career' | 'opportunities' | 'team' | 'focus'
const paidFormats = (BUSINESS_FINDER_FORMATS as readonly Format[]).filter((format): format is PaidFormat => format !== 'free')
// Editorial mapping onto the existing approved matcher and CRM formats.
// No questionnaire answers, sensitive data, identifiers or diagnosis are collected.
const needIssues = {
  clarity: {area: 'business', issue: 'decisions'},
  income: {area: 'money', issue: 'income'},
  growth: {area: 'project', issue: 'stuck'},
} as const

const words: Record<Locale, {
  title: string; match: string; focus: string; change: string;
  questionLabel: string; questionPlaceholder: string; submit: string; questionError: string;
  ideaLabel: string; unknownIdea: string;
  request: string; freeAction: string; freeKicker: string; paidKicker: string;
  other: string; available: string; consent: string; noBooking: string;
  mentorPrice: string; reasons: Record<Format, string>; choices: Record<Need, Choice>;
}> = {
  en: {
    title: 'Find your starting point',
    questionLabel: 'Ask a question about your business',
    questionPlaceholder: 'For example: I have an idea, but how do I find my first clients?',
    submit: 'Find a solution or get an idea',
    questionError: 'Please write a short question (at least 8 characters).',
    ideaLabel: 'A practical idea',
    unknownIdea: 'Choose a topic below to narrow this down. You can also start with a free written review.',
    match: 'Choose how to begin', focus: 'Your focus', change: 'Change my answer',
    request: 'Request a personal session', freeAction: 'Start free written review',
    freeKicker: 'FREE · WRITTEN REVIEW', paidKicker: 'LIVE WITH ANDREY',
    other: 'Other paid formats', available: 'Personal session formats',
    consent: 'Only an enquiry you submit with consent goes to Andrey. Your choice stays on this page until then.',
    noBooking: 'A request is not a booked or paid appointment. Time is confirmed personally; business results are not guaranteed.',
    mentorPrice: 'By arrangement',
    reasons: {
      free: 'Share a question and an I–Goal–Obstacle drawing. Written reply, no call.',
      express: '30-minute live session to clarify one decision and next step.',
      full: '60-minute live session to map obstacles, options and an action plan.',
      mentoring: 'Arrange ongoing follow-up sessions personally.',
    },
    choices: {
      clarity: {label: 'I need clarity', help: 'One important business decision'},
      income: {label: 'I need steadier income', help: 'Work, pricing or uncertainty'},
      growth: {label: 'I want to grow a project', help: 'Launch, direction and progress'},
    },
  },
  ru: {
    title: 'Найдите подходящий формат',
    questionLabel: 'Задайте вопрос о бизнесе',
    questionPlaceholder: 'Например: как мне найти клиентов и увеличить доход?',
    submit: 'Найти решение или идею',
    questionError: 'Напишите короткий вопрос (хотя бы 8 символов).',
    ideaLabel: 'Идея для первого шага',
    unknownIdea: 'Выберите тему в фильтре ниже для уточнения. Можно также начать с бесплатного письменного разбора.',
    match: 'Два способа начать', focus: 'Ваш запрос', change: 'Изменить ответ',
    request: 'Запросить личную сессию', freeAction: 'Начать бесплатный разбор',
    freeKicker: 'БЕСПЛАТНО · ПИСЬМЕННО', paidKicker: 'СЕССИЯ С АНДРЕЕМ',
    other: 'Другие платные форматы', available: 'Форматы личных сессий',
    consent: 'Только заявка с вашим согласием отправляется Андрею. До этого выбор остаётся на странице.',
    noBooking: 'Заявка — ещё не запись и не оплата. Время согласуется лично; результаты для бизнеса не гарантируются.',
    mentorPrice: 'По договорённости',
    reasons: {
      free: 'Вопрос и рисунок «Я — цель — препятствие»; письменный ответ без созвона.',
      express: '30 минут с Андреем: решение и ближайший шаг.',
      full: '60 минут с Андреем: варианты, препятствия и план.',
      mentoring: 'Регулярные встречи по личной договорённости.',
    },
    choices: {
      clarity: {label: 'Нужна ясность', help: 'Одно важное решение'},
      income: {label: 'Нужен стабильный доход', help: 'Работа, цена, неопределённость'},
      growth: {label: 'Хочу развивать проект', help: 'Запуск, стратегия, движение'},
    },
  },
  es: {
    title: 'Encuentra tu punto de partida',
    questionLabel: 'Haz una pregunta sobre tu negocio',
    questionPlaceholder: 'Por ejemplo: ¿cómo encuentro mis primeros clientes?',
    submit: 'Encontrar una solución o idea',
    questionError: 'Escribe una pregunta breve (al menos 8 caracteres).',
    ideaLabel: 'Una idea para empezar',
    unknownIdea: 'Elige un tema abajo para precisar tu pregunta. También puedes solicitar una revisión escrita gratis.',
    match: 'Dos formas de empezar', focus: 'Tu tema', change: 'Cambiar respuesta',
    request: 'Solicitar una sesión personal', freeAction: 'Empezar revisión gratuita',
    freeKicker: 'GRATIS · POR ESCRITO', paidKicker: 'EN VIVO CON ANDREY',
    other: 'Otras opciones de pago', available: 'Modalidades de sesiones personales',
    consent: 'Solo enviamos tu solicitud con tu consentimiento. Hasta entonces, tu elección queda en la página.',
    noBooking: 'Solicitar no confirma una cita ni un pago. El horario se acuerda personalmente, sin promesas económicas.',
    mentorPrice: 'Por acuerdo',
    reasons: {
      free: 'Pregunta y dibujo Yo–Meta–Obstáculo; respuesta escrita, sin llamada.',
      express: '30 minutos para aclarar una decisión y el siguiente paso.',
      full: '60 minutos para explorar opciones, obstáculos y un plan de acción.',
      mentoring: 'Seguimiento continuo, por acuerdo personal.',
    },
    choices: {
      clarity: {label: 'Necesito claridad', help: 'Una decisión importante'},
      income: {label: 'Busco ingresos estables', help: 'Trabajo, precios e incertidumbre'},
      growth: {label: 'Quiero crecer mi proyecto', help: 'Inicio, estrategia y progreso'},
    },
  },
}

export function BusinessConsultationFinder({locale, onTopicIdentified}: {
  locale: Locale; onTopicIdentified?: (topic: BusinessTopic) => void
}) {
  const t = words[locale]
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [topic, setTopic] = useState<BusinessTopic>('all')
  const [need, setNeed] = useState<Need | null>(null)
  const [preferred, setPreferred] = useState<PaidFormat | null>(null)
  const issue = need ? needIssues[need] : null
  const suggested = issue ? suggestBusinessConsultation(issue) as Format | null : null
  const selected: PaidFormat = preferred || (suggested === 'full' || suggested === 'mentoring' ? suggested : 'express')
  const offers = businessConsultingCopy[locale].offers
  const offerCopy: Record<Format, {name: string; price: string}> = {
    free: {name: offers[0].name, price: offers[0].price},
    express: {name: offers[1].name, price: offers[1].price},
    full: {name: offers[2].name, price: offers[2].price},
    mentoring: {name: businessConsultingCopy[locale].mentorTitle, price: t.mentorPrice},
  }
  // Only a *public topic label*, never the visitor's free text, enters a CRM handoff.
  const context = need ? t.focus + ': ' + t.choices[need].label + '.' : ''
  const idea = topic === 'all' ? t.unknownIdea : BUSINESS_TOPIC_GUIDE[locale][topic].idea

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (question.trim().length < 8) { setError(t.questionError); return }
    const inferred = inferBusinessTopic(question)
    const nextTopic: BusinessTopic = inferred && BUSINESS_QUESTION_TOPICS.includes(inferred)
      ? inferred as BusinessTopic : 'all'
    setTopic(nextTopic)
    setNeed(businessNeedForTopic(nextTopic) as Need)
    setPreferred(null)
    setError('')
    onTopicIdentified?.(nextTopic)
  }

  function restart() {
    setNeed(null)
    setPreferred(null)
    setError('')
    onTopicIdentified?.('all')
  }

  return <section className={styles.panel} id="hh-business-finder"
    data-business-consultation-finder aria-labelledby="hh-business-finder-title">
    <h2 id="hh-business-finder-title" className={styles.srOnly}>{t.title}</h2>
    {!need ? <form className={styles.askForm} data-business-finder-step="question" onSubmit={submitQuestion} noValidate>
      <label className={styles.askLabel} htmlFor="hh-business-question">{t.questionLabel}</label>
      <textarea id="hh-business-question" className={styles.questionInput}
        data-business-question-input value={question} maxLength={400} rows={2}
        placeholder={t.questionPlaceholder} aria-invalid={!!error}
        onChange={event=>{setQuestion(event.target.value);if(error)setError('')}}/>
      <button type="submit" className={styles.submit} data-business-question-submit>
        <Lightbulb size={18} aria-hidden="true"/>{t.submit}<ArrowRight size={17} aria-hidden="true"/>
      </button>
      {error && <p className={styles.inputError} role="alert">{error}</p>}
      <p className={styles.privacy}><ShieldCheck size={14} aria-hidden="true"/>{t.consent}</p>
    </form> : <div className={styles.recommendation} data-business-finder-result aria-live="polite">
      <button className={styles.change} data-business-finder-reset type="button"
        onClick={restart}><RotateCcw size={14} aria-hidden="true"/>{t.change}</button>
      <div className={styles.resultIntro}>
        <p className={styles.resultEyebrow}>{t.match}</p>
        <p className={styles.needSummary}>{t.focus}: <strong>{t.choices[need].label}</strong></p>
      </div>
      <p className={styles.quickIdea} data-business-quick-idea><Lightbulb size={16} aria-hidden="true"/>
        <span><strong>{t.ideaLabel}:</strong> {idea}</span>
      </p>
      <div className={styles.ways} data-business-finder-ways>
        <article className={styles.way} data-business-result-path="free">
          <div className={styles.wayHeading}>
            <span className={styles.wayKicker}>{t.freeKicker}</span>
            <strong className={styles.selectedPrice}>{offerCopy.free.price}</strong>
          </div>
          <h3>{offerCopy.free.name}</h3>
          <p className={styles.reason}>{t.reasons.free}</p>
          <AcquisitionEventLink
            href={'/'+locale+'/services/free-situation-review?topic=business'}
            event="service_request_start" prefetch={false} className={styles.freePrimary}
            attributes={{ 'data-business-finder-start': 'free-review' }}>
            {t.freeAction}<ArrowRight size={17} aria-hidden="true"/>
          </AcquisitionEventLink>
        </article>
        <article className={styles.way} data-business-result-path="paid">
          <div className={styles.wayHeading}>
            <span className={styles.wayKicker}>{t.paidKicker}</span>
            <strong className={styles.selectedPrice}>{offerCopy[selected].price}</strong>
          </div>
          <h3>{offerCopy[selected].name}</h3>
          <p className={styles.reason}>{t.reasons[selected]}</p>
          <AcquisitionEventLink href="#business-direct-request" event="service_request_start"
            prefetch={false} className={styles.primary} attributes={{
              'data-business-direct-option': selected,
              'data-business-finder-context': context,
              'data-business-finder-start': 'website-form',
            }}>
            {t.request}<ArrowRight size={17} aria-hidden="true"/>
          </AcquisitionEventLink>
        </article>
      </div>
      <details className={styles.otherFormats}>
        <summary>{t.other}</summary>
        <div className={styles.formats} role="group" aria-label={t.available}>
          {paidFormats.map(key=><button key={key} type="button" className={styles.format}
            aria-pressed={selected===key} data-business-format-choice={key}
            onClick={()=>setPreferred(key)}>
            <span>{selected===key && <Check size={15} aria-hidden="true"/>}{offerCopy[key].name}</span>
            <small>{offerCopy[key].price}</small>
          </button>)}
        </div>
      </details>
      <p className={styles.noBooking}>{t.noBooking}</p>
    </div>}
  </section>
}
