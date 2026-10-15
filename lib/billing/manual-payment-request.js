import { COURSE_MEMBERSHIP } from '../inner-growth/course-membership.js'

// Reference: Ezohata's currency-specific checkout. These are INQUIRY channels,
// not payment processors: no destination or paid access is inferred from a choice.
export const MANUAL_PAYMENT_CONTACT_URL = 'https://t.me/AndyTherapist'
export const MANUAL_PAYMENT_METHODS = Object.freeze([
  Object.freeze({ id: 'paypal-eur', currency: 'EUR', en: 'PayPal · EUR', ru: 'PayPal · EUR',
    enHint: 'Request an invoice in euros', ruHint: 'Запросить счёт в евро' }),
  Object.freeze({ id: 'paypal-usd', currency: 'USD', en: 'PayPal · USD', ru: 'PayPal · USD',
    enHint: 'Confirm USD conversion before paying', ruHint: 'Уточнить сумму в долларах до оплаты' }),
  Object.freeze({ id: 'interac-cad', currency: 'CAD', en: 'Interac e-Transfer · CAD', ru: 'Interac e-Transfer · CAD',
    enHint: 'For eligible Canadian bank transfers', ruHint: 'Для банковских переводов в Канаде' }),
  Object.freeze({ id: 'privatbank-uah', currency: 'UAH', en: 'Bank card / PrivatBank · UAH', ru: 'Карта / ПриватБанк · UAH',
    enHint: 'Ask whether payment in hryvnia is available', ruHint: 'Уточнить возможность оплаты в гривнах' }),
])

export function buildManualPaymentRequest({ planId, methodId, locale = 'en' } = {}) {
  if (planId !== 'advanced' && planId !== 'premium') return null
  const method = MANUAL_PAYMENT_METHODS.find(item => item.id === methodId)
  if (!method) return null
  const ru = locale === 'ru'
  const regular = planId === 'advanced' ? COURSE_MEMBERSHIP.regularMonthlyEUR : COURSE_MEMBERSHIP.premiumMonthlyEUR
  const name = planId === 'advanced' ? 'Advanced' : 'Premium'
  const price = ru ? 'План: ' + name + ' — €' + regular + '/мес.' : 'Plan: ' + name + ' — €' + regular + '/month.'
  const intro = planId === 'advanced'
    ? (ru ? 'Для нового подписчика возможен первый месяц за €' + COURSE_MEMBERSHIP.introFirstMonthEUR + ' (−50%) при подтверждении права на скидку.'
      : 'Eligible new subscribers may receive the first month for €' + COURSE_MEMBERSHIP.introFirstMonthEUR + ' (50% off), subject to confirmation.')
    : (ru ? 'Первый месяц Premium: €' + regular + ' до пересчёта валюты/налогов.'
      : 'First Premium month: €' + regular + ' before currency conversion/applicable tax.')
  return [
    ru ? 'Здравствуйте! Хочу получить инструкции по оплате Holistic House.' : 'Hello! I would like payment instructions for Holistic House.',
    price, intro,
    (ru ? 'Предпочтительный способ: ' : 'Preferred method: ') + method[ru ? 'ru' : 'en'] + '.',
    ru
      ? 'Пожалуйста, подтвердите доступность способа, окончательную сумму и валюту, получателя и условия до перевода денег.'
      : 'Please confirm method availability, final amount/currency, payee, and terms before I pay.',
    ru
      ? 'Понимаю: это заявка на разовую оплату месяца, не автосписание. Доступ откроется только после фактической проверки поступления.'
      : 'I understand this is a manual request for one month, not automatic renewal. Access starts only after actual payment verification.',
  ].join('\n')
}
