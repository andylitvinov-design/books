'use client'

import { useState } from 'react'
import { ArrowRight, Check, Compass, RotateCcw, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react'
import { AcquisitionEventLink } from '@/components/acquisition-event-link'
import { businessConsultingCopy } from '@/data/business-consulting-copy'
import { BUSINESS_FINDER_FORMATS, suggestBusinessConsultation } from '@/lib/business-consulting/consultation-finder'
import styles from './business-consultation-finder.module.css'

type Locale = 'en' | 'ru' | 'es'
type Need = 'clarity' | 'income' | 'growth'
type Format = 'free' | 'express' | 'full' | 'mentoring'
type Choice = { label: string; help: string }

const needs = ['clarity', 'income', 'growth'] as const
const formats = BUSINESS_FINDER_FORMATS as readonly Format[]
// Editorial mapping onto the existing approved matcher and CRM formats.
// No questionnaire answers, sensitive data, identifiers or diagnosis are collected.
const needIssues = {
  clarity: {area: 'business', issue: 'decisions'},
  income: {area: 'money', issue: 'income'},
  growth: {area: 'project', issue: 'stuck'},
} as const

const words: Record<Locale, {
  title: string; helper: string; match: string; focus: string; change: string;
  request: string; other: string; available: string; consent: string; noBooking: string;
  mentorPrice: string; reasons: Record<Format, string>; choices: Record<Need, Choice>;
}> = {
  en: {
    title: 'Find your starting point', helper: 'Choose one answer. You can always change the suggested format.',
    match: 'A starting point for you', focus: 'Your focus', change: 'Change my answer',
    request: 'Request this consultation', other: 'See other formats', available: 'Available consultation formats',
    consent: 'Only an enquiry you submit with consent goes to Andrey. Your choice stays on this page until then.',
    noBooking: 'A request is not a booked or paid appointment. Time is confirmed personally; business results are not guaranteed.',
    mentorPrice: 'By arrangement',
    reasons: {
      free: 'Start with a free written reflection on your situation. A live call is not included.',
      express: 'A focused 30-minute conversation to clarify a decision and choose one realistic next step.',
      full: 'A 60-minute conversation offers more space to map obstacles, options and a practical action plan.',
      mentoring: 'For ongoing work, ask about individually arranged follow-up sessions.',
    },
    choices: {
      clarity: {label: 'I need clarity', help: 'One important business decision'},
      income: {label: 'I need steadier income', help: 'Work, pricing or uncertainty'},
      growth: {label: 'I want to grow a project', help: 'Launch, direction and progress'},
    },
  },
  ru: {
    title: 'Найдите подходящий формат', helper: 'Выберите один вариант. Рекомендацию можно изменить.',
    match: 'С чего можно начать', focus: 'Ваш запрос', change: 'Изменить ответ',
    request: 'Оставить заявку', other: 'Другие форматы', available: 'Доступные форматы консультаций',
    consent: 'Только заявка с вашим согласием отправляется Андрею. До этого выбор остаётся на странице.',
    noBooking: 'Заявка — ещё не запись и не оплата. Время согласуется лично; результаты для бизнеса не гарантируются.',
    mentorPrice: 'По договорённости',
    reasons: {
      free: 'Начните с бесплатного письменного разбора. Живой созвон не входит.',
      express: '30 минут, чтобы прояснить одно решение и наметить реалистичный следующий шаг.',
      full: 'За 60 минут можно подробнее рассмотреть препятствия, варианты и практический план.',
      mentoring: 'Для длительной поддержки можно согласовать индивидуальные повторные встречи.',
    },
    choices: {
      clarity: {label: 'Нужна ясность', help: 'Одно важное решение'},
      income: {label: 'Нужен стабильный доход', help: 'Работа, цена, неопределённость'},
      growth: {label: 'Хочу развивать проект', help: 'Запуск, стратегия, движение'},
    },
  },
  es: {
    title: 'Encuentra tu punto de partida', helper: 'Elige una respuesta. Puedes cambiar la modalidad.',
    match: 'Una opción para empezar', focus: 'Tu tema', change: 'Cambiar respuesta',
    request: 'Solicitar esta consulta', other: 'Otras modalidades', available: 'Modalidades de consulta',
    consent: 'Solo enviamos tu solicitud con tu consentimiento. Hasta entonces, tu elección queda en la página.',
    noBooking: 'Solicitar no confirma una cita ni un pago. El horario se acuerda personalmente, sin promesas económicas.',
    mentorPrice: 'Por acuerdo',
    reasons: {
      free: 'Empieza con una reflexión escrita gratuita. No incluye una llamada.',
      express: '30 minutos para aclarar una decisión y elegir un próximo paso realista.',
      full: '60 minutos para explorar obstáculos, opciones y un plan práctico.',
      mentoring: 'Si deseas continuidad, solicita encuentros de seguimiento acordados personalmente.',
    },
    choices: {
      clarity: {label: 'Necesito claridad', help: 'Una decisión importante'},
      income: {label: 'Busco ingresos estables', help: 'Trabajo, precios e incertidumbre'},
      growth: {label: 'Quiero crecer mi proyecto', help: 'Inicio, estrategia y progreso'},
    },
  },
}

export function BusinessConsultationFinder({locale}: {locale: Locale}) {
  const t = words[locale]
  const [need, setNeed] = useState<Need | null>(null)
  const [preferred, setPreferred] = useState<Format | null>(null)
  const issue = need ? needIssues[need] : null
  const suggested = issue ? suggestBusinessConsultation(issue) as Format | null : null
  const selected = preferred || suggested
  const offers = businessConsultingCopy[locale].offers
  const offerCopy: Record<Format, {name: string; price: string}> = {
    free: {name: offers[0].name, price: offers[0].price},
    express: {name: offers[1].name, price: offers[1].price},
    full: {name: offers[2].name, price: offers[2].price},
    mentoring: {name: businessConsultingCopy[locale].mentorTitle, price: t.mentorPrice},
  }
  // Editorial labels only. Never place answers in URL/query, marketing pixels or messages.
  const context = need ? t.focus + ': ' + t.choices[need].label + '.' : ''

  return <section className={styles.panel} id="hh-business-finder"
    data-business-consultation-finder aria-labelledby="hh-business-finder-title">
    <h2 id="hh-business-finder-title" className={styles.srOnly}>{t.title}</h2>
    {!need ? <>
      <p className={styles.helper}>{t.helper}</p>
      <div className={styles.choices} role="group" aria-label={t.title} data-business-finder-step="need">
        {needs.map(key=><button key={key} type="button" className={styles.choice}
          data-business-need={key} aria-pressed={need===key}
          onClick={()=>{setNeed(key);setPreferred(null)}}>
          <span className={styles.choiceIcon} aria-hidden="true">
            {key==='clarity' ? <Compass size={19}/> : key==='income' ? <WalletCards size={19}/> : <TrendingUp size={19}/>}
          </span>
          <span className={styles.choiceCopy}>
            <strong>{t.choices[key].label}</strong><small>{t.choices[key].help}</small>
          </span>
          <ArrowRight className={styles.choiceArrow} size={16} aria-hidden="true"/>
        </button>)}
      </div>
      <p className={styles.privacy}><ShieldCheck size={14} aria-hidden="true"/>{t.consent}</p>
    </> : selected ? <div className={styles.recommendation} data-business-finder-result aria-live="polite">
      <button className={styles.change} data-business-finder-reset type="button"
        onClick={()=>{setNeed(null);setPreferred(null)}}><RotateCcw size={14} aria-hidden="true"/>{t.change}</button>
      <p className={styles.resultEyebrow}>{t.match}</p>
      <div className={styles.resultTitle}>
        <h3>{offerCopy[selected].name}</h3>
        <strong className={styles.selectedPrice}>{offerCopy[selected].price}</strong>
      </div>
      <p className={styles.reason}>{t.reasons[selected]}</p>
      <AcquisitionEventLink href="#business-direct-request" event="service_request_start"
        prefetch={false} className={styles.primary} attributes={{
          'data-business-direct-option': selected,
          'data-business-finder-context': context,
          'data-business-finder-start': 'website-form',
        }}>
        {t.request}<ArrowRight size={18} aria-hidden="true"/>
      </AcquisitionEventLink>
      <details className={styles.otherFormats}>
        <summary>{t.other}</summary>
        <div className={styles.formats} role="group" aria-label={t.available}>
          {formats.map(key=><button key={key} type="button" className={styles.format}
            aria-pressed={selected===key} data-business-format-choice={key}
            onClick={()=>setPreferred(key)}>
            <span>{selected===key && <Check size={15} aria-hidden="true"/>}{offerCopy[key].name}</span>
            <small>{offerCopy[key].price}</small>
          </button>)}
        </div>
      </details>
      <p className={styles.noBooking}>{t.noBooking}</p>
    </div> : null}
  </section>
}
