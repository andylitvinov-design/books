'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, ChevronDown, HeartHandshake } from 'lucide-react'
import { CompactLeadCapture } from '@/components/compact-lead-capture'
import { FreeDiagnosticStart } from '@/components/free-diagnostic-start'
import { humanCoachingArt } from '@/lib/coaching/public-session-art'
import styles from './coaching-live-session-capture.module.css'

const offers = ['free', 'short', 'full']
const content = {
  en: {
    eyebrow: 'LIVE WITH ANDREY',
    title: 'Coaching & Hypnotherapy',
    lead: 'Personal support online. Choose how you would like to start.',
    choose: 'Request a session',
    service: 'Coaching & Hypnotherapy',
    options: {
      free: { title: 'Free express assessment', detail: 'A written review of your situation', price: 'FREE' },
      short: { title: 'Short session · 30 min', detail: 'One focused question, live online', price: '€50' },
      full: { title: 'Full session · 60 min', detail: 'More time for a deeper conversation', price: '€100' },
    },
    actions: {
      free: 'Start free assessment',
      short: 'Request 30-minute session',
      full: 'Request 60-minute session',
    },
    requests: {
      short: 'I would like a live 30-minute coaching or hypnotherapy session for €50. Please let me know the available times.',
      full: 'I would like a live 60-minute coaching or hypnotherapy session for €100. Please let me know the available times.',
    },
    freeNote: 'The free assessment is a written review using a short form and drawing, not a live call or medical diagnosis.',
    paidNote: 'Send a request first. The time and format are confirmed personally before any payment.',
  },
  ru: {
    eyebrow: 'ЖИВАЯ СЕССИЯ С АНДРЕЕМ',
    title: 'Коучинг и гипнотерапия',
    lead: 'Индивидуальная работа онлайн. Выберите удобный формат.',
    choose: 'Заказать сессию',
    service: 'Коучинг и гипнотерапия',
    options: {
      free: { title: 'Бесплатная экспресс-диагностика', detail: 'Письменный разбор вашей ситуации', price: 'БЕСПЛАТНО' },
      short: { title: 'Краткая сессия · 30 мин', detail: 'Один вопрос в живом разговоре', price: '€50' },
      full: { title: 'Полная сессия · 60 мин', detail: 'Больше времени для глубокой работы', price: '€100' },
    },
    actions: {
      free: 'Начать бесплатную диагностику',
      short: 'Заказать сессию на 30 минут',
      full: 'Заказать сессию на 60 минут',
    },
    requests: {
      short: 'Хочу записаться на живую сессию коучинга или гипнотерапии: 30 минут, €50. Подскажите возможное время.',
      full: 'Хочу записаться на живую сессию коучинга или гипнотерапии: 60 минут, €100. Подскажите возможное время.',
    },
    freeNote: 'Бесплатная диагностика — письменный разбор по анкете и рисунку, не видеовстреча и не медицинский диагноз.',
    paidNote: 'Сначала отправьте заявку. Время и формат согласовываются лично, до оплаты.',
  },
  es: {
    eyebrow: 'SESIÓN EN VIVO CON ANDREY',
    title: 'Coaching e hipnoterapia',
    lead: 'Apoyo individual en línea. Elige cómo quieres empezar.',
    choose: 'Solicitar una sesión',
    service: 'Coaching e hipnoterapia',
    options: {
      free: { title: 'Evaluación exprés gratuita', detail: 'Análisis escrito de tu situación', price: 'GRATIS' },
      short: { title: 'Sesión breve · 30 min', detail: 'Una pregunta concreta en directo', price: '€50' },
      full: { title: 'Sesión completa · 60 min', detail: 'Más tiempo para explorar tu situación', price: '€100' },
    },
    actions: {
      free: 'Empezar evaluación gratuita',
      short: 'Solicitar sesión de 30 minutos',
      full: 'Solicitar sesión de 60 minutos',
    },
    requests: {
      short: 'Quisiera una sesión en vivo de coaching o hipnoterapia de 30 minutos por €50. ¿Qué horarios hay disponibles?',
      full: 'Quisiera una sesión en vivo de coaching o hipnoterapia de 60 minutos por €100. ¿Qué horarios hay disponibles?',
    },
    freeNote: 'La evaluación gratuita es un informe escrito basado en un formulario y dibujo, no una llamada ni un diagnóstico médico.',
    paidNote: 'Primero envía una solicitud. La fecha y el formato se acuerdan antes de pagar.',
  },
}

export default function CoachingLiveSessionCapture({ locale = 'en' }) {
  const lang = Object.prototype.hasOwnProperty.call(content, locale) ? locale : 'en'
  const t = content[lang]
  const [selected, setSelected] = useState('free')
  const [opened, setOpened] = useState(false)
  const sheetRef = useRef(null)
  const option = t.options[selected]
  const paid = selected !== 'free'

  // The panel stays in the document flow, below the selected offer. Never
  // open a messenger, send contact details or create a lead merely on a tap.
  useEffect(() => {
    if (!opened) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sheetRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'instant' : 'smooth' })
  }, [opened, selected])

  return (
    <div className={styles.capture} data-coaching-live-capture lang={lang}>
      <div className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><HeartHandshake size={15} aria-hidden="true" />{t.eyebrow}</p>
          <h2 id="human-coaching-title">{t.title}</h2>
          <p className={styles.lead}>{t.lead}</p>
        </div>
        <div className={styles.photo}>
          <Image src={humanCoachingArt} alt="" aria-hidden="true" fill unoptimized
            sizes="(max-width: 600px) 100px, 180px" />
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>{t.choose}</legend>
        <div className={styles.options} role="radiogroup" aria-label={t.choose}>
          {offers.map(key => {
            const item = t.options[key]
            const active = key === selected
            return <button key={key} type="button" role="radio" aria-checked={active}
              className={styles.option} data-selected={active} data-coaching-booking-option={key}
              onClick={() => { setSelected(key); setOpened(false) }}>
              <span className={styles.indicator} aria-hidden="true">{active && <Check size={15} strokeWidth={3} />}</span>
              <span className={styles.optionText}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={key === 'free' ? styles.freePrice : styles.price}>{item.price}</span>
            </button>
          })}
        </div>
      </fieldset>

      <button type="button" className={styles.primary} data-coaching-booking-choice={selected}
        aria-expanded={opened} aria-controls="coaching-request-sheet"
        onClick={() => setOpened(value => !value)}>
        <span>{t.actions[selected]}</span>
        <ChevronDown className={opened ? styles.chevronOpen : ''} size={19} aria-hidden="true" />
      </button>
      <div ref={sheetRef} id="coaching-request-sheet" className={styles.sheet}
        data-coaching-request-sheet={selected} data-open={opened ? 'true' : 'false'} hidden={!opened}>
        {opened && (paid
          ? <CompactLeadCapture key={selected} locale={lang} variant="coaching"
              sourcePath={'/' + lang + '/coaching'} serviceTitle={t.service + ' · ' + option.title + ' · ' + option.price}
              title={t.actions[selected]} lead={t.paidNote} />
          : <FreeDiagnosticStart locale={lang} variant="coaching" />)}
      </div>
      {!opened && <p className={styles.note}>{paid ? t.paidNote : t.freeNote}</p>}
    </div>
  )
}
