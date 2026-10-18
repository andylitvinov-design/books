import { SERVICE_PRODUCTS } from './catalog.js'

// This is ONLY a payment-method inquiry. It cannot initiate a ZEN checkout,
// transfer funds, reserve appointments or mark an order paid.
// No personal account top-up links, card numbers, or private payee details are
// ever generated or inferred from the website visitor's input.
const contact = 'https://wa.me/14376066502'
const languages = ['en', 'ru', 'es']

export function buildZenTransferInquiry(serviceIds, locale = 'en') {
  if (!Array.isArray(serviceIds) || !serviceIds.length ||
      serviceIds.length > SERVICE_PRODUCTS.length ||
      serviceIds.some(id => typeof id !== 'string') ||
      new Set(serviceIds).size !== serviceIds.length) return null
  const products = serviceIds.map(id => SERVICE_PRODUCTS.find(p => p.id === id))
  if (products.some(p => !p || p.kind !== 'one_time' || p.currency !== 'EUR' ||
      !Number.isSafeInteger(p.amountMinor) || p.amountMinor <= 0)) return null
  const lang = languages.includes(locale) ? locale : 'en'
  const amountMinor = products.reduce((sum, p) => sum + p.amountMinor, 0)
  const amount = '€' + (amountMinor / 100).toFixed(2)
  const description = products.map(p => p.title[lang] + ' (' + p.durationMinutes + ' min)').join(', ')
  const messages = {
    en: [
      'Hello Andrey! I would like to arrange a ZEN.COM EUR bank transfer for Holistic House.',
      'Services: ' + description + '. Total: ' + amount + '.',
      'Please confirm a convenient appointment time and whether payment by ZEN.COM transfer is available for these services.',
      'If this method is available, please send the verified recipient details and payment reference before I transfer. I have not paid yet.',
    ],
    ru: [
      'Здравствуйте, Андрей! Хочу согласовать оплату услуг Holistic House переводом через ZEN.COM в EUR.',
      'Услуги: ' + description + '. Итого: ' + amount + '.',
      'Подскажите, пожалуйста, доступное время и можно ли оплатить эти услуги переводом через ZEN.COM.',
      'Если способ доступен, пришлите проверенные реквизиты получателя и назначение платежа до перевода. Оплата ещё не отправлена.',
    ],
    es: [
      'Hola Andrey. Quisiera solicitar un pago mediante transferencia bancaria ZEN.COM en EUR por servicios de Holistic House.',
      'Servicios: ' + description + '. Total: ' + amount + '.',
      'Por favor, confirma la disponibilidad de la cita y si puedo pagar estos servicios mediante ZEN.COM.',
      'Si está disponible, envíame los datos verificados del destinatario y una referencia antes de transferir. Todavía no he pagado.',
    ],
  }
  return contact + '?text=' + encodeURIComponent(messages[lang].join('\n'))
}
