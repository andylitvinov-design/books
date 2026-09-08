import { randomUUID } from 'node:crypto'

// All supported currencies have two decimal minor units. Cap at one million major units.
export const paymentCurrencies = ['CAD', 'USD', 'EUR', 'UAH']
const statuses = ['draft', 'active', 'revoked', 'archived']
const optional = (value) => String(value ?? '').trim() || undefined
function required(value, label) {
  const text = optional(value)
  if (!text) throw new Error(`${label} is required`)
  if (text.length > 2000) throw new Error(`${label} is too long`)
  return text
}
function date(value, label) {
  const text = required(value, label)
  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new Error(`${label} must be a valid ISO date`)
  return text
}
function parseAmount(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(text)) throw new Error('Amount must be a decimal with at most two fractional digits')
  const [whole, fraction = ''] = text.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) throw new Error('Amount must be greater than zero and at most 1000000')
  return amount
}

export function validatePaymentDocumentInput(input, now = new Date().toISOString()) {
  const status = input.status ?? 'draft'
  const currency = input.currency ?? 'CAD'
  const paymentStatus = input.paymentStatus ?? 'unpaid'
  const languagePreference = input.languagePreference ?? 'bilingual'
  if (!statuses.includes(status)) throw new Error('Invalid document status')
  if (!paymentCurrencies.includes(currency)) throw new Error('Unsupported currency')
  if (!['received', 'unpaid'].includes(paymentStatus)) throw new Error('Invalid payment status')
  if (!['en', 'ru', 'bilingual'].includes(languagePreference)) throw new Error('Invalid language preference')
  const count = optional(input.consultations)
  if (count && (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count)) || Number(count) < 1 || Number(count) > 10000)) throw new Error('Consultations must be a positive integer at most 10000')
  return {
    kind: 'payment', patientName: required(input.patientName, 'Client name'),
    dateOfService: date(input.dateOfService, 'Date of service'),
    dateIssued: date(input.dateIssued || now.slice(0, 10), 'Date issued'),
    amount: parseAmount(input.amount), currency, service: required(input.service, 'Service'),
    consultations: count ? Number(count) : undefined,
    documentNumber: optional(input.documentNumber), paymentStatus, languagePreference, status,
  }
}

export function createPaymentDocument(input, now = new Date().toISOString()) {
  return { id: randomUUID(), createdAt: now, updatedAt: now, ...validatePaymentDocumentInput(input, now) }
}

export function updatePaymentDocument(existing, input, now = new Date().toISOString()) {
  if (existing?.kind !== 'payment') throw new Error('Existing payment document required')
  const updated = { ...validatePaymentDocumentInput(input, now), id: existing.id, createdAt: existing.createdAt, updatedAt: now }
  if (existing.status === 'active' && updated.status === 'active' && existing.access) updated.access = existing.access
  return updated
}

export function getClientPaymentDocument(record, locale) {
  if (record?.kind !== 'payment' || record.status !== 'active' || !['en', 'ru'].includes(locale)) return undefined
  return {
    kind: 'payment', documentType: record.paymentStatus === 'received' ? 'receipt' : 'invoice',
    patientName: record.patientName, dateOfService: record.dateOfService, dateIssued: record.dateIssued,
    amount: record.amount, currency: record.currency, service: record.service,
    consultations: record.consultations, documentNumber: record.documentNumber,
    paymentStatus: record.paymentStatus, languagePreference: record.languagePreference,
  }
}

export function formatPaymentAmount(document, locale = 'en') {
  return (document.amount / 100).toFixed(2).replace('.', locale === 'ru' ? ',' : '.')
}

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function english(n) {
  if (n < 20) return small[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? `-${small[n % 10]}` : '')
  for (const [size, word] of [[1000000, 'million'], [1000, 'thousand'], [100, 'hundred']]) {
    if (n >= size) return `${english(Math.floor(n / size))} ${word}${n % size ? ` ${english(n % size)}` : ''}`
  }
}
const ruSmall = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
const ruTens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
const ruHundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']
function plural(n, forms) { return forms[n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2] }
function russian(n, feminine = false) {
  if (n < 20) return feminine && n === 1 ? 'одна' : feminine && n === 2 ? 'две' : ruSmall[n]
  if (n < 100) return `${ruTens[Math.floor(n / 10)]}${n % 10 ? ` ${russian(n % 10, feminine)}` : ''}`
  if (n < 1000) return `${ruHundreds[Math.floor(n / 100)]}${n % 100 ? ` ${russian(n % 100, feminine)}` : ''}`
  const size = n >= 1000000 ? 1000000 : 1000
  const count = Math.floor(n / size)
  return `${russian(count, size === 1000)} ${plural(count, size === 1000 ? ['тысяча', 'тысячи', 'тысяч'] : ['миллион', 'миллиона', 'миллионов'])}${n % size ? ` ${russian(n % size, feminine)}` : ''}`
}

export function paymentAmountInWords(document, locale = 'en') {
  const whole = Math.floor(document.amount / 100)
  const cents = document.amount % 100
  if (locale === 'ru') {
    const names = { CAD: ['канадский доллар', 'канадских доллара', 'канадских долларов'], USD: ['доллар США', 'доллара США', 'долларов США'], EUR: ['евро', 'евро', 'евро'], UAH: ['украинская гривна', 'украинские гривны', 'украинских гривен'] }
    return `${russian(whole, document.currency === 'UAH')} ${plural(whole, names[document.currency])} ${russian(cents, document.currency === 'UAH')} ${plural(cents, document.currency === 'UAH' ? ['копейка', 'копейки', 'копеек'] : ['цент', 'цента', 'центов'])}`
  }
  const names = { CAD: ['Canadian dollar', 'Canadian dollars'], USD: ['US dollar', 'US dollars'], EUR: ['euro', 'euros'], UAH: ['Ukrainian hryvnia', 'Ukrainian hryvnias'] }
  return `${english(whole)} ${names[document.currency][whole === 1 ? 0 : 1]} and ${english(cents)} ${document.currency === 'UAH' ? (cents === 1 ? 'kopiyka' : 'kopiykas') : (cents === 1 ? 'cent' : 'cents')}`
}

export function paymentNarrative(document, locale = 'en') {
  const amount = `${document.currency} ${formatPaymentAmount(document, locale)} (${paymentAmountInWords(document, locale)})`
  const consultations = document.consultations ? ` ${paymentCopy(locale).consultations}: ${document.consultations}.` : ''
  if (locale === 'ru') return document.paymentStatus === 'received'
    ? `Подтверждаю получение оплаты ${amount} от ${document.patientName} за услугу «${document.service}», оказанную ${document.dateOfService}.${consultations}`
    : `К оплате: ${amount}. Клиент: ${document.patientName}. Услуга: ${document.service}. Дата оказания услуги: ${document.dateOfService}.${consultations}`
  return document.paymentStatus === 'received'
    ? `I confirm that I received ${amount} from ${document.patientName} for ${document.service} provided on ${document.dateOfService}.${consultations}`
    : `Amount due: ${amount} from ${document.patientName} for ${document.service} provided on ${document.dateOfService}.${consultations}`
}

export function paymentCopy(locale = 'en') {
  return locale === 'ru'
    ? { receipt: 'КВИТАНЦИЯ', invoice: 'СЧЁТ', client: 'Клиент', dateOfService: 'Дата оказания услуги', dateIssued: 'Дата документа', amount: 'Сумма', service: 'Услуга', consultations: 'Количество консультаций', documentNumber: 'Номер документа', signature: 'Подпись', received: 'Оплачено', unpaid: 'Не оплачено' }
    : { receipt: 'RECEIPT', invoice: 'INVOICE', client: 'Client', dateOfService: 'Date of service', dateIssued: 'Date issued', amount: 'Amount', service: 'Service', consultations: 'Number of consultations', documentNumber: 'Document number', signature: 'Signature', received: 'Paid', unpaid: 'Unpaid' }
}
