import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './goal-support-offers.module.css'

type Direction = 'energy' | 'love' | 'business'
type OfferCopy = { eyebrow: string; title: string; description: string; note: string; action: string }
type LocaleCopy = {
  eyebrow: string
  lead: string
  energy: OfferCopy
  alchemy: OfferCopy
}

const headings: Record<Direction, Record<PublicLocale, string>> = {
  energy: {
    en: 'Support for your energy and wellbeing goals',
    ru: 'Поддержка целей в сфере энергии и самочувствия',
    es: 'Apoyo para tus metas de energía y bienestar',
  },
  love: {
    en: 'Support for your relationship goals',
    ru: 'Поддержка целей в любви и отношениях',
    es: 'Apoyo para tus metas en las relaciones',
  },
  business: {
    en: 'Support for your business and money goals',
    ru: 'Поддержка целей в деньгах и бизнесе',
    es: 'Apoyo para tus metas de dinero y negocios',
  },
}

const copy: Record<PublicLocale, LocaleCopy> = {
  en: {
    eyebrow: 'TWO MORE WAYS TO SUPPORT YOUR GOAL',
    lead: 'Choose a practitioner-led energy practice or explore a personal Alchemy of the Soul consultation. Neither link makes a booking or payment.',
    energy: {
      eyebrow: 'COMPLEMENTARY PRACTICE',
      title: 'Energy support for your goal',
      description: 'An energy practice may help you feel more resourced and gain momentum toward your goal. Faster progress or specific results are not guaranteed.',
      note: 'With Andrey · €50 / 30 min · €100 / 60 min · Confirmation required',
      action: 'Choose a practitioner',
    },
    alchemy: {
      eyebrow: 'PERSONAL CONSULTATION · ANDREY',
      title: 'Alchemy of the Soul · Psycho-homeopathy',
      description: 'Explore inner obstacles around your goal with Andrey. Homeopathic products can be discussed as an optional approach, but there is no reliable evidence they treat health conditions.',
      note: '30 min €50 · 60 min €100 · Request, not a booking',
      action: 'Explore Alchemy of the Soul',
    },
  },
  ru: {
    eyebrow: 'ЕЩЁ ДВА СПОСОБА ПОДДЕРЖАТЬ ЦЕЛЬ',
    lead: 'Выберите мастера для энергетической практики или личную консультацию «Алхимия души». Переход не означает запись или оплату.',
    energy: {
      eyebrow: 'ДОПОЛНИТЕЛЬНАЯ ПРАКТИКА',
      title: 'Энергетическая поддержка цели',
      description: 'Энергопрактика может дать ощущение ресурса и импульса, чтобы двигаться к своей цели увереннее и быстрее. Ускорение и результат не гарантированы.',
      note: 'С Андреем · €50 / 30 мин · €100 / 60 мин · Запись после подтверждения',
      action: 'Выбрать мастера',
    },
    alchemy: {
      eyebrow: 'ЛИЧНАЯ КОНСУЛЬТАЦИЯ · АНДРЕЙ',
      title: 'Алхимия души · Психогомеопатия',
      description: 'Исследуйте с Андреем внутренние препятствия на пути к цели. При желании можно обсудить гомеопатические препараты как дополнительный подход без доказанной лечебной эффективности.',
      note: '30 мин €50 · 60 мин €100 · Заявка, не запись',
      action: 'Открыть «Алхимию души»',
    },
  },
  es: {
    eyebrow: 'DOS FORMAS MÁS DE APOYAR TU META',
    lead: 'Elige un profesional para una práctica energética o explora una consulta de Alquimia del Alma. Ningún enlace confirma una reserva o pago.',
    energy: {
      eyebrow: 'PRÁCTICA COMPLEMENTARIA',
      title: 'Apoyo energético para tu meta',
      description: 'La práctica energética puede ayudarte a sentir más recursos e impulso hacia tu meta. No se garantiza avanzar más rápido ni obtener un resultado.',
      note: 'Con Andrey · €50 / 30 min · €100 / 60 min · Confirmación necesaria',
      action: 'Elegir profesional',
    },
    alchemy: {
      eyebrow: 'CONSULTA PERSONAL · ANDREY',
      title: 'Alquimia del Alma · Psicohomeopatía',
      description: 'Explora con Andrey los obstáculos internos a tu meta. Los productos homeopáticos son opcionales y no tienen evidencia fiable de eficacia para tratar enfermedades.',
      note: '30 min €50 · 60 min €100 · Solicitud sin reserva',
      action: 'Explorar Alquimia del Alma',
    },
  },
}

/** One shared EN/RU/ES footer; link only to the existing confirmed service routes. */
export function GoalSupportOffers({ locale, direction }: { locale: PublicLocale; direction: Direction }) {
  const t = copy[locale]
  const offers = [
    { id: 'energy', path: 'remote-energy-support', image: '/academy/reiki-yggdrasil/source/basic-program.jpg', copy: t.energy },
    { id: 'alchemy', path: 'alchemy-of-soul', image: '/images/holistic-house/andy-about.png', copy: t.alchemy },
  ] as const

  return (
    <section className={styles.section} data-goal-support-offers data-goal-support-theme={direction}
      aria-labelledby="goal-support-heading">
      <header className={styles.header}>
        <p className={styles.kicker}>{t.eyebrow}</p>
        <h2 id="goal-support-heading">{headings[direction][locale]}</h2>
        <p>{t.lead}</p>
      </header>
      <div className={styles.grid}>
        {offers.map(offer => (
          <article key={offer.id} className={styles.card} data-goal-support-card={offer.id}>
            <div className={styles.photo}>
              <Image src={offer.image} alt="" fill loading="lazy" unoptimized
                sizes="(max-width:350px) 78px, (max-width:600px) 94px, (max-width:1100px) 145px, 175px" />
            </div>
            <div className={styles.content}>
              <p className={styles.eyebrow}>{offer.copy.eyebrow}</p>
              <h3>{offer.copy.title}</h3>
              <p className={styles.description}>{offer.copy.description}</p>
              <p className={styles.note}>{offer.copy.note}</p>
              <Link href={`/${locale}/services/${offer.path}`} className={styles.action} prefetch={false}
                data-goal-support-action={offer.id}>
                {offer.copy.action}<ArrowRight size={16} aria-hidden="true"/>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
