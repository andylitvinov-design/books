import { SERVICE_PRODUCTS } from './catalog.js'

// Canada-only manual enquiry. Never show or invent bank details, exchange rates
// or an automatic "paid" state. The provider and payee must be verified first.
export function buildInteracTransferInquiry(serviceIds, locale = 'en') {
  if (!Array.isArray(serviceIds) || !serviceIds.length ||
    serviceIds.length > SERVICE_PRODUCTS.length ||
    serviceIds.some(id => typeof id !== 'string') ||
    new Set(serviceIds).size !== serviceIds.length) return null
  const products = serviceIds.map(id => SERVICE_PRODUCTS.find(product => product.id === id))
  if (products.some(product => !product || product.kind !== 'one_time' ||
    product.currency !== 'EUR' || !Number.isSafeInteger(product.amountMinor) ||
    product.amountMinor <= 0)) return null
  const lang = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const total = '€' + (products.reduce((sum, product) => sum + product.amountMinor, 0) / 100).toFixed(2)
  const description = products.map(product => product.title[lang]).join(', ')
  const messages = {
    en: [
      'Hello Andrey! I am in Canada and would like to ask about paying by Interac e-Transfer.',
      'Services: ' + description + '. Listed website total: ' + total + ' EUR.',
      'Please confirm appointment availability, the final CAD amount, the recipient, and the payment reference before I transfer.',
      'I have not paid. Please do not request banking passwords or card details in chat.',
    ],
    ru: [
      'Здравствуйте, Андрей! Я в Канаде и хочу уточнить оплату через Interac e-Transfer.',
      'Услуги: ' + description + '. Цена на сайте: ' + total + ' EUR.',
      'До перевода подтвердите, пожалуйста, время сеанса, итоговую сумму в CAD, получателя и назначение платежа.',
      'Я ещё не платил(а). Банковские пароли и данные карты в чат не отправляю.',
    ],
    es: [
      'Hola Andrey. Estoy en Canadá y quiero preguntar por un pago con Interac e-Transfer.',
      'Servicios: ' + description + '. Total en el sitio: ' + total + ' EUR.',
      'Antes de transferir, confirma disponibilidad, el importe final en CAD, el destinatario y la referencia.',
      'Todavía no he pagado. No enviaré contraseñas bancarias ni datos de tarjeta por chat.',
    ],
  }
  return 'https://wa.me/14376066502?text=' + encodeURIComponent(messages[lang].join('\n'))
}
