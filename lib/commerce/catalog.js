import { deepFreeze } from '../assessments/contracts.js'

// Existing published rates: components/consultation-choice-capture.tsx and
// data/personal-service-pages.ts. These are one-time formats, never subscriptions.
// Marketplace "from" / "contact" prices and individually quoted courses are
// deliberately not converted into payable products.
export const SERVICE_PRODUCTS = deepFreeze([
  {
    id: 'express-consultation-30',
    amountMinor: 5000,
    currency: 'EUR',
    durationMinutes: 30,
    kind: 'one_time',
    title: { en: 'Express consultation', ru: 'Экспресс-консультация', es: 'Consulta exprés' },
    description: {
      en: 'A 30-minute personal consultation with Andrey. Availability is confirmed personally.',
      ru: 'Личная консультация с Андреем, 30 минут. Время согласуем лично.',
      es: 'Consulta personal de 30 minutos con Andrey. Confirmaremos el horario personalmente.',
    },
  },
  {
    id: 'personal-session-60',
    amountMinor: 10000,
    currency: 'EUR',
    durationMinutes: 60,
    kind: 'one_time',
    title: { en: 'Personal session', ru: 'Личная сессия', es: 'Sesión personal' },
    description: {
      en: 'A 60-minute personal session with Andrey. Choose the approach and agree a time together.',
      ru: 'Личная сессия с Андреем, 60 минут. Подход и время согласуем вместе.',
      es: 'Sesión personal de 60 minutos con Andrey. Acordaremos juntos el enfoque y el horario.',
    },
  },
])

export function serviceLocale(value) {
  return ['en', 'ru', 'es'].includes(value) ? value : 'en'
}

export function publicServiceCatalog(locale = 'en') {
  const language = serviceLocale(locale)
  return SERVICE_PRODUCTS.map((product) => ({
    id: product.id,
    title: product.title[language],
    description: product.description[language],
    amountMinor: product.amountMinor,
    currency: product.currency,
    durationMinutes: product.durationMinutes,
    kind: product.kind,
  }))
}

export function formatServiceAmount(amountMinor, locale = 'en') {
  return new Intl.NumberFormat(serviceLocale(locale), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}
