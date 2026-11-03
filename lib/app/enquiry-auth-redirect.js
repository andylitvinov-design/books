import { safePublicWhatsAppPath } from '../whatsapp-enquiry.js'

// OAuth may return only to the exact, allowlisted public locale path.
// No arbitrary origin, query, fragment, hidden test or private report paths.
export function safeEnquiryReturnPath(path, locale) {
  if (!['en', 'ru', 'es'].includes(locale) ||
      typeof path !== 'string' || path.length > 300 ||
      !path.startsWith('/' + locale + '/') ||
      !/^\/(?:en|ru|es)\/[A-Za-z0-9/_-]+$/.test(path) ||
      path.includes('//') || path.split('/').some(s => s === '.' || s === '..')) return ''
  return safePublicWhatsAppPath(path) === path ? path : ''
}
