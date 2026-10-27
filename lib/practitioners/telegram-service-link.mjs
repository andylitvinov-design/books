// One shared Holistic House bot can route to any published practitioner offering.
// Telegram start payloads contain only an opaque public offering UUID and language.
import { telegramPublicDiagnosticReady } from '../crm/messenger-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALE = /^(en|ru|es)$/

export function parseTelegramServiceStart(rawText) {
  const text = String(rawText || '').trim()
  const directory = /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhmasters_(en|ru|es)$/i.exec(text)
  if (directory) return { locale: directory[1].toLowerCase(), directory: true }
  const service = /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhservice_(en|ru|es)_([0-9a-f]{32})$/i.exec(text)
  if (!service) return null
  const hex = service[2].toLowerCase()
  return {
    locale: service[1].toLowerCase(),
    serviceId: [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
      hex.slice(16, 20), hex.slice(20)].join('-'),
  }
}

export function telegramServiceRequestUrl(locale, serviceId) {
  if (!LOCALE.test(String(locale)) || !UUID.test(String(serviceId))) return null
  return `https://holistichouse.vercel.app/${locale}/services/telegram-request?service=${serviceId.toLowerCase()}`
}

export function telegramMasterDirectoryUrl(locale) {
  return LOCALE.test(String(locale)) ? `https://holistichouse.vercel.app/${locale}/masters` : null
}

export function telegramServiceBotUrl(locale, serviceId, env = process.env) {
  if (!telegramPublicDiagnosticReady(env) || !LOCALE.test(String(locale)) ||
      !UUID.test(String(serviceId))) return null
  const bot = String(env.HH_CRM_MSG_TELEGRAM_USERNAME || '').replace(/^@/, '')
  if (!/^[A-Za-z0-9_]{5,32}$/.test(bot) || !/bot$/i.test(bot)) return null
  return `https://t.me/${bot}?start=hhservice_${locale}_${serviceId.replace(/-/g, '').toLowerCase()}`
}


/**
 * Public service titles are read back from published offering snapshots.
 * A bot start does not create a lead, appointment or inferred contact consent.
 */
export function telegramServiceStartPrompt(selection, offering = null) {
  const locale = selection?.locale
  if (!LOCALE.test(String(locale))) return null
  const directory = telegramMasterDirectoryUrl(locale)
  const link = offering ? telegramServiceRequestUrl(locale, offering.id) : directory
  if (!link) return null
  const title = offering?.title || ''
  const master = offering?.practitionerName || offering?.practitionerSlug || ''
  if (locale === 'ru') return offering
    ? `Заявка мастеру «${master}» на услугу «${title}».\n\nОткройте защищённую короткую форму, укажите контакт для ответа и нажмите «Отправить заявку»:\n${link}\n\nПростое открытие ссылки не создаёт заявку. Запись и оплата подтверждаются отдельно.`
    : `Выберите мастера и его услугу в каталоге Holistic House:\n${directory}\n\nНа странице услуги выберите «Заявка через Telegram-бота».`
  if (locale === 'es') return offering
    ? `Solicitud al profesional «${master}», servicio «${title}».\n\nAbre el formulario privado, proporciona un contacto y pulsa «Enviar solicitud»:\n${link}\n\nAbrir el enlace no envía una solicitud. La reserva y el pago se confirman por separado.`
    : `Elige un profesional y un servicio en el catálogo de Holistic House:\n${directory}\n\nAbre el servicio y selecciona «Solicitar por Telegram».`
  return offering
    ? `Request to practitioner “${master}” for “${title}”.\n\nOpen the secure short form, enter contact details for a reply and press “Send request”:\n${link}\n\nOpening this link alone does not submit a request. Booking and payment are confirmed separately.`
    : `Choose a practitioner and service in Holistic House:\n${directory}\n\nOn a service page, select “Request via Telegram bot”.`
}
